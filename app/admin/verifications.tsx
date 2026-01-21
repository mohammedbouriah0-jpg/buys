import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, TextInput, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/lib/i18n/language-context';
import { API_URL, API_CONFIG } from '@/config';

const ADMIN_CANCEL_REASON = "Abonnement annulé par l'administrateur";

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
  const [documentModalTitle, setDocumentModalTitle] = useState<string>('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedShopForDate, setSelectedShopForDate] = useState<any>(null);
  const [newEndDate, setNewEndDate] = useState('');

  const formatDateLocalized = (date: Date) => {
    try {
      return date.toLocaleDateString(isRTL ? 'ar-DZ' : 'fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return date.toISOString().split('T')[0];
    }
  };

  const buildDocumentUrl = (path?: string | null) => {
    if (!path) return null;
    const protocol = API_CONFIG.USE_HTTPS ? "https" : "http";
    const port = (API_CONFIG as any).PORT ? `:${(API_CONFIG as any).PORT}` : "";
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${protocol}://${API_CONFIG.SERVER_IP}${port}${normalized}`;
  };

  const openDocumentModal = (path?: string | null, title?: string) => {
    const url = buildDocumentUrl(path);
    if (!url) return;
    setSelectedDocument(url);
    setDocumentModalTitle(title || t('viewDocument'));
    setShowDocumentModal(true);
  };

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

  const handleReapproveShop = async (shopId: number, shopName: string) => {
    Alert.alert(
      t('reapprove'),
      `${t('reapprove')} - ${shopName}`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('yes') || 'Oui',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_URL}/admin/shops/${shopId}/reapprove`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                Alert.alert(t('success'), t('subscriptionRenewed') || 'Abonnement renouvelé pour 1 mois');
                fetchShops();
              } else {
                const error = await response.json();
                Alert.alert(t('error'), error.error || t('errorOccurred'));
              }
            } catch (error) {
              console.error('Erreur ré-approbation:', error);
              Alert.alert(t('error'), t('errorOccurred'));
            }
          }
        }
      ]
    );
  };

  const openDateModal = (shop: any) => {
    setSelectedShopForDate(shop);
    // Pré-remplir avec la date actuelle formatée YYYY-MM-DD
    if (shop.subscription_end_date) {
      const date = new Date(shop.subscription_end_date);
      setNewEndDate(date.toISOString().split('T')[0]);
    } else {
      // Par défaut: 30 jours à partir d'aujourd'hui
      const date = new Date();
      date.setDate(date.getDate() + 30);
      setNewEndDate(date.toISOString().split('T')[0]);
    }
    setShowDateModal(true);
  };

  const handleUpdateSubscriptionDate = async () => {
    if (!newEndDate || !selectedShopForDate) {
      Alert.alert(t('error'), 'Veuillez sélectionner une date');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/shops/${selectedShopForDate.id}/subscription`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ end_date: newEndDate })
      });

      if (response.ok) {
        Alert.alert(t('success'), 'Date d\'abonnement modifiée');
        setShowDateModal(false);
        setSelectedShopForDate(null);
        setNewEndDate('');
        fetchShops();
      } else {
        const error = await response.json();
        Alert.alert(t('error'), error.error || 'Impossible de modifier la date');
      }
    } catch (error) {
      console.error('Erreur modification date:', error);
      Alert.alert(t('error'), t('errorOccurred'));
    }
  };

  const addDaysToDate = (days: number) => {
    const currentDate = newEndDate ? new Date(newEndDate) : new Date();
    currentDate.setDate(currentDate.getDate() + days);
    setNewEndDate(currentDate.toISOString().split('T')[0]);
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

  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      if (filter !== 'all' && shop.verification_status !== filter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          shop.shop_name?.toLowerCase().includes(query) ||
          shop.email?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [shops, filter, searchQuery]);

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

  const getInvoiceStatusColor = (status?: string | null) => {
    switch (status) {
      case 'pending':
        return '#d97706';
      case 'approved':
        return '#15803d';
      case 'rejected':
        return '#dc2626';
      default:
        return '#4b5563';
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
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: 48,
        paddingBottom: 16,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3
      }}>
        <View style={{ 
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: '#f3f4f6',
              padding: 8,
              borderRadius: 12
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={{ 
            color: '#111827',
            fontSize: 20,
            fontWeight: '900',
            letterSpacing: 0.5
          }}>{t('verifications')}</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Barre de recherche */}
        <View style={{ 
          backgroundColor: '#f9fafb',
          borderRadius: 12,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb'
        }}>
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('searchShop')}
            placeholderTextColor="#9ca3af"
            style={{ 
              flex: 1,
              color: '#111827',
              fontSize: 14,
              fontWeight: '600',
              marginLeft: isRTL ? 0 : 10,
              marginRight: isRTL ? 10 : 0,
              textAlign: isRTL ? 'right' : 'left'
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
          {[
            { key: 'all', label: t('all'), count: shops.length, color: '#6366f1' },
            { key: 'pending', label: t('pending'), count: shops.filter(s => s.verification_status === 'pending').length, color: '#f59e0b' },
            { key: 'approved', label: t('approved'), count: shops.filter(s => s.verification_status === 'approved').length, color: '#10b981' },
            { key: 'rejected', label: t('rejected'), count: shops.filter(s => s.verification_status === 'rejected').length, color: '#ef4444' }
          ].map((item: any) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={{
                marginRight: 8,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: filter === item.key ? item.color : '#f3f4f6',
              }}
            >
              <Text 
                style={{ 
                  fontWeight: '800',
                  fontSize: 12,
                  color: filter === item.key ? '#fff' : '#6b7280'
                }}
              >
                {`${item.label} (${item.count})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#f8fafc' }}
        contentContainerStyle={{ padding: 12, paddingTop: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredShops.map((shop) => (
          <View key={shop.id} style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            overflow: 'hidden',
            marginBottom: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2
          }}>
            {/* En-tête boutique */}
            <View style={{ padding: 12, paddingBottom: 10 }}>
              <View style={{ 
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 8
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    fontSize: 15,
                    fontWeight: '800',
                    color: '#111827',
                    marginBottom: 3,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{shop.shop_name}</Text>
                  <Text style={{ 
                    color: '#6b7280',
                    fontSize: 11,
                    fontWeight: '600',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{shop.email}</Text>
                </View>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: `${getStatusColor(shop.verification_status)}15`
                  }}>
                    <Text style={{ 
                      color: getStatusColor(shop.verification_status),
                      fontWeight: '800',
                      fontSize: 10
                    }}>
                      {getStatusText(shop.verification_status)}
                    </Text>
                  </View>
                  {shop.latest_invoice_status === 'pending' && (
                    <View style={{
                      marginTop: 6,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      backgroundColor: '#fee2e2',
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 4
                    }}>
                      <Ionicons name="information-circle" size={12} color="#b91c1c" />
                      <Text style={{
                        color: '#b91c1c',
                        fontSize: 10,
                        fontWeight: '700',
                        marginLeft: isRTL ? 0 : 4,
                        marginRight: isRTL ? 4 : 0
                      }}>
                        {t('paymentAwaitingReview') || 'Paiement à valider'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Statistiques compactes */}
              <View style={{ 
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center'
              }}>
                <View style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  marginRight: isRTL ? 0 : 10,
                  marginLeft: isRTL ? 10 : 0
                }}>
                  <View style={{
                    backgroundColor: '#f3f4f6',
                    padding: 4,
                    borderRadius: 6
                  }}>
                    <Ionicons name="cube-outline" size={11} color="#6b7280" />
                  </View>
                  <Text style={{ 
                    color: '#6b7280',
                    fontSize: 11,
                    fontWeight: '700',
                    marginLeft: isRTL ? 0 : 5,
                    marginRight: isRTL ? 5 : 0
                  }}>
                    {shop.product_count} {t('products')}
                  </Text>
                </View>
                <View style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center'
                }}>
                  <View style={{
                    backgroundColor: '#f3f4f6',
                    padding: 4,
                    borderRadius: 6
                  }}>
                    <Ionicons name="receipt-outline" size={11} color="#6b7280" />
                  </View>
                  <Text style={{ 
                    color: '#6b7280',
                    fontSize: 11,
                    fontWeight: '700',
                    marginLeft: isRTL ? 0 : 5,
                    marginRight: isRTL ? 5 : 0
                  }}>
                    {shop.order_count} {t('orders')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Document de vérification */}
            {shop.verification_document && (
              <TouchableOpacity 
                onPress={() => openDocumentModal(shop.verification_document, t('verificationDocument'))}
                style={{
                  backgroundColor: '#eff6ff',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: '#dbeafe',
                }}
              >
                <View style={{
                  backgroundColor: '#3b82f6',
                  padding: 6,
                  borderRadius: 8,
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.12,
                  shadowRadius: 2,
                  elevation: 2,
                }}>
                  <Ionicons name="document-text" size={16} color="white" />
                </View>
                <Text style={{ 
                  color: '#1e40af',
                  fontWeight: '800',
                  fontSize: 12,
                  flex: 1,
                  marginLeft: isRTL ? 0 : 8,
                  marginRight: isRTL ? 8 : 0,
                  textAlign: isRTL ? 'right' : 'left'
                }}>{t('viewDocument')}</Text>
                <View style={{
                  backgroundColor: '#dbeafe',
                  padding: 4,
                  borderRadius: 6
                }}>
                  <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
                </View>
              </TouchableOpacity>
            )}

            {/* Preuve de paiement */}
            {shop.latest_invoice_status && (
              <View style={{
                backgroundColor: '#eff6ff',
                padding: 12,
                borderBottomWidth: 1,
                borderColor: '#dbeafe'
              }}>
                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <View style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    flex: 1
                  }}>
                    <View style={{
                      backgroundColor: '#dbeafe',
                      padding: 6,
                      borderRadius: 8,
                      marginRight: isRTL ? 0 : 8,
                      marginLeft: isRTL ? 8 : 0
                    }}>
                      <Ionicons name="receipt-outline" size={16} color="#1e40af" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        color: '#1e3a8a',
                        fontSize: 12,
                        fontWeight: '800',
                        textAlign: isRTL ? 'right' : 'left'
                      }}>
                        {t('viewPaymentProof')}
                      </Text>
                      {shop.latest_invoice_submitted_at && (
                        <View style={{
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                          alignItems: 'center',
                          marginTop: 4
                        }}>
                          <Ionicons name="time-outline" size={12} color="#1d4ed8" />
                          <Text style={{
                            color: '#1d4ed8',
                            fontSize: 11,
                            marginLeft: isRTL ? 0 : 4,
                            marginRight: isRTL ? 4 : 0,
                            textAlign: isRTL ? 'right' : 'left'
                          }}>
                            {`${t('submittedOn')} ${formatDateLocalized(new Date(shop.latest_invoice_submitted_at))}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: `${getInvoiceStatusColor(shop.latest_invoice_status)}20`
                  }}>
                    <Text style={{
                      color: getInvoiceStatusColor(shop.latest_invoice_status),
                      fontWeight: '700',
                      fontSize: 11
                    }}>
                      {shop.latest_invoice_status === 'pending' 
                        ? t('pending')
                        : shop.latest_invoice_status === 'approved'
                          ? t('approved')
                          : t('rejected')}
                    </Text>
                  </View>
                </View>

                {shop.latest_invoice_document && (
                  <TouchableOpacity
                    onPress={() => openDocumentModal(shop.latest_invoice_document, t('viewPaymentProof'))}
                    style={{
                      marginTop: 10,
                      backgroundColor: '#dbeafe',
                      padding: 10,
                      borderRadius: 10,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <View style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center'
                    }}>
                      <Ionicons name="eye-outline" size={16} color="#1d4ed8" />
                      <Text style={{
                        color: '#1d4ed8',
                        fontWeight: '700',
                        fontSize: 12,
                        marginLeft: isRTL ? 0 : 8,
                        marginRight: isRTL ? 8 : 0
                      }}>
                        {t('viewPaymentProof')}
                      </Text>
                    </View>
                    <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#1d4ed8" />
                  </TouchableOpacity>
                )}

                {shop.latest_invoice_status === 'pending' && (
                  <View style={{
                    backgroundColor: '#fef9c3',
                    borderRadius: 10,
                    padding: 10,
                    marginTop: 10
                  }}>
                    <Text style={{
                      color: '#92400e',
                      fontSize: 11,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      {t('pendingPaymentReview')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Actions & Statuts d'abonnement */}
            <View style={{ padding: 12, paddingTop: 10 }}>
              {(() => {
                const subscriptionEndDate = shop.subscription_end_date ? new Date(shop.subscription_end_date) : null;
                const now = new Date();
                const isSubscriptionActive = shop.is_subscribed && subscriptionEndDate;
                const isAdminCancelled = shop.rejection_reason?.trim() === ADMIN_CANCEL_REASON;
                const isSubscriptionExpired = !shop.is_subscribed && subscriptionEndDate && subscriptionEndDate < now;
                const hasPendingInvoice = shop.latest_invoice_status === 'pending';

                if (isSubscriptionActive && subscriptionEndDate) {
                  return (
                    <View style={{
                      backgroundColor: '#f0fdf4',
                      borderWidth: 1,
                      borderColor: '#bbf7d0',
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12
                    }}>
                      <View style={{
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        flex: 1
                      }}>
                        <View style={{
                          backgroundColor: '#dcfce7',
                          padding: 6,
                          borderRadius: 8
                        }}>
                          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        </View>
                        <View style={{
                          flex: 1,
                          marginLeft: isRTL ? 0 : 10,
                          marginRight: isRTL ? 10 : 0
                        }}>
                          <Text style={{
                            color: '#14532d',
                            fontSize: 11,
                            fontWeight: '700',
                            marginBottom: 2,
                            textAlign: isRTL ? 'right' : 'left'
                          }}>
                            {t('activeSubscription')}
                          </Text>
                          <Text style={{
                            color: '#15803d',
                            fontSize: 12,
                            fontWeight: '800',
                            textAlign: isRTL ? 'right' : 'left'
                          }}>
                            {`${t('until')} ${formatDateLocalized(subscriptionEndDate)}`}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => openDateModal(shop)}
                          style={{
                            backgroundColor: '#3b82f6',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            shadowColor: '#3b82f6',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 3,
                            elevation: 2,
                          }}
                        >
                          <Ionicons name="calendar" size={14} color="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleCancelSubscription(shop.id, shop.shop_name)}
                          style={{
                            backgroundColor: '#ef4444',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            shadowColor: '#ef4444',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 3,
                            elevation: 2,
                          }}
                        >
                          <Text style={{
                            color: '#ffffff',
                            fontSize: 11,
                            fontWeight: '800'
                          }}>{t('cancel')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                if ((isAdminCancelled || isSubscriptionExpired) && subscriptionEndDate) {
                  return (
                    <View style={{ marginBottom: 12 }}>
                      <View style={{
                        backgroundColor: isAdminCancelled ? '#fef2f2' : '#fef3c7',
                        borderWidth: 1,
                        borderColor: isAdminCancelled ? '#fecaca' : '#fde68a',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: isAdminCancelled ? 10 : 0
                      }}>
                        <View style={{
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                          alignItems: 'center'
                        }}>
                          <View style={{
                            backgroundColor: isAdminCancelled ? '#fee2e2' : '#fef9c3',
                            padding: 6,
                            borderRadius: 8,
                            marginRight: isRTL ? 0 : 10,
                            marginLeft: isRTL ? 10 : 0
                          }}>
                            <Ionicons
                              name={isAdminCancelled ? 'alert-circle' : 'time'}
                              size={16}
                              color={isAdminCancelled ? '#ef4444' : '#f59e0b'}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              color: isAdminCancelled ? '#991b1b' : '#92400e',
                              fontSize: 12,
                              fontWeight: '800',
                              textAlign: isRTL ? 'right' : 'left'
                            }}>
                              {isAdminCancelled ? t('subscriptionCancelled') : t('subscriptionExpired')}
                            </Text>
                            <Text style={{
                              color: isAdminCancelled ? '#b91c1c' : '#b45309',
                              fontSize: 11,
                              marginTop: 4,
                              fontWeight: '600',
                              textAlign: isRTL ? 'right' : 'left'
                            }}>
                              {`${isAdminCancelled ? t('canceledOn') || t('expiredOn') : t('expiredOn')} ${formatDateLocalized(subscriptionEndDate)}`}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {(isAdminCancelled || isSubscriptionExpired) && hasPendingInvoice && shop.latest_invoice_document && (
                        <TouchableOpacity
                          onPress={() => handleReapproveShop(shop.id, shop.shop_name)}
                          style={{
                            borderRadius: 12,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#10b981',
                            shadowColor: '#10b981',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.2,
                            shadowRadius: 6,
                            elevation: 5
                          }}
                        >
                          <View style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            padding: 5,
                            borderRadius: 8,
                            marginRight: 6
                          }}>
                            <Ionicons name="refresh" size={16} color="#ffffff" />
                          </View>
                          <Text style={{
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: 14
                          }}>
                            {t('reapprove')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }

                return null;
              })()}

              {shop.verification_status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleApprove(shop.id)}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#10b981',
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <View style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      padding: 4,
                      borderRadius: 6,
                      marginRight: 5
                    }}>
                      <Ionicons name="checkmark" size={14} color="white" />
                    </View>
                    <Text style={{ 
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: 13
                    }}>{t('approve')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedShop(shop);
                      setShowRejectModal(true);
                    }}
                    style={{
                      borderRadius: 10,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#ef4444',
                      shadowColor: '#ef4444',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Ionicons name="close" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              {shop.verification_status === 'rejected' && (
                <>
                  {shop.rejection_reason && (
                    <View style={{
                      backgroundColor: '#fef2f2',
                      borderLeftWidth: 3,
                      borderLeftColor: '#ef4444',
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 10
                    }}>
                      <View style={{ 
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                        alignItems: 'flex-start'
                      }}>
                        <Ionicons name="alert-circle" size={16} color="#ef4444" />
                        <Text style={{ 
                          color: '#991b1b',
                          fontSize: 12,
                          fontWeight: '600',
                          flex: 1,
                          marginLeft: isRTL ? 0 : 8,
                          marginRight: isRTL ? 8 : 0,
                          textAlign: isRTL ? 'right' : 'left',
                          lineHeight: 18
                        }}>{shop.rejection_reason}</Text>
                      </View>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => handleReapproveShop(shop.id, shop.shop_name)}
                    style={{
                      borderRadius: 12,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#10b981',
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.25,
                      shadowRadius: 6,
                      elevation: 5,
                    }}
                  >
                    <View style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      padding: 5,
                      borderRadius: 8,
                      marginRight: 6
                    }}>
                      <Ionicons name="refresh" size={16} color="white" />
                    </View>
                    <Text style={{ 
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: 14
                    }}>{t('reapprove')}</Text>
                  </TouchableOpacity>
                </>
              )}

            </View>
          </View>
        ))}

        {filteredShops.length === 0 && (
          <View style={{ 
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 48
          }}>
            <Ionicons name="folder-open-outline" size={56} color="#d1d5db" />
            <Text style={{ 
              color: '#9ca3af',
              fontSize: 16,
              fontWeight: '600',
              marginTop: 12
            }}>{t('noShops')}</Text>
          </View>
        )}

        <View style={{ height: 16 }} />
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
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          {/* Header */}
          <View style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            paddingTop: 48,
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Text style={{ 
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '700'
            }}>{documentModalTitle || t('verificationDocument')}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowDocumentModal(false);
                setSelectedDocument(null);
                setDocumentModalTitle('');
              }}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: 8,
                borderRadius: 12
              }}
            >
              <Ionicons name="close" size={22} color="white" />
            </TouchableOpacity>
          </View>

          {/* Image du document */}
          {selectedDocument ? (
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={{ 
                flexGrow: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 16
              }}
              maximumZoomScale={3}
              minimumZoomScale={1}
            >
              <Image
                source={{ uri: selectedDocument }}
                style={{ 
                  width: '100%',
                  aspectRatio: 0.7,
                  borderRadius: 8
                }}
                resizeMode="contain"
                onError={(error) => {
                  console.log('Erreur chargement image:', error);
                  Alert.alert(t('error'), 'Impossible de charger le document');
                }}
              />
            </ScrollView>
          ) : (
            <View style={{ 
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={{ 
                color: '#ffffff',
                marginTop: 16,
                fontSize: 14
              }}>Chargement...</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal de modification de date d'abonnement */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#3b82f6', padding: 16 }}>
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
                Modifier la date d'abonnement
              </Text>
              {selectedShopForDate && (
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                  {selectedShopForDate.shop_name}
                </Text>
              )}
            </View>

            <View style={{ padding: 16 }}>
              {/* Date actuelle */}
              {selectedShopForDate?.subscription_end_date && (
                <View style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 10, marginBottom: 16 }}>
                  <Text style={{ color: '#15803d', fontSize: 12, fontWeight: '600' }}>
                    Date actuelle: {new Date(selectedShopForDate.subscription_end_date).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              )}

              {/* Input de date */}
              <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                Nouvelle date de fin:
              </Text>
              <TextInput
                value={newEndDate}
                onChangeText={setNewEndDate}
                placeholder="AAAA-MM-JJ"
                style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 16,
                  fontWeight: '600',
                  marginBottom: 12
                }}
              />

              {/* Boutons rapides */}
              <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                Ajouter rapidement:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { label: '+7 jours', days: 7 },
                  { label: '+15 jours', days: 15 },
                  { label: '+30 jours', days: 30 },
                  { label: '+3 mois', days: 90 },
                  { label: '+6 mois', days: 180 },
                  { label: '+1 an', days: 365 }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.days}
                    onPress={() => addDaysToDate(item.days)}
                    style={{
                      backgroundColor: '#eff6ff',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8
                    }}
                  >
                    <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Aperçu */}
              {newEndDate && (
                <View style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 10, marginBottom: 16 }}>
                  <Text style={{ color: '#92400e', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                    Nouvelle fin: {new Date(newEndDate).toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                </View>
              )}

              {/* Boutons d'action */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDateModal(false);
                    setSelectedShopForDate(null);
                    setNewEndDate('');
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    padding: 14,
                    borderRadius: 10,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#6b7280', fontWeight: '700' }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleUpdateSubscriptionDate}
                  style={{
                    flex: 1,
                    backgroundColor: '#3b82f6',
                    padding: 14,
                    borderRadius: 10,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
