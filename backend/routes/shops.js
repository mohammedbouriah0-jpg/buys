const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, isShop, requireActiveSubscription } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { buildFullUrl } = require('../utils/url-helper');
const bunnyCdn = require('../services/bunny-cdn');

// Get all shops
router.get('/', async (req, res) => {
  try {
    const [shops] = await pool.query(`
      SELECT s.*, u.name as owner_name,
      (SELECT COUNT(*) FROM products WHERE shop_id = s.id) as products_count
      FROM shops s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.verified DESC, s.created_at DESC
    `);

    // Convertir les URLs
    const shopsWithUrls = shops.map(shop => ({
      ...shop,
      logo_url: shop.logo_url ? buildFullUrl(shop.logo_url, req) : null,
      banner_url: shop.banner_url ? buildFullUrl(shop.banner_url, req) : null
    }));

    res.json(shopsWithUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Search shops - endpoint optimisé pour la recherche
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ shops: [], total: 0 });
    }

    const searchTerm = `%${q}%`;
    
    const [shops] = await pool.query(`
      SELECT s.id, s.shop_name, s.description, s.logo_url, s.verified,
             (SELECT COUNT(*) FROM products WHERE shop_id = s.id) as products_count
      FROM shops s
      WHERE s.shop_name LIKE ? OR s.description LIKE ?
      ORDER BY 
        s.verified DESC,
        CASE WHEN s.shop_name LIKE ? THEN 0 ELSE 1 END,
        s.created_at DESC
      LIMIT ? OFFSET ?
    `, [searchTerm, searchTerm, `${q}%`, parseInt(limit), parseInt(offset)]);
    
    // Convertir les URLs
    const shopsWithUrls = shops.map(shop => ({
      ...shop,
      logo_url: shop.logo_url ? buildFullUrl(shop.logo_url, req) : null
    }));

    // Compter le total
    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) as total FROM shops s
      WHERE s.shop_name LIKE ? OR s.description LIKE ?
    `, [searchTerm, searchTerm]);
    
    res.json({ shops: shopsWithUrls, total });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get shop by ID
router.get('/:id', async (req, res) => {
  try {
    const [shops] = await pool.query(`
      SELECT s.*, u.name as owner_name
      FROM shops s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shop = shops[0];

    // Get products count
    const [products] = await pool.query('SELECT COUNT(*) as count FROM products WHERE shop_id = ?', [req.params.id]);
    shop.products_count = products[0].count;

    // Get videos count
    const [videos] = await pool.query('SELECT COUNT(*) as count FROM videos WHERE shop_id = ?', [req.params.id]);
    shop.videos_count = videos[0].count;

    // Get subscribers count
    const [subscribers] = await pool.query('SELECT COUNT(*) as count FROM subscriptions WHERE shop_id = ?', [req.params.id]);
    shop.subscribers_count = subscribers[0].count;

    // Convertir les URLs
    shop.logo_url = shop.logo_url ? buildFullUrl(shop.logo_url, req) : null;
    shop.banner_url = shop.banner_url ? buildFullUrl(shop.banner_url, req) : null;

    res.json(shop);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get subscribers count for a shop
