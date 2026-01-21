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
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header moderne */}
      <View style={{
        backgroundColor: '#1e293b',
        paddingTop: 48,
        paddingBottom: 16,
        paddingHorizontal: 14,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6
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
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: 8,
              borderRadius: 12
            }}
          >
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
            <Text style={{ 
              color: '#ffffff',
              fontSize: 20,
              fontWeight: '900',
              letterSpacing: 0.5
            }}>{t('userManagement')}</Text>
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 12,
              fontWeight: '600'
            }}>{filteredUsers.length} {t('users')}</Text>
          </View>
        </View>

        {/* Barre de recherche */}
        <View style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 12
        }}>
          <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.7)" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('searchUsers')}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            style={{ 
              flex: 1,
              marginLeft: 10,
              color: '#ffffff',
              fontSize: 14,
              fontWeight: '600'
            }}
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
              style={{
                marginRight: 8,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: filter === item.key ? '#3b82f6' : 'rgba(255, 255, 255, 0.15)'
              }}
            >
              <Text style={{ 
                color: filter === item.key ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: '800',
                fontSize: 12
              }}>
                {item.label} ({item.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingTop: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredUsers.map((user) => (
          <View key={user.id} style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: 12,
            marginBottom: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2
          }}>
            {/* En-tête */}
            <View style={{ 
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10
            }}>
              <View style={{ flex: 1 }}>
                <View style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  marginBottom: 4
                }}>
                  <Text style={{ 
                    fontSize: 15,
                    fontWeight: '800',
                    color: '#111827'
                  }}>{user.name}</Text>
                  {user.is_verified ? (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={18} 
                      color="#10b981" 
                      style={{ marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }} 
                    />
                  ) : null}
                </View>
                <Text style={{ 
                  color: '#6b7280',
                  fontSize: 11,
                  fontWeight: '600'
                }}>{user.email}</Text>
              </View>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: `${getUserTypeColor(user.type)}15`
              }}>
                <Text style={{ 
                  color: getUserTypeColor(user.type),
                  fontWeight: '800',
                  fontSize: 10
                }}>
                  {getUserTypeLabel(user.type)}
                </Text>
              </View>
            </View>

            {/* Informations boutique */}
            {user.type === 'shop' && user.shop_name ? (
              <View style={{
                backgroundColor: '#eff6ff',
                borderRadius: 10,
                padding: 10,
                marginBottom: 8
              }}>
                <View style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center'
                }}>
                  <Ionicons name="storefront" size={16} color="#3b82f6" />
                  <Text style={{ 
                    color: '#1e40af',
                    fontWeight: '800',
                    fontSize: 12,
                    marginLeft: isRTL ? 0 : 8,
                    marginRight: isRTL ? 8 : 0
                  }}>{user.shop_name}</Text>
                </View>
              </View>
            ) : null}

            {/* Statut abonnement */}
            {user.type === 'shop' && user.is_subscribed && user.subscription_end_date ? (
              <View style={{
                backgroundColor: '#f0fdf4',
                borderRadius: 10,
                padding: 10,
                marginBottom: 8
              }}>
                <View style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center'
                }}>
                  <Ionicons name="star" size={16} color="#10b981" />
                  <View style={{ 
                    flex: 1,
                    marginLeft: isRTL ? 0 : 8,
                    marginRight: isRTL ? 8 : 0
                  }}>
                    <Text style={{ 
                      color: '#15803d',
                      fontWeight: '800',
                      fontSize: 12
                    }}>{t('activeSubscription')}</Text>
                    <Text style={{ 
                      color: '#16a34a',
                      fontSize: 10,
                      fontWeight: '600'
                    }}>
                      {t('expiresOn')} {formatDate(user.subscription_end_date)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Statistiques */}
            <View style={{ 
              flexDirection: isRTL ? 'row-reverse' : 'row',
              marginBottom: 10,
              gap: 8
            }}>
              <View style={{
                flex: 1,
                backgroundColor: '#f9fafb',
                borderRadius: 10,
                padding: 10
              }}>
                <Text style={{ 
                  color: '#6b7280',
                  fontSize: 10,
                  fontWeight: '600',
                  marginBottom: 3
                }}>{t('memberSince')}</Text>
                <Text style={{ 
                  color: '#111827',
                  fontSize: 11,
                  fontWeight: '800'
                }}>{formatDate(user.created_at)}</Text>
              </View>
              {user.type === 'shop' ? (
                <View style={{
                  flex: 1,
                  backgroundColor: '#faf5ff',
                  borderRadius: 10,
                  padding: 10
                }}>
                  <Text style={{ 
                    color: '#9333ea',
                    fontSize: 10,
                    fontWeight: '600',
                    marginBottom: 3
                  }}>{t('products')}</Text>
                  <Text style={{ 
                    color: '#7c3aed',
                    fontSize: 18,
                    fontWeight: '900'
                  }}>{user.product_count || 0}</Text>
                </View>
              ) : null}
              {user.type === 'customer' ? (
                <View style={{
                  flex: 1,
                  backgroundColor: '#fdf2f8',
                  borderRadius: 10,
                  padding: 10
                }}>
                  <Text style={{ 
                    color: '#ec4899',
                    fontSize: 10,
                    fontWeight: '600',
                    marginBottom: 3
                  }}>{t('orders')}</Text>
                  <Text style={{ 
                    color: '#db2777',
                    fontSize: 18,
                    fontWeight: '900'
                  }}>{user.order_count || 0}</Text>
                </View>
              ) : null}
            </View>

            {/* Actions */}
            {user.type !== 'admin' ? (
              <TouchableOpacity
                onPress={() => handleDeleteUser(user.id, user.name)}
                style={{
                  backgroundColor: '#ef4444',
                  borderRadius: 10,
                  paddingVertical: 10,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#ef4444',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                <Ionicons name="trash" size={16} color="white" />
                <Text style={{ 
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: 13,
                  marginLeft: isRTL ? 0 : 6,
                  marginRight: isRTL ? 6 : 0
                }}>{t('deleteUser')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}

        {filteredUsers.length === 0 ? (
          <View style={{ 
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 48
          }}>
            <Ionicons name="people-outline" size={56} color="#d1d5db" />
            <Text style={{ 
              color: '#9ca3af',
              fontSize: 16,
              fontWeight: '600',
              marginTop: 12
            }}>{t('noUsers')}</Text>
          </View>
        ) : null}

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}
