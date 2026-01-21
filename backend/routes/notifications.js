const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// Get shop notifications
router.get('/', auth, async (req, res) => {
  try {
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;

    const [notifications] = await pool.query(`
      SELECT * FROM notifications 
      WHERE shop_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [shopId]);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    
    if (shops.length === 0) {
      return res.json({ count: 0 });
    }

    const shopId = shops[0].id;

    const [result] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE shop_id = ? AND is_read = FALSE
    `, [shopId]);

    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;

    await pool.query(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE id = ? AND shop_id = ?
    `, [req.params.id, shopId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mark all as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;

    await pool.query(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE shop_id = ? AND is_read = FALSE
    `, [shopId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Register push token
router.post('/register-token', auth, async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ error: 'Token manquant' });
    }

    // Mettre à jour le token push de l'utilisateur
    await pool.query(
      'UPDATE users SET push_token = ?, push_enabled = TRUE WHERE id = ?',
      [pushToken, req.user.id]
    );

    console.log(`✅ Token push enregistré pour user ${req.user.id}`);
    res.json({ success: true, message: 'Token enregistré' });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Disable push notifications
router.post('/disable-push', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET push_enabled = FALSE WHERE id = ?',
      [req.user.id]
    );

    console.log(`🔕 Notifications push désactivées pour user ${req.user.id}`);
    res.json({ success: true, message: 'Notifications désactivées' });
  } catch (error) {
    console.error('Error disabling push:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
