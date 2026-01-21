-- Ajouter les colonnes pour les variantes dans order_items
ALTER TABLE order_items 
ADD COLUMN variant_size VARCHAR(50) DEFAULT NULL,
ADD COLUMN variant_color VARCHAR(50) DEFAULT NULL;
