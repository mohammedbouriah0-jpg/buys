// Middleware pour vérifier si une boutique est vérifiée
const checkVerified = (req, res, next) => {
  if (req.user.type === 'shop' && !req.user.is_verified) {
    return res.status(403).json({ 
      error: 'Boutique non vérifiée',
      message: 'Votre boutique doit être vérifiée pour effectuer cette action. Veuillez soumettre vos documents de vérification.',
      verification_required: true
    });
  }
  next();
};

module.exports = checkVerified;
