const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

const expo = new Expo();

/**
 * Route de test pour vérifier le token push d'un utilisateur
 */
router.get('/check-token', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT push_token, push_enabled FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];
    const isValidToken = user.push_token ? Expo.isExpoPushToken(user.push_token) : false;

    res.json({
      hasToken: !!user.push_token,
      token: user.push_token ? `${user.push_token.substring(0, 30)}...` : null,
      fullToken: user.push_token,
      isValidToken,
      pushEnabled: user.push_enabled,
      status: user.push_enabled && isValidToken ? 'OK' : 'PROBLÈME',
    });
  } catch (error) {
    console.error('Erreur vérification token:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Route de test pour envoyer une notification push de test
 */
router.post('/test-push', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 [TEST-PUSH] Début test notification pour user', req.user.id);

    // Récupérer le token de l'utilisateur
    const [users] = await pool.query(
      'SELECT push_token, push_enabled, name FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      console.log('❌ [TEST-PUSH] Utilisateur non trouvé');
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];
    console.log('🔍 [TEST-PUSH] User:', {
      name: user.name,
      hasToken: !!user.push_token,
      pushEnabled: user.push_enabled,
    });

    if (!user.push_enabled) {
      console.log('⚠️ [TEST-PUSH] Notifications désactivées');
      return res.status(400).json({ 
        error: 'Notifications désactivées',
        pushEnabled: false,
      });
    }

    if (!user.push_token) {
      console.log('⚠️ [TEST-PUSH] Pas de token push');
      return res.status(400).json({ 
        error: 'Pas de token push enregistré',
        hasToken: false,
      });
    }

    // Vérifier que le token est valide
    if (!Expo.isExpoPushToken(user.push_token)) {
      console.log('❌ [TEST-PUSH] Token invalide:', user.push_token);
      return res.status(400).json({ 
        error: 'Token push invalide',
        token: user.push_token,
        isValid: false,
      });
    }

    console.log('✅ [TEST-PUSH] Token valide, envoi notification...');

    // Créer le message de test
    const message = {
      to: user.push_token,
      sound: 'default',
      title: '🧪 Test Notification',
      body: `Bonjour ${user.name} ! Cette notification de test fonctionne parfaitement.`,
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      channelId: 'orders',
    };

    console.log('📤 [TEST-PUSH] Message:', JSON.stringify(message, null, 2));

    // Envoyer la notification
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync([message]);
      console.log('✅ [TEST-PUSH] Notification envoyée:', JSON.stringify(ticketChunk, null, 2));

      const ticket = ticketChunk[0];
      
      if (ticket.status === 'error') {
        console.error('❌ [TEST-PUSH] Erreur ticket:', ticket);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de l\'envoi',
          ticket,
        });
      }

      res.json({
        success: true,
        message: 'Notification de test envoyée !',
        ticket,
        sentTo: `${user.push_token.substring(0, 30)}...`,
      });
    } catch (sendError) {
      console.error('❌ [TEST-PUSH] Erreur envoi:', sendError);
      res.status(500).json({
        success: false,
        error: sendError.message,
        details: sendError,
      });
    }
  } catch (error) {
    console.error('❌ [TEST-PUSH] Exception:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message,
    });
  }
});

/**
 * Route de debug pour voir tous les tokens enregistrés
 */
router.get('/debug/all-tokens', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    const [users] = await pool.query(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Récupérer tous les tokens
    const [tokens] = await pool.query(`
      SELECT 
        id,
        name,
        email,
        push_token,
        push_enabled,
        created_at
      FROM users
      WHERE push_token IS NOT NULL
      ORDER BY created_at DESC
    `);

    const tokensInfo = tokens.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      tokenPreview: user.push_token ? `${user.push_token.substring(0, 30)}...` : null,
      isValid: user.push_token ? Expo.isExpoPushToken(user.push_token) : false,
      enabled: user.push_enabled,
      registeredAt: user.created_at,
    }));

    res.json({
      total: tokensInfo.length,
      tokens: tokensInfo,
    });
  } catch (error) {
    console.error('Erreur debug tokens:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Route pour tester l'envoi à un utilisateur spécifique (admin only)
 */
router.post('/debug/send-to-user/:userId', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    const [admins] = await pool.query(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.id]
    );

    if (admins.length === 0 || !admins[0].is_admin) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const targetUserId = req.params.userId;
    const { title, body } = req.body;

    // Récupérer le token de l'utilisateur cible
    const [users] = await pool.query(
      'SELECT push_token, push_enabled, name FROM users WHERE id = ?',
      [targetUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];

    if (!user.push_enabled || !user.push_token) {
      return res.status(400).json({ 
        error: 'Notifications non disponibles pour cet utilisateur',
        pushEnabled: user.push_enabled,
        hasToken: !!user.push_token,
      });
    }

    if (!Expo.isExpoPushToken(user.push_token)) {
      return res.status(400).json({ error: 'Token invalide' });
    }

    // Envoyer la notification
    const message = {
      to: user.push_token,
      sound: 'default',
      title: title || '🧪 Test Admin',
      body: body || `Test envoyé à ${user.name}`,
      data: { type: 'admin_test' },
      priority: 'high',
      channelId: 'orders',
    };

    const ticketChunk = await expo.sendPushNotificationsAsync([message]);

    res.json({
      success: true,
      sentTo: user.name,
      ticket: ticketChunk[0],
    });
  } catch (error) {
    console.error('Erreur envoi admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
