import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Shield, CheckCircle, Users, AlertCircle, Receipt } from 'lucide-react-native';
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

  const ActionCard = ({ icon: Icon, title, subtitle, color, badge, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-2xl p-6 mb-4 shadow-lg"
      style={{ backgroundColor: color }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="bg-white/20 p-4 rounded-full">
          <Icon size={32} color="white" strokeWidth={2.5} />
        </View>
        {badge > 0 && (
          <View className="bg-red-500 px-3 py-1 rounded-full">
            <Text className="text-white font-bold">{badge}</Text>
          </View>
        )}
      </View>
      <Text className="text-white text-xl font-bold mb-1">{title}</Text>
      <Text className="text-white/80 text-sm">{subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-8 px-6 border-b border-gray-200">
        <View className={`flex-row items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <View className={`bg-gray-100 p-3 rounded-full ${isRTL ? 'ml-3' : 'mr-3'}`}>
            <Shield size={28} color="#000" strokeWidth={2.5} />
          </View>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text className="text-gray-900 text-2xl font-bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t('administration')}</Text>
            <Text className="text-gray-500 text-sm" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t('controlPanel')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Actions rapides */}
        <Text className="text-xl font-bold text-gray-800 mb-4" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t('quickActions')}</Text>

        <ActionCard
          icon={CheckCircle}
          title={t('verifications')}
          subtitle={t('approveShops')}
          color="#f97316"
          badge={stats?.pending_verifications || 0}
          onPress={() => router.push('/admin/verifications')}
        />

        <ActionCard
          icon={Users}
          title={t('userManagement')}
          subtitle={t('manageAllUsers')}
          color="#10b981"
          badge={0}
          onPress={() => router.push('/admin/users')}
        />

        <ActionCard
          icon={Receipt}
          title="Paramètres de paiement"
          subtitle="Configuration Baridimob/CCP"
          color="#8b5cf6"
          badge={0}
          onPress={() => router.push('/admin/payment-settings')}
        />

        <View className="flex-row mb-4">
          <TouchableOpacity
            onPress={() => router.push('/admin/shops')}
            className="flex-1 bg-blue-500 rounded-2xl p-5 mr-2"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-white/20 p-3 rounded-full">
                <Ionicons name="storefront" size={24} color="white" />
              </View>
              <Text className="text-white text-3xl font-bold">{stats?.total_shops || 0}</Text>
            </View>
            <Text className="text-white text-base font-bold">{t('shops')}</Text>
            <Text className="text-white/80 text-xs mt-1">{t('viewAllShops')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/admin/videos')}
            className="flex-1 bg-purple-500 rounded-2xl p-5 ml-2"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-white/20 p-3 rounded-full">
                <Ionicons name="videocam" size={24} color="white" />
              </View>
              <Text className="text-white text-3xl font-bold">{stats?.total_videos || 0}</Text>
            </View>
            <Text className="text-white text-base font-bold">{t('videos')}</Text>
            <Text className="text-white/80 text-xs mt-1">{t('contentModeration')}</Text>
          </TouchableOpacity>
        </View>

        {/* Info système */}
        <View className="bg-blue-50 rounded-xl p-4 mb-6">
          <View className={`flex-row items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Shield size={20} color="#3b82f6" strokeWidth={2.5} />
            <View className={`flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`}>
              <Text className="text-blue-800 font-semibold mb-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {t('adminSystem')}
              </Text>
              <Text className="text-blue-600 text-sm" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {t('adminSystemDesc')}
              </Text>
            </View>
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
