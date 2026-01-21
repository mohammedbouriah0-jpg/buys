const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Route pour migrer la table users (ajouter les colonnes manquantes)
router.post('/fix-users-table', async (req, res) => {
  const results = [];
  
  try {
    console.log('🔧 Migration de la table users...');
    
    // Liste des migrations à effectuer
    const migrations = [
      {
        name: 'password nullable',
        sql: `ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL`
      },
      {
        name: 'google_id',
        sql: `ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE NULL`
      },
      {
        name: 'auth_provider',
        sql: `ALTER TABLE users ADD COLUMN auth_provider ENUM('local', 'google') DEFAULT 'local'`
      },
      {
        name: 'avatar_url',
        sql: `ALTER TABLE users ADD COLUMN avatar_url TEXT NULL`
      },
      {
        name: 'email_verified',
        sql: `ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 0`
      },
      {
        name: 'address',
        sql: `ALTER TABLE users ADD COLUMN address TEXT NULL`
      },
      {
        name: 'wilaya',
        sql: `ALTER TABLE users ADD COLUMN wilaya VARCHAR(100) NULL`
      },
      {
        name: 'is_verified',
        sql: `ALTER TABLE users ADD COLUMN is_verified TINYINT(1) DEFAULT 0`
      },
      {
        name: 'updated_at',
        sql: `ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
      }
    ];
    
    for (const migration of migrations) {
      try {
        await pool.query(migration.sql);
        results.push({ name: migration.name, status: 'success' });
        console.log(`   ✅ ${migration.name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          results.push({ name: migration.name, status: 'already_exists' });
          console.log(`   ⚠️ ${migration.name} existe déjà`);
        } else {
          results.push({ name: migration.name, status: 'error', message: error.message });
          console.log(`   ❌ ${migration.name}:`, error.message);
        }
      }
    }
    
    // Afficher la structure finale
    const [columns] = await pool.query(`DESCRIBE users`);
    console.log('\n📋 Structure finale:');
    columns.forEach(col => console.log(`   - ${col.Field}`));
    
    res.json({
      success: true,
      message: 'Migration terminée',
      results,
      columns: columns.map(c => c.Field)
    });
    
  } catch (error) {
    console.error('❌ Erreur migration:', error);
    res.status(500).json({ error: error.message, results });
  }
});

// Route pour créer la table product_likes
router.post('/create-product-likes', async (req, res) => {
  try {
    console.log('🔧 Création de la table product_likes...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_likes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_product_like (product_id, user_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Table product_likes créée avec succès');
    
    res.json({
      success: true,
      message: 'Table product_likes créée avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur création table:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
