/**
 * Service BunnyCDN pour l'upload et la gestion des fichiers
 * Documentation: https://docs.bunny.net/reference/storage-api
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration BunnyCDN depuis les variables d'environnement
const config = {
  // Storage Zone API
  storageZoneName: process.env.BUNNY_STORAGE_ZONE || '',
  storageApiKey: process.env.BUNNY_STORAGE_API_KEY || '',
  storageEndpoint: process.env.BUNNY_STORAGE_ENDPOINT || 'storage.bunnycdn.com',
  
  // CDN Pull Zone pour les URLs publiques
  cdnUrl: process.env.BUNNY_CDN_URL || '', // ex: https://your-zone.b-cdn.net
  
  // Dossiers sur BunnyCDN
  folders: {
    images: 'images',
    videos: 'videos',
    thumbnails: 'thumbnails',
  }
};

/**
 * Vérifie si BunnyCDN est configuré
 */
function isConfigured() {
  return !!(config.storageZoneName && config.storageApiKey && config.cdnUrl);
}

/**
 * Upload un fichier sur BunnyCDN Storage
 * @param {string} localFilePath - Chemin local du fichier
 * @param {string} remotePath - Chemin sur BunnyCDN (ex: "images/avatar-123.jpg")
 * @returns {Promise<object>} - Résultat de l'upload avec l'URL CDN
 */
function uploadFile(localFilePath, remotePath) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return reject(new Error('BunnyCDN non configuré. Vérifiez les variables d\'environnement.'));
    }

    // Lire le fichier
    const fileBuffer = fs.readFileSync(localFilePath);
    const fileSize = fs.statSync(localFilePath).size;

    // Construire le chemin complet
    const fullRemotePath = `/${config.storageZoneName}/${remotePath}`;

    const options = {
      hostname: config.storageEndpoint,
      port: 443,
      path: fullRemotePath,
      method: 'PUT',
      headers: {
        'AccessKey': config.storageApiKey,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize,
      }
    };

    console.log(`📤 BunnyCDN Upload: ${remotePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          const cdnFileUrl = `${config.cdnUrl}/${remotePath}`;
          console.log(`✅ BunnyCDN Upload réussi: ${cdnFileUrl}`);
          
          resolve({
            success: true,
            url: cdnFileUrl,
            remotePath: remotePath,
            size: fileSize,
          });
        } else {
          console.error(`❌ BunnyCDN Upload échoué: ${res.statusCode} - ${data}`);
          reject(new Error(`Upload failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ BunnyCDN Erreur réseau:', error.message);
      reject(error);
    });

    req.write(fileBuffer);
    req.end();
  });
}

/**
 * Upload un fichier depuis un buffer (pour les fichiers en mémoire)
 * @param {Buffer} buffer - Buffer du fichier
 * @param {string} remotePath - Chemin sur BunnyCDN
 * @param {string} contentType - Type MIME du fichier
 * @returns {Promise<object>}
 */
function uploadBuffer(buffer, remotePath, contentType = 'application/octet-stream') {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return reject(new Error('BunnyCDN non configuré. Vérifiez les variables d\'environnement.'));
    }

    const fullRemotePath = `/${config.storageZoneName}/${remotePath}`;

    const options = {
      hostname: config.storageEndpoint,
      port: 443,
      path: fullRemotePath,
      method: 'PUT',
      headers: {
        'AccessKey': config.storageApiKey,
        'Content-Type': contentType,
        'Content-Length': buffer.length,
      }
    };

    console.log(`📤 BunnyCDN Upload Buffer: ${remotePath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          const cdnFileUrl = `${config.cdnUrl}/${remotePath}`;
          console.log(`✅ BunnyCDN Upload réussi: ${cdnFileUrl}`);
          
          resolve({
            success: true,
            url: cdnFileUrl,
            remotePath: remotePath,
            size: buffer.length,
          });
        } else {
          console.error(`❌ BunnyCDN Upload échoué: ${res.statusCode} - ${data}`);
          reject(new Error(`Upload failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ BunnyCDN Erreur réseau:', error.message);
      reject(error);
    });

    req.write(buffer);
    req.end();
  });
}

/**
 * Supprimer un fichier de BunnyCDN
 * @param {string} remotePath - Chemin du fichier sur BunnyCDN
 * @returns {Promise<boolean>}
 */
