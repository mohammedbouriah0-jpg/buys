import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Générer une miniature à partir d'une vidéo
 */
export async function generateThumbnail(videoUri: string, timeMs: number = 1000) {
  try {
    console.log('📸 Génération miniature...');
    
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: timeMs,
      quality: 0.7,
    });
    
    // Compresser la miniature
    const compressed = await manipulateAsync(
      uri,
      [{ resize: { width: 720 } }],
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    
    console.log('✅ Miniature générée et compressée');
    return compressed.uri;
  } catch (error) {
    console.error('Erreur génération miniature:', error);
    return null;
  }
}

/**
 * Obtenir les informations d'une vidéo
 */
export async function getVideoInfo(videoUri: string) {
  try {
    const info = await FileSystem.getInfoAsync(videoUri);
    return {
      size: info.size || 0,
      sizeInMB: info.size ? (info.size / 1024 / 1024).toFixed(2) : '0',
      exists: info.exists,
      uri: info.uri,
    };
  } catch (error) {
    console.error('Erreur info vidéo:', error);
    return null;
  }
}
