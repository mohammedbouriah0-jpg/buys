import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_URL } from '@/config';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Demander la permission pour les notifications push
 */
export async function registerForPushNotificationsAsync() {
  let token;

  console.log('🔍 [PUSH] Platform:', Platform.OS);
  console.log('🔍 [PUSH] Is Device:', Device.isDevice);

  // Désactiver les push dans Expo Go (non supporté depuis SDK 53)
  if (Constants.appOwnership === 'expo') {
    console.log('⚠️ [PUSH] Désactivé dans Expo Go (utiliser un build dev / APK pour tester les push)');
    return null;
  }

  if (Platform.OS === 'android') {
    console.log('🔍 [PUSH] Configuration canal Android...');
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Commandes',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
    console.log('✅ [PUSH] Canal Android configuré');
  }

  if (Device.isDevice) {
    console.log('🔍 [PUSH] Vérification permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('🔍 [PUSH] Permission actuelle:', existingStatus);
    
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('🔍 [PUSH] Demande de permission...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('🔍 [PUSH] Permission après demande:', finalStatus);
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ [PUSH] Permission notifications refusée par l\'utilisateur');
      return null;
    }
    
    console.log('🔍 [PUSH] Récupération du token FCM natif...');
    
    // Récupérer le token FCM natif (pas le token Expo)
    // Cela permet d'envoyer directement via FCM sans passer par Expo Push Service
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    token = deviceToken.data;
    console.log('✅ [PUSH] Token FCM obtenu:', token);
  } else {
    console.log('⚠️ [PUSH] Émulateur détecté - Les notifications push nécessitent un appareil physique');
  }

  return token;
}

/**
 * Enregistrer le token push sur le serveur
 */
export async function registerPushToken(authToken: string, retryCount = 0): Promise<boolean> {
  try {
    console.log('🔍 [PUSH] Début registerPushToken (tentative', retryCount + 1, ')');
    console.log('🔍 [PUSH] Auth token présent:', !!authToken);
    
    const pushToken = await registerForPushNotificationsAsync();
    
    console.log('🔍 [PUSH] Push token obtenu:', pushToken ? pushToken.substring(0, 30) + '...' : 'NULL');
    
    if (!pushToken) {
      console.log('⚠️ [PUSH] Pas de push token - Probablement en développement ou permissions refusées');
      return false;
    }

    console.log('🔍 [PUSH] Envoi au serveur:', `${API_URL}/notifications/register-token`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(`${API_URL}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ pushToken }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('🔍 [PUSH] Réponse serveur status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [PUSH] Token push enregistré avec succès:', data);
      
      // Sauvegarder le statut pour ne plus afficher le banner
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('push-token-registered', 'true');
      
      return true;
    } else {
      const errorText = await response.text();
      console.log('⚠️ [PUSH] Erreur serveur:', response.status, errorText);
      return false;
    }
  } catch (error: any) {
    // Utiliser console.log au lieu de console.error pour éviter les stack traces alarmantes
    console.log('⚠️ [PUSH] Erreur connexion serveur:', error.message || 'Network request failed');
    
    // Retry silencieux en arrière-plan si c'est une erreur réseau
    if (error.message?.includes('Network') && retryCount < 2) {
      console.log('🔄 [PUSH] Nouvelle tentative dans 5 secondes... (tentative', retryCount + 2, '/3)');
      setTimeout(() => {
        registerPushToken(authToken, retryCount + 1);
      }, 5000);
    } else if (retryCount >= 2) {
      console.log('⚠️ [PUSH] Toutes les tentatives échouées. Les notifications seront envoyées par email.');
    }
    
    return false;
  }
}

/**
 * Écouter les notifications reçues
 */
export function addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Écouter les interactions avec les notifications
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Désactiver les notifications push
 */
export async function disablePushNotifications(authToken: string) {
  try {
    const response = await fetch(`${API_URL}/notifications/disable-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      console.log('✅ Notifications push désactivées');
      return true;
    } else {
      console.log('⚠️ Erreur désactivation notifications');
      return false;
    }
  } catch (error) {
    console.log('⚠️ Erreur désactivation push:', error);
    return false;
  }
}