function deleteFile(remotePath) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return reject(new Error('BunnyCDN non configuré.'));
    }

    // Extraire le chemin relatif si c'est une URL complète
    let pathToDelete = remotePath;
    if (remotePath.startsWith('http')) {
      try {
        const url = new URL(remotePath);
        pathToDelete = url.pathname.substring(1); // Enlever le premier /
      } catch (e) {
        // Garder le chemin tel quel
      }
    }

    const fullRemotePath = `/${config.storageZoneName}/${pathToDelete}`;

    const options = {
      hostname: config.storageEndpoint,
      port: 443,
      path: fullRemotePath,
      method: 'DELETE',
      headers: {
        'AccessKey': config.storageApiKey,
      }
    };

    console.log(`🗑️ BunnyCDN Delete: ${pathToDelete}`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          console.log(`✅ BunnyCDN Fichier supprimé: ${pathToDelete}`);
          resolve(true);
        } else {
          console.error(`❌ BunnyCDN Delete échoué: ${res.statusCode} - ${data}`);
          reject(new Error(`Delete failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ BunnyCDN Erreur réseau:', error.message);
      reject(error);
    });

    req.end();
  });
}

/**
 * Générer un nom de fichier unique pour BunnyCDN
 * @param {string} originalFilename - Nom original du fichier
 * @param {string} folder - Dossier cible (images, videos, thumbnails)
 * @returns {string} - Chemin complet sur BunnyCDN
 */
function generateRemotePath(originalFilename, folder = 'images') {
  const ext = path.extname(originalFilename).toLowerCase();
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const filename = `${timestamp}-${random}${ext}`;
  
  return `${folder}/${filename}`;
}

/**
 * Upload un fichier multer sur BunnyCDN et supprimer le fichier local
 * @param {object} multerFile - Objet fichier multer
 * @param {string} folder - Dossier cible (images, videos)
 * @returns {Promise<string>} - URL CDN du fichier
 */
async function uploadMulterFile(multerFile, folder = 'images') {
  const remotePath = generateRemotePath(multerFile.originalname, folder);
  const localPath = multerFile.path;

  try {
    const result = await uploadFile(localPath, remotePath);
    
    // Supprimer le fichier local après upload réussi
    try {
      fs.unlinkSync(localPath);
      console.log(`🗑️ Fichier local supprimé: ${localPath}`);
    } catch (unlinkError) {
      console.warn(`⚠️ Impossible de supprimer le fichier local: ${unlinkError.message}`);
    }
    
    return result.url;
  } catch (error) {
    // En cas d'erreur, garder le fichier local et lancer l'erreur
    throw error;
  }
}

/**
 * Upload plusieurs fichiers multer sur BunnyCDN
 * @param {object[]} multerFiles - Array d'objets fichiers multer
 * @param {string} folder - Dossier cible
 * @returns {Promise<string[]>} - Array des URLs CDN
 */
async function uploadMulterFiles(multerFiles, folder = 'images') {
  const urls = [];
  
  for (const file of multerFiles) {
    const url = await uploadMulterFile(file, folder);
    urls.push(url);
  }
  
  return urls;
}

/**
 * Extraire le chemin relatif d'une URL BunnyCDN pour suppression
 * @param {string} cdnUrl - URL complète BunnyCDN
 * @returns {string|null} - Chemin relatif ou null
 */
function extractPathFromCdnUrl(cdnUrl) {
  if (!cdnUrl || !cdnUrl.startsWith('http')) {
    return cdnUrl; // Déjà un chemin relatif ou null
  }
  
  try {
    const url = new URL(cdnUrl);
    return url.pathname.substring(1); // Enlever le premier /
  } catch (e) {
    return null;
  }
}

/**
 * Vérifie si une URL est une URL BunnyCDN
 * @param {string} url - URL à vérifier
 * @returns {boolean}
 */
function isBunnyCdnUrl(url) {
  if (!url || !config.cdnUrl) return false;
  return url.startsWith(config.cdnUrl);
}

/**
 * Obtenir l'URL CDN de base
 * @returns {string}
 */
function getCdnBaseUrl() {
  return config.cdnUrl;
}

module.exports = {
  uploadFile,
  uploadBuffer,
  deleteFile,
  generateRemotePath,
  uploadMulterFile,
  uploadMulterFiles,
  extractPathFromCdnUrl,
  isBunnyCdnUrl,
  getCdnBaseUrl,
  isConfigured,
  config,
};
