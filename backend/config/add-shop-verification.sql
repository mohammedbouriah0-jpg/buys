-- Ajouter les colonnes de vérification pour les boutiques
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_document VARCHAR(500),
ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

-- Mettre à jour les boutiques existantes
UPDATE users SET is_verified = FALSE WHERE type = 'shop';
