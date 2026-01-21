-- Corriger le statut de vérification par défaut
-- Les nouveaux comptes ne doivent pas avoir 'pending' par défaut

-- 1. Modifier la colonne pour accepter NULL et changer le défaut
ALTER TABLE users 
MODIFY COLUMN verification_status ENUM('pending', 'approved', 'rejected') DEFAULT NULL;

-- 2. Mettre à NULL le statut des comptes qui n'ont jamais soumis de document
UPDATE users 
SET verification_status = NULL 
WHERE type = 'shop' 
  AND verification_document IS NULL 
  AND verification_status = 'pending';

-- Vérifier les résultats
SELECT 
  id,
  name,
  email,
  type,
  verification_status,
  verification_document,
  is_verified
FROM users 
WHERE type = 'shop'
ORDER BY created_at DESC;
