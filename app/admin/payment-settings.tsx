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
          alignItems: 'center'
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
              letterSpacing: 0.5,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              Paramètres de paiement
            </Text>
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 12,
              fontWeight: '600',
              textAlign: isRTL ? 'right' : 'left'
            }}>
              Configuration Baridimob/CCP
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingTop: 16 }}>
        {/* Info */}
        <View style={{
          backgroundColor: '#eff6ff',
          borderLeftWidth: 3,
          borderLeftColor: '#3b82f6',
          borderRadius: 12,
          padding: 12,
          marginBottom: 12
        }}>
          <View style={{ 
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'flex-start'
          }}>
            <Ionicons name="information-circle" size={18} color="#3b82f6" />
            <Text style={{ 
              color: '#1e40af',
              fontSize: 12,
              fontWeight: '600',
              flex: 1,
              marginLeft: isRTL ? 0 : 8,
              marginRight: isRTL ? 8 : 0,
              textAlign: isRTL ? 'right' : 'left',
              lineHeight: 18
            }}>
              Ces informations seront affichées aux boutiques pour effectuer le paiement de l'abonnement mensuel.
            </Text>
          </View>
        </View>

        {/* Formulaire */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2
        }}>
          {/* Numéro CCP */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ 
              color: '#374151',
              fontWeight: '700',
              fontSize: 12,
              marginBottom: 6,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              Numéro CCP *
            </Text>
            <TextInput
              value={settings.ccp_number}
              onChangeText={(text) => setSettings({ ...settings, ccp_number: text })}
              placeholder="00799999001234567890"
              keyboardType="numeric"
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: '#111827',
                fontSize: 13,
                fontWeight: '600',
                textAlign: isRTL ? 'right' : 'left'
              }}
            />
          </View>

          {/* Clé */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ 
              color: '#374151',
              fontWeight: '700',
              fontSize: 12,
              marginBottom: 6,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              Clé *
            </Text>
            <TextInput
              value={settings.ccp_key}
              onChangeText={(text) => setSettings({ ...settings, ccp_key: text })}
              placeholder="97"
              keyboardType="numeric"
              maxLength={2}
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: '#111827',
                fontSize: 13,
                fontWeight: '600',
                textAlign: isRTL ? 'right' : 'left'
              }}
            />
          </View>

          {/* Nom du titulaire */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ 
              color: '#374151',
              fontWeight: '700',
              fontSize: 12,
              marginBottom: 6,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              Nom du titulaire *
            </Text>
            <TextInput
              value={settings.account_holder_name}
              onChangeText={(text) => setSettings({ ...settings, account_holder_name: text })}
              placeholder="Ahmed Karim"
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: '#111827',
                fontSize: 13,
                fontWeight: '600',
                textAlign: isRTL ? 'right' : 'left'
              }}
            />
          </View>

          {/* Montant */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ 
              color: '#374151',
              fontWeight: '700',
              fontSize: 12,
              marginBottom: 6,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              Montant de l'abonnement (DA) *
            </Text>
            <TextInput
              value={settings.subscription_amount}
              onChangeText={(text) => setSettings({ ...settings, subscription_amount: text })}
              placeholder="5000"
              keyboardType="numeric"
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: '#111827',
                fontSize: 13,
                fontWeight: '600',
                textAlign: isRTL ? 'right' : 'left'
              }}
            />
          </View>

          {/* Informations additionnelles */}
          <View>
            <Text style={{ 
              color: '#374151',
              fontWeight: '700',
              fontSize: 12,
              marginBottom: 6,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              Informations additionnelles
            </Text>
            <TextInput
              value={settings.additional_info}
              onChangeText={(text) => setSettings({ ...settings, additional_info: text })}
              placeholder="Instructions supplémentaires..."
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: '#111827',
                fontSize: 13,
                fontWeight: '600',
                minHeight: 80,
                textAlignVertical: 'top',
                textAlign: isRTL ? 'right' : 'left'
              }}
            />
          </View>
        </View>

        {/* Aperçu */}
        <View style={{
          backgroundColor: '#f0fdf4',
          borderWidth: 1,
          borderColor: '#bbf7d0',
          borderRadius: 14,
          padding: 14,
          marginBottom: 12
        }}>
          <Text style={{ 
            color: '#14532d',
            fontWeight: '800',
            fontSize: 14,
            marginBottom: 10,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            Aperçu pour les boutiques
          </Text>
          
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: 12
          }}>
            <View style={{ marginBottom: 10 }}>
              <Text style={{ 
                color: '#6b7280',
                fontSize: 10,
                fontWeight: '600',
                marginBottom: 3,
                textAlign: isRTL ? 'right' : 'left'
              }}>Numéro CCP</Text>
              <Text style={{ 
                color: '#111827',
                fontWeight: '800',
                fontSize: 15,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {settings.ccp_number || '---'}
              </Text>
            </View>
            
            <View style={{ marginBottom: 10 }}>
              <Text style={{ 
                color: '#6b7280',
                fontSize: 10,
                fontWeight: '600',
                marginBottom: 3,
                textAlign: isRTL ? 'right' : 'left'
              }}>Clé</Text>
              <Text style={{ 
                color: '#111827',
                fontWeight: '800',
                fontSize: 15,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {settings.ccp_key || '--'}
              </Text>
            </View>
            
            <View style={{ marginBottom: 10 }}>
              <Text style={{ 
                color: '#6b7280',
                fontSize: 10,
                fontWeight: '600',
                marginBottom: 3,
                textAlign: isRTL ? 'right' : 'left'
              }}>Nom du titulaire</Text>
              <Text style={{ 
                color: '#111827',
                fontWeight: '800',
                fontSize: 13,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {settings.account_holder_name || '---'}
              </Text>
            </View>
            
            <View style={{
              backgroundColor: '#f0fdf4',
              borderRadius: 10,
              padding: 10
            }}>
              <Text style={{ 
                color: '#6b7280',
                fontSize: 10,
                fontWeight: '600',
                marginBottom: 3,
                textAlign: isRTL ? 'right' : 'left'
              }}>Montant à payer</Text>
              <Text style={{ 
                color: '#15803d',
                fontWeight: '900',
                fontSize: 20,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {settings.subscription_amount || '0'} DA
              </Text>
            </View>
          </View>
        </View>

        {/* Bouton sauvegarder */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: '#10b981',
            borderRadius: 12,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="save" size={18} color="white" />
              <Text style={{ 
                color: '#ffffff',
                fontWeight: '800',
                fontSize: 14,
                marginLeft: 6
              }}>Enregistrer les paramètres</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
