const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const { generateVerificationCode, sendVerificationCode, sendWelcomeEmail } = require('../services/email');

// Vérifier le code
router.post('/verify-code', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    console.log('🔍 Vérification code pour user:', userId, 'Code:', code);

    const [users] = await pool.query(
      'SELECT verification_code, verification_code_expires, email_verified, name, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];

    if (user.email_verified) {
      console.log('✅ Email déjà vérifié');
      return res.json({ message: 'Email déjà vérifié', email_verified: true });
    }

    if (!user.verification_code) {
      console.log('❌ Aucun code de vérification');
      return res.status(400).json({ error: 'Aucun code de vérification' });
    }

    if (new Date() > new Date(user.verification_code_expires)) {
      console.log('❌ Code expiré');
      return res.status(400).json({ error: 'Code expiré. Demandez un nouveau code.' });
    }

    if (user.verification_code !== code) {
      console.log('❌ Code incorrect');
      return res.status(400).json({ error: 'Code incorrect' });
    }

    // Marquer comme vérifié
    await pool.query(
      'UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?',
      [userId]
    );

    console.log('✅ Email vérifié avec succès');

    // Envoyer email de bienvenue
    const { language } = req.body;
    await sendWelcomeEmail(user.email, user.name, language || 'fr');

    res.json({ message: 'Email vérifié avec succès', email_verified: true });
  } catch (error) {
    console.error('❌ Erreur vérification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Renvoyer le code
router.post('/resend-code', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { language } = req.body;

    console.log('📧 Demande de renvoi de code pour user:', userId, 'langue:', language || 'fr');

    const [users] = await pool.query(
      'SELECT email, name, email_verified, last_code_sent FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];

    if (user.email_verified) {
      console.log('✅ Email déjà vérifié');
      return res.json({ message: 'Email déjà vérifié', email_verified: true });
    }

    // Anti-spam : 60 secondes
    if (user.last_code_sent) {
      const timeSinceLastCode = Date.now() - new Date(user.last_code_sent).getTime();
      if (timeSinceLastCode < 60000) {
        const waitTime = Math.ceil((60000 - timeSinceLastCode) / 1000);
        console.log('⏳ Anti-spam actif, attendre:', waitTime, 'secondes');
        return res.status(429).json({ 
          error: `Attendez ${waitTime} secondes avant de renvoyer le code`,
          wait_time: waitTime 
        });
      }
    }

    // Générer nouveau code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await pool.query(
      'UPDATE users SET verification_code = ?, verification_code_expires = ?, last_code_sent = NOW() WHERE id = ?',
      [verificationCode, expiresAt, userId]
    );

    console.log('📧 Envoi du nouveau code:', verificationCode, 'langue:', language || 'fr');
    await sendVerificationCode(user.email, user.name, verificationCode, language || 'fr');

    res.json({ message: 'Code renvoyé avec succès', wait_time: 60 });
  } catch (error) {
    console.error('❌ Erreur renvoi code:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir le statut de vérification
router.get('/status', auth, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT email_verified, email FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      email_verified: users[0].email_verified === 1,
      email: users[0].email
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
