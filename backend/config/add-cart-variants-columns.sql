-- Ajouter les colonnes pour les variantes dans la table cart
ALTER TABLE cart 
ADD COLUMN size VARCHAR(50) DEFAULT NULL,
ADD COLUMN color VARCHAR(50) DEFAULT NULL;
