import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Shield, CheckCircle, Users, AlertCircle, Receipt, Bell, Headphones, Ticket } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { API_URL } from '@/config';

export default function AdminPage() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.type === 'admin') {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (user?.type !== 'admin') {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <View className="bg-red-50 p-6 rounded-2xl items-center">
          <AlertCircle size={48} color="#ef4444" />
          <Text className="text-red-800 text-lg font-bold mt-4" style={{ textAlign: isRTL ? 'right' : 'center' }}>{t('accessDenied')}</Text>
          <Text className="text-red-600 text-center mt-2" style={{ textAlign: isRTL ? 'right' : 'center' }}>
            {t('adminOnly')}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }



  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header moderne */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: 48,
        paddingBottom: 18,
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
          marginBottom: 6
        }}>
          <View style={{
            backgroundColor: '#f3f4f6',
            padding: 8,
            borderRadius: 12,
            marginRight: isRTL ? 0 : 10,
            marginLeft: isRTL ? 10 : 0
          }}>
            <Shield size={22} color="#111827" strokeWidth={2.5} />
          </View>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={{ 
              color: '#111827',
              fontSize: 22,
              fontWeight: '900',
              letterSpacing: 0.5,
              textAlign: isRTL ? 'right' : 'left'
            }}>{t('administration')}</Text>
            <Text style={{ 
              color: '#6b7280',
              fontSize: 12,
              fontWeight: '600',
              textAlign: isRTL ? 'right' : 'left'
            }}>{t('controlPanel')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#f8fafc' }}
        contentContainerStyle={{ padding: 12, paddingTop: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Actions rapides - Cards modernes */}
        <Text style={{ 
          fontSize: 16,
          fontWeight: '800',
          color: '#111827',
          marginBottom: 12,
          textAlign: isRTL ? 'right' : 'left'
        }}>{t('quickActions')}</Text>

        {/* Vérifications */}
        <TouchableOpacity
          onPress={() => router.push('/admin/verifications')}
          style={{
            backgroundColor: '#f97316',
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            shadowColor: '#f97316',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6
          }}
        >
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              padding: 10,
              borderRadius: 12
            }}>
              <CheckCircle size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
            {(stats?.pending_verifications || 0) > 0 && (
              <View style={{
                backgroundColor: '#dc2626',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 10,
                minWidth: 28,
                alignItems: 'center'
              }}>
                <Text style={{ 
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: '800'
                }}>{stats?.pending_verifications}</Text>
              </View>
            )}
          </View>
          <Text style={{ 
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 3
          }}>{t('verifications')}</Text>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 12,
            fontWeight: '600'
          }}>{t('approveShops')}</Text>
        </TouchableOpacity>

        {/* Gestion des comptes */}
        <TouchableOpacity
          onPress={() => router.push('/admin/users')}
          style={{
            backgroundColor: '#10b981',
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6
          }}
        >
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              padding: 10,
              borderRadius: 12
            }}>
              <Users size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
          </View>
          <Text style={{ 
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 3
          }}>{t('userManagement')}</Text>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 12,
            fontWeight: '600'
          }}>{t('manageAllUsers')}</Text>
        </TouchableOpacity>

        {/* Paramètres de paiement */}
        <TouchableOpacity
          onPress={() => router.push('/admin/payment-settings')}
          style={{
            backgroundColor: '#8b5cf6',
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            shadowColor: '#8b5cf6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6
          }}
        >
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              padding: 10,
              borderRadius: 12
            }}>
              <Receipt size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
          </View>
          <Text style={{ 
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 3
          }}>Paramètres de paiement</Text>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 12,
            fontWeight: '600'
          }}>Configuration Baridimob/CCP</Text>
        </TouchableOpacity>

        {/* Codes Promo & Influenceurs */}
        <TouchableOpacity
          onPress={() => router.push('/admin/promo-codes')}
          style={{
            backgroundColor: '#a855f7',
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            shadowColor: '#a855f7',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6
          }}
        >
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              padding: 10,
              borderRadius: 12
            }}>
              <Ticket size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
          </View>
          <Text style={{ 
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 3
          }}>Codes Promo</Text>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 12,
            fontWeight: '600'
          }}>Gérer les codes & influenceurs</Text>
        </TouchableOpacity>

        {/* Gestion des catégories */}
        <TouchableOpacity
          onPress={() => router.push('/admin/categories')}
          style={{
            backgroundColor: '#06b6d4',
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
            shadowColor: '#06b6d4',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6
          }}
        >
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              padding: 10,
              borderRadius: 12
            }}>
              <Ionicons name="grid" size={24} color="white" />
            </View>
          </View>
          <Text style={{ 
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 3
          }}>{t('categories')}</Text>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 12,
            fontWeight: '600'
          }}>{t('manageCategories')}</Text>
        </TouchableOpacity>

        {/* Notifications push */}
        <TouchableOpacity
          onPress={() => router.push('/admin/notifications')}
          style={{
            backgroundColor: '#ec4899',
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            shadowColor: '#ec4899',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6
          }}
        >
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              padding: 10,
              borderRadius: 12
            }}>
              <Bell size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
          </View>
          <Text style={{ 
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 3
          }}>Notifications</Text>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 12,
            fontWeight: '600'
          }}>Envoyer une notification à tous</Text>
        </TouchableOpacity>

        {/* Configuration Support */}
        <TouchableOpacity
          onPress={() => router.push('/admin/support')}
          style={{
            backgroundColor: '#14b8a6',
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            shadowColor: '#14b8a6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6
          }}
        >
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              padding: 10,
              borderRadius: 12
            }}>
              <Headphones size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
          </View>
          <Text style={{ 
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 3
          }}>Configuration Support</Text>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 12,
            fontWeight: '600'
          }}>Gérer les infos de contact</Text>
        </TouchableOpacity>

        {/* Stats - Vidéos uniquement */}
        <TouchableOpacity
          onPress={() => router.push('/admin/videos')}
          style={{
            backgroundColor: '#a855f7',
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
            shadowColor: '#a855f7',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 6,
            elevation: 5
          }}
        >
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              padding: 10,
              borderRadius: 12
            }}>
              <Ionicons name="videocam" size={24} color="white" />
            </View>
            <Text style={{ 
              color: '#ffffff',
              fontSize: 28,
              fontWeight: '900'
            }}>{stats?.total_videos || 0}</Text>
          </View>
          <Text style={{ 
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 3
          }}>{t('videos')}</Text>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 12,
            fontWeight: '600'
          }}>{t('contentModeration')}</Text>
        </TouchableOpacity>

        {/* Info système */}
        <View style={{
          backgroundColor: '#eff6ff',
          borderRadius: 12,
          padding: 12,
          borderLeftWidth: 3,
          borderLeftColor: '#3b82f6'
        }}>
          <View style={{ 
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'flex-start'
          }}>
            <View style={{
              backgroundColor: '#dbeafe',
              padding: 6,
              borderRadius: 8,
              marginRight: isRTL ? 0 : 10,
              marginLeft: isRTL ? 10 : 0
            }}>
              <Shield size={18} color="#3b82f6" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                color: '#1e40af',
                fontSize: 13,
                fontWeight: '800',
                marginBottom: 3,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {t('adminSystem')}
              </Text>
              <Text style={{ 
                color: '#3b82f6',
                fontSize: 11,
                lineHeight: 16,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {t('adminSystemDesc')}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}
