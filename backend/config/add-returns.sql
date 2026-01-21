-- Ajouter les colonnes pour gérer les retours
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_date TIMESTAMP NULL;

-- Ajouter un compteur de retours pour les utilisateurs
ALTER TABLE users ADD COLUMN IF NOT EXISTS returns_count INT DEFAULT 0;
