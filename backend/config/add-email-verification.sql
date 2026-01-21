-- Ajouter les colonnes pour la vérification d'email
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires DATETIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_code_sent DATETIME;

-- Mettre à jour les utilisateurs existants comme vérifiés
UPDATE users SET email_verified = 1 WHERE email_verified IS NULL OR email_verified = 0;
