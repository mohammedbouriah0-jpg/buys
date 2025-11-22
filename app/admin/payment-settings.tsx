import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';
import { useLanguage } from '@/lib/i18n/language-context';

export default function PaymentSettings() {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    ccp_number: '',
    ccp_key: '',
    account_holder_name: '',
    subscription_amount: '5000',
    additional_info: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/payment-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({
          ccp_number: data.ccp_number || '',
          ccp_key: data.ccp_key || '',
          account_holder_name: data.account_holder_name || '',
          subscription_amount: data.subscription_amount?.toString() || '5000',
          additional_info: data.additional_info || ''
        });
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.ccp_number || !settings.ccp_key || !settings.account_holder_name || !settings.subscription_amount) {
      Alert.alert(t('error'), 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/payment-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...settings,
          subscription_amount: parseFloat(settings.subscription_amount)
        })
      });

      if (response.ok) {
        Alert.alert(t('success'), 'Paramètres de paiement mis à jour');
      } else {
        Alert.alert(t('error'), 'Impossible de mettre à jour les paramètres');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert(t('error'), t('errorOccurred'));
    } finally {
      setSaving(false);
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
        <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-gray-100 p-2 rounded-full"
          >
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#000" />
          </TouchableOpacity>
          <View className={`flex-1 ${isRTL ? 'mr-4' : 'ml-4'}`}>
            <Text className="text-black text-xl font-bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
              Paramètres de paiement
            </Text>
            <Text className="text-gray-600 text-sm" style={{ textAlign: isRTL ? 'right' : 'left' }}>
              Configuration Baridimob/CCP
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        {/* Info */}
        <View className="bg-blue-50 border-l-4 border-blue-400 rounded-xl p-4 mb-6">
          <View className={`flex-row items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text className={`text-blue-700 text-sm flex-1 ${isRTL ? 'mr-2 text-right' : 'ml-2'}`}>
              Ces informations seront affichées aux boutiques pour effectuer le paiement de l'abonnement mensuel.
            </Text>
          </View>
        </View>

        {/* Formulaire */}
        <View className="bg-white rounded-2xl p-6 mb-6">
          {/* Numéro CCP */}
          <View className="mb-5">
            <Text className="text-gray-700 font-semibold mb-2" style={{ textAlign: isRTL ? 'right' : 'left' }}>
              Numéro CCP *
            </Text>
            <TextInput
              value={settings.ccp_number}
              onChangeText={(text) => setSettings({ ...settings, ccp_number: text })}
              placeholder="00799999001234567890"
              keyboardType="numeric"
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
              style={{ textAlign: isRTL ? 'right' : 'left' }}
            />
          </View>

          {/* Clé */}
          <View className="mb-5">
            <Text className="text-gray-700 font-semibold mb-2" style={{ textAlign: isRTL ? 'right' : 'left' }}>
              Clé *
            </Text>
            <TextInput
              value={settings.ccp_key}
              onChangeText={(text) => setSettings({ ...settings, ccp_key: text })}
              placeholder="97"
              keyboardType="numeric"
              maxLength={2}
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
              style={{ textAlign: isRTL ? 'right' : 'left' }}
            />
          </View>

          {/* Nom du titulaire */}
          <View className="mb-5">
            <Text className="text-gray-700 font-semibold mb-2" style={{ textAlign: isRTL ? 'right' : 'left' }}>
              Nom du titulaire *
            </Text>
            <TextInput
              value={settings.account_holder_name}
              onChangeText={(text) => setSettings({ ...settings, account_holder_name: text })}
              placeholder="Ahmed Karim"
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
              style={{ textAlign: isRTL ? 'right' : 'left' }}
            />
          </View>

          {/* Montant */}
          <View className="mb-5">
            <Text className="text-gray-700 font-semibold mb-2" style={{ textAlign: isRTL ? 'right' : 'left' }}>
              Montant de l'abonnement (DA) *
            </Text>
            <TextInput
              value={settings.subscription_amount}
              onChangeText={(text) => setSettings({ ...settings, subscription_amount: text })}
              placeholder="5000"
              keyboardType="numeric"
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
              style={{ textAlign: isRTL ? 'right' : 'left' }}
            />
          </View>

          {/* Informations additionnelles */}
          <View className="mb-2">
            <Text className="text-gray-700 font-semibold mb-2" style={{ textAlign: isRTL ? 'right' : 'left' }}>
              Informations additionnelles
            </Text>
            <TextInput
              value={settings.additional_info}
              onChangeText={(text) => setSettings({ ...settings, additional_info: text })}
              placeholder="Instructions supplémentaires..."
              multiline
              numberOfLines={4}
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
              style={{ textAlignVertical: 'top', textAlign: isRTL ? 'right' : 'left' }}
            />
          </View>
        </View>

        {/* Aperçu */}
        <View className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-6">
          <Text className="text-green-900 font-bold text-lg mb-4" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            Aperçu pour les boutiques
          </Text>
          
          <View className="bg-white rounded-xl p-4">
            <View className="mb-3">
              <Text className="text-gray-500 text-xs mb-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>Numéro CCP</Text>
              <Text className="text-gray-900 font-bold text-lg" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {settings.ccp_number || '---'}
              </Text>
            </View>
            
            <View className="mb-3">
              <Text className="text-gray-500 text-xs mb-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>Clé</Text>
              <Text className="text-gray-900 font-bold text-lg" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {settings.ccp_key || '--'}
              </Text>
            </View>
            
            <View className="mb-3">
              <Text className="text-gray-500 text-xs mb-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>Nom du titulaire</Text>
              <Text className="text-gray-900 font-bold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {settings.account_holder_name || '---'}
              </Text>
            </View>
            
            <View className="bg-green-50 rounded-lg p-3">
              <Text className="text-gray-500 text-xs mb-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>Montant à payer</Text>
              <Text className="text-green-700 font-bold text-2xl" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {settings.subscription_amount || '0'} DA
              </Text>
            </View>
          </View>
        </View>

        {/* Bouton sauvegarder */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="rounded-2xl py-4 flex-row items-center justify-center mb-8"
          style={{
            backgroundColor: '#10b981',
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="white" />
              <Text className="text-white font-bold text-base ml-2">Enregistrer les paramètres</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
