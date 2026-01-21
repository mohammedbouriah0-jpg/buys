import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken } from './push-notifications';

/**
 * Force le réenregistrement du token push
 * À appeler manuellement depuis un bouton ou au démarrage
 */
export async function forcePushTokenRegistration() {
  try {
    console.log('🔄 [FORCE-PUSH] Début du réenregistrement forcé...');
    
    // Récupérer le token auth
    const token = await AsyncStorage.getItem('buys-token');
    
    if (!token) {
      console.log('❌ [FORCE-PUSH] Pas de token auth trouvé');
      return { success: false, error: 'Not authenticated' };
    }
    
    console.log('✅ [FORCE-PUSH] Token auth trouvé');
    
    // Réinitialiser le statut d'enregistrement
    await AsyncStorage.removeItem('push-token-registered');
    await AsyncStorage.removeItem('push-banner-dismissed');
    
    console.log('🔄 [FORCE-PUSH] Tentative d\'enregistrement...');
    
    // Tenter l'enregistrement
    const success = await registerPushToken(token);
    
    if (success) {
      console.log('✅ [FORCE-PUSH] Token push enregistré avec succès !');
      return { success: true };
    } else {
      console.log('❌ [FORCE-PUSH] Échec de l\'enregistrement');
      return { success: false, error: 'Registration failed' };
    }
  } catch (error: any) {
    console.error('❌ [FORCE-PUSH] Exception:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Vérifier si le token push est enregistré
 */
export async function checkPushTokenStatus() {
  try {
    const registered = await AsyncStorage.getItem('push-token-registered');
    return registered === 'true';
  } catch (error) {
    return false;
  }
}
