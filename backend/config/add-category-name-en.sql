-- Ajouter la colonne name_en à la table categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en VARCHAR(100) AFTER name_ar;

-- Mettre à jour les catégories existantes avec des valeurs par défaut en anglais
UPDATE categories SET name_en = 'Food' WHERE name = 'Alimentation' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Automobile' WHERE name = 'Automobile' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Beauty' WHERE name = 'Beauté' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Beauty & Health' WHERE name = 'Beauté & Santé' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Jewelry & Accessories' WHERE name = 'Bijoux & Accessoires' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Electronics' WHERE name = 'Électronique' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Home & Garden' WHERE name = 'Maison & Jardin' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Fashion' WHERE name = 'Mode' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Sports & Leisure' WHERE name = 'Sport & Loisirs' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Toys & Games' WHERE name = 'Jouets & Jeux' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Books & Media' WHERE name = 'Livres & Médias' AND (name_en IS NULL OR name_en = '');
UPDATE categories SET name_en = 'Other' WHERE name = 'Autre' AND (name_en IS NULL OR name_en = '');

-- Pour toutes les autres catégories sans traduction, utiliser le nom français
UPDATE categories SET name_en = name WHERE name_en IS NULL OR name_en = '';
