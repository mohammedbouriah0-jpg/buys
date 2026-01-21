const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration optimisée du pool de connexions
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Optimisation des connexions
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20, // Augmenté pour la charge
  queueLimit: 100, // Limite de la file d'attente
  
  // Timeouts
  connectTimeout: 10000, // 10 secondes pour se connecter
  acquireTimeout: 10000, // 10 secondes pour obtenir une connexion
  
  // Gestion des connexions inactives
  idleTimeout: 60000, // 60 secondes avant de fermer une connexion inactive
  
  // Reconnexion automatique
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000, // 30 secondes
  
  // Préparation des requêtes (performance)
  namedPlaceholders: false,
  
  // Charset et timezone
  charset: 'utf8mb4',
  timezone: '+00:00',
  
  // Sécurité: désactiver les requêtes multiples
  multipleStatements: false,
});

// Gestion des erreurs de connexion
pool.on('connection', (connection) => {
  console.log('✅ Nouvelle connexion DB établie');
});

pool.on('release', (connection) => {
  // Connection retournée au pool
});

// Vérifier la connexion au démarrage
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connexion à la base de données réussie');
    connection.release();
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
  }
})();

// Fonction helper pour les transactions
pool.transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = pool;
