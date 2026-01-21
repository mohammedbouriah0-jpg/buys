-- Ajouter des catégories de test
USE buys_db;

-- Supprimer les catégories existantes si nécessaire
-- DELETE FROM categories;

-- Insérer des catégories
INSERT INTO categories (name, icon) VALUES
('Électronique', '📱'),
('Mode & Vêtements', '👕'),
('Maison & Jardin', '🏠'),
('Beauté & Santé', '💄'),
('Sports & Loisirs', '⚽'),
('Livres & Médias', '📚'),
('Jouets & Enfants', '🧸'),
('Alimentation', '🍔'),
('Automobile', '🚗'),
('Bijoux & Accessoires', '💍')
ON DUPLICATE KEY UPDATE name=VALUES(name);

SELECT * FROM categories;
