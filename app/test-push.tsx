import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '../lib/auth-context';
import { API_URL } from '../lib/api';
import { registerForPushNotificationsAsync } from '../lib/push-notifications';

export default function TestPushScreen() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
    console.log(message);
  };

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    addLog('🔍 Vérification état initial...');
    
    // 1. Vérifier la plateforme
    addLog(`📱 Platform: ${Device.osName} ${Device.osVersion}`);
    addLog(`📱 Device: ${Device.isDevice ? 'Physique' : 'Émulateur'}`);
    addLog(`📱 Model: ${Device.modelName}`);
    
    // 2. Vérifier les permissions
    const perms = await Notifications.getPermissionsAsync();
    setPermissions(perms);
    addLog(`🔐 Permissions: ${JSON.stringify(perms, null, 2)}`);
    
    // 3. Vérifier le token existant
    try {
      if (Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync();
        setPushToken(token.data);
        addLog(`🎫 Token Expo: ${token.data.substring(0, 50)}...`);
      } else {
        addLog('⚠️ Émulateur détecté - Pas de token push');
      }
    } catch (error: any) {
      addLog(`❌ Erreur récupération token: ${error.message}`);
    }
  };

  const testRequestPermissions = async () => {
    addLog('🔍 Test demande permissions...');
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      addLog(`📋 Status actuel: ${existingStatus}`);
      
      if (existingStatus !== 'granted') {
        addLog('📝 Demande de permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        addLog(`📋 Nouveau status: ${status}`);
        
        if (status === 'granted') {
          addLog('✅ Permissions accordées !');
        } else {
          addLog('❌ Permissions refusées');
        }
      } else {
        addLog('✅ Permissions déjà accordées');
      }
      
      await checkInitialState();
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
    }
  };

  const testGetToken = async () => {
    addLog('🔍 Test récupération token...');
    
    try {
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        setPushToken(token);
        addLog(`✅ Token obtenu: ${token.substring(0, 50)}...`);
      } else {
        addLog('❌ Pas de token obtenu');
      }
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
    }
  };

  const testRegisterOnServer = async () => {
    if (!token) {
      addLog('❌ Pas de token auth');
      return;
    }
    
    if (!pushToken) {
      addLog('❌ Pas de push token');
      return;
    }
    
    addLog('🔍 Test enregistrement serveur...');
    addLog(`📡 URL: ${API_URL}/notifications/register-token`);
    
    try {
      const response = await fetch(`${API_URL}/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pushToken }),
      });
      
      addLog(`📡 Status: ${response.status}`);
      
      const data = await response.json();
      addLog(`📡 Réponse: ${JSON.stringify(data, null, 2)}`);
      
      if (response.ok) {
        addLog('✅ Enregistrement réussi !');
      } else {
        addLog('❌ Enregistrement échoué');
      }
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
    }
  };

  const testSendNotification = async () => {
    if (!token) {
      addLog('❌ Pas de token auth');
      return;
    }
    
    addLog('🔍 Test envoi notification...');
    
    try {
      const response = await fetch(`${API_URL}/notifications/test-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      addLog(`📡 Status: ${response.status}`);
      
      const data = await response.json();
      addLog(`📡 Réponse: ${JSON.stringify(data, null, 2)}`);
      
      if (response.ok) {
        addLog('✅ Notification envoyée !');
      } else {
        addLog('❌ Envoi échoué');
      }
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
    }
  };

  const testLocalNotification = async () => {
    addLog('🔍 Test notification locale...');
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'Ceci est une notification de test locale',
          data: { test: true },
        },
        trigger: null,
      });
      
      addLog('✅ Notification locale envoyée !');
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
    }
  };

  const checkServerToken = async () => {
    if (!token) {
      addLog('❌ Pas de token auth');
      return;
    }
    
    addLog('🔍 Vérification token sur serveur...');
    
    try {
      const response = await fetch(`${API_URL}/notifications/check-token`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      addLog(`📡 Token serveur: ${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-4">🧪 Test Notifications Push</Text>
        
        {/* État actuel */}
        <View className="bg-gray-100 p-4 rounded-lg mb-4">
          <Text className="font-bold mb-2">État actuel:</Text>
          <Text className="text-sm">Device: {Device.isDevice ? '✅ Physique' : '❌ Émulateur'}</Text>
          <Text className="text-sm">Permissions: {permissions?.status || 'Inconnues'}</Text>
          <Text className="text-sm">Push Token: {pushToken ? '✅ Présent' : '❌ Absent'}</Text>
          <Text className="text-sm">Auth Token: {token ? '✅ Présent' : '❌ Absent'}</Text>
        </View>

        {/* Boutons de test */}
        <View className="space-y-2">
          <TouchableOpacity
            onPress={checkInitialState}
            className="bg-blue-500 p-4 rounded-lg mb-2"
          >
            <Text className="text-white text-center font-bold">
              🔍 Vérifier État
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testRequestPermissions}
            className="bg-green-500 p-4 rounded-lg mb-2"
          >
            <Text className="text-white text-center font-bold">
              🔐 Demander Permissions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testGetToken}
            className="bg-purple-500 p-4 rounded-lg mb-2"
          >
            <Text className="text-white text-center font-bold">
              🎫 Obtenir Token
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testRegisterOnServer}
            className="bg-orange-500 p-4 rounded-lg mb-2"
          >
            <Text className="text-white text-center font-bold">
              📡 Enregistrer sur Serveur
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={checkServerToken}
            className="bg-cyan-500 p-4 rounded-lg mb-2"
          >
            <Text className="text-white text-center font-bold">
              🔍 Vérifier Token Serveur
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testLocalNotification}
            className="bg-yellow-500 p-4 rounded-lg mb-2"
          >
            <Text className="text-white text-center font-bold">
              📱 Test Notification Locale
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testSendNotification}
            className="bg-red-500 p-4 rounded-lg mb-2"
          >
            <Text className="text-white text-center font-bold">
              🚀 Test Notification Push
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLogs([])}
            className="bg-gray-500 p-4 rounded-lg mb-2"
          >
            <Text className="text-white text-center font-bold">
              🗑️ Effacer Logs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logs */}
        <View className="mt-6">
          <Text className="font-bold text-lg mb-2">📋 Logs:</Text>
          <View className="bg-black p-4 rounded-lg">
            {logs.length === 0 ? (
              <Text className="text-gray-400 text-xs">Aucun log...</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} className="text-green-400 text-xs mb-1 font-mono">
                  {log}
                </Text>
              ))
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
