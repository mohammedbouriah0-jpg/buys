import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';

export default function AdminShops() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleCancelSubscription = async (userId: number, shopName: string) => {
    Alert.alert(
      'Annuler l\'abonnement',
      `Êtes-vous sûr de vouloir annuler l'abonnement de ${shopName} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_URL}/admin/shops/${userId}/cancel-subscription`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                Alert.alert('Succès', 'Abonnement annulé');
                fetchShops();
              } else {
                Alert.alert('Erreur', 'Impossible d\'annuler l\'abonnement');
              }
            } catch (error) {
              console.error('Erreur annulation:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  const fetchShops = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/shops`, {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
      <View className="bg-gradient-to-r from-blue-600 to-cyan-600 pt-12 pb-6 px-6">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-white/20 p-2 rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1 ml-4">
            <Text className="text-white text-xl font-bold">Toutes les Boutiques</Text>
            <Text className="text-blue-100 text-sm">{shops.length} boutique{shops.length > 1 ? 's' : ''}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {shops.map((shop) => (
          <TouchableOpacity
            key={shop.id}
            onPress={() => router.push(`/shop/${shop.id}`)}
            className="bg-white rounded-xl p-4 mb-3"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
          >
            {/* En-tête */}
            <View className="flex-row items-center mb-3">
              {shop.logo_url ? (
                <Image
                  source={{ uri: `${API_URL.replace('/api', '')}${shop.logo_url}` }}
                  style={{ width: 50, height: 50, borderRadius: 25 }}
                />
              ) : (
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center">
                  <Ionicons name="storefront" size={24} color="#3b82f6" />
                </View>
              )}
              <View className="flex-1 ml-3">
                <View className="flex-row items-center">
                  <Text className="text-base font-bold text-gray-800">{shop.shop_name}</Text>
                  {shop.is_verified && (
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text className="text-gray-500 text-xs mt-1">{shop.owner_email}</Text>
              </View>
            </View>

            {/* Statistiques */}
            <View className="flex-row">
              <View className="flex-1 items-center py-2">
                <Text className="text-gray-800 font-bold text-lg">{shop.product_count || 0}</Text>
                <Text className="text-gray-500 text-xs">Produits</Text>
              </View>
              <View className="w-px bg-gray-200" />
              <View className="flex-1 items-center py-2">
                <Text className="text-gray-800 font-bold text-lg">{shop.video_count || 0}</Text>
                <Text className="text-gray-500 text-xs">Vidéos</Text>
              </View>
              <View className="w-px bg-gray-200" />
              <View className="flex-1 items-center py-2">
                <Text className="text-gray-800 font-bold text-lg">{shop.order_count || 0}</Text>
                <Text className="text-gray-500 text-xs">Commandes</Text>
              </View>
            </View>

            {/* Badges et Actions */}
            <View className="mt-3 pt-3 border-t border-gray-100">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View
                    className="px-2 py-1 rounded-md mr-2"
                    style={{ 
                      backgroundColor: shop.is_verified ? '#dcfce7' : '#fee2e2'
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: shop.is_verified ? '#16a34a' : '#dc2626' }}
                    >
                      {shop.is_verified ? '✓ Vérifiée' : '✗ Non vérifiée'}
                    </Text>
                  </View>
                  
                  {shop.is_subscribed && (
                    <View className="bg-yellow-100 px-2 py-1 rounded-md flex-row items-center">
                      <Ionicons name="star" size={12} color="#eab308" />
                      <Text className="text-yellow-700 text-xs font-semibold ml-1">Premium</Text>
                    </View>
                  )}
                </View>

                {shop.is_subscribed && (
                  <TouchableOpacity
                    onPress={() => handleCancelSubscription(shop.id, shop.shop_name)}
                    className="bg-red-100 px-3 py-1 rounded-md"
                  >
                    <Text className="text-red-600 text-xs font-semibold">Annuler</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {shops.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="storefront-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-400 text-lg mt-4">Aucune boutique</Text>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
