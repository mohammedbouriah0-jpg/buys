/**
 * Service de gestion du mode de stockage (BunnyCDN ou Local)
 * Permet à l'admin de basculer entre stockage cloud et local
 */

const db = require('../config/database');

// Cache du mode pour éviter les requêtes DB à chaque upload
let cachedMode = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Initialise la table de configuration si elle n'existe pas
 */
async function initTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS storage_config (
        id INT PRIMARY KEY AUTO_INCREMENT,
        mode ENUM('bunny', 'local') NOT NULL DEFAULT 'bunny',
        updated_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insérer une config par défaut si la table est vide
    const [rows] = await db.query('SELECT id FROM storage_config LIMIT 1');
    if (rows.length === 0) {
      await db.query("INSERT INTO storage_config (mode) VALUES ('bunny')");
      console.log('✅ [STORAGE] Configuration par défaut créée: mode=bunny');
    }
  } catch (error) {
    console.error('❌ [STORAGE] Erreur initialisation table:', error.message);
  }
}

/**
 * Récupère le mode de stockage actuel
 * @returns {Promise<'bunny'|'local'>} Le mode de stockage
 */
async function getStorageMode() {
  // Vérifier le cache
  const now = Date.now();
  if (cachedMode && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedMode;
  }
  
  try {
    // S'assurer que la table existe
    await initTable();
    
    const [rows] = await db.query('SELECT mode FROM storage_config ORDER BY id DESC LIMIT 1');
    
    if (rows.length > 0) {
      cachedMode = rows[0].mode;
      cacheTimestamp = now;
      return cachedMode;
    }
    
    // Par défaut: bunny
    return 'bunny';
  } catch (error) {
    console.error('❌ [STORAGE] Erreur lecture mode:', error.message);
    // En cas d'erreur, retourner le mode par défaut
    return 'bunny';
  }
}

/**
 * Définit le mode de stockage
 * @param {'bunny'|'local'} mode - Le nouveau mode
 * @param {number} adminId - ID de l'admin qui fait le changement
 * @returns {Promise<boolean>} Succès de l'opération
 */
async function setStorageMode(mode, adminId = null) {
  if (!['bunny', 'local'].includes(mode)) {
    throw new Error('Mode invalide. Utilisez "bunny" ou "local"');
  }
  
  try {
    // S'assurer que la table existe
    await initTable();
    
    const [existing] = await db.query('SELECT id FROM storage_config LIMIT 1');
    
    if (existing.length > 0) {
      await db.query(
        'UPDATE storage_config SET mode = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
        [mode, adminId, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO storage_config (mode, updated_by) VALUES (?, ?)',
        [mode, adminId]
      );
    }
    
    // Invalider le cache
    cachedMode = mode;
    cacheTimestamp = Date.now();
    
    console.log(`✅ [STORAGE] Mode changé: ${mode} (par admin ${adminId})`);
    return true;
  } catch (error) {
    console.error('❌ [STORAGE] Erreur changement mode:', error.message);
    throw error;
  }
}

/**
 * Récupère la configuration complète
 * @returns {Promise<object>} Configuration complète
 */
async function getStorageConfig() {
  try {
    await initTable();
    
    const [rows] = await db.query(`
      SELECT sc.*, u.name as updated_by_name 
      FROM storage_config sc
      LEFT JOIN users u ON sc.updated_by = u.id
      ORDER BY sc.id DESC LIMIT 1
    `);
    
    if (rows.length > 0) {
      return {
        mode: rows[0].mode,
        updated_by: rows[0].updated_by,
        updated_by_name: rows[0].updated_by_name,
        updated_at: rows[0].updated_at,
        created_at: rows[0].created_at
      };
    }
    
    return {
      mode: 'bunny',
      updated_by: null,
      updated_by_name: null,
      updated_at: null,
      created_at: null
    };
  } catch (error) {
    console.error('❌ [STORAGE] Erreur lecture config:', error.message);
    return { mode: 'bunny' };
  }
}

/**
 * Vérifie si on doit utiliser BunnyCDN
 * Combine le mode de stockage ET la configuration BunnyCDN
 * @returns {Promise<boolean>}
 */
async function shouldUseBunny() {
  const mode = await getStorageMode();
  
  if (mode === 'local') {
    return false;
  }
  
  // Mode bunny: vérifier si BunnyCDN est configuré
  const bunnyCdn = require('./bunny-cdn');
  return bunnyCdn.isConfigured();
}

/**
 * Invalide le cache (utile après changement de config)
 */
function invalidateCache() {
  cachedMode = null;
  cacheTimestamp = 0;
}

module.exports = {
  getStorageMode,
  setStorageMode,
  getStorageConfig,
  shouldUseBunny,
  invalidateCache,
  initTable
};
