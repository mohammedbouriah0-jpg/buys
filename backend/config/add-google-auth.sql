-- Ajouter les colonnes pour l'authentification Google

ALTER TABLE users 
ADD COLUMN google_id VARCHAR(255) UNIQUE NULL AFTER email,
ADD COLUMN auth_provider ENUM('local', 'google') DEFAULT 'local' AFTER google_id,
ADD COLUMN avatar_url TEXT NULL AFTER phone;

-- Modifier la colonne password pour la rendre nullable (car Google auth n'a pas de password)
ALTER TABLE users 
MODIFY COLUMN password VARCHAR(255) NULL;

-- Index pour améliorer les performances de recherche
CREATE INDEX idx_google_id ON users(google_id);
CREATE INDEX idx_auth_provider ON users(auth_provider);

-- Afficher la structure mise à jour
DESCRIBE users;
