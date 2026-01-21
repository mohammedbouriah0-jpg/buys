-- Ajouter une colonne pour stocker les tokens de notification push
ALTER TABLE users ADD COLUMN push_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN push_enabled BOOLEAN DEFAULT TRUE;

-- Index pour rechercher rapidement par token
CREATE INDEX idx_users_push_token ON users(push_token);
