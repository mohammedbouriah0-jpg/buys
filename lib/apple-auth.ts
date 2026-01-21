import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export const isAppleSignInAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return await AppleAuthentication.isAvailableAsync();
};

export const signInWithApple = async (): Promise<{
  success: boolean;
  user?: {
    id: string;
    email: string | null;
    fullName: {
      givenName: string | null;
      familyName: string | null;
    };
  };
  identityToken?: string;
  authorizationCode?: string;
  error?: string;
}> => {
  if (Platform.OS !== 'ios') {
    return {
      success: false,
      error: 'Apple Sign-In est disponible uniquement sur iOS',
    };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log('🍎 Apple Sign-In réussi:', credential);

    return {
      success: true,
      user: {
        id: credential.user,
        email: credential.email,
        fullName: {
          givenName: credential.fullName?.givenName || null,
          familyName: credential.fullName?.familyName || null,
        },
      },
      identityToken: credential.identityToken || undefined,
      authorizationCode: credential.authorizationCode || undefined,
    };
  } catch (error: any) {
    console.error('🍎 Erreur Apple Sign-In:', error);

    if (error.code === 'ERR_REQUEST_CANCELED') {
      return {
        success: false,
        error: 'Connexion annulée par l\'utilisateur',
      };
    }

    return {
      success: false,
      error: error.message || 'Erreur inconnue',
    };
  }
};

// Export du composant bouton Apple (à utiliser dans les écrans de connexion)
export { AppleAuthentication };
