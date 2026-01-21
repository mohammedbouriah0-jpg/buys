import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { API_URL } from './api';

const ORDER_CHECK_TASK = 'order-check-background';
let lastOrderCount = 0;
let checkInterval: NodeJS.Timeout | null = null;

/**
 * Vérifier les nouvelles commandes et afficher une notification locale
 */
export async function checkNewOrders(authToken: string, shopId: number) {
  try {
    const response = await fetch(`${API_URL}/orders/shop?limit=1`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) return;

    const orders = await response.json();
    
    if (orders.length > 0) {
      const latestOrderId = orders[0].id;
      
      // Vérifier si c'est une nouvelle commande
      const storedLastOrderId = await getLastOrderId();
      
      if (storedLastOrderId && latestOrderId > storedLastOrderId) {
        // Nouvelle commande détectée !
        await showNewOrderNotification(orders[0]);
      }
      
      // Sauvegarder le dernier ID
      await saveLastOrderId(latestOrderId);
    }
  } catch (error) {
    console.error('Erreur vérification commandes:', error);
  }
}

/**
 * Afficher une notification locale pour une nouvelle commande
 */
async function showNewOrderNotification(order: any) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Nouvelle commande !',
        body: `Commande #${order.id} - ${order.total_amount?.toFixed(2) || '0.00'} DA`,
        data: {
          orderId: order.id,
          screen: 'OrderDetails',
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Immédiat
    });
    
    console.log('✅ Notification locale affichée pour commande', order.id);
  } catch (error) {
    console.error('Erreur notification locale:', error);
  }
}

/**
 * Démarrer la vérification périodique des commandes
 */
export function startOrderChecking(authToken: string, shopId: number) {
  // Arrêter l'ancien interval s'il existe
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  console.log('🔄 Démarrage vérification commandes toutes les 30s');

  // Vérifier immédiatement
  checkNewOrders(authToken, shopId);

  // Puis toutes les 30 secondes
  checkInterval = setInterval(() => {
    checkNewOrders(authToken, shopId);
  }, 30000); // 30 secondes
}

/**
 * Arrêter la vérification périodique
 */
export function stopOrderChecking() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('⏹️ Arrêt vérification commandes');
  }
}

/**
 * Sauvegarder le dernier ID de commande
 */
async function saveLastOrderId(orderId: number) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('lastOrderId', orderId.toString());
  } catch (error) {
    console.error('Erreur sauvegarde lastOrderId:', error);
  }
}

/**
 * Récupérer le dernier ID de commande
 */
async function getLastOrderId(): Promise<number | null> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const value = await AsyncStorage.getItem('lastOrderId');
    return value ? parseInt(value) : null;
  } catch (error) {
    console.error('Erreur récupération lastOrderId:', error);
    return null;
  }
}

/**
 * Réinitialiser le compteur (utile au premier lancement)
 */
export async function resetOrderCounter() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('lastOrderId');
    console.log('✅ Compteur commandes réinitialisé');
  } catch (error) {
    console.error('Erreur reset compteur:', error);
  }
}
