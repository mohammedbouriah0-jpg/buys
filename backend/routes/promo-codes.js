const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, isShop, requireActiveSubscription } = require('../middleware/auth');

/**
 * Routes publiques et boutique pour les codes promo
 */

// POST /api/promo-codes/validate - Valider un code promo (sans l'appliquer)
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, order_amount, applies_to } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code promo requis' });
    }

    const cleanCode = code.toUpperCase().replace(/\s/g, '');

    // Récupérer le code promo
    const [promoCodes] = await db.query(`
      SELECT pc.*, i.name as influencer_name
      FROM promo_codes pc
      LEFT JOIN influencers i ON pc.influencer_id = i.id
      WHERE pc.code = ? AND pc.is_active = TRUE
    `, [cleanCode]);

    if (promoCodes.length === 0) {
      return res.status(404).json({ 
        valid: false,
        error: 'Code promo invalide ou expiré' 
      });
    }

    const promoCode = promoCodes[0];

    // Vérifier la validité temporelle
    const now = new Date();
    if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
      return res.status(400).json({ 
        valid: false,
        error: 'Ce code promo n\'est pas encore actif' 
      });
    }
    if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
      return res.status(400).json({ 
        valid: false,
        error: 'Ce code promo a expiré' 
      });
    }

    // Vérifier la limite d'utilisation
    if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
      return res.status(400).json({ 
        valid: false,
        error: 'Ce code promo a atteint sa limite d\'utilisation' 
      });
    }

    // Vérifier le type d'application
    if (applies_to && promoCode.applies_to !== 'all' && promoCode.applies_to !== applies_to) {
      return res.status(400).json({ 
        valid: false,
        error: `Ce code promo ne s'applique pas à ${applies_to === 'subscription' ? 'l\'abonnement' : 'aux produits'}` 
      });
    }

    // Vérifier le montant minimum
    const amount = parseFloat(order_amount) || 0;
    if (promoCode.min_order_amount && amount < promoCode.min_order_amount) {
      return res.status(400).json({ 
        valid: false,
        error: `Montant minimum requis: ${promoCode.min_order_amount} DA` 
      });
    }

    // Calculer la réduction
    let discountAmount = 0;
    if (promoCode.discount_type === 'percentage') {
      discountAmount = (amount * promoCode.discount_value) / 100;
      // Appliquer le plafond si défini
      if (promoCode.max_discount && discountAmount > promoCode.max_discount) {
        discountAmount = promoCode.max_discount;
      }
    } else {
      discountAmount = promoCode.discount_value;
    }

    // Ne pas dépasser le montant de la commande
    if (discountAmount > amount) {
      discountAmount = amount;
    }

    const finalAmount = amount - discountAmount;

    res.json({
      valid: true,
      code: promoCode.code,
      discount_type: promoCode.discount_type,
      discount_value: promoCode.discount_value,
      discount_amount: discountAmount,
      original_amount: amount,
      final_amount: finalAmount,
      influencer_name: promoCode.influencer_name,
      description: promoCode.description,
      applies_to: promoCode.applies_to
    });

  } catch (error) {
    console.error('❌ [PROMO] Erreur validation code:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/promo-codes/apply - Appliquer un code promo (pour boutique/abonnement)
router.post('/apply', auth, requireActiveSubscription, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { code, order_amount, applies_to } = req.body;

    if (!code) {
      await connection.rollback();
      return res.status(400).json({ error: 'Code promo requis' });
    }

    const cleanCode = code.toUpperCase().replace(/\s/g, '');

    // Récupérer la boutique de l'utilisateur
    const [shops] = await connection.query(
      'SELECT id FROM shops WHERE user_id = ?',
      [req.user.id]
    );

    if (shops.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;

    // Récupérer et verrouiller le code promo
    const [promoCodes] = await connection.query(`
      SELECT pc.*, i.name as influencer_name, i.commission_rate
      FROM promo_codes pc
      LEFT JOIN influencers i ON pc.influencer_id = i.id
      WHERE pc.code = ? AND pc.is_active = TRUE
      FOR UPDATE
    `, [cleanCode]);

    if (promoCodes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Code promo invalide ou expiré' });
    }

    const promoCode = promoCodes[0];

    // Vérifications (même logique que validate)
    const now = new Date();
    if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
      await connection.rollback();
      return res.status(400).json({ error: 'Ce code promo n\'est pas encore actif' });
    }
    if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
      await connection.rollback();
      return res.status(400).json({ error: 'Ce code promo a expiré' });
    }
    if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
      await connection.rollback();
      return res.status(400).json({ error: 'Ce code promo a atteint sa limite d\'utilisation' });
    }
    if (applies_to && promoCode.applies_to !== 'all' && promoCode.applies_to !== applies_to) {
      await connection.rollback();
      return res.status(400).json({ error: 'Ce code promo ne s\'applique pas ici' });
    }

    const amount = parseFloat(order_amount) || 0;
    if (promoCode.min_order_amount && amount < promoCode.min_order_amount) {
      await connection.rollback();
      return res.status(400).json({ error: `Montant minimum requis: ${promoCode.min_order_amount} DA` });
    }

    // Calculer la réduction
    let discountAmount = 0;
    if (promoCode.discount_type === 'percentage') {
      discountAmount = (amount * promoCode.discount_value) / 100;
      if (promoCode.max_discount && discountAmount > promoCode.max_discount) {
        discountAmount = promoCode.max_discount;
      }
    } else {
      discountAmount = promoCode.discount_value;
    }
    if (discountAmount > amount) {
      discountAmount = amount;
    }

    // Calculer la commission de l'influenceur
    const commissionRate = promoCode.commission_rate || 0;
    const commissionAmount = (discountAmount * commissionRate) / 100;

    // Incrémenter le compteur d'utilisation
    await connection.query(
      'UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = ?',
      [promoCode.id]
    );

    // Enregistrer l'utilisation
    await connection.query(`
      INSERT INTO promo_code_usage (promo_code_id, shop_id, user_id, order_amount, discount_amount, commission_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [promoCode.id, shopId, req.user.id, amount, discountAmount, commissionAmount]);

    // Mettre à jour les gains de l'influenceur
    if (promoCode.influencer_id && commissionAmount > 0) {
      await connection.query(
        'UPDATE influencers SET total_earnings = total_earnings + ? WHERE id = ?',
        [commissionAmount, promoCode.influencer_id]
      );
    }

    await connection.commit();

    const finalAmount = amount - discountAmount;

    console.log(`✅ [PROMO] Code ${cleanCode} appliqué par boutique ${shopId}: -${discountAmount} DA`);

    res.json({
      success: true,
      code: promoCode.code,
      discount_amount: discountAmount,
      original_amount: amount,
      final_amount: finalAmount,
      commission_amount: commissionAmount,
      influencer_name: promoCode.influencer_name,
      message: `Code promo appliqué: -${discountAmount} DA`
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ [PROMO] Erreur application code:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
});

// GET /api/promo-codes/check-new-user - Vérifier si l'utilisateur est nouveau (0 commandes)
router.get('/check-new-user', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Compter les commandes de l'utilisateur
    const [orders] = await db.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
      [userId]
    );

    const isNewUser = orders[0].count === 0;

    // Si nouveau, chercher un code promo pour nouveaux utilisateurs (description contient "nouveau" ou "welcome" ou "bienvenue")
    let welcomeCode = null;
    if (isNewUser) {
      const [codes] = await db.query(`
        SELECT code, discount_type, discount_value, max_discount, description
        FROM promo_codes 
        WHERE is_active = TRUE 
          AND (applies_to = 'all' OR applies_to = 'products')
          AND (LOWER(description) LIKE '%nouveau%' OR LOWER(description) LIKE '%welcome%' OR LOWER(description) LIKE '%bienvenue%' OR LOWER(code) LIKE '%welcome%' OR LOWER(code) LIKE '%new%')
          AND (valid_until IS NULL OR valid_until > NOW())
          AND (usage_limit IS NULL OR usage_count < usage_limit)
        ORDER BY discount_value DESC
        LIMIT 1
      `);
      
      if (codes.length > 0) {
        welcomeCode = codes[0];
      }
    }

    res.json({
      is_new_user: isNewUser,
      orders_count: orders[0].count,
      welcome_code: welcomeCode
    });

  } catch (error) {
    console.error('❌ [PROMO] Erreur check new user:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/promo-codes/my-usage - Historique d'utilisation des codes promo (pour boutique)
router.get('/my-usage', auth, requireActiveSubscription, async (req, res) => {
  try {
    const [shops] = await db.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const [usage] = await db.query(`
      SELECT 
        pcu.*,
        pc.code,
        pc.discount_type,
        pc.discount_value,
        i.name as influencer_name
      FROM promo_code_usage pcu
      JOIN promo_codes pc ON pcu.promo_code_id = pc.id
      LEFT JOIN influencers i ON pc.influencer_id = i.id
      WHERE pcu.shop_id = ?
      ORDER BY pcu.used_at DESC
      LIMIT 50
    `, [shops[0].id]);

    // Stats
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_uses,
        COALESCE(SUM(discount_amount), 0) as total_savings
      FROM promo_code_usage
      WHERE shop_id = ?
    `, [shops[0].id]);

    res.json({
      usage,
      stats: stats[0]
    });
  } catch (error) {
    console.error('❌ [PROMO] Erreur historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
