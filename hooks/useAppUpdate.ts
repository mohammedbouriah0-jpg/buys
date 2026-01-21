import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '@/config';

interface UpdateInfo {
  updateRequired: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  minVersion: string;
  latestVersion: string;
  updateMessage: string;
  storeUrl: string;
  hasNewerVersion: boolean;
}

/**
 * Hook pour vérifier les mises à jour de l'application
 * et forcer la mise à jour si nécessaire
 */
export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtenir la version actuelle de l'app depuis app.json
  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  const platform = Platform.OS;

  const checkForUpdate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/app-version/check?current_version=${currentVersion}&platform=${platform}`
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la vérification des mises à jour');
      }

      const data = await response.json();

      setUpdateInfo({
        updateRequired: data.update_required,
        forceUpdate: data.force_update,
        currentVersion: data.current_version,
        minVersion: data.min_version,
        latestVersion: data.latest_version,
        updateMessage: data.update_message,
        storeUrl: data.store_url,
        hasNewerVersion: data.has_newer_version,
      });
    } catch (err: any) {
      console.error('Error checking for updates:', err);
      setError(err.message);
      // En cas d'erreur, ne pas bloquer l'app
      setUpdateInfo(null);
    } finally {
      setLoading(false);
    }
  }, [currentVersion, platform]);

  // Ouvrir le store pour mettre à jour
  const openStore = useCallback(() => {
    if (updateInfo?.storeUrl) {
      Linking.openURL(updateInfo.storeUrl).catch((err) => {
        console.error('Error opening store:', err);
        // Fallback URLs
        if (Platform.OS === 'ios') {
          Linking.openURL('https://apps.apple.com/app/buys');
        } else {
          Linking.openURL('https://play.google.com/store/apps/details?id=com.buys.app');
        }
      });
    }
  }, [updateInfo?.storeUrl]);

  // Vérifier au montage
  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  return {
    updateInfo,
    loading,
    error,
    checkForUpdate,
    openStore,
    // Raccourcis pratiques
    needsForceUpdate: updateInfo?.forceUpdate || false,
    hasUpdate: updateInfo?.hasNewerVersion || false,
    currentVersion,
  };
}
