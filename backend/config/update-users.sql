USE buys_db;

-- Ajouter les colonnes avatar_url et phone si elles n'existent pas
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
