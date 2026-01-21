-- Script pour corriger le champ has_variants pour tous les produits existants
-- Ce script met à jour has_variants en fonction de l'existence réelle de variantes

-- Mettre has_variants à 0 pour les produits sans variantes
UPDATE products 
SET has_variants = 0 
WHERE id NOT IN (
    SELECT DISTINCT product_id 
    FROM product_variants 
    WHERE product_id IS NOT NULL
);

-- Mettre has_variants à 1 pour les produits avec variantes
UPDATE products 
SET has_variants = 1 
WHERE id IN (
    SELECT DISTINCT product_id 
    FROM product_variants 
    WHERE product_id IS NOT NULL
);

-- Afficher le résultat
SELECT 
    COUNT(*) as total_products,
    SUM(CASE WHEN has_variants = 1 THEN 1 ELSE 0 END) as products_with_variants,
    SUM(CASE WHEN has_variants = 0 THEN 1 ELSE 0 END) as products_without_variants
FROM products;
