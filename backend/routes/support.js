const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, isAdmin } = require('../middleware/auth');

/**
 * Support Contact Management
 * Permet à l'admin de configurer les infos de contact du support
 */

// GET /api/support/info - Récupérer les infos de support (public)
// Retourne uniquement les canaux activés
router.get('/info', async (req, res) => {
  try {
    const [config] = await pool.query(
      'SELECT * FROM support_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );

    if (config.length === 0) {
      return res.json({
        contacts: [],
        working_hours: null,
        address: null,
      });
    }

    const data = config[0];
    
    // Construire la liste des contacts actifs
    const contacts = [];
    
    if (data.phone && data.phone_enabled) {
      contacts.push({ type: 'phone', value: data.phone, label: 'Téléphone' });
    }
    if (data.email && data.email_enabled) {
      contacts.push({ type: 'email', value: data.email, label: 'Email' });
    }
    if (data.whatsapp && data.whatsapp_enabled) {
      contacts.push({ type: 'whatsapp', value: data.whatsapp, label: 'WhatsApp' });
    }
    if (data.telegram && data.telegram_enabled) {
      contacts.push({ type: 'telegram', value: data.telegram, label: 'Telegram' });
    }
    if (data.instagram && data.instagram_enabled) {
      contacts.push({ type: 'instagram', value: data.instagram, label: 'Instagram' });
    }
    if (data.facebook && data.facebook_enabled) {
      contacts.push({ type: 'facebook', value: data.facebook, label: 'Facebook' });
    }
    if (data.website && data.website_enabled) {
      contacts.push({ type: 'website', value: data.website, label: 'Site web' });
    }

    res.json({
      contacts,
      working_hours: data.working_hours_enabled ? data.working_hours : null,
      address: data.address_enabled ? data.address : null,
    });
  } catch (error) {
    console.error('Error getting support info:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/support/config - Récupérer la config (admin)
router.get('/config', auth, isAdmin, async (req, res) => {
  try {
    const [config] = await pool.query(
      'SELECT * FROM support_config ORDER BY id DESC LIMIT 1'
    );

    if (config.length === 0) {
      return res.json({
        id: null,
        phone: '',
        email: '',
        whatsapp: '',
        instagram: '',
        facebook: '',
        telegram: '',
        website: '',
        working_hours: '',
        address: '',
        phone_enabled: true,
        email_enabled: true,
        whatsapp_enabled: true,
        instagram_enabled: true,
        facebook_enabled: true,
        telegram_enabled: true,
        website_enabled: true,
        working_hours_enabled: true,
        address_enabled: true,
        is_active: true,
      });
    }

    // Convertir les booléens (MySQL retourne 0/1)
    const data = config[0];
    res.json({
      ...data,
      phone_enabled: !!data.phone_enabled,
      email_enabled: !!data.email_enabled,
      whatsapp_enabled: !!data.whatsapp_enabled,
      instagram_enabled: !!data.instagram_enabled,
      facebook_enabled: !!data.facebook_enabled,
      telegram_enabled: !!data.telegram_enabled,
      website_enabled: !!data.website_enabled,
      working_hours_enabled: !!data.working_hours_enabled,
      address_enabled: !!data.address_enabled,
      is_active: !!data.is_active,
    });
  } catch (error) {
    console.error('Error getting support config:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/support/config - Mettre à jour la config (admin)
router.put('/config', auth, isAdmin, async (req, res) => {
  try {
    const {
      phone,
      email,
      whatsapp,
      instagram,
      facebook,
      telegram,
      website,
      working_hours,
      address,
      phone_enabled,
      email_enabled,
      whatsapp_enabled,
      instagram_enabled,
      facebook_enabled,
      telegram_enabled,
      website_enabled,
      working_hours_enabled,
      address_enabled,
      is_active,
    } = req.body;

    // Vérifier si une config existe
    const [existing] = await pool.query(
      'SELECT id FROM support_config LIMIT 1'
    );

    if (existing.length > 0) {
      // Mettre à jour
      await pool.query(
        `UPDATE support_config SET 
          phone = ?,
          email = ?,
          whatsapp = ?,
          instagram = ?,
          facebook = ?,
          telegram = ?,
          website = ?,
          working_hours = ?,
          address = ?,
          phone_enabled = ?,
          email_enabled = ?,
          whatsapp_enabled = ?,
          instagram_enabled = ?,
          facebook_enabled = ?,
          telegram_enabled = ?,
          website_enabled = ?,
          working_hours_enabled = ?,
          address_enabled = ?,
          is_active = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          phone || null,
          email || null,
          whatsapp || null,
          instagram || null,
          facebook || null,
          telegram || null,
          website || null,
          working_hours || null,
          address || null,
          phone_enabled ? 1 : 0,
          email_enabled ? 1 : 0,
          whatsapp_enabled ? 1 : 0,
          instagram_enabled ? 1 : 0,
          facebook_enabled ? 1 : 0,
          telegram_enabled ? 1 : 0,
          website_enabled ? 1 : 0,
          working_hours_enabled ? 1 : 0,
          address_enabled ? 1 : 0,
          is_active ? 1 : 0,
          existing[0].id,
        ]
      );
    } else {
      // Créer
      await pool.query(
        `INSERT INTO support_config 
          (phone, email, whatsapp, instagram, facebook, telegram, website, working_hours, address,
           phone_enabled, email_enabled, whatsapp_enabled, instagram_enabled, facebook_enabled,
           telegram_enabled, website_enabled, working_hours_enabled, address_enabled, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          phone || null,
          email || null,
          whatsapp || null,
          instagram || null,
          facebook || null,
          telegram || null,
          website || null,
          working_hours || null,
          address || null,
          phone_enabled ? 1 : 0,
          email_enabled ? 1 : 0,
          whatsapp_enabled ? 1 : 0,
          instagram_enabled ? 1 : 0,
          facebook_enabled ? 1 : 0,
          telegram_enabled ? 1 : 0,
          website_enabled ? 1 : 0,
          working_hours_enabled ? 1 : 0,
          address_enabled ? 1 : 0,
          is_active ? 1 : 0,
        ]
      );
    }

    res.json({ message: 'Configuration du support mise à jour' });
  } catch (error) {
    console.error('Error updating support config:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
