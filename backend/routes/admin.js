const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const { deleteVideoFiles, deleteProductFiles, deleteShopFiles, deleteUserFiles } = require('../utils/file-cleanup');
const { sendPushNotification } = require('../services/push-notifications');

// Helper pour notifier une boutique
async function notifyShop(userId, title, body, data = {}) {
  try {
    // Récupérer le push token de la boutique
    const [users] = await db.query(
      'SELECT push_token, push_enabled, email, name FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) return;
    const user = users[0];

    // Envoyer push notification si disponible
    if (user.push_enabled && user.push_token) {
      await sendPushNotification(user.push_token, { title, body, data });
      console.log(`✅ [NOTIF] Push envoyé à boutique ${userId}`);
    }

    // Envoyer email en fallback ou en plus
    if (user.email) {
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

      await transporter.sendMail({
        from: `"Buys DZ" <${process.env.EMAIL_USER || 'support@buysdz.com'}>`,
        to: user.email,
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000;">${title}</h2>
            <p>Bonjour ${user.name},</p>
            <p>${body}</p>
            <p>Connectez-vous à l'application pour plus de détails.</p>
          </div>
        `
      });
      console.log(`📧 [NOTIF] Email envoyé à boutique: ${user.email}`);
    }
  } catch (error) {
    console.error('⚠️ [NOTIF] Erreur notification boutique:', error.message);
  }
}

// Middleware d'authentification admin
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const [results] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    
    if (results.length === 0 || results[0].type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    
    req.user = results[0];
    next();
  } catch (error) {
    console.error('❌ [ADMIN AUTH] Erreur:', error);
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// ============ GESTION DES VÉRIFICATIONS ============

// Obtenir toutes les demandes de vérification
router.get('/verifications', authenticateAdmin, async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM (
        SELECT 
          u.id,
          u.name,
          u.email,
          s.shop_name,
          u.verification_document,
          u.verification_status,
          u.is_verified,
          u.verification_date,
          u.rejection_reason,
          u.is_subscribed,
          u.subscription_end_date,
          u.created_at,
          COUNT(DISTINCT p.id) as product_count,
          COUNT(DISTINCT oi.order_id) as order_count,
          MAX(latest_invoice.latest_invoice_id) as latest_invoice_id,
          MAX(latest_invoice.latest_invoice_status) as latest_invoice_status,
          MAX(latest_invoice.latest_invoice_document) as latest_invoice_document,
          MAX(latest_invoice.latest_invoice_submitted_at) as latest_invoice_submitted_at
        FROM users u
        LEFT JOIN shops s ON u.id = s.user_id
        LEFT JOIN products p ON s.id = p.shop_id
        LEFT JOIN order_items oi ON s.id = oi.shop_id
        LEFT JOIN (
          SELECT 
            si.shop_id,
            si.id as latest_invoice_id,
            si.status as latest_invoice_status,
            si.invoice_document as latest_invoice_document,
            si.submitted_at as latest_invoice_submitted_at
          FROM subscription_invoices si
          JOIN (
            SELECT shop_id, MAX(submitted_at) as latest_submitted_at
            FROM subscription_invoices
            GROUP BY shop_id
          ) last_sub 
            ON last_sub.shop_id = si.shop_id 
            AND last_sub.latest_submitted_at = si.submitted_at
        ) latest_invoice ON latest_invoice.shop_id = u.id
        WHERE u.type = 'shop'
        GROUP BY u.id
      ) shop_stats
      ORDER BY 
        CASE 
          WHEN shop_stats.latest_invoice_status = 'pending' THEN 0
          WHEN shop_stats.verification_status = 'pending' THEN 1
          WHEN shop_stats.verification_status = 'approved' THEN 2
          WHEN shop_stats.verification_status = 'rejected' THEN 3
          ELSE 4
        END,
        COALESCE(shop_stats.latest_invoice_submitted_at, shop_stats.created_at) DESC
    `;

    const [results] = await db.query(query);
    res.json(results);
  } catch (error) {
    console.error('❌ [ADMIN] Erreur récupération vérifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Approuver une vérification (donne automatiquement 1 mois d'abonnement)
router.post('/verifications/:shopId/approve', authenticateAdmin, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Récupérer l'utilisateur
    const [users] = await connection.query(
      'SELECT * FROM users WHERE id = ? AND type = \'shop\'',
      [req.params.shopId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    // Calculer les dates d'abonnement (1 mois)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // Mettre à jour la vérification ET l'abonnement
    await connection.query(
      `UPDATE users 
       SET is_verified = TRUE,
           verification_status = 'approved',
           verification_date = NOW(),
           is_subscribed = TRUE,
           subscription_end_date = ?
       WHERE id = ?`,
      [endDate, req.params.shopId]
    );

    // Créer l'abonnement dans shop_subscriptions (shop_id = user_id de type shop)
    await connection.query(
      `INSERT INTO shop_subscriptions (shop_id, start_date, end_date, is_active)
       VALUES (?, ?, ?, TRUE)`,
      [req.params.shopId, startDate, endDate]
    )

    await connection.commit();

    // 🔔 Notifier la boutique
    await notifyShop(
      req.params.shopId,
      '✅ Boutique vérifiée !',
      'Félicitations ! Votre boutique a été vérifiée. Vous bénéficiez d\'un mois d\'abonnement gratuit.',
      { type: 'verification_approved', screen: 'Profile' }
    );

    res.json({ 
      message: 'Boutique vérifiée et abonnement de 1 mois activé',
      subscription: {
        start_date: startDate,
        end_date: endDate
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [ADMIN] Erreur approbation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// Rejeter une vérification
router.post('/verifications/:shopId/reject', authenticateAdmin, async (req, res) => {
  try {
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

    // 🔔 Notifier la boutique
    await notifyShop(
      req.params.shopId,
      '❌ Vérification refusée',
      `Votre demande de vérification a été refusée. Raison: ${reason}`,
      { type: 'verification_rejected', reason, screen: 'Profile' }
    );

    res.json({ message: 'Vérification rejetée' });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur rejet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ GESTION DES FACTURES D'ABONNEMENT ============

// Obtenir toutes les factures
router.get('/invoices', authenticateAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        si.*,
        u.name,
        u.email,
        s.shop_name,
        u.is_subscribed,
        u.subscription_end_date,
        admin.name as reviewed_by_name
      FROM subscription_invoices si
      JOIN shops s ON si.shop_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN users admin ON si.reviewed_by = admin.id
      ORDER BY 
        CASE si.status
          WHEN 'pending' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'rejected' THEN 3
        END,
        si.submitted_at DESC
    `;

    const [results] = await db.query(query);
    res.json(results);
  } catch (error) {
    console.error('❌ [ADMIN] Erreur récupération factures:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Approuver une facture (donne 1 mois d'abonnement)
router.post('/invoices/:invoiceId/approve', authenticateAdmin, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Récupérer la facture
    const [invoices] = await connection.query(
      'SELECT * FROM subscription_invoices WHERE id = ?',
      [req.params.invoiceId]
    );

    if (invoices.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = invoices[0];

    if (invoice.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'Cette facture a déjà été traitée' });
    }

    // Calculer les dates d'abonnement (1 mois)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // Mettre à jour la facture
    await connection.query(
      `UPDATE subscription_invoices 
       SET status = 'approved',
           reviewed_at = NOW(),
           reviewed_by = ?,
           subscription_start_date = ?,
           subscription_end_date = ?
       WHERE id = ?`,
      [req.user.id, startDate, endDate, req.params.invoiceId]
    );

    // Créer l'abonnement
    await connection.query(
      `INSERT INTO shop_subscriptions (shop_id, start_date, end_date, invoice_id)
       VALUES (?, ?, ?, ?)`,
      [invoice.shop_id, startDate, endDate, req.params.invoiceId]
    );

    // Mettre à jour l'utilisateur
    await connection.query(
      `UPDATE users 
       SET is_subscribed = TRUE,
           subscription_end_date = ?
       WHERE id = ?`,
      [endDate, invoice.shop_id]
    );

    await connection.commit();

    // 🔔 Notifier la boutique
    await notifyShop(
      invoice.shop_id,
      '✅ Paiement accepté !',
      'Votre paiement a été validé. Votre abonnement est maintenant actif pour 1 mois.',
      { type: 'invoice_approved', invoiceId: req.params.invoiceId, screen: 'Profile' }
    );

    res.json({
      message: 'Facture approuvée et abonnement activé pour 1 mois',
      subscription: {
        start_date: startDate,
        end_date: endDate
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [ADMIN] Erreur approbation facture:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// Rejeter une facture
router.post('/invoices/:invoiceId/reject', authenticateAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Raison du rejet requise' });
    }

    // Récupérer le shop_id avant la mise à jour
    const [invoices] = await db.query(
      'SELECT shop_id FROM subscription_invoices WHERE id = ?',
      [req.params.invoiceId]
    );

    const [result] = await db.query(
      `UPDATE subscription_invoices 
       SET status = 'rejected',
           reviewed_at = NOW(),
           reviewed_by = ?,
           rejection_reason = ?
       WHERE id = ? AND status = 'pending'`,
      [req.user.id, reason, req.params.invoiceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Facture non trouvée ou déjà traitée' });
    }

    // 🔔 Notifier la boutique
    if (invoices.length > 0) {
      await notifyShop(
        invoices[0].shop_id,
        '❌ Paiement refusé',
        `Votre paiement a été refusé. Raison: ${reason}`,
        { type: 'invoice_rejected', reason, invoiceId: req.params.invoiceId, screen: 'Profile' }
      );
    }

    res.json({ message: 'Facture rejetée' });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur rejet facture:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ STATISTIQUES ============

router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE type = 'shop') as total_shops,
        (SELECT COUNT(*) FROM users WHERE type = 'shop' AND is_verified = TRUE) as verified_shops,
        (SELECT COUNT(*) FROM users WHERE type = 'shop' AND verification_status = 'pending') as pending_verifications,
        (SELECT COUNT(*) FROM subscription_invoices WHERE status = 'pending') as pending_invoices,
        (SELECT COUNT(*) FROM users WHERE type = 'shop' AND is_subscribed = TRUE) as subscribed_shops,
        (SELECT COUNT(*) FROM users WHERE type = 'customer') as total_customers,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed') as total_revenue,
        (SELECT COUNT(*) FROM videos) as total_videos
    `);

    res.json(stats[0]);
  } catch (error) {
    console.error('❌ [ADMIN] Erreur statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ GESTION DES UTILISATEURS ============

// Obtenir tous les utilisateurs
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.type,
        u.is_verified,
        u.is_subscribed,
        u.subscription_end_date,
        u.created_at,
        s.shop_name,
        (SELECT COUNT(*) FROM products p 
         JOIN shops sh ON p.shop_id = sh.id 
         WHERE sh.user_id = u.id) as product_count,
        (SELECT COUNT(*) FROM orders o 
         WHERE o.user_id = u.id) as order_count
      FROM users u
      LEFT JOIN shops s ON u.id = s.user_id
      ORDER BY u.created_at DESC
    `;

    const [results] = await db.query(query);
    res.json(results);
  } catch (error) {
    console.error('❌ [ADMIN] Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un utilisateur
router.delete('/users/:userId', authenticateAdmin, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Vérifier que ce n'est pas un admin
    const [users] = await connection.query(
      'SELECT * FROM users WHERE id = ?',
      [req.params.userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];

    if (user.type === 'admin') {
      await connection.rollback();
      return res.status(403).json({ error: 'Impossible de supprimer un administrateur' });
    }

    let filesDeleted = 0;

    // Si c'est une boutique, supprimer toutes les données associées
    if (user.type === 'shop') {
      const [shops] = await connection.query(
        'SELECT * FROM shops WHERE user_id = ?',
        [req.params.userId]
      );

      if (shops.length > 0) {
        const shop = shops[0];
        const shopId = shop.id;

        // Récupérer et supprimer les fichiers vidéos
        const [videos] = await connection.query(
          'SELECT video_url, video_url_high, video_url_medium, video_url_low, thumbnail_url FROM videos WHERE shop_id = ?',
          [shopId]
        );
        for (const video of videos) {
          filesDeleted += deleteVideoFiles(video);
        }

        // Récupérer et supprimer les fichiers produits
        const [products] = await connection.query(
          'SELECT id, image_url FROM products WHERE shop_id = ?',
          [shopId]
        );
        for (const product of products) {
          // Récupérer les images supplémentaires du produit
          const [productImages] = await connection.query(
            'SELECT image_url FROM product_images WHERE product_id = ?',
            [product.id]
          );
          filesDeleted += deleteProductFiles(product, productImages);
        }

        // Supprimer les fichiers de la boutique (logo, banner)
        filesDeleted += deleteShopFiles(shop);

        // Supprimer les vidéos et leurs dépendances
        await connection.query('DELETE vl FROM video_likes vl JOIN videos v ON vl.video_id = v.id WHERE v.shop_id = ?', [shopId]);
        await connection.query('DELETE cl FROM comment_likes cl JOIN comments c ON cl.comment_id = c.id JOIN videos v ON c.video_id = v.id WHERE v.shop_id = ?', [shopId]);
        await connection.query('DELETE c FROM comments c JOIN videos v ON c.video_id = v.id WHERE v.shop_id = ?', [shopId]);
        await connection.query('DELETE FROM videos WHERE shop_id = ?', [shopId]);

        // Supprimer les images de produits
        await connection.query('DELETE pi FROM product_images pi JOIN products p ON pi.product_id = p.id WHERE p.shop_id = ?', [shopId]);
        
        // Supprimer les produits
        await connection.query('DELETE FROM products WHERE shop_id = ?', [shopId]);

        // Supprimer les abonnements
        await connection.query('DELETE FROM shop_subscriptions WHERE shop_id = ?', [shopId]);
        await connection.query('DELETE FROM subscription_invoices WHERE shop_id = ?', [shopId]);

        // Supprimer les subscriptions des utilisateurs à cette boutique
        await connection.query('DELETE FROM subscriptions WHERE shop_id = ?', [shopId]);

        // Supprimer la boutique
        await connection.query('DELETE FROM shops WHERE id = ?', [shopId]);
      }
    }

    // Si c'est un client, supprimer ses commandes
    if (user.type === 'customer' || user.type === 'client') {
      await connection.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', [req.params.userId]);
      await connection.query('DELETE FROM orders WHERE user_id = ?', [req.params.userId]);
      
      // Supprimer ses likes et commentaires
      await connection.query('DELETE FROM video_likes WHERE user_id = ?', [req.params.userId]);
      await connection.query('DELETE FROM comment_likes WHERE user_id = ?', [req.params.userId]);
      await connection.query('DELETE FROM comments WHERE user_id = ?', [req.params.userId]);
      
      // Supprimer ses abonnements aux boutiques
      await connection.query('DELETE FROM subscriptions WHERE user_id = ?', [req.params.userId]);
      
      // Supprimer son panier
      await connection.query('DELETE FROM cart_items WHERE user_id = ?', [req.params.userId]);
    }

    // Supprimer l'avatar de l'utilisateur
    filesDeleted += deleteUserFiles(user);

    // Supprimer l'utilisateur
    await connection.query('DELETE FROM users WHERE id = ?', [req.params.userId]);

    await connection.commit();

    console.log(`✅ [ADMIN] Utilisateur ${req.params.userId} supprimé avec ${filesDeleted} fichiers`);

    res.json({ 
      message: 'Utilisateur supprimé avec succès',
      deleted_by: req.user.id,
      files_deleted: filesDeleted
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [ADMIN] Erreur suppression utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// ============ GESTION DES BOUTIQUES ============

// Annuler l'abonnement d'une boutique (révoque aussi la vérification)
router.post('/shops/:shopId/cancel-subscription', authenticateAdmin, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Vérifier que l'utilisateur existe et récupérer la dernière date d'abonnement
    const [users] = await connection.query(
      'SELECT subscription_end_date FROM users WHERE id = ? AND type = \'shop\'',
      [req.params.shopId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const lastSubscriptionEnd = users[0].subscription_end_date;

    // Récupérer le shop_id depuis user_id
    const [shops] = await connection.query(
      'SELECT id FROM shops WHERE user_id = ?',
      [req.params.shopId]
    );

    if (shops.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;

    // Révoquer la vérification ET l'abonnement
    await connection.query(
      `UPDATE users 
       SET is_verified = FALSE,
           verification_status = 'rejected',
           is_subscribed = FALSE,
           rejection_reason = ?
       WHERE id = ?`,
      ['Abonnement annulé par l\'administrateur', req.params.shopId]
    );

    // Désactiver tous les abonnements actifs dans shop_subscriptions
    await connection.query(
      `UPDATE shop_subscriptions 
       SET is_active = FALSE
       WHERE shop_id = ? AND is_active = TRUE`,
      [shopId]
    );

    await connection.commit();

    res.json({ 
      message: 'Vérification et abonnement révoqués',
      cancelled_by: req.user.id,
      last_subscription_end_date: lastSubscriptionEnd
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [ADMIN] Erreur annulation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// Ré-approuver une boutique annulée (1 mois supplémentaire basé sur la dernière facture)
router.post('/shops/:shopId/reapprove', authenticateAdmin, async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query(
      'SELECT * FROM users WHERE id = ? AND type = \'shop\'',
      [req.params.shopId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const [latestInvoices] = await connection.query(
      `SELECT * FROM subscription_invoices 
       WHERE shop_id = ? 
       ORDER BY submitted_at DESC 
       LIMIT 1`,
      [req.params.shopId]
    );

    if (latestInvoices.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Aucune facture trouvée pour cette boutique' });
    }

    const invoice = latestInvoices[0];

    if (invoice.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'La dernière facture n\'est pas en attente' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    await connection.query(
      `UPDATE subscription_invoices 
       SET status = 'approved',
           reviewed_at = NOW(),
           reviewed_by = ?,
           subscription_start_date = ?,
           subscription_end_date = ?
       WHERE id = ?`,
      [req.user.id, startDate, endDate, invoice.id]
    );

    await connection.query(
      `UPDATE shop_subscriptions 
       SET is_active = FALSE
       WHERE shop_id = ? AND is_active = TRUE`,
      [req.params.shopId]
    );

    await connection.query(
      `INSERT INTO shop_subscriptions (shop_id, start_date, end_date, invoice_id, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [req.params.shopId, startDate, endDate, invoice.id]
    );

    await connection.query(
      `UPDATE users 
       SET is_verified = TRUE,
           verification_status = 'approved',
           verification_date = NOW(),
           rejection_reason = NULL,
           is_subscribed = TRUE,
           subscription_end_date = ?
       WHERE id = ?`,
      [endDate, req.params.shopId]
    );

    await connection.commit();

    await notifyShop(
      req.params.shopId,
      '✅ Abonnement renouvelé !',
      'Votre abonnement a été ré-approuvé pour 1 mois.',
      { type: 'subscription_reapproved', invoiceId: invoice.id, screen: 'Profile' }
    );

    res.json({
      message: 'Boutique ré-approuvée et abonnement prolongé de 1 mois',
      subscription: {
        start_date: startDate,
        end_date: endDate
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [ADMIN] Erreur ré-approbation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// Modifier la date d'abonnement d'une boutique
router.put('/shops/:shopId/subscription', authenticateAdmin, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { end_date } = req.body;
    
    if (!end_date) {
      return res.status(400).json({ error: 'Date de fin requise' });
    }

    // Vérifier que la boutique existe
    const [shops] = await connection.query(
      'SELECT id FROM shops WHERE user_id = ?',
      [req.params.shopId]
    );

    if (shops.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;
    const newEndDate = new Date(end_date);

    // Mettre à jour la date dans users
    await connection.query(
      `UPDATE users 
       SET subscription_end_date = ?,
           is_subscribed = TRUE
       WHERE id = ?`,
      [newEndDate, req.params.shopId]
    );

    // Mettre à jour l'abonnement actif dans shop_subscriptions
    await connection.query(
      `UPDATE shop_subscriptions 
       SET end_date = ?
       WHERE shop_id = ? AND is_active = TRUE`,
      [newEndDate, shopId]
    );

    await connection.commit();

    console.log(`✅ [ADMIN] Date abonnement modifiée pour boutique ${shopId}: ${newEndDate.toISOString()} (par ${req.user.name})`);

    res.json({ 
      message: 'Date d\'abonnement modifiée avec succès',
      new_end_date: newEndDate,
      modified_by: req.user.id
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [ADMIN] Erreur modification date abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// Obtenir toutes les boutiques
router.get('/shops', authenticateAdmin, async (req, res) => {
  try {
    // Requête simplifiée sans GROUP BY
    const query = `
      SELECT 
        s.id,
        s.shop_name,
        s.description,
        s.logo_url,
        s.banner_url,
        s.verified,
        s.created_at,
        u.name as owner_name,
        u.email as owner_email,
        u.is_verified,
        u.verification_status,
        u.is_subscribed,
        u.subscription_end_date
      FROM shops s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `;

    const [shops] = await db.query(query);
    
    // Récupérer les compteurs séparément pour chaque boutique
    for (let shop of shops) {
      // Compter les produits
      const [productCount] = await db.query(
        'SELECT COUNT(*) as count FROM products WHERE shop_id = ?',
        [shop.id]
      );
      shop.product_count = productCount[0].count;
      
      // Compter les vidéos
      const [videoCount] = await db.query(
        'SELECT COUNT(*) as count FROM videos WHERE shop_id = ?',
        [shop.id]
      );
      shop.video_count = videoCount[0].count;
      
      // Compter les commandes (via order_items)
      const [orderCount] = await db.query(
        'SELECT COUNT(DISTINCT order_id) as count FROM order_items WHERE shop_id = ?',
        [shop.id]
      );
      shop.order_count = orderCount[0].count;
    }

    res.json(shops);
  } catch (error) {
    console.error('❌ [ADMIN] Erreur récupération boutiques:', error);
    console.error('Détails:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ============ GESTION DES VIDÉOS ============

// Obtenir toutes les vidéos pour modération
router.get('/videos', authenticateAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        v.*,
        s.shop_name,
        u.name as shop_owner_name,
        u.email as shop_owner_email,
        p.name as product_name,
        (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comments_count
      FROM videos v
      JOIN shops s ON v.shop_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN products p ON v.product_id = p.id
      ORDER BY v.created_at DESC
    `;

    const [results] = await db.query(query);
    
    // Ajouter reports_count = 0 pour chaque vidéo (table pas encore créée)
    const videosWithReports = results.map(video => ({
      ...video,
      reports_count: 0
    }));
    
    res.json(videosWithReports);
  } catch (error) {
    console.error('❌ [ADMIN] Erreur récupération vidéos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une vidéo
router.delete('/videos/:videoId', authenticateAdmin, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Récupérer les infos de la vidéo
    const [videos] = await connection.query(
      'SELECT * FROM videos WHERE id = ?',
      [req.params.videoId]
    );

    if (videos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }

    const video = videos[0];

    // Supprimer les fichiers vidéo et thumbnail du serveur
    const filesDeleted = deleteVideoFiles(video);

    // Supprimer les likes des commentaires
    await connection.query('DELETE cl FROM comment_likes cl JOIN comments c ON cl.comment_id = c.id WHERE c.video_id = ?', [req.params.videoId]);

    // Supprimer les likes
    await connection.query('DELETE FROM video_likes WHERE video_id = ?', [req.params.videoId]);

    // Supprimer les commentaires
    await connection.query('DELETE FROM comments WHERE video_id = ?', [req.params.videoId]);

    // Supprimer les signalements si la table existe
    await connection.query('DELETE FROM video_reports WHERE video_id = ?', [req.params.videoId]).catch(() => {});

    // Supprimer la vidéo
    await connection.query('DELETE FROM videos WHERE id = ?', [req.params.videoId]);

    await connection.commit();

    console.log(`✅ [ADMIN] Vidéo ${req.params.videoId} supprimée avec ${filesDeleted} fichiers`);

    res.json({ 
      message: 'Vidéo supprimée avec succès',
      deleted_by: req.user.id,
      files_deleted: filesDeleted
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ [ADMIN] Erreur suppression vidéo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// ============ NOTIFICATIONS PUSH ============

// Envoyer une notification à tous les utilisateurs
router.post('/send-notification', authenticateAdmin, async (req, res) => {
  try {
    const { title, body, target } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Titre et message requis' });
    }

    // Construire la requête selon la cible
    let query = 'SELECT id, push_token, push_enabled FROM users WHERE push_token IS NOT NULL AND push_enabled = TRUE';
    
    if (target === 'clients') {
      query += " AND type = 'customer'";
    } else if (target === 'shops') {
      query += " AND type = 'shop'";
    }
    // target === 'all' : pas de filtre supplémentaire

    const [users] = await db.query(query);

    console.log(`📢 [ADMIN NOTIF] Envoi à ${users.length} utilisateurs (cible: ${target})`);

    let sentCount = 0;
    let failedCount = 0;

    // Envoyer les notifications en parallèle par lots de 50
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const promises = batch.map(async (user) => {
        try {
          await sendPushNotification(user.push_token, {
            title,
            body,
            data: { type: 'admin_broadcast' }
          });
          sentCount++;
        } catch (error) {
          console.error(`❌ Erreur envoi à user ${user.id}:`, error.message);
          failedCount++;
        }
      });

      await Promise.all(promises);
    }

    console.log(`✅ [ADMIN NOTIF] Envoyé: ${sentCount}, Échoué: ${failedCount}`);

    res.json({
      message: 'Notifications envoyées',
      sent_count: sentCount,
      failed_count: failedCount,
      total_targets: users.length
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur envoi notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Signaler une vidéo (pour les utilisateurs)
router.post('/videos/:videoId/report', authenticateAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Raison requise' });
    }

    // Créer la table si elle n'existe pas
    await db.query(`
      CREATE TABLE IF NOT EXISTS video_reports (
        id INT PRIMARY KEY AUTO_INCREMENT,
        video_id INT NOT NULL,
        reported_by INT NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.query(
      'INSERT INTO video_reports (video_id, reported_by, reason) VALUES (?, ?, ?)',
      [req.params.videoId, req.user.id, reason]
    );

    res.json({ message: 'Vidéo signalée' });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur signalement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ GESTION DU MODE DE STOCKAGE ============

const storageMode = require('../services/storage-mode');
const bunnyCdn = require('../services/bunny-cdn');

// GET /api/admin/storage-config - Récupérer la configuration de stockage
router.get('/storage-config', authenticateAdmin, async (req, res) => {
  try {
    const config = await storageMode.getStorageConfig();
    
    // Ajouter le statut BunnyCDN
    const bunnyConfigured = bunnyCdn.isConfigured();
    
    res.json({
      ...config,
      bunny_configured: bunnyConfigured,
      bunny_url: bunnyConfigured ? bunnyCdn.getCdnBaseUrl() : null,
      description: config.mode === 'bunny' 
        ? 'Les médias sont stockés sur BunnyCDN (cloud)'
        : 'Les médias sont stockés localement sur le serveur'
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur récupération config stockage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/storage-config - Changer le mode de stockage
router.put('/storage-config', authenticateAdmin, async (req, res) => {
  try {
    const { mode } = req.body;
    
    if (!mode || !['bunny', 'local'].includes(mode)) {
      return res.status(400).json({ 
        error: 'Mode invalide. Utilisez "bunny" ou "local"' 
      });
    }
    
    // Vérifier si BunnyCDN est configuré avant de passer en mode bunny
    if (mode === 'bunny' && !bunnyCdn.isConfigured()) {
      return res.status(400).json({ 
        error: 'BunnyCDN n\'est pas configuré. Ajoutez les variables d\'environnement BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY et BUNNY_CDN_URL avant d\'activer ce mode.',
        bunny_configured: false
      });
    }
    
    await storageMode.setStorageMode(mode, req.user.id);
    
    const newConfig = await storageMode.getStorageConfig();
    
    console.log(`✅ [ADMIN] Mode de stockage changé: ${mode} (par ${req.user.name})`);
    
    res.json({
      message: `Mode de stockage changé: ${mode}`,
      config: {
        ...newConfig,
        bunny_configured: bunnyCdn.isConfigured(),
        description: mode === 'bunny' 
          ? 'Les médias sont maintenant stockés sur BunnyCDN (cloud)'
          : 'Les médias sont maintenant stockés localement sur le serveur'
      }
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur changement mode stockage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ GESTION DES INFLUENCEURS ET CODES PROMO ============

// Initialiser les tables influenceurs et codes promo
async function initPromoTables() {
  try {
    // Table des influenceurs
    await db.query(`
      CREATE TABLE IF NOT EXISTS influencers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        instagram VARCHAR(255),
        tiktok VARCHAR(255),
        youtube VARCHAR(255),
        commission_rate DECIMAL(5,2) DEFAULT 10.00,
        total_earnings DECIMAL(10,2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Table des codes promo
    await db.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(50) UNIQUE NOT NULL,
        influencer_id INT,
        discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
        discount_value DECIMAL(10,2) NOT NULL,
        min_order_amount DECIMAL(10,2) DEFAULT 0,
        max_discount DECIMAL(10,2),
        usage_limit INT,
        usage_count INT DEFAULT 0,
        valid_from DATETIME,
        valid_until DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        applies_to ENUM('all', 'subscription', 'products') DEFAULT 'subscription',
        description TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Table de suivi des utilisations de codes promo
    await db.query(`
      CREATE TABLE IF NOT EXISTS promo_code_usage (
        id INT PRIMARY KEY AUTO_INCREMENT,
        promo_code_id INT NOT NULL,
        shop_id INT NOT NULL,
        user_id INT,
        order_amount DECIMAL(10,2),
        discount_amount DECIMAL(10,2),
        commission_amount DECIMAL(10,2),
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ [PROMO] Tables initialisées');
  } catch (error) {
    console.error('❌ [PROMO] Erreur initialisation tables:', error.message);
  }
}

// Initialiser les tables au démarrage
initPromoTables();

// -------- INFLUENCEURS --------

// GET /api/admin/influencers - Liste des influenceurs
router.get('/influencers', authenticateAdmin, async (req, res) => {
  try {
    const [influencers] = await db.query(`
      SELECT 
        i.*,
        u.name as created_by_name,
        COUNT(DISTINCT pc.id) as promo_codes_count,
        COALESCE(SUM(pcu.commission_amount), 0) as total_commissions
      FROM influencers i
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN promo_codes pc ON i.id = pc.influencer_id
      LEFT JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);

    res.json(influencers);
  } catch (error) {
    console.error('❌ [ADMIN] Erreur liste influenceurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/influencers/:id - Détails d'un influenceur
router.get('/influencers/:id', authenticateAdmin, async (req, res) => {
  try {
    const [influencers] = await db.query(`
      SELECT i.*, u.name as created_by_name
      FROM influencers i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (influencers.length === 0) {
      return res.status(404).json({ error: 'Influenceur non trouvé' });
    }

    // Récupérer les codes promo de l'influenceur
    const [promoCodes] = await db.query(`
      SELECT pc.*, COUNT(pcu.id) as total_uses, COALESCE(SUM(pcu.commission_amount), 0) as total_earned
      FROM promo_codes pc
      LEFT JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
      WHERE pc.influencer_id = ?
      GROUP BY pc.id
      ORDER BY pc.created_at DESC
    `, [req.params.id]);

    // Récupérer les statistiques d'utilisation
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_uses,
        COALESCE(SUM(pcu.discount_amount), 0) as total_discounts,
        COALESCE(SUM(pcu.commission_amount), 0) as total_commissions,
        COALESCE(SUM(pcu.order_amount), 0) as total_order_amount
      FROM promo_code_usage pcu
      JOIN promo_codes pc ON pcu.promo_code_id = pc.id
      WHERE pc.influencer_id = ?
    `, [req.params.id]);

    res.json({
      ...influencers[0],
      promo_codes: promoCodes,
      stats: stats[0]
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur détails influenceur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/admin/influencers - Créer un influenceur
router.post('/influencers', authenticateAdmin, async (req, res) => {
  try {
    const { name, email, phone, instagram, tiktok, youtube, commission_rate, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const [result] = await db.query(`
      INSERT INTO influencers (name, email, phone, instagram, tiktok, youtube, commission_rate, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, email || null, phone || null, instagram || null, tiktok || null, youtube || null, commission_rate || 10, notes || null, req.user.id]);

    console.log(`✅ [ADMIN] Influenceur créé: ${name} (ID: ${result.insertId}) par ${req.user.name}`);

    res.status(201).json({
      message: 'Influenceur créé avec succès',
      id: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    console.error('❌ [ADMIN] Erreur création influenceur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/influencers/:id - Modifier un influenceur
router.put('/influencers/:id', authenticateAdmin, async (req, res) => {
  try {
    const { name, email, phone, instagram, tiktok, youtube, commission_rate, is_active, notes } = req.body;

    const [result] = await db.query(`
      UPDATE influencers 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          instagram = COALESCE(?, instagram),
          tiktok = COALESCE(?, tiktok),
          youtube = COALESCE(?, youtube),
          commission_rate = COALESCE(?, commission_rate),
          is_active = COALESCE(?, is_active),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `, [name, email, phone, instagram, tiktok, youtube, commission_rate, is_active, notes, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Influenceur non trouvé' });
    }

    console.log(`✅ [ADMIN] Influenceur modifié: ID ${req.params.id} par ${req.user.name}`);
    res.json({ message: 'Influenceur modifié avec succès' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    console.error('❌ [ADMIN] Erreur modification influenceur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/influencers/:id - Supprimer un influenceur
router.delete('/influencers/:id', authenticateAdmin, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM influencers WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Influenceur non trouvé' });
    }

    console.log(`✅ [ADMIN] Influenceur supprimé: ID ${req.params.id} par ${req.user.name}`);
    res.json({ message: 'Influenceur supprimé avec succès' });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur suppression influenceur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// -------- CODES PROMO --------

// GET /api/admin/promo-codes - Liste des codes promo
router.get('/promo-codes', authenticateAdmin, async (req, res) => {
  try {
    const [promoCodes] = await db.query(`
      SELECT 
        pc.*,
        i.name as influencer_name,
        u.name as created_by_name,
        COUNT(pcu.id) as total_uses,
        COALESCE(SUM(pcu.discount_amount), 0) as total_discounts
      FROM promo_codes pc
      LEFT JOIN influencers i ON pc.influencer_id = i.id
      LEFT JOIN users u ON pc.created_by = u.id
      LEFT JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
      GROUP BY pc.id
      ORDER BY pc.created_at DESC
    `);

    res.json(promoCodes);
  } catch (error) {
    console.error('❌ [ADMIN] Erreur liste codes promo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/promo-codes/:id - Détails d'un code promo
router.get('/promo-codes/:id', authenticateAdmin, async (req, res) => {
  try {
    const [promoCodes] = await db.query(`
      SELECT pc.*, i.name as influencer_name, u.name as created_by_name
      FROM promo_codes pc
      LEFT JOIN influencers i ON pc.influencer_id = i.id
      LEFT JOIN users u ON pc.created_by = u.id
      WHERE pc.id = ?
    `, [req.params.id]);

    if (promoCodes.length === 0) {
      return res.status(404).json({ error: 'Code promo non trouvé' });
    }

    // Récupérer l'historique d'utilisation
    const [usage] = await db.query(`
      SELECT pcu.*, s.shop_name, u.name as user_name
      FROM promo_code_usage pcu
      JOIN shops s ON pcu.shop_id = s.id
      LEFT JOIN users u ON pcu.user_id = u.id
      WHERE pcu.promo_code_id = ?
      ORDER BY pcu.used_at DESC
      LIMIT 50
    `, [req.params.id]);

    res.json({
      ...promoCodes[0],
      usage_history: usage
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur détails code promo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/admin/promo-codes - Créer un code promo
router.post('/promo-codes', authenticateAdmin, async (req, res) => {
  try {
    const { 
      code, 
      influencer_id, 
      discount_type, 
      discount_value, 
      min_order_amount,
      max_discount,
      usage_limit, 
      valid_from, 
      valid_until, 
      applies_to,
      description 
    } = req.body;

    if (!code || !discount_value) {
      return res.status(400).json({ error: 'Code et valeur de réduction requis' });
    }

    // Générer un code en majuscules sans espaces
    const cleanCode = code.toUpperCase().replace(/\s/g, '');

    const [result] = await db.query(`
      INSERT INTO promo_codes (
        code, influencer_id, discount_type, discount_value, min_order_amount,
        max_discount, usage_limit, valid_from, valid_until, applies_to, description, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cleanCode, 
      influencer_id || null, 
      discount_type || 'percentage', 
      discount_value,
      min_order_amount || 0,
      max_discount || null,
      usage_limit || null, 
      valid_from || null, 
      valid_until || null,
      applies_to || 'subscription',
      description || null,
      req.user.id
    ]);

    console.log(`✅ [ADMIN] Code promo créé: ${cleanCode} (ID: ${result.insertId}) par ${req.user.name}`);

    res.status(201).json({
      message: 'Code promo créé avec succès',
      id: result.insertId,
      code: cleanCode
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ce code promo existe déjà' });
    }
    console.error('❌ [ADMIN] Erreur création code promo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/promo-codes/:id - Modifier un code promo
router.put('/promo-codes/:id', authenticateAdmin, async (req, res) => {
  try {
    const { 
      code,
      influencer_id, 
      discount_type, 
      discount_value, 
      min_order_amount,
      max_discount,
      usage_limit, 
      valid_from, 
      valid_until, 
      is_active,
      applies_to,
      description 
    } = req.body;

    const cleanCode = code ? code.toUpperCase().replace(/\s/g, '') : undefined;

    const [result] = await db.query(`
      UPDATE promo_codes 
      SET code = COALESCE(?, code),
          influencer_id = COALESCE(?, influencer_id),
          discount_type = COALESCE(?, discount_type),
          discount_value = COALESCE(?, discount_value),
          min_order_amount = COALESCE(?, min_order_amount),
          max_discount = COALESCE(?, max_discount),
          usage_limit = COALESCE(?, usage_limit),
          valid_from = COALESCE(?, valid_from),
          valid_until = COALESCE(?, valid_until),
          is_active = COALESCE(?, is_active),
          applies_to = COALESCE(?, applies_to),
          description = COALESCE(?, description)
      WHERE id = ?
    `, [
      cleanCode, influencer_id, discount_type, discount_value, min_order_amount,
      max_discount, usage_limit, valid_from, valid_until, is_active, applies_to, description, req.params.id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Code promo non trouvé' });
    }

    console.log(`✅ [ADMIN] Code promo modifié: ID ${req.params.id} par ${req.user.name}`);
    res.json({ message: 'Code promo modifié avec succès' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ce code promo existe déjà' });
    }
    console.error('❌ [ADMIN] Erreur modification code promo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/promo-codes/:id - Supprimer un code promo
router.delete('/promo-codes/:id', authenticateAdmin, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM promo_codes WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Code promo non trouvé' });
    }

    console.log(`✅ [ADMIN] Code promo supprimé: ID ${req.params.id} par ${req.user.name}`);
    res.json({ message: 'Code promo supprimé avec succès' });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur suppression code promo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// -------- STATISTIQUES PROMO --------

// GET /api/admin/promo-stats - Statistiques globales des codes promo
router.get('/promo-stats', authenticateAdmin, async (req, res) => {
  try {
    // Stats globales
    const [globalStats] = await db.query(`
      SELECT 
        COUNT(DISTINCT pc.id) as total_codes,
        COUNT(DISTINCT i.id) as total_influencers,
        COUNT(pcu.id) as total_uses,
        COALESCE(SUM(pcu.discount_amount), 0) as total_discounts,
        COALESCE(SUM(pcu.commission_amount), 0) as total_commissions,
        COALESCE(SUM(pcu.order_amount), 0) as total_order_amount
      FROM promo_codes pc
      LEFT JOIN influencers i ON pc.influencer_id = i.id
      LEFT JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
    `);

    // Top influenceurs
    const [topInfluencers] = await db.query(`
      SELECT 
        i.id, i.name,
        COUNT(pcu.id) as total_uses,
        COALESCE(SUM(pcu.commission_amount), 0) as total_earned
      FROM influencers i
      JOIN promo_codes pc ON i.id = pc.influencer_id
      JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
      GROUP BY i.id
      ORDER BY total_earned DESC
      LIMIT 5
    `);

    // Top codes promo
    const [topCodes] = await db.query(`
      SELECT 
        pc.id, pc.code,
        i.name as influencer_name,
        COUNT(pcu.id) as total_uses,
        COALESCE(SUM(pcu.discount_amount), 0) as total_discounts
      FROM promo_codes pc
      LEFT JOIN influencers i ON pc.influencer_id = i.id
      JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
      GROUP BY pc.id
      ORDER BY total_uses DESC
      LIMIT 5
    `);

    // Utilisation par mois (6 derniers mois)
    const [monthlyUsage] = await db.query(`
      SELECT 
        DATE_FORMAT(used_at, '%Y-%m') as month,
        COUNT(*) as uses,
        COALESCE(SUM(discount_amount), 0) as discounts,
        COALESCE(SUM(commission_amount), 0) as commissions
      FROM promo_code_usage
      WHERE used_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(used_at, '%Y-%m')
      ORDER BY month DESC
    `);

    res.json({
      global: globalStats[0],
      top_influencers: topInfluencers,
      top_codes: topCodes,
      monthly_usage: monthlyUsage
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur stats promo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
