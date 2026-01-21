const crypto = require('crypto');

// Clé secrète pour encoder/décoder
const SECRET_KEY = process.env.SHARE_SECRET_KEY || process.env.JWT_SECRET || 'buys-secret-key-2024';

/**
 * Génère un token simple et stable pour un ID
 * Format: hash court de 8 caractères
 */
function generateShareToken(id) {
  const hash = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(id.toString())
    .digest('hex')
    .substring(0, 8);
  return hash;
}

/**
 * Vérifie si un token correspond à un ID
 */
function verifyShareToken(id, token) {
  const expectedToken = generateShareToken(id);
  return token === expectedToken;
}

/**
 * Génère un lien de partage simple
 * Format: /v/20-a1b2c3d4
 */
function generateShareLink(type, id) {
  if (!id || isNaN(parseInt(id))) {
    throw new Error('ID invalide pour le lien de partage');
  }
  const token = generateShareToken(id);
  return `/${type}/${id}-${token}`;
}

/**
 * Parse un lien de partage et vérifie le token
 * Retourne l'ID si valide, null sinon
 */
function parseShareLink(params) {
  try {
    if (!params || typeof params !== 'string') {
      console.log('parseShareLink: params invalide');
      return null;
    }
    
    // Format: "20-a1b2c3d4"
    const separatorIndex = params.indexOf('-');
    if (separatorIndex === -1) {
      console.log('parseShareLink: pas de séparateur trouvé');
      return null;
    }
    
    const idPart = params.substring(0, separatorIndex);
    const token = params.substring(separatorIndex + 1);
    
    const id = parseInt(idPart);
    if (isNaN(id) || id <= 0) {
      console.log('parseShareLink: ID invalide:', idPart);
      return null;
    }
    
    if (!token || token.length !== 8) {
      console.log('parseShareLink: token invalide, longueur:', token?.length);
      return null;
    }
    
    // Vérifier le token
    if (verifyShareToken(id, token)) {
      console.log('parseShareLink: token valide pour ID:', id);
      return id;
    }
    
    console.log('parseShareLink: token ne correspond pas');
    return null;
  } catch (error) {
    console.error('parseShareLink erreur:', error.message);
    return null;
  }
}

/**
 * Les liens n'expirent plus
 */
function isLinkExpired(params) {
  return false;
}

module.exports = {
  generateShareToken,
  verifyShareToken,
  generateShareLink,
  parseShareLink,
  isLinkExpired
};
