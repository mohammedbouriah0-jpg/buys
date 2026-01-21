const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendBatchPushNotifications } = require('../services/push-notifications');

// Configuration multer pour l'upload de factures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/invoices';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
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
      return res.status(403).json({ error: 'Token invalide' });
    }
    
    req.user = results[0];
    next();
  } catch (error) {
    console.error('❌ [AUTH] Erreur:', error);
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// Soumettre une facture d'abonnement
router.post('/submit', authenticateToken, upload.single('invoice'), async (req, res) => {
  try {
    if (req.user.type !== 'shop') {
      return res.status(403).json({ error: 'Seules les boutiques peuvent soumettre des factures' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Facture requise' });
    }

    const { amount } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    const invoiceUrl = `/uploads/invoices/${req.file.filename}`;
    
    const query = `
      INSERT INTO subscription_invoices (shop_id, invoice_document, amount, status)
      VALUES (?, ?, ?, 'pending')
    `;

    const [result] = await db.query(query, [req.user.id, invoiceUrl, amount]);

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

      console.log(`🔔 [INVOICE] ${admins.length} admin(s) à notifier`);

      if (admins.length > 0) {
        const notifications = admins.map(admin => ({
          pushToken: admin.push_token,
          title: '💳 Paiement à valider',
          body: `${shopName} a soumis une preuve de ${amount} DA`,
          data: {
            type: 'subscription_invoice',
            invoiceId: result.insertId,
            shopId: req.user.id,
            screen: 'AdminVerifications'
          }
        }));

        const results = await sendBatchPushNotifications(notifications);
        console.log(`✅ [INVOICE] Notifications envoyées aux admins:`, results.length);
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
              subject: '💳 Paiement à valider',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #000;">💳 Nouvelle preuve de paiement</h2>
                  <p>Bonjour ${admin.name},</p>
                  <p>La boutique <strong>${shopName}</strong> a soumis une preuve de paiement de <strong>${amount} DA</strong>.</p>
                  <p>Connectez-vous au panneau d'administration (section Vérifications) pour l'examiner rapidement.</p>
                </div>
              `
            });
            console.log(`📧 [INVOICE] Email envoyé à admin: ${admin.email}`);
          } catch (emailErr) {
            console.error(`❌ [INVOICE] Erreur email admin:`, emailErr.message);
          }
        }
      }
    } catch (notifError) {
      // Ne pas bloquer si les notifs échouent
      console.error('⚠️ [INVOICE] Erreur notification admins:', notifError.message);
    }

    res.json({
      message: 'Facture soumise avec succès',
      invoiceId: result.insertId,
      status: 'pending'
    });
  } catch (error) {
    console.error('❌ [INVOICE] Erreur soumission:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les factures de la boutique
router.get('/my-invoices', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'shop') {
      return res.status(403).json({ error: 'Accès réservé aux boutiques' });
    }

    const query = `
      SELECT 
        si.*,
        admin.name as reviewed_by_name
      FROM subscription_invoices si
      LEFT JOIN users admin ON si.reviewed_by = admin.id
      WHERE si.shop_id = ?
      ORDER BY si.submitted_at DESC
    `;

    const [results] = await db.query(query, [req.user.id]);
    res.json(results);
  } catch (error) {
    console.error('❌ [INVOICE] Erreur récupération:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir le statut d'abonnement actuel
router.get('/subscription-status', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'shop') {
      return res.status(403).json({ error: 'Accès réservé aux boutiques' });
    }

    const query = `
      SELECT 
        u.is_subscribed,
        u.subscription_end_date,
        ss.start_date,
        ss.end_date,
        ss.is_active,
        DATEDIFF(ss.end_date, NOW()) as days_remaining,
        latest_invoice.latest_invoice_id,
        latest_invoice.latest_invoice_status,
        latest_invoice.latest_invoice_document,
        latest_invoice.latest_invoice_submitted_at
      FROM users u
      LEFT JOIN shop_subscriptions ss ON u.id = ss.shop_id AND ss.is_active = TRUE
      LEFT JOIN (
        SELECT 
          si.shop_id,
          si.id AS latest_invoice_id,
          si.status AS latest_invoice_status,
          si.invoice_document AS latest_invoice_document,
          si.submitted_at AS latest_invoice_submitted_at
        FROM subscription_invoices si
        JOIN (
          SELECT shop_id, MAX(submitted_at) AS latest_submitted_at
          FROM subscription_invoices
          GROUP BY shop_id
        ) last_sub 
          ON last_sub.shop_id = si.shop_id 
          AND last_sub.latest_submitted_at = si.submitted_at
      ) latest_invoice ON latest_invoice.shop_id = u.id
      WHERE u.id = ?
    `;

    const [results] = await db.query(query, [req.user.id]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(results[0]);
  } catch (error) {
    console.error('❌ [INVOICE] Erreur statut abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
