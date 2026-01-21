// Helper pour construire les URLs complètes dynamiquement
const getBaseUrl = (req) => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
};

// URL CDN BunnyCDN pour vérification
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL || '';

/**
 * Vérifie si une URL est déjà une URL CDN (BunnyCDN ou autre)
 * @param {string} url - URL à vérifier
 * @returns {boolean}
 */
const isCdnUrl = (url) => {
  if (!url) return false;
  // Vérifier si c'est une URL BunnyCDN
  if (BUNNY_CDN_URL && url.startsWith(BUNNY_CDN_URL)) return true;
  // Vérifier les patterns CDN communs
  if (url.includes('.b-cdn.net')) return true;
  if (url.includes('bunnycdn.com')) return true;
  return false;
};

const buildFullUrl = (path, req) => {
  // Vérifier que path est une string valide
  if (!path || typeof path !== 'string') return null;
  
  // Si c'est déjà une URL complète (http/https), la retourner telle quelle
  // Cela inclut les URLs BunnyCDN qui commencent par https://
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Si req n'est pas disponible, retourner le chemin tel quel
  if (!req) {
    return path;
  }
  
  // Construire l'URL complète avec l'adresse actuelle (pour les fichiers locaux)
  try {
    const baseUrl = getBaseUrl(req);
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  } catch (error) {
    console.error('Error building full URL:', error);
    return path;
  }
};

const extractRelativePath = (url) => {
  if (!url) return null;
  
  // Si c'est déjà un chemin relatif, le retourner
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }
  
  // Extraire le chemin relatif d'une URL complète
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch (e) {
    return url;
  }
};

module.exports = {
  getBaseUrl,
  buildFullUrl,
  extractRelativePath,
  isCdnUrl
};
