-- Script pour approuver une boutique manuellement
-- Remplacez l'ID par celui de votre boutique

-- Voir toutes les boutiques
SELECT id, username, email, type, is_verified, verification_status 
FROM users 
WHERE type = 'shop';

-- Approuver la boutique avec ID = 1 (changez le numéro)
UPDATE users 
SET is_verified = TRUE,
    verification_status = 'approved',
    verification_date = NOW()
WHERE id = 1 AND type = 'shop';

-- Vérifier que ça a marché
SELECT id, username, is_verified, verification_status, verification_date 
FROM users 
WHERE id = 1;
