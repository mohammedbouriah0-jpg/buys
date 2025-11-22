import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_URL } from './api';

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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Commandes',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Permission notifications refusée');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('✅ Token push obtenu:', token);
  } else {
    console.log('⚠️ Doit utiliser un appareil physique pour les notifications push');
  }

  return token;
}

/**
 * Enregistrer le token push sur le serveur
 */
export async function registerPushToken(authToken: string) {
  try {
    const pushToken = await registerForPushNotificationsAsync();
    
    if (!pushToken) {
      console.log('⚠️ Pas de token push à enregistrer');
      return false;
    }

    const response = await fetch(`${API_URL}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ pushToken }),
    });

    if (response.ok) {
      console.log('✅ Token push enregistré sur le serveur');
      return true;
    } else {
      console.error('❌ Erreur enregistrement token:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur enregistrement push token:', error);
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
      console.error('❌ Erreur désactivation notifications');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur désactivation push:', error);
    return false;
  }
}
