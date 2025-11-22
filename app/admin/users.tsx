import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';
import { useLanguage } from '@/lib/i18n/language-context';

export default function AdminUsers() {
  const { t, isRTL } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'customer' | 'shop' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    Alert.alert(
      t('deleteUser'),
      t('deleteUserConfirm').replace('{userName}', userName),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                Alert.alert(t('success'), t('userDeleted'));
                fetchUsers();
              } else {
                Alert.alert(t('error'), t('cannotDeleteUser'));
              }
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert(t('error'), t('errorOccurred'));
            }
          }
        }
      ]
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.type === filter;
    const matchesSearch = searchQuery === '' || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'admin': return '#ef4444';
      case 'shop': return '#3b82f6';
      case 'customer': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'admin': return t('admin');
      case 'shop': return t('shop');
      case 'customer': return t('customer');
      default: return type;
    }
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
      <View className="bg-white pt-12 pb-6 px-6 border-b border-gray-200">
        <View className={`flex-row items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-gray-100 p-2 rounded-full"
          >
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#000" />
          </TouchableOpacity>
          <View className={`flex-1 ${isRTL ? 'mr-4' : 'ml-4'}`}>
            <Text className="text-black text-xl font-bold">{t('userManagement')}</Text>
            <Text className="text-gray-600 text-sm">{filteredUsers.length} {t('users')}</Text>
          </View>
        </View>

        {/* Barre de recherche */}
        <View className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center mb-4">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('searchUsers')}
            className="flex-1 ml-2 text-gray-800"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: t('all'), count: users.length },
            { key: 'customer', label: t('customers'), count: users.filter(u => u.type === 'customer').length },
            { key: 'shop', label: t('shops'), count: users.filter(u => u.type === 'shop').length },
            { key: 'admin', label: t('admins'), count: users.filter(u => u.type === 'admin').length }
          ].map((item: any) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              className={`mr-3 px-4 py-2 rounded-full ${
                filter === item.key ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            >
              <Text className={filter === item.key ? 'text-white font-semibold' : 'text-gray-700'}>
                {item.label} ({item.count})
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
        {filteredUsers.map((user) => (
          <View key={user.id} className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            {/* En-tête */}
            <View className={`flex-row items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <View className="flex-1">
                <View className={`flex-row items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Text className="text-lg font-bold text-gray-800">{user.name}</Text>
                  {user.is_verified && (
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }} />
                  )}
                </View>
                <Text className="text-gray-500 text-sm">{user.email}</Text>
              </View>
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: `${getUserTypeColor(user.type)}20` }}
              >
                <Text style={{ color: getUserTypeColor(user.type) }} className="font-semibold text-xs">
                  {getUserTypeLabel(user.type)}
                </Text>
              </View>
            </View>

            {/* Informations boutique */}
            {user.type === 'shop' && user.shop_name && (
              <View className="bg-blue-50 rounded-lg p-3 mb-3">
                <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Ionicons name="storefront" size={20} color="#3b82f6" />
                  <Text className={`text-blue-700 font-semibold ${isRTL ? 'mr-2' : 'ml-2'}`}>{user.shop_name}</Text>
                </View>
              </View>
            )}

            {/* Statut abonnement */}
            {user.type === 'shop' && user.is_subscribed && user.subscription_end_date && (
              <View className="bg-green-50 rounded-lg p-3 mb-3">
                <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Ionicons name="star" size={20} color="#10b981" />
                  <View className={`flex-1 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                    <Text className="text-green-700 font-semibold">{t('activeSubscription')}</Text>
                    <Text className="text-green-600 text-xs">
                      {t('expiresOn')} {formatDate(user.subscription_end_date)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Statistiques */}
            <View className={`flex-row mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <View className={`flex-1 bg-gray-50 rounded-lg p-3 ${isRTL ? 'ml-2' : 'mr-2'}`}>
                <Text className="text-gray-500 text-xs mb-1">{t('memberSince')}</Text>
                <Text className="text-gray-800 font-semibold">{formatDate(user.created_at)}</Text>
              </View>
              {user.type === 'shop' && (
                <View className={`flex-1 bg-purple-50 rounded-lg p-3 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                  <Text className="text-purple-600 text-xs mb-1">{t('products')}</Text>
                  <Text className="text-purple-700 font-bold text-xl">{user.product_count || 0}</Text>
                </View>
              )}
              {user.type === 'customer' && (
                <View className={`flex-1 bg-pink-50 rounded-lg p-3 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                  <Text className="text-pink-600 text-xs mb-1">{t('orders')}</Text>
                  <Text className="text-pink-700 font-bold text-xl">{user.order_count || 0}</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            {user.type !== 'admin' && (
              <TouchableOpacity
                onPress={() => handleDeleteUser(user.id, user.name)}
                className={`bg-red-500 rounded-xl py-3 flex-row items-center justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Ionicons name="trash" size={20} color="white" />
                <Text className={`text-white font-semibold ${isRTL ? 'mr-2' : 'ml-2'}`}>{t('deleteUser')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {filteredUsers.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-400 text-lg mt-4">{t('noUsers')}</Text>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
