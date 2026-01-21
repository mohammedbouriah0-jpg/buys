import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../lib/auth-context';
import { registerPushToken } from '../lib/push-notifications';

export function PushStatusBanner() {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    // Afficher seulement pour les boutiques
    if (user?.type !== 'shop' && user?.type !== 'boutique') {
      return;
    }

    // Vérifier si l'utilisateur a déjà fermé le banner
    const dismissed = await AsyncStorage.getItem('push-banner-dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Vérifier si le push token est enregistré
    const pushRegistered = await AsyncStorage.getItem('push-token-registered');
    if (pushRegistered !== 'true') {
      setShowBanner(true);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Récupérer le token auth
    const userStr = await AsyncStorage.getItem('buys-user');
    if (!userStr) return;
    
    const userData = JSON.parse(userStr);
    const authToken = await AsyncStorage.getItem('buys-token');
    
    if (authToken) {
      const success = await registerPushToken(authToken);
      
      if (success) {
        await AsyncStorage.setItem('push-token-registered', 'true');
        setShowBanner(false);
      }
    }
    
    setIsRetrying(false);
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem('push-banner-dismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <View className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4 rounded-lg">
      <View className="flex-row items-start">
        <Text className="text-2xl mr-2">⚠️</Text>
        <View className="flex-1">
          <Text className="font-bold text-yellow-800 mb-1">
            Notifications désactivées
          </Text>
          <Text className="text-yellow-700 text-sm mb-3">
            Vous ne recevrez pas d'alertes pour les nouvelles commandes. 
            Les notifications seront envoyées par email.
          </Text>
          
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={handleRetry}
              disabled={isRetrying}
              className="bg-yellow-600 px-4 py-2 rounded-lg mr-2"
            >
              <Text className="text-white font-bold text-sm">
                {isRetrying ? 'Réessayer...' : 'Activer'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleDismiss}
              className="bg-gray-200 px-4 py-2 rounded-lg"
            >
              <Text className="text-gray-700 font-bold text-sm">
                Plus tard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
