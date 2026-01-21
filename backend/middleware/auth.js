const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

const isShop = (req, res, next) => {
  if (req.user.type !== 'shop') {
    return res.status(403).json({ error: 'Accès réservé aux boutiques' });
  }
  next();
};

// Middleware pour vérifier que la boutique a un abonnement actif (non expiré)
const requireActiveSubscription = async (req, res, next) => {
  if (req.user.type !== 'shop') {
    return res.status(403).json({ error: 'Accès réservé aux boutiques' });
  }

  try {
    const [users] = await db.query(
      'SELECT is_subscribed, subscription_end_date FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];

    // Vérifier si l'abonnement est actif
    if (!user.is_subscribed) {
      return res.status(403).json({ 
        error: 'Abonnement requis',
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Vous devez avoir un abonnement actif pour accéder à cette fonctionnalité'
      });
    }

    // Vérifier si l'abonnement n'est pas expiré
    if (user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      const now = new Date();
      
      if (endDate < now) {
        // Abonnement expiré - désactiver automatiquement
        await db.query(
          'UPDATE users SET is_subscribed = FALSE WHERE id = ?',
          [req.user.id]
        );
        
        // Désactiver aussi dans shop_subscriptions
        const [shops] = await db.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
        if (shops.length > 0) {
          await db.query(
            'UPDATE shop_subscriptions SET is_active = FALSE WHERE shop_id = ? AND is_active = TRUE',
            [shops[0].id]
          );
        }

        console.log(`⏰ Abonnement expiré pour user ${req.user.id} - désactivé automatiquement`);

        return res.status(403).json({ 
          error: 'Abonnement expiré',
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Votre abonnement a expiré. Veuillez renouveler pour continuer.',
          expired_at: user.subscription_end_date
        });
      }
    }

    next();
  } catch (error) {
    console.error('Erreur vérification abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

// Fonction pour vérifier et désactiver les abonnements expirés (à appeler périodiquement)
const checkExpiredSubscriptions = async () => {
  try {
    const [expiredUsers] = await db.query(`
      UPDATE users 
      SET is_subscribed = FALSE 
      WHERE is_subscribed = TRUE 
        AND subscription_end_date IS NOT NULL 
        AND subscription_end_date < NOW()
    `);

    if (expiredUsers.affectedRows > 0) {
      console.log(`⏰ ${expiredUsers.affectedRows} abonnement(s) expiré(s) désactivé(s)`);
      
      // Désactiver aussi dans shop_subscriptions
      await db.query(`
        UPDATE shop_subscriptions ss
        JOIN shops s ON ss.shop_id = s.id
        JOIN users u ON s.user_id = u.id
        SET ss.is_active = FALSE
        WHERE ss.is_active = TRUE
          AND u.subscription_end_date IS NOT NULL
          AND u.subscription_end_date < NOW()
      `);
    }

    return expiredUsers.affectedRows;
  } catch (error) {
    console.error('Erreur vérification abonnements expirés:', error);
    return 0;
  }
};

// Lancer la vérification toutes les heures
setInterval(checkExpiredSubscriptions, 60 * 60 * 1000);

// Lancer une vérification au démarrage
setTimeout(checkExpiredSubscriptions, 5000);

module.exports = { 
  auth, 
  isShop, 
  isAdmin, 
  authenticateToken: auth,
  requireActiveSubscription,
  checkExpiredSubscriptions
};
