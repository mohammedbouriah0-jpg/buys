-- Ajouter la colonne wilaya à la table users
ALTER TABLE users ADD COLUMN wilaya VARCHAR(100) DEFAULT NULL;
