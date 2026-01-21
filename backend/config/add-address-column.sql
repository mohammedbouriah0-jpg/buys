-- Ajouter la colonne address à la table users
ALTER TABLE users ADD COLUMN address VARCHAR(255) DEFAULT NULL AFTER phone;
