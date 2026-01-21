-- Migration pour ajouter les variantes de produits (tailles et couleurs)

-- Créer la table des variantes de produits
CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  size VARCHAR(20),
  color VARCHAR(50),
  stock INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Ajouter une colonne pour indiquer si un produit a des variantes
ALTER TABLE products ADD COLUMN has_variants BOOLEAN DEFAULT 0;

-- Afficher un message de succès
SELECT 'Migration des variantes de produits terminée avec succès!' as message;
