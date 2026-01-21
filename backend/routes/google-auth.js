const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Validation du GOOGLE_CLIENT_ID au démarrage
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error('⚠️ GOOGLE_CLIENT_ID non configuré - L\'authentification Google sera désactivée');
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Cache pour les tokens vérifiés (évite les appels répétés à Google)
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Nettoyer le cache périodiquement
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenCache.entries()) {
    if (now - value.timestamp > TOKEN_CACHE_TTL) {
      tokenCache.delete(key);
    }
  }
}, 60 * 1000); // Toutes les minutes

// Vérifier le token Google et créer/connecter l'utilisateur
router.post('/google', async (req, res) => {
  try {
    // Vérifier que Google Auth est configuré
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Authentification Google non configurée' });
    }

    const { idToken, userType = 'client' } = req.body;

    // Validation des entrées
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'Token Google requis et doit être une chaîne' });
    }

    if (idToken.length > 5000) {
      return res.status(400).json({ error: 'Token Google invalide (trop long)' });
    }

    // Valider le type d'utilisateur
    const validUserTypes = ['client', 'shop'];
    const sanitizedUserType = validUserTypes.includes(userType) ? userType : 'client';

    // Vérifier le cache d'abord
    const cachedPayload = tokenCache.get(idToken);
    let payload;

    if (cachedPayload && Date.now() - cachedPayload.timestamp < TOKEN_CACHE_TTL) {
      payload = cachedPayload.data;
      console.log('✅ Google Auth - Token depuis cache');
    } else {
      // Vérifier le token avec Google
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      payload = ticket.getPayload();

      // Vérifier que l'email est vérifié par Google
      if (!payload.email_verified) {
        return res.status(401).json({ error: 'Email Google non vérifié' });
      }

      // Mettre en cache
      tokenCache.set(idToken, { data: payload, timestamp: Date.now() });
    }

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase().trim();
    const name = payload.name?.substring(0, 100) || 'Utilisateur Google'; // Limiter la longueur
    const picture = payload.picture;

    // Validation de l'email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email Google invalide' });
    }

    console.log('✅ Google Auth - Email:', email, 'Name:', name);

    // Vérifier si l'utilisateur existe déjà
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [googleId, email]
    );

    let user;

    if (existingUsers.length > 0) {
      // Utilisateur existe - mise à jour (sans updated_at car il se met à jour automatiquement)
      user = existingUsers[0];
      
      await pool.query(
        `UPDATE users 
         SET google_id = COALESCE(google_id, ?), 
             auth_provider = 'google',
             avatar_url = COALESCE(avatar_url, ?)
         WHERE id = ?`,
        [googleId, picture, user.id]
      );

      // Recharger l'utilisateur pour avoir les données à jour
      const [updatedUser] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
      user = updatedUser[0];

      console.log('✅ Utilisateur existant connecté:', user.email);
    } else {
      // Nouvel utilisateur - création avec sanitizedUserType
      const [result] = await pool.query(
        `INSERT INTO users (
          email, name, google_id, auth_provider, avatar_url, type, email_verified
        ) VALUES (?, ?, ?, 'google', ?, ?, 1)`,
        [email, name, googleId, picture, sanitizedUserType]
      );

      const [newUser] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );

      user = newUser[0];
      console.log('✅ Nouvel utilisateur créé:', user.email, 'type:', sanitizedUserType);
    }

    // Générer le JWT avec plus d'informations de sécurité
    const token = jwt.sign(
      { 
        id: user.id, // Utiliser 'id' pour cohérence avec auth.js
        userId: user.id, 
        email: user.email,
        type: user.type,
        authProvider: 'google',
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Retourner les données utilisateur (gérer les champs potentiellement absents)
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        type: user.type,
        avatar: user.avatar_url || picture || null,
        phone: user.phone || null,
        address: user.address || null,
        wilaya: user.wilaya || null,
        isVerified: user.is_verified || false,
        email_verified: true, // Toujours vrai pour Google Auth
        authProvider: 'google'
      }
    });

  } catch (error) {
    console.error('❌ Erreur Google Auth:', error.message);
    
    // Gestion d'erreurs plus précise
    if (error.message?.includes('Token used too late') || error.message?.includes('Token used too early')) {
      return res.status(401).json({ error: 'Token Google expiré, veuillez réessayer' });
    }
    
    if (error.message?.includes('Invalid token') || error.message?.includes('Wrong number of segments')) {
      return res.status(401).json({ error: 'Token Google invalide' });
    }

    if (error.message?.includes('audience')) {
      return res.status(401).json({ error: 'Token Google non autorisé pour cette application' });
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
    }
    
    // Ne pas exposer les détails d'erreur en production
    res.status(500).json({ error: 'Erreur serveur lors de l\'authentification Google' });
  }
});

// Vérifier si un utilisateur Google existe déjà
router.post('/google/check', async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Authentification Google non configurée' });
    }

    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'Token Google requis' });
    }

    // Vérifier le cache d'abord
    const cachedPayload = tokenCache.get(idToken);
    let payload;

    if (cachedPayload && Date.now() - cachedPayload.timestamp < TOKEN_CACHE_TTL) {
      payload = cachedPayload.data;
    } else {
      // Vérifier le token avec Google
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
      tokenCache.set(idToken, { data: payload, timestamp: Date.now() });
    }

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase().trim();

    // Vérifier si l'utilisateur existe
    const [existingUsers] = await pool.query(
      'SELECT id, email, name, type FROM users WHERE google_id = ? OR email = ?',
      [googleId, email]
    );

    if (existingUsers.length > 0) {
      res.json({
        exists: true,
        user: {
          id: existingUsers[0].id,
          email: existingUsers[0].email,
          name: existingUsers[0].name,
          type: existingUsers[0].type
        }
      });
    } else {
      res.json({
        exists: false,
        googleUser: {
          email: email,
          name: payload.name
        }
      });
    }

  } catch (error) {
    console.error('❌ Erreur Google Check:', error.message);
    
    if (error.message?.includes('Token used too late')) {
      return res.status(401).json({ error: 'Token Google expiré' });
    }
    
    res.status(500).json({ error: 'Erreur de vérification' });
  }
});

module.exports = router;
