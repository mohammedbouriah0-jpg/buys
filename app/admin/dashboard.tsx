import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const StatCard = ({ icon, title, value, color, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-5 mb-4 shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-gray-500 text-sm mb-1">{title}</Text>
          <Text className="text-3xl font-bold" style={{ color }}>{value}</Text>
        </View>
        <View className="bg-gray-50 p-4 rounded-full">
          <Ionicons name={icon} size={28} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-gradient-to-r from-blue-600 to-purple-600 pt-12 pb-6 px-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">Administration</Text>
            <Text className="text-blue-100 text-sm mt-1">Tableau de bord</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-white/20 p-3 rounded-full"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Actions rapides */}
        <View className="flex-row mb-3">
          <TouchableOpacity
            onPress={() => router.push('/admin/verifications')}
            className="flex-1 bg-orange-500 rounded-xl p-4 mr-2"
          >
            <View className="items-center">
              <View className="bg-white/20 p-3 rounded-full mb-2">
                <Ionicons name="shield-checkmark" size={24} color="white" />
              </View>
              <Text className="text-white font-semibold text-sm">Vérifications</Text>
              {stats?.pending_verifications > 0 && (
                <View className="bg-red-500 px-2 py-1 rounded-full mt-1">
                  <Text className="text-white text-xs font-bold">
                    {stats.pending_verifications}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/admin/invoices')}
            className="flex-1 bg-green-500 rounded-xl p-4 ml-2"
          >
            <View className="items-center">
              <View className="bg-white/20 p-3 rounded-full mb-2">
                <Ionicons name="receipt" size={24} color="white" />
              </View>
              <Text className="text-white font-semibold text-sm">Factures</Text>
              {stats?.pending_invoices > 0 && (
                <View className="bg-red-500 px-2 py-1 rounded-full mt-1">
                  <Text className="text-white text-xs font-bold">
                    {stats.pending_invoices}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View className="flex-row mb-6">
          <TouchableOpacity
            onPress={() => router.push('/admin/users')}
            className="flex-1 bg-green-600 rounded-xl p-4 mr-2"
          >
            <View className="items-center">
              <View className="bg-white/20 p-3 rounded-full mb-2">
                <Ionicons name="people" size={24} color="white" />
              </View>
              <Text className="text-white font-semibold text-sm">Gestion des comptes</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/admin/categories')}
            className="flex-1 bg-purple-500 rounded-xl p-4 ml-2"
          >
            <View className="items-center">
              <View className="bg-white/20 p-3 rounded-full mb-2">
                <Ionicons name="grid" size={24} color="white" />
              </View>
              <Text className="text-white font-semibold text-sm">Catégories</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="flex-row mb-6">
          <TouchableOpacity
            onPress={() => router.push('/admin/support')}
            className="flex-1 bg-teal-500 rounded-xl p-4 mr-2"
          >
            <View className="items-center">
              <View className="bg-white/20 p-3 rounded-full mb-2">
                <Ionicons name="headset" size={24} color="white" />
              </View>
              <Text className="text-white font-semibold text-sm">Config Support</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/admin/payment-settings')}
            className="flex-1 bg-indigo-500 rounded-xl p-4 ml-2"
          >
            <View className="items-center">
              <View className="bg-white/20 p-3 rounded-full mb-2">
                <Ionicons name="card" size={24} color="white" />
              </View>
              <Text className="text-white font-semibold text-sm">Paiements</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Statistiques */}
        <Text className="text-xl font-bold text-gray-800 mb-4">Statistiques</Text>

        <StatCard
          icon="storefront"
          title="Total Boutiques"
          value={stats?.total_shops || 0}
          color="#3b82f6"
        />

        <StatCard
          icon="shield-checkmark"
          title="Boutiques Vérifiées"
          value={stats?.verified_shops || 0}
          color="#10b981"
        />

        <StatCard
          icon="star"
          title="Abonnements Actifs"
          value={stats?.subscribed_shops || 0}
          color="#f59e0b"
        />

        <StatCard
          icon="people"
          title="Total Clients"
          value={stats?.total_customers || 0}
          color="#8b5cf6"
        />

        <StatCard
          icon="cart"
          title="Total Commandes"
          value={stats?.total_orders || 0}
          color="#ec4899"
        />

        <StatCard
          icon="cash"
          title="Revenu Total"
          value={`${Number(stats?.total_revenue || 0).toFixed(2)} €`}
          color="#14b8a6"
        />

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
