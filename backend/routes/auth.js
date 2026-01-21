const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { generateVerificationCode, sendVerificationCode, sendPasswordResetCode } = require('../services/email');

// Fonction de validation du mot de passe
function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un symbole (!@#$%...)');
  }
  
  return errors;
}

// Register
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('name').notEmpty(),
  body('type').isIn(['client', 'shop'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, type, phone, shopName, shopDescription, language } = req.body;

    // Valider la force du mot de passe
    const passwordErrors = validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Mot de passe trop faible', 
        details: passwordErrors 
      });
    }

    // Check if user exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (email, password, name, type, phone) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, name, type, phone]
    );

    const userId = result.insertId;

    // If shop, create shop entry
    if (type === 'shop') {
      await pool.query(
        'INSERT INTO shops (user_id, shop_name, description) VALUES (?, ?, ?)',
        [userId, shopName, shopDescription]
      );
    }

    // Générer et envoyer le code de vérification
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await pool.query(
      'UPDATE users SET verification_code = ?, verification_code_expires = ?, last_code_sent = NOW() WHERE id = ?',
      [verificationCode, expiresAt, userId]
    );

    console.log('📧 Envoi du code de vérification:', verificationCode, 'à', email, 'langue:', language || 'fr');
    await sendVerificationCode(email, name, verificationCode, language || 'fr');

    // Generate token
    const token = jwt.sign(
      { id: userId, email, type },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: { id: userId, email, name, type, email_verified: false },
      message: 'Compte créé. Vérifiez votre email pour activer votre compte.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Get user (sans vérifier le type, on le détecte automatiquement)
    const [users] = await pool.query(
      'SELECT id, email, password, name, type, email_verified, avatar_url, phone, address FROM users WHERE email = ?',
      [email]
    );

    console.log('🔍 [LOGIN] Recherche user pour email:', email);
    console.log('🔍 [LOGIN] Nombre de users trouvés:', users.length);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];
    console.log('🔍 [LOGIN] User trouvé:', {
      id: user.id,
      email: user.email,
      type: user.type,
      email_verified: user.email_verified,
      email_verified_type: typeof user.email_verified
    });

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Get shop info if shop
    let shopInfo = null;
    if (user.type === 'shop') {
      const [shops] = await pool.query('SELECT * FROM shops WHERE user_id = ?', [user.id]);
      shopInfo = shops[0];
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, type: user.type },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const responseUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      type: user.type,
      email_verified: user.email_verified === 1,
      avatar: user.avatar_url,
      phone: user.phone,
      address: user.address,
      ...(shopInfo && {
        shopId: shopInfo.id,
        shopName: shopInfo.shop_name,
        shopDescription: shopInfo.description,
        shopLogo: shopInfo.logo_url,
        verified: shopInfo.verified
      })
    };

    console.log('📤 [LOGIN] Réponse envoyée:', {
      email_verified_db: user.email_verified,
      email_verified_response: responseUser.email_verified,
      type_db: typeof user.email_verified,
      type_response: typeof responseUser.email_verified
    });

    res.json({
      token,
      user: responseUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Forgot Password - Send reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, language } = req.body;

    // Check if user exists
    const [users] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Aucun compte avec cet email' });
    }

    const user = users[0];

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Delete old codes for this email
    await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);

    // Insert new code
    await pool.query(
      'INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt]
    );

    // Send email with reset code
    console.log(`📧 Envoi du code de réinitialisation:`, code, 'à', email, 'langue:', language || 'fr');
    await sendPasswordResetCode(email, user.name, code, language || 'fr');

    res.json({ message: 'Code envoyé par email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Reset Password - Verify code and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Valider la force du mot de passe
    const passwordErrors = validatePasswordStrength(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Mot de passe trop faible', 
        details: passwordErrors 
      });
    }

    // Find valid code
    const [resets] = await pool.query(
      'SELECT * FROM password_resets WHERE email = ? AND code = ? AND used = FALSE AND expires_at > NOW()',
      [email, code]
    );

    if (resets.length === 0) {
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

    // Mark code as used
    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = ?', [resets[0].id]);

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
