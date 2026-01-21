const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const [results] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    
    if (results.length === 0) {
      return res.status(403).json({ error: 'Utilisateur non trouvé' });
    }
    
    req.user = results[0];
    next();
  } catch (error) {
    console.error('❌ [AUTH] Erreur:', error);
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// Middleware admin
const requireAdmin = (req, res, next) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

// Obtenir les paramètres de paiement (accessible à tous les utilisateurs authentifiés)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT ccp_number, ccp_key, account_holder_name, subscription_amount, additional_info FROM payment_settings WHERE is_active = TRUE LIMIT 1'
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Paramètres de paiement non configurés' });
    }

    res.json(results[0]);
  } catch (error) {
    console.error('❌ [PAYMENT SETTINGS] Erreur récupération:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour les paramètres de paiement (admin uniquement)
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ccp_number, ccp_key, account_holder_name, subscription_amount, additional_info } = req.body;

    if (!ccp_number || !ccp_key || !account_holder_name || !subscription_amount) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }

    // Vérifier si des paramètres existent déjà
    const [existing] = await db.query('SELECT id FROM payment_settings LIMIT 1');

    if (existing.length > 0) {
      // Mettre à jour
      await db.query(
        `UPDATE payment_settings 
         SET ccp_number = ?, ccp_key = ?, account_holder_name = ?, 
             subscription_amount = ?, additional_info = ?, updated_by = ?
         WHERE id = ?`,
        [ccp_number, ccp_key, account_holder_name, subscription_amount, additional_info, req.user.id, existing[0].id]
      );
    } else {
      // Créer
      await db.query(
        `INSERT INTO payment_settings (ccp_number, ccp_key, account_holder_name, subscription_amount, additional_info, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ccp_number, ccp_key, account_holder_name, subscription_amount, additional_info, req.user.id]
      );
    }

    console.log(`✅ [PAYMENT SETTINGS] Paramètres mis à jour par admin ${req.user.id}`);
    res.json({ message: 'Paramètres de paiement mis à jour avec succès' });
  } catch (error) {
    console.error('❌ [PAYMENT SETTINGS] Erreur mise à jour:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
