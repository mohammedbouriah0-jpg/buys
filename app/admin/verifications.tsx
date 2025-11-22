import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, TextInput, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/lib/i18n/language-context';
import { API_URL, API_CONFIG } from '@/config';

export default function AdminVerifications() {
  const { t, isRTL } = useLanguage();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  const handleCancelSubscription = async (shopId: number, shopName: string) => {
    Alert.alert(
      t('cancelSubscription'),
      `${t('cancelSubscriptionConfirm')} ${shopName} ? ${t('shopWillLoseAccess')}`,
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes') + ', ' + t('cancel').toLowerCase(),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_URL}/admin/shops/${shopId}/cancel-subscription`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                Alert.alert(t('success'), t('subscriptionCancelled'));
                fetchShops();
              } else {
                Alert.alert(t('error'), t('unableToCancel'));
              }
            } catch (error) {
              console.error('Erreur annulation:', error);
              Alert.alert(t('error'), t('errorOccurred'));
            }
          }
        }
      ]
    );
  };

  const fetchShops = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/verifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setShops(data);
      }
    } catch (error) {
      console.error('Erreur chargement boutiques:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShops();
  };

  const handleApprove = async (shopId: number) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/verifications/${shopId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        Alert.alert(t('success'), t('shopVerified'));
        fetchShops();
      } else {
        Alert.alert(t('error'), t('unableToVerify'));
      }
    } catch (error) {
      console.error('Erreur approbation:', error);
      Alert.alert(t('error'), t('errorOccurred'));
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert(t('error'), t('provideReason'));
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/verifications/${selectedShop.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });

      if (response.ok) {
        Alert.alert(t('success'), t('verificationRejected'));
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedShop(null);
        fetchShops();
      } else {
        Alert.alert(t('error'), t('unableToReject'));
      }
    } catch (error) {
      console.error('Erreur rejet:', error);
      Alert.alert(t('error'), t('errorOccurred'));
    }
  };

  const filteredShops = shops.filter(shop => {
    // Filtre par statut
    if (filter !== 'all' && shop.verification_status !== filter) return false;
    
    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        shop.shop_name?.toLowerCase().includes(query) ||
        shop.email?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('pending');
      case 'approved': return t('approved');
      case 'rejected': return t('rejected');
      default: return status;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-6 border-b border-gray-200">
        <View className={`flex-row items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-gray-100 p-2 rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-gray-900 text-xl font-bold">{t('verifications')}</Text>
          <View className="w-10" />
        </View>

        {/* Barre de recherche */}
        <View className={`bg-gray-100 rounded-xl flex-row items-center px-4 py-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('searchShop')}
            placeholderTextColor="#9ca3af"
            className={`flex-1 text-gray-900 ${isRTL ? 'mr-3 text-right' : 'ml-3'}`}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {[
            { key: 'all', label: t('all'), count: shops.length, color: '#6366f1' },
            { key: 'pending', label: t('pending'), count: shops.filter(s => s.verification_status === 'pending').length, color: '#f59e0b' },
            { key: 'approved', label: t('approved'), count: shops.filter(s => s.verification_status === 'approved').length, color: '#10b981' },
            { key: 'rejected', label: t('rejected'), count: shops.filter(s => s.verification_status === 'rejected').length, color: '#ef4444' }
          ].map((item: any) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              className="mr-3 px-5 py-2.5 rounded-full"
              style={{
                backgroundColor: filter === item.key ? item.color : '#f3f4f6',
              }}
            >
              <Text 
                className="font-bold text-sm"
                style={{ color: filter === item.key ? '#fff' : '#6b7280' }}
              >
                {`${item.label} (${item.count})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredShops.map((shop) => (
          <View key={shop.id} className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm">
            {/* En-tête boutique */}
            <View className="p-5 pb-4">
              <View className={`flex-row items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 mb-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>{shop.shop_name}</Text>
                  <Text className="text-gray-500 text-sm" style={{ textAlign: isRTL ? 'right' : 'left' }}>{shop.email}</Text>
                </View>
                <View
                  className="px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: `${getStatusColor(shop.verification_status)}20` }}
                >
                  <Text style={{ color: getStatusColor(shop.verification_status) }} className="font-bold text-xs">
                    {getStatusText(shop.verification_status)}
                  </Text>
                </View>
              </View>

              {/* Statistiques compactes */}
              <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse ml-4' : 'mr-4'}`}>
                  <View className="bg-gray-100 p-1.5 rounded-full">
                    <Ionicons name="cube-outline" size={14} color="#6b7280" />
                  </View>
                  <Text className={`text-gray-600 text-sm font-semibold ${isRTL ? 'mr-1.5' : 'ml-1.5'}`}>
                    {shop.product_count} {t('products')}
                  </Text>
                </View>
                <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <View className="bg-gray-100 p-1.5 rounded-full">
                    <Ionicons name="receipt-outline" size={14} color="#6b7280" />
                  </View>
                  <Text className={`text-gray-600 text-sm font-semibold ${isRTL ? 'mr-1.5' : 'ml-1.5'}`}>
                    {shop.order_count} {t('orders')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Document */}
            {shop.verification_document && (
              <TouchableOpacity 
                onPress={() => {
                  setSelectedDocument(`http://${API_CONFIG.SERVER_IP}:${API_CONFIG.PORT}${shop.verification_document}`);
                  setShowDocumentModal(true);
                }}
                className={`bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: '#e0e7ff',
                }}
              >
                <View className="bg-blue-500 p-2.5 rounded-xl" style={{
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}>
                  <Ionicons name="document-text" size={20} color="white" />
                </View>
                <Text className={`text-blue-700 font-bold flex-1 ${isRTL ? 'mr-3 text-right' : 'ml-3'}`}>{t('viewDocument')}</Text>
                <View className="bg-blue-100 p-1.5 rounded-full">
                  <Ionicons name="chevron-forward" size={18} color="#3b82f6" />
                </View>
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View className="p-5 pt-4">
              {shop.verification_status === 'pending' && (
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => handleApprove(shop.id)}
                    className="flex-1 rounded-2xl py-4 flex-row items-center justify-center"
                    style={{
                      backgroundColor: '#10b981',
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <View className="bg-white/20 p-1.5 rounded-full mr-2">
                      <Ionicons name="checkmark" size={18} color="white" />
                    </View>
                    <Text className="text-white font-bold text-base">{t('approve')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedShop(shop);
                      setShowRejectModal(true);
                    }}
                    className="rounded-2xl py-4 px-6 flex-row items-center justify-center"
                    style={{
                      backgroundColor: '#ef4444',
                      shadowColor: '#ef4444',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <Ionicons name="close" size={22} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              {shop.verification_status === 'rejected' && (
                <>
                  {shop.rejection_reason && (
                    <View className="bg-red-50 border-l-4 border-red-400 rounded-xl p-4 mb-3">
                      <View className={`flex-row items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Ionicons name="alert-circle" size={18} color="#ef4444" />
                        <Text className={`text-red-700 text-sm flex-1 ${isRTL ? 'mr-2 text-right' : 'ml-2'}`}>{shop.rejection_reason}</Text>
                      </View>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => handleApprove(shop.id)}
                    className="rounded-2xl py-4 flex-row items-center justify-center"
                    style={{
                      backgroundColor: '#10b981',
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <View className="bg-white/20 p-1.5 rounded-full mr-2">
                      <Ionicons name="refresh" size={18} color="white" />
                    </View>
                    <Text className="text-white font-bold text-base">{t('reapprove')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {shop.verification_status === 'approved' && shop.subscription_end_date && (
                <View className={`bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <View className={`flex-row items-center flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <View className="bg-green-100 p-2 rounded-full">
                      <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    </View>
                    <View className={`flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`}>
                      <Text className="text-green-900 text-xs font-semibold mb-0.5" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                        {t('activeSubscription')}
                      </Text>
                      <Text className="text-green-700 text-sm font-bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                        {`${t('until')} ${new Date(shop.subscription_end_date).toLocaleDateString(isRTL ? 'ar-DZ' : 'fr-FR')}`}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleCancelSubscription(shop.id, shop.shop_name)}
                    className="bg-red-500 px-4 py-2 rounded-xl"
                    style={{
                      shadowColor: '#ef4444',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Text className="text-white text-xs font-bold">{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}

        {filteredShops.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="folder-open-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-400 text-lg mt-4">{t('noShops')}</Text>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>

      {/* Modal de rejet */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-800 mb-4" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t('rejectVerification')}</Text>
            
            <Text className="text-gray-600 mb-3" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t('rejectReason')}:</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={t('explainRejection')}
              multiline
              numberOfLines={4}
              className="bg-gray-50 rounded-xl p-4 mb-4"
              style={{ textAlignVertical: 'top', textAlign: isRTL ? 'right' : 'left' }}
            />

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedShop(null);
                }}
                className="flex-1 bg-gray-200 rounded-xl py-3 mr-2"
              >
                <Text className="text-gray-700 font-semibold text-center">{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                className="flex-1 bg-red-500 rounded-xl py-3 ml-2"
              >
                <Text className="text-white font-semibold text-center">{t('reject')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de visualisation du document */}
      <Modal
        visible={showDocumentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDocumentModal(false)}
      >
        <View className="flex-1 bg-black">
          {/* Header */}
          <View className={`bg-black/80 pt-12 pb-4 px-6 flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Text className="text-white text-lg font-semibold">{t('verificationDocument')}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowDocumentModal(false);
                setSelectedDocument(null);
              }}
              className="bg-white/20 p-2 rounded-full"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Image du document */}
          <ScrollView 
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
            maximumZoomScale={3}
            minimumZoomScale={1}
          >
            {selectedDocument && (
              <Image
                source={{ uri: selectedDocument }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
