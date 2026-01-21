const fs = require('fs');
const path = require('path');

/**
 * Supprime un fichier du serveur à partir de son URL relative
 * @param {string} fileUrl - URL relative du fichier (ex: /uploads/videos/video.mp4)
 */
function deleteFile(fileUrl) {
  if (!fileUrl) return false;
  
  try {
    const filePath = path.join(__dirname, '..', fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Fichier supprimé: ${filePath}`);
      return true;
    }
  } catch (err) {
    console.error(`⚠️ Erreur suppression fichier ${fileUrl}:`, err.message);
  }
  return false;
}

/**
 * Supprime plusieurs fichiers du serveur
 * @param {string[]} fileUrls - Liste des URLs relatives des fichiers
 */
function deleteFiles(fileUrls) {
  const validUrls = fileUrls.filter(Boolean);
  let deletedCount = 0;
  
  for (const fileUrl of validUrls) {
    if (deleteFile(fileUrl)) {
      deletedCount++;
    }
  }
  
  return deletedCount;
}

/**
 * Supprime tous les fichiers d'une vidéo (vidéo + thumbnail + qualités)
 * @param {Object} video - Objet vidéo avec les URLs
 */
function deleteVideoFiles(video) {
  const filesToDelete = [
    video.video_url,
    video.video_url_high,
    video.video_url_medium,
    video.video_url_low,
    video.thumbnail_url
  ];
  
  return deleteFiles(filesToDelete);
}

/**
 * Supprime tous les fichiers d'un produit (images)
 * @param {Object} product - Objet produit avec image_url
 * @param {Array} productImages - Liste des images supplémentaires du produit
 */
function deleteProductFiles(product, productImages = []) {
  const filesToDelete = [product.image_url];
  
  // Ajouter les images supplémentaires
  for (const img of productImages) {
    if (img.image_url) {
      filesToDelete.push(img.image_url);
    }
  }
  
  return deleteFiles(filesToDelete);
}

/**
 * Supprime tous les fichiers d'une boutique (logo, banner)
 * @param {Object} shop - Objet boutique
 */
function deleteShopFiles(shop) {
  const filesToDelete = [
    shop.logo_url,
    shop.banner_url
  ];
  
  return deleteFiles(filesToDelete);
}

/**
 * Supprime l'avatar d'un utilisateur
 * @param {Object} user - Objet utilisateur
 */
function deleteUserFiles(user) {
  const filesToDelete = [user.avatar_url];
  return deleteFiles(filesToDelete);
}

module.exports = {
  deleteFile,
  deleteFiles,
  deleteVideoFiles,
  deleteProductFiles,
  deleteShopFiles,
  deleteUserFiles
};
