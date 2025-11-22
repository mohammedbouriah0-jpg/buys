import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const fetchInvoices = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/invoices`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error('Erreur chargement factures:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const handleApprove = async (invoiceId: number) => {
    Alert.alert(
      'Confirmer l\'approbation',
      'Cette action donnera 1 mois d\'abonnement à la boutique. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Approuver',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_URL}/admin/invoices/${invoiceId}/approve`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                const data = await response.json();
                Alert.alert('Succès', 'Facture approuvée et abonnement activé pour 1 mois');
                fetchInvoices();
              } else {
                Alert.alert('Erreur', 'Impossible d\'approuver la facture');
              }
            } catch (error) {
              console.error('Erreur approbation:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer une raison');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/admin/invoices/${selectedInvoice.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });

      if (response.ok) {
        Alert.alert('Succès', 'Facture rejetée');
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedInvoice(null);
        fetchInvoices();
      } else {
        Alert.alert('Erreur', 'Impossible de rejeter la facture');
      }
    } catch (error) {
      console.error('Erreur rejet:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true;
    return invoice.status === filter;
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
      case 'pending': return 'En attente';
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Rejetée';
      default: return status;
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
      <View className="bg-gradient-to-r from-green-500 to-emerald-500 pt-12 pb-6 px-6">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-white/20 p-2 rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Factures d'abonnement</Text>
          <View className="w-10" />
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'Toutes', count: invoices.length },
            { key: 'pending', label: 'En attente', count: invoices.filter(i => i.status === 'pending').length },
            { key: 'approved', label: 'Approuvées', count: invoices.filter(i => i.status === 'approved').length },
            { key: 'rejected', label: 'Rejetées', count: invoices.filter(i => i.status === 'rejected').length }
          ].map((item: any) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              className={`mr-3 px-4 py-2 rounded-full ${
                filter === item.key ? 'bg-white' : 'bg-white/20'
              }`}
            >
              <Text className={filter === item.key ? 'text-green-600 font-semibold' : 'text-white'}>
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
        {filteredInvoices.map((invoice) => (
          <View key={invoice.id} className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            {/* En-tête */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">{invoice.shop_name}</Text>
                <Text className="text-gray-500 text-sm">{invoice.email}</Text>
              </View>
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: `${getStatusColor(invoice.status)}20` }}
              >
                <Text style={{ color: getStatusColor(invoice.status) }} className="font-semibold text-xs">
                  {getStatusText(invoice.status)}
                </Text>
              </View>
            </View>

            {/* Montant et date */}
            <View className="flex-row mb-4">
              <View className="flex-1 bg-green-50 rounded-lg p-3 mr-2">
                <Text className="text-green-600 text-xs mb-1">Montant</Text>
                <Text className="text-green-700 font-bold text-xl">{invoice.amount} €</Text>
              </View>
              <View className="flex-1 bg-gray-50 rounded-lg p-3 ml-2">
                <Text className="text-gray-500 text-xs mb-1">Soumise le</Text>
                <Text className="text-gray-800 font-semibold">{formatDate(invoice.submitted_at)}</Text>
              </View>
            </View>

            {/* Statut abonnement actuel */}
            {invoice.is_subscribed && invoice.subscription_end_date && (
              <View className="bg-blue-50 rounded-lg p-3 mb-4 flex-row items-center">
                <Ionicons name="star" size={20} color="#3b82f6" />
                <View className="ml-3 flex-1">
                  <Text className="text-blue-600 font-semibold">Abonnement actif</Text>
                  <Text className="text-blue-500 text-xs">
                    Expire le {formatDate(invoice.subscription_end_date)}
                  </Text>
                </View>
              </View>
            )}

            {/* Document */}
            {invoice.invoice_document && (
              <TouchableOpacity className="bg-purple-50 rounded-lg p-3 mb-4 flex-row items-center">
                <Ionicons name="document-text" size={24} color="#8b5cf6" />
                <Text className="text-purple-600 ml-2 flex-1">Voir la facture</Text>
                <Ionicons name="chevron-forward" size={20} color="#8b5cf6" />
              </TouchableOpacity>
            )}

            {/* Info approbation/rejet */}
            {invoice.status !== 'pending' && (
              <View className={`rounded-lg p-3 mb-4 ${
                invoice.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <View className="flex-row items-center mb-2">
                  <Ionicons
                    name={invoice.status === 'approved' ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={invoice.status === 'approved' ? '#10b981' : '#ef4444'}
                  />
                  <Text className={`ml-2 font-semibold ${
                    invoice.status === 'approved' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {invoice.status === 'approved' ? 'Approuvée' : 'Rejetée'} par {invoice.reviewed_by_name}
                  </Text>
                </View>
                <Text className={`text-xs ${
                  invoice.status === 'approved' ? 'text-green-600' : 'text-red-600'
                }`}>
                  Le {formatDate(invoice.reviewed_at)}
                </Text>
                {invoice.rejection_reason && (
                  <Text className="text-red-700 mt-2">{invoice.rejection_reason}</Text>
                )}
                {invoice.subscription_start_date && invoice.subscription_end_date && (
                  <View className="mt-2 pt-2 border-t border-green-200">
                    <Text className="text-green-700 text-xs">
                      Abonnement: {formatDate(invoice.subscription_start_date)} → {formatDate(invoice.subscription_end_date)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Actions */}
            {invoice.status === 'pending' && (
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => handleApprove(invoice.id)}
                  className="flex-1 bg-green-500 rounded-xl py-3 mr-2 flex-row items-center justify-center"
                >
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">Approuver (1 mois)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedInvoice(invoice);
                    setShowRejectModal(true);
                  }}
                  className="bg-red-500 rounded-xl py-3 px-4 flex-row items-center justify-center"
                >
                  <Ionicons name="close-circle" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {filteredInvoices.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-400 text-lg mt-4">Aucune facture</Text>
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
            <Text className="text-xl font-bold text-gray-800 mb-4">Rejeter la facture</Text>
            
            <Text className="text-gray-600 mb-3">Raison du rejet:</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Expliquez pourquoi vous rejetez cette facture..."
              multiline
              numberOfLines={4}
              className="bg-gray-50 rounded-xl p-4 mb-4"
              style={{ textAlignVertical: 'top' }}
            />

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedInvoice(null);
                }}
                className="flex-1 bg-gray-200 rounded-xl py-3 mr-2"
              >
                <Text className="text-gray-700 font-semibold text-center">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                className="flex-1 bg-red-500 rounded-xl py-3 ml-2"
              >
                <Text className="text-white font-semibold text-center">Rejeter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
