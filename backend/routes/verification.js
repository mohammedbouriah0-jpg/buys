const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendPushNotification, sendBatchPushNotifications } = require('../services/push-notifications');

// Configuration multer pour l'upload de documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/verification';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JPEG, PNG et PDF sont autorisés'));
    }
  }
});

// Middleware d'authentification (utilise JWT comme les autres routes)
const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔑 [AUTH] Token reçu:', token ? token.substring(0, 20) + '...' : 'null');

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: 'Token manquant' });
    }

    // Vérifier le JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('✅ [AUTH] Token décodé, user ID:', decoded.id);
    
    // Récupérer l'utilisateur depuis la DB (avec await car c'est un pool promise)
    const query = 'SELECT * FROM users WHERE id = ?';
    console.log('📊 [AUTH] Requête SQL:', query, [decoded.id]);
    
    const [results] = await db.query(query, [decoded.id]);
    
    if (results.length === 0) {
      console.error('❌ [AUTH] Utilisateur non trouvé');
      return res.status(403).json({ error: 'Token invalide' });
    }
    
    console.log('✅ [AUTH] Utilisateur trouvé:', results[0].username);
    req.user = results[0];
    next();
  } catch (error) {
    console.error('❌ [AUTH] Erreur:', error);
    return res.status(403).json({ 
      error: 'Token invalide',
      message: 'Veuillez vous reconnecter',
      needsReauth: true
    });
  }
};

// Soumettre une demande de vérification
router.post('/submit', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (req.user.type !== 'shop') {
      return res.status(403).json({ error: 'Seules les boutiques peuvent soumettre une vérification' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Document requis' });
    }

    const documentUrl = `/uploads/verification/${req.file.filename}`;
    
    const query = `
      UPDATE users 
      SET verification_document = ?,
          verification_status = 'pending',
          verification_date = NULL,
          rejection_reason = NULL
      WHERE id = ?
    `;

    await db.query(query, [documentUrl, req.user.id]);

    console.log(`✅ [VERIFICATION] Document soumis pour l'utilisateur ${req.user.id}`);

    // 🔔 Notifier tous les admins
    try {
      // Récupérer le nom de la boutique
      const [shops] = await db.query(
        'SELECT shop_name FROM shops WHERE user_id = ?',
        [req.user.id]
      );
      const shopName = shops.length > 0 ? shops[0].shop_name : req.user.name || 'Une boutique';

      // Récupérer tous les admins avec leur push_token
      const [admins] = await db.query(
        'SELECT id, push_token, email, name FROM users WHERE type = ? AND push_token IS NOT NULL AND push_enabled = TRUE',
        ['admin']
      );

      console.log(`🔔 [VERIFICATION] ${admins.length} admin(s) à notifier`);

      if (admins.length > 0) {
        const notifications = admins.map(admin => ({
          pushToken: admin.push_token,
          title: '📋 Nouvelle demande de vérification',
          body: `${shopName} a soumis un document de vérification`,
          data: {
            type: 'verification_request',
            shopId: req.user.id,
            screen: 'AdminVerifications'
          }
        }));

        const results = await sendBatchPushNotifications(notifications);
        console.log(`✅ [VERIFICATION] Notifications envoyées aux admins:`, results.length);
      }

      // Envoyer aussi un email aux admins sans push token
      const [adminsWithoutPush] = await db.query(
        'SELECT email, name FROM users WHERE type = ? AND (push_token IS NULL OR push_enabled = FALSE) AND email IS NOT NULL',
        ['admin']
      );

      if (adminsWithoutPush.length > 0) {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.hostinger.com',
          port: parseInt(process.env.SMTP_PORT) || 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER || 'support@buysdz.com',
            pass: process.env.EMAIL_PASSWORD
          },
          tls: { rejectUnauthorized: false }
        });

        for (const admin of adminsWithoutPush) {
          try {
            await transporter.sendMail({
              from: `"Buys DZ" <${process.env.EMAIL_USER || 'support@buysdz.com'}>`,
              to: admin.email,
              subject: '📋 Nouvelle demande de vérification',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #000;">📋 Nouvelle demande de vérification</h2>
                  <p>Bonjour ${admin.name},</p>
                  <p>La boutique <strong>${shopName}</strong> a soumis un document pour vérification.</p>
                  <p>Connectez-vous au panneau d'administration pour examiner cette demande.</p>
                </div>
              `
            });
            console.log(`📧 [VERIFICATION] Email envoyé à admin: ${admin.email}`);
          } catch (emailErr) {
            console.error(`❌ [VERIFICATION] Erreur email admin:`, emailErr.message);
          }
        }
      }
    } catch (notifError) {
      // Ne pas bloquer si les notifs échouent
      console.error('⚠️ [VERIFICATION] Erreur notification admins:', notifError.message);
    }

    res.json({
      message: 'Demande de vérification soumise avec succès',
      status: 'pending'
    });
  } catch (err) {
    console.error('❌ [VERIFICATION SUBMIT] Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir le statut de vérification
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT is_verified, verification_status, verification_date, rejection_reason,
             is_subscribed, subscription_end_date
      FROM users
      WHERE id = ?
    `;

    const [results] = await db.query(query, [req.user.id]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    let userData = results[0];

    // Vérifier si l'abonnement est expiré et le désactiver automatiquement
    if (userData.is_subscribed && userData.subscription_end_date) {
      const endDate = new Date(userData.subscription_end_date);
      const now = new Date();
      
      if (endDate < now) {
        // Abonnement expiré - désactiver
        await db.query(
          'UPDATE users SET is_subscribed = FALSE WHERE id = ?',
          [req.user.id]
        );
        
        // Mettre à jour les données retournées
        userData.is_subscribed = false;
        
        console.log(`⏰ [VERIFICATION STATUS] Abonnement expiré pour user ${req.user.id} - désactivé`);
      }
    }

    console.log('📊 [VERIFICATION STATUS] User ID:', req.user.id);
    console.log('📊 [VERIFICATION STATUS] Data:', userData);

    res.json(userData);
  } catch (error) {
    console.error('❌ [VERIFICATION STATUS] Erreur:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ADMIN: Obtenir toutes les demandes en attente
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const query = `
      SELECT id, username, email, shop_name, verification_document, 
             verification_status, created_at
      FROM users
      WHERE type = 'shop' AND verification_status = 'pending'
      ORDER BY created_at DESC
    `;

    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('❌ [VERIFICATION PENDING] Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ADMIN: Approuver une boutique
router.post('/approve/:shopId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const query = `
      UPDATE users 
      SET is_verified = TRUE,
          verification_status = 'approved',
          verification_date = NOW()
      WHERE id = ? AND type = 'shop'
    `;

    const [result] = await db.query(query, [req.params.shopId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    res.json({ message: 'Boutique approuvée avec succès' });
  } catch (err) {
    console.error('❌ [VERIFICATION APPROVE] Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ADMIN: Rejeter une boutique
router.post('/reject/:shopId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Raison du rejet requise' });
    }

    const query = `
      UPDATE users 
      SET is_verified = FALSE,
          verification_status = 'rejected',
          verification_date = NOW(),
          rejection_reason = ?
      WHERE id = ? AND type = 'shop'
    `;

    const [result] = await db.query(query, [reason, req.params.shopId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    res.json({ message: 'Boutique rejetée' });
  } catch (err) {
    console.error('❌ [VERIFICATION REJECT] Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
