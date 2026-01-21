import React, { useState } from 'react';
import { TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { forcePushTokenRegistration, checkPushTokenStatus } from '../lib/force-push-register';

export function PushTestButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'unknown' | 'registered' | 'failed'>('unknown');

  const handlePress = async () => {
    setLoading(true);
    
    try {
      // Vérifier d'abord le statut
      const isRegistered = await checkPushTokenStatus();
      
      if (isRegistered) {
        Alert.alert(
          '✅ Token Déjà Enregistré',
          'Votre token push est déjà enregistré. Voulez-vous le réenregistrer ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Réenregistrer', 
              onPress: async () => {
                const result = await forcePushTokenRegistration();
                if (result.success) {
                  setStatus('registered');
                  Alert.alert('✅ Succès', 'Token push enregistré avec succès !');
                } else {
                  setStatus('failed');
                  Alert.alert('❌ Échec', `Erreur: ${result.error}\n\nVérifiez que le backend est accessible.`);
                }
              }
            }
          ]
        );
      } else {
        // Tenter l'enregistrement
        const result = await forcePushTokenRegistration();
        
        if (result.success) {
          setStatus('registered');
          Alert.alert('✅ Succès', 'Token push enregistré avec succès ! Vous recevrez maintenant les notifications.');
        } else {
          setStatus('failed');
          Alert.alert(
            '❌ Échec', 
            `Impossible d'enregistrer le token.\n\nErreur: ${result.error}\n\nVérifiez que:\n1. Le backend est démarré\n2. Le port 3000 est autorisé\n3. Vous êtes sur le même WiFi`
          );
        }
      }
    } catch (error: any) {
      setStatus('failed');
      Alert.alert('❌ Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getButtonColor = () => {
    if (status === 'registered') return 'bg-green-500';
    if (status === 'failed') return 'bg-red-500';
    return 'bg-blue-500';
  };

  const getButtonText = () => {
    if (loading) return 'Vérification...';
    if (status === 'registered') return '✅ Notifications Activées';
    if (status === 'failed') return '❌ Réessayer';
    return '🔔 Activer Notifications Push';
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading}
      className={`${getButtonColor()} p-4 rounded-lg flex-row items-center justify-center`}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-white font-bold text-center">
          {getButtonText()}
        </Text>
      )}
    </TouchableOpacity>
  );
}
