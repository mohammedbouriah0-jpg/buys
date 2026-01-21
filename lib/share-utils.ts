import { Share, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { API_CONFIG } from "@/config";

// Configuration des liens - Utilise automatiquement le domaine + protocole (http/https) du config.ts
const getWebUrl = () => {
  const protocol = API_CONFIG.USE_HTTPS ? "https" : "http";
  const port = (API_CONFIG as any).PORT ? `:${(API_CONFIG as any).PORT}` : "";
  return `${protocol}://${API_CONFIG.SERVER_IP}${port}`;
};

export interface ShareVideoOptions {
  videoId: number;
  title?: string;
  shopName?: string;
}

export interface ShareShopOptions {
  shopId: number;
  shopName: string;
  description?: string;
}

/**
 * Partager une vidéo
 * Le lien web ouvre automatiquement l'app si installée grâce aux Universal Links/App Links
 */
export async function shareVideo({ videoId, title, shopName }: ShareVideoOptions) {
  try {
    // Lien web court qui ouvre l'app automatiquement si installée
    // Format: https://buysdz.com/v/123
    // Android App Links et iOS Universal Links configurés dans app.json
    const webLink = `${getWebUrl()}/v/${videoId}`;

    // Message de partage simplifié - juste le lien
    const result = await Share.share(
      Platform.OS === 'ios' 
        ? { url: webLink }
        : { message: webLink }
    );

    return result;
  } catch (error) {
    console.error('Error sharing video:', error);
    throw error;
  }
}

/**
 * Partager une boutique
 * Le lien web ouvre automatiquement l'app si installée grâce aux Universal Links/App Links
 */
export async function shareShop({ shopId, shopName, description }: ShareShopOptions) {
  try {
    // Lien web court qui ouvre l'app automatiquement si installée
    // Format: https://buysdz.com/s/123
    // Android App Links et iOS Universal Links configurés dans app.json
    const webLink = `${getWebUrl()}/s/${shopId}`;

    // Message de partage simplifié - juste le lien
    const result = await Share.share(
      Platform.OS === 'ios' 
        ? { url: webLink }
        : { message: webLink }
    );

    return result;
  } catch (error) {
    console.error('Error sharing shop:', error);
    throw error;
  }
}

/**
 * Copier le lien dans le presse-papier (avec token sécurisé)
 */
export async function getVideoShareLink(videoId: number): Promise<string> {
  try {
    const response = await fetch(`${getWebUrl()}/api/share/video/${videoId}`);
    const data = await response.json();
    return data.fullUrl;
  } catch (error) {
    return `${getWebUrl()}/v/${videoId}`;
  }
}

export async function getShopShareLink(shopId: number): Promise<string> {
  try {
    const response = await fetch(`${getWebUrl()}/api/share/shop/${shopId}`);
    const data = await response.json();
    return data.fullUrl;
  } catch (error) {
    return `${getWebUrl()}/s/${shopId}`;
  }
}

/**
 * Gérer les deep links entrants
 */
export function handleDeepLink(url: string): { type: 'video' | 'shop' | null; id: number | null } {
  try {
    const parsed = Linking.parse(url);
    
    // Format: buys://share/video/123 ou buys://share/shop/456
    if (parsed.path?.includes('share/video/')) {
      const id = parseInt(parsed.path.split('/').pop() || '0');
      return { type: 'video', id };
    }
    
    if (parsed.path?.includes('share/shop/')) {
      const id = parseInt(parsed.path.split('/').pop() || '0');
      return { type: 'shop', id };
    }
    
    return { type: null, id: null };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return { type: null, id: null };
  }
}