router.get('/:id/subscribers-count', async (req, res) => {
  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM subscriptions WHERE shop_id = ?',
      [req.params.id]
    );
    res.json({ count: result[0].count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update shop customization (requires active subscription)
router.put('/customize', auth, requireActiveSubscription, async (req, res) => {
  try {
    const { shop_name, description, primary_color, accent_color } = req.body;

    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    await pool.query(
      'UPDATE shops SET shop_name = ?, description = ?, primary_color = ?, accent_color = ? WHERE user_id = ?',
      [shop_name, description, primary_color, accent_color, req.user.id]
    );

    res.json({ message: 'Boutique mise à jour' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Upload shop logo (requires active subscription)
router.post('/logo', auth, requireActiveSubscription, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image requise' });
    }

    let logoUrl;
    try {
      if (bunnyCdn.isConfigured()) {
        logoUrl = await bunnyCdn.uploadMulterFile(req.file, 'images');
        console.log(`✅ Logo boutique uploadé sur BunnyCDN: ${logoUrl}`);
      } else {
        logoUrl = `/uploads/images/${req.file.filename}`;
      }
    } catch (uploadError) {
      console.error(`❌ Erreur upload logo:`, uploadError.message);
      logoUrl = `/uploads/images/${req.file.filename}`;
    }

    await pool.query('UPDATE shops SET logo_url = ? WHERE user_id = ?', [logoUrl, req.user.id]);

    res.json({ logo_url: logoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Upload shop banner (requires active subscription)
router.post('/banner', auth, requireActiveSubscription, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image requise' });
    }

    let bannerUrl;
    try {
      if (bunnyCdn.isConfigured()) {
        bannerUrl = await bunnyCdn.uploadMulterFile(req.file, 'images');
        console.log(`✅ Bannière boutique uploadée sur BunnyCDN: ${bannerUrl}`);
      } else {
        bannerUrl = `/uploads/images/${req.file.filename}`;
      }
    } catch (uploadError) {
      console.error(`❌ Erreur upload bannière:`, uploadError.message);
      bannerUrl = `/uploads/images/${req.file.filename}`;
    }

    await pool.query('UPDATE shops SET banner_url = ? WHERE user_id = ?', [bannerUrl, req.user.id]);

    res.json({ banner_url: bannerUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Subscribe to shop
router.post('/:id/subscribe', auth, async (req, res) => {
  try {
    const shopId = req.params.id;

    // Check if shop exists
    const [shops] = await pool.query('SELECT id FROM shops WHERE id = ?', [shopId]);
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    // Check if already subscribed
    const [existing] = await pool.query(
      'SELECT id FROM subscriptions WHERE user_id = ? AND shop_id = ?',
      [req.user.id, shopId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Déjà abonné' });
    }

    // Subscribe
    await pool.query(
      'INSERT INTO subscriptions (user_id, shop_id) VALUES (?, ?)',
      [req.user.id, shopId]
    );

    res.json({ success: true, message: 'Abonné avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Unsubscribe from shop
router.delete('/:id/subscribe', auth, async (req, res) => {
  try {
    const shopId = req.params.id;

    await pool.query(
      'DELETE FROM subscriptions WHERE user_id = ? AND shop_id = ?',
      [req.user.id, shopId]
    );

    res.json({ success: true, message: 'Désabonné avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Check subscription status
router.get('/:id/subscription-status', auth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'SELECT id FROM subscriptions WHERE user_id = ? AND shop_id = ?',
      [req.user.id, req.params.id]
    );
    
    res.json({ is_subscribed: result.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get my shop stats (for shop owners - requires active subscription)
router.get('/my-stats', auth, requireActiveSubscription, async (req, res) => {
  try {
    // Get shop ID
    const [shops] = await pool.query(
      'SELECT id FROM shops WHERE user_id = ?',
      [req.user.id]
    );

    if (shops.length === 0) {
      return res.json({ products_count: 0, orders_count: 0 });
    }

    const shopId = shops[0].id;

    // Get products count
    const [productsResult] = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE shop_id = ?',
      [shopId]
    );

    // Get orders count (from order_items)
    const [ordersResult] = await pool.query(
      'SELECT COUNT(DISTINCT order_id) as count FROM order_items WHERE shop_id = ?',
      [shopId]
    );

    res.json({
      products_count: productsResult[0].count || 0,
      orders_count: ordersResult[0].count || 0
    });
  } catch (error) {
    console.error('Error getting shop stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get user's subscriptions
router.get('/subscriptions', auth, async (req, res) => {
  try {
    const [subscriptions] = await pool.query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM subscriptions WHERE shop_id = s.id) as subscribers_count
      FROM subscriptions sub
      JOIN shops s ON sub.shop_id = s.id
      WHERE sub.user_id = ?
      ORDER BY sub.created_at DESC
    `, [req.user.id]);

    // Convertir les URLs
    const subscriptionsWithUrls = subscriptions.map(sub => ({
      ...sub,
      logo_url: sub.logo_url ? buildFullUrl(sub.logo_url, req) : null,
      banner_url: sub.banner_url ? buildFullUrl(sub.banner_url, req) : null
    }));

    res.json(subscriptionsWithUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
