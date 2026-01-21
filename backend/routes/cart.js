const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const { buildFullUrl } = require('../utils/url-helper');

// Get cart
router.get('/', auth, async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT c.*, p.name, p.price, p.image_url as product_image_url, p.shop_id,
      (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image_url,
      s.shop_name
      FROM cart c
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN shops s ON p.shop_id = s.id
      WHERE c.user_id = ?
    `, [req.user.id]);

    // Convertir les URLs d'images (utiliser primary_image_url si disponible, sinon product_image_url)
    const itemsWithUrls = items.map(item => {
      const imageUrl = item.primary_image_url || item.product_image_url;
      return {
        ...item,
        image_url: imageUrl ? buildFullUrl(imageUrl, req) : null,
        // Nettoyer les champs temporaires
        primary_image_url: undefined,
        product_image_url: undefined
      };
    });

    const total = itemsWithUrls.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({ items: itemsWithUrls, total });
  } catch (error) {
    console.error('Error loading cart:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Add to cart
router.post('/', auth, async (req, res) => {
  try {
    const { product_id, quantity, size, color } = req.body;

    // Check if already in cart (including variants)
    const [existing] = await pool.query(
      'SELECT * FROM cart WHERE user_id = ? AND product_id = ? AND (size = ? OR (size IS NULL AND ? IS NULL)) AND (color = ? OR (color IS NULL AND ? IS NULL))',
      [req.user.id, product_id, size, size, color, color]
    );

    if (existing.length > 0) {
      // Update quantity
      await pool.query(
        'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ? AND (size = ? OR (size IS NULL AND ? IS NULL)) AND (color = ? OR (color IS NULL AND ? IS NULL))',
        [quantity, req.user.id, product_id, size, size, color, color]
      );
    } else {
      // Insert new
      await pool.query(
        'INSERT INTO cart (user_id, product_id, quantity, size, color) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, product_id, quantity, size, color]
      );
    }

    res.json({ message: 'Ajouté au panier' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update cart item
router.put('/:product_id', auth, async (req, res) => {
  try {
    const { quantity, size, color } = req.body;

    if (quantity <= 0) {
      await pool.query(
        'DELETE FROM cart WHERE user_id = ? AND product_id = ? AND (size = ? OR (size IS NULL AND ? IS NULL)) AND (color = ? OR (color IS NULL AND ? IS NULL))',
        [req.user.id, req.params.product_id, size, size, color, color]
      );
    } else {
      await pool.query(
        'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ? AND (size = ? OR (size IS NULL AND ? IS NULL)) AND (color = ? OR (color IS NULL AND ? IS NULL))',
        [quantity, req.user.id, req.params.product_id, size, size, color, color]
      );
    }

    res.json({ message: 'Panier mis à jour' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Remove from cart
router.delete('/:product_id', auth, async (req, res) => {
  try {
    const { size, color } = req.body;
    console.log('🗑️ DELETE cart - User:', req.user.id, 'Product:', req.params.product_id, 'Size:', size, 'Color:', color);
    
    const [result] = await pool.query(
      'DELETE FROM cart WHERE user_id = ? AND product_id = ? AND (size = ? OR (size IS NULL AND ? IS NULL)) AND (color = ? OR (color IS NULL AND ? IS NULL))',
      [req.user.id, req.params.product_id, size, size, color, color]
    );
    
    console.log('✅ Lignes supprimées:', result.affectedRows);
    res.json({ message: 'Retiré du panier', deleted: result.affectedRows });
  } catch (error) {
    console.error('❌ Erreur suppression panier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Clear cart
router.delete('/', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Panier vidé' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
