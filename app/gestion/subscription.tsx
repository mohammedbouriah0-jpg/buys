import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';

export default function SubscriptionManagement() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      // Récupérer le statut d'abonnement
      const statusResponse = await fetch(`${API_URL}/subscription-invoices/subscription-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSubscriptionStatus(statusData);
      }

      // Récupérer les factures
      const invoicesResponse = await fetch(`${API_URL}/subscription-invoices/my-invoices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        setInvoices(invoicesData);
      }

      // Récupérer les paramètres de paiement
      const paymentResponse = await fetch(`${API_URL}/payment-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        setPaymentSettings(paymentData);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUploadInvoice = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const file = result.assets[0];

      Alert.prompt(
        'Montant de la facture',
        'Entrez le montant en euros:',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Soumettre',
            onPress: async (amount) => {
              if (!amount || isNaN(parseFloat(amount))) {
                Alert.alert('Erreur', 'Montant invalide');
                return;
              }

              setUploading(true);

              try {
                const token = await AsyncStorage.getItem('auth_token');
                const formData = new FormData();
                
                formData.append('invoice', {
                  uri: file.uri,
                  type: file.mimeType || 'application/pdf',
                  name: file.name
                } as any);
                
                formData.append('amount', amount);

                const response = await fetch(`${API_URL}/subscription-invoices/submit`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  },
                  body: formData
                });

                if (response.ok) {
                  Alert.alert('Succès', 'Facture soumise avec succès');
                  fetchData();
                } else {
                  const error = await response.json();
                  Alert.alert('Erreur', error.error || 'Impossible de soumettre la facture');
                }
              } catch (error) {
                console.error('Erreur upload:', error);
                Alert.alert('Erreur', 'Une erreur est survenue');
              } finally {
                setUploading(false);
              }
            }
          }
        ],
        'plain-text',
        '',
        'numeric'
      );
    } catch (error) {
      console.error('Erreur sélection document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
    }
  };

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

  const getDaysRemaining = () => {
    if (!subscriptionStatus?.subscription_end_date) return 0;
    const endDate = new Date(subscriptionStatus.subscription_end_date);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const daysRemaining = getDaysRemaining();
  const isActive = subscriptionStatus?.is_subscribed && daysRemaining > 0;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-gradient-to-r from-purple-600 to-pink-600 pt-12 pb-6 px-6">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-white/20 p-2 rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Abonnement</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statut abonnement */}
        <View className={`rounded-2xl p-6 mb-6 ${
          isActive ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'
        }`}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="bg-white/20 p-3 rounded-full mr-3">
                <Ionicons name="star" size={28} color="white" />
              </View>
              <View>
                <Text className="text-white text-xl font-bold">
                  {isActive ? 'Abonnement Actif' : 'Pas d\'abonnement'}
                </Text>
                {isActive && (
                  <Text className="text-white/80 text-sm">
                    {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {isActive && subscriptionStatus?.subscription_end_date && (
            <View className="bg-white/20 rounded-xl p-3">
              <Text className="text-white/80 text-xs mb-1">Expire le</Text>
              <Text className="text-white font-semibold">
                {formatDate(subscriptionStatus.subscription_end_date)}
              </Text>
            </View>
          )}
        </View>

        {/* Informations de paiement */}
        {paymentSettings && (
          <View className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="bg-green-500 p-2.5 rounded-xl mr-3">
                <Ionicons name="card" size={24} color="white" />
              </View>
              <Text className="text-green-900 font-bold text-lg">Informations de paiement</Text>
            </View>

            <View className="bg-white rounded-xl p-4 mb-3">
              <Text className="text-gray-500 text-xs mb-1">Numéro CCP</Text>
              <Text className="text-gray-900 font-bold text-lg mb-3">{paymentSettings.ccp_number}</Text>
              
              <Text className="text-gray-500 text-xs mb-1">Clé</Text>
              <Text className="text-gray-900 font-bold text-lg mb-3">{paymentSettings.ccp_key}</Text>
              
              <Text className="text-gray-500 text-xs mb-1">Nom du titulaire</Text>
              <Text className="text-gray-900 font-bold mb-3">{paymentSettings.account_holder_name}</Text>
              
              <View className="bg-green-50 rounded-lg p-3">
                <Text className="text-gray-500 text-xs mb-1">Montant à payer</Text>
                <Text className="text-green-700 font-bold text-2xl">{paymentSettings.subscription_amount} DA</Text>
              </View>
            </View>

            {paymentSettings.additional_info && (
              <View className="bg-green-100 rounded-xl p-3">
                <Text className="text-green-800 text-sm">{paymentSettings.additional_info}</Text>
              </View>
            )}
          </View>
        )}

        {/* Bouton soumettre facture */}
        <TouchableOpacity
          onPress={handleUploadInvoice}
          disabled={uploading}
          className="bg-blue-500 rounded-2xl p-5 mb-6 flex-row items-center justify-center"
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="white" />
              <Text className="text-white font-bold text-lg ml-3">
                Soumettre la capture d'écran
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View className="bg-blue-50 rounded-xl p-4 mb-6 flex-row">
          <Ionicons name="information-circle" size={24} color="#3b82f6" />
          <Text className="text-blue-700 ml-3 flex-1 text-sm">
            Effectuez le paiement via Baridimob puis soumettez la capture d'écran. Une fois approuvée par l'admin, vous recevrez 1 mois d'abonnement.
          </Text>
        </View>

        {/* Historique des factures */}
        <Text className="text-xl font-bold text-gray-800 mb-4">Mes factures</Text>

        {invoices.map((invoice) => (
          <View key={invoice.id} className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: `${getStatusColor(invoice.status)}20` }}
              >
                <Text style={{ color: getStatusColor(invoice.status) }} className="font-semibold text-xs">
                  {getStatusText(invoice.status)}
                </Text>
              </View>
              <Text className="text-gray-800 font-bold text-lg">{invoice.amount} €</Text>
            </View>

            <View className="flex-row items-center mb-2">
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text className="text-gray-600 text-sm ml-2">
                Soumise le {formatDate(invoice.submitted_at)}
              </Text>
            </View>

            {invoice.status === 'approved' && invoice.reviewed_by_name && (
              <View className="bg-green-50 rounded-lg p-3 mt-3">
                <Text className="text-green-700 font-semibold mb-1">
                  ✓ Approuvée par {invoice.reviewed_by_name}
                </Text>
                {invoice.subscription_start_date && invoice.subscription_end_date && (
                  <Text className="text-green-600 text-xs">
                    Abonnement: {formatDate(invoice.subscription_start_date)} → {formatDate(invoice.subscription_end_date)}
                  </Text>
                )}
              </View>
            )}

            {invoice.status === 'rejected' && invoice.rejection_reason && (
              <View className="bg-red-50 rounded-lg p-3 mt-3">
                <Text className="text-red-700 font-semibold mb-1">✗ Rejetée</Text>
                <Text className="text-red-600 text-sm">{invoice.rejection_reason}</Text>
              </View>
            )}

            {invoice.status === 'pending' && (
              <View className="bg-orange-50 rounded-lg p-3 mt-3 flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#f59e0b" />
                <Text className="text-orange-600 text-sm ml-2">En attente de validation</Text>
              </View>
            )}
          </View>
        ))}

        {invoices.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-400 text-lg mt-4">Aucune facture soumise</Text>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
