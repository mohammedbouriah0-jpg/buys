const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { buildFullUrl } = require('../utils/url-helper');
const bunnyCdn = require('../services/bunny-cdn');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, name, type, avatar_url, phone, address, wilaya FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];
    
    // Convert avatar URL to use current server address
    user.avatar = user.avatar_url ? buildFullUrl(user.avatar_url, req) : null;
    delete user.avatar_url;

    // Get shop info if shop
    if (user.type === 'shop') {
      const [shops] = await pool.query('SELECT * FROM shops WHERE user_id = ?', [user.id]);
      if (shops.length > 0) {
        user.shopId = shops[0].id;
        user.shopName = shops[0].shop_name;
        user.shopDescription = shops[0].description;
        user.shopLogo = shops[0].logo_url ? buildFullUrl(shops[0].logo_url, req) : null;
        user.verified = shops[0].verified;
      }
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update user profile
router.post('/profile', auth, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, phone, address, wilaya, shopName, shopDescription, removeAvatar, removeLogo } = req.body;
    let avatarUrl = null;
    let logoUrl = null;

    // Upload avatar sur BunnyCDN si configuré
    if (req.files && req.files['avatar']) {
      try {
        if (bunnyCdn.isConfigured()) {
          avatarUrl = await bunnyCdn.uploadMulterFile(req.files['avatar'][0], 'images');
          console.log(`✅ Avatar uploadé sur BunnyCDN: ${avatarUrl}`);
        } else {
          avatarUrl = `/uploads/images/${req.files['avatar'][0].filename}`;
        }
      } catch (uploadError) {
        console.error(`❌ Erreur upload avatar:`, uploadError.message);
        avatarUrl = `/uploads/images/${req.files['avatar'][0].filename}`;
      }
    }

    // Upload logo sur BunnyCDN si configuré
    if (req.files && req.files['logo']) {
      try {
        if (bunnyCdn.isConfigured()) {
          logoUrl = await bunnyCdn.uploadMulterFile(req.files['logo'][0], 'images');
          console.log(`✅ Logo uploadé sur BunnyCDN: ${logoUrl}`);
        } else {
          logoUrl = `/uploads/images/${req.files['logo'][0].filename}`;
        }
      } catch (uploadError) {
        console.error(`❌ Erreur upload logo:`, uploadError.message);
        logoUrl = `/uploads/images/${req.files['logo'][0].filename}`;
      }
    }

    // Update user
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (phone) {
      updates.push('phone = ?');
      params.push(phone);
    }

    if (address) {
      updates.push('address = ?');
      params.push(address);
    }

    if (wilaya) {
      updates.push('wilaya = ?');
      params.push(wilaya);
    }

    if (avatarUrl) {
      updates.push('avatar_url = ?');
      params.push(avatarUrl);
    } else if (removeAvatar === 'true') {
      updates.push('avatar_url = NULL');
    }

    if (updates.length > 0) {
      params.push(req.user.id);
      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    // Update shop info if shop
    const [users] = await pool.query('SELECT type FROM users WHERE id = ?', [req.user.id]);
    if (users[0].type === 'shop') {
      const shopUpdates = [];
      const shopParams = [];

      if (shopName) {
        shopUpdates.push('shop_name = ?');
        shopParams.push(shopName);
      }

      if (shopDescription) {
        shopUpdates.push('description = ?');
        shopParams.push(shopDescription);
      }

      if (logoUrl) {
        shopUpdates.push('logo_url = ?');
        shopParams.push(logoUrl);
      } else if (removeLogo === 'true') {
        shopUpdates.push('logo_url = NULL');
      }

      if (shopUpdates.length > 0) {
        shopParams.push(req.user.id);
        await pool.query(
          `UPDATE shops SET ${shopUpdates.join(', ')} WHERE user_id = ?`,
          shopParams
        );
      }
    }

    // Get updated user
    const [updatedUsers] = await pool.query(
      'SELECT id, email, name, type, avatar_url, phone, address, wilaya FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = updatedUsers[0];
    
    // Map avatar_url to avatar for frontend
    user.avatar = user.avatar_url;
    delete user.avatar_url;

    // Get shop info if shop
    if (user.type === 'shop') {
      const [shops] = await pool.query('SELECT * FROM shops WHERE user_id = ?', [user.id]);
      if (shops.length > 0) {
        user.shopId = shops[0].id;
        user.shopName = shops[0].shop_name;
        user.shopDescription = shops[0].description;
        user.shopLogo = shops[0].logo_url;
        user.verified = shops[0].verified;
      }
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Get user with password
    const [users] = await pool.query(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, users[0].password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
