import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Pour éviter l'erreur "RNGoogleSignin could not be found" dans Expo Go,
// on ne charge le module natif que lorsque ce n'est pas Expo Go.
let GoogleSignin: any = null;
let statusCodes: any = null;
let isErrorWithCode: any = null;

// Web Client ID (requis pour obtenir l'idToken)
const GOOGLE_WEB_CLIENT_ID = '288552147312-5u8d8tvigf6hfvv6k70pnm297kvounfb.apps.googleusercontent.com';

// iOS Client ID (requis pour iOS)
const GOOGLE_IOS_CLIENT_ID = '288552147312-ku7gs46bd7cn6n6bn4ji8tke0eb1kcjv.apps.googleusercontent.com';

// Vérifier si on est dans Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Charger dynamiquement le module natif uniquement hors Expo Go
if (!isExpoGo && Platform.OS !== 'web') {
  try {
    const googleModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleModule.GoogleSignin;
    statusCodes = googleModule.statusCodes;
    isErrorWithCode = googleModule.isErrorWithCode;
  } catch (error) {
    console.warn('🔐 Impossible de charger @react-native-google-signin/google-signin :', error);
  }
}

let isConfigured = false;

export const configureGoogleSignIn = async () => {
  if (isConfigured) return;
  
  if (isExpoGo) {
    console.log('🔐 Google Sign-In: Mode Expo Go - fonctionnalité désactivée (utiliser un build dev / APK)');
    isConfigured = true;
    return;
  }

  if (Platform.OS !== 'web' && GoogleSignin) {
    try {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : undefined,
        offlineAccess: true,
        scopes: ['profile', 'email'],
      });
      console.log('🔐 Google Sign-In configuré (natif) pour', Platform.OS);
    } catch (error) {
      console.warn('🔐 Erreur configuration Google Sign-In:', error);
    }
  }

  isConfigured = true;
};

export const signInWithGoogle = async (): Promise<{
  success: boolean;
  user?: any;
  idToken?: string;
  error?: string;
}> => {
  // Dans Expo Go, afficher un message
  if (isExpoGo) {
    return {
      success: false,
      error: "Google Sign-In n'est pas disponible dans Expo Go. Testez avec un APK.",
    };
  }

  if (!GoogleSignin) {
    return { success: false, error: 'Module Google Sign-In natif non disponible' };
  }

  try {
    // S'assurer que Google Sign-In est configuré
    await configureGoogleSignIn();

    // Vérifier si les services Google Play sont disponibles
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Lancer la connexion Google native
    const response = await GoogleSignin.signIn();

    console.log('🔐 Google Sign-In réussi:', response);

    if (response.type === 'success' && response.data) {
      const { user, idToken } = response.data;

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          givenName: user.givenName,
          familyName: user.familyName,
          photo: user.photo,
        },
        idToken: idToken || undefined,
      };
    }

    return { success: false, error: 'Connexion annulée' };
  } catch (error: any) {
    console.error('🔐 Erreur Google Sign-In:', error);
    
    if (isErrorWithCode && isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return { success: false, error: 'Connexion annulée par l\'utilisateur' };
        case statusCodes.IN_PROGRESS:
          return { success: false, error: 'Connexion déjà en cours' };
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return { success: false, error: 'Services Google Play non disponibles' };
        default:
          return { success: false, error: `Erreur: ${error.message}` };
      }
    }
    
    return { success: false, error: error.message || 'Erreur inconnue' };
  }
};

export const signOutGoogle = async () => {
  if (isExpoGo) return;
  
  try {
    await GoogleSignin.signOut();
    console.log('🔐 Déconnexion Google réussie');
  } catch (error) {
    console.error('🔐 Erreur déconnexion Google:', error);
  }
};

export const isGoogleSignedIn = async () => {
  if (isExpoGo) return false;
  
  try {
    const currentUser = await GoogleSignin.getCurrentUser();
    return currentUser !== null;
  } catch (error) {
    return false;
  }
};

// Fonction de compatibilité pour l'ancien code
export const getGoogleUserInfo = async (accessToken: string) => {
  try {
    const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error fetching Google user info:', error);
    return null;
  }
};
