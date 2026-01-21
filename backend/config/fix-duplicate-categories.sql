-- Supprimer les catégories en double en gardant l'ID le plus petit

-- 1. Mettre à jour les produits qui utilisent les catégories en double
UPDATE products SET category_id = 8 WHERE category_id = 16;  -- Alimentation
UPDATE products SET category_id = 2 WHERE category_id = 9;   -- Électronique

-- 2. Supprimer les catégories en double
DELETE FROM categories WHERE id = 16;  -- Alimentation (doublon)
DELETE FROM categories WHERE id = 9;   -- Électronique (doublon)

-- 3. Vérifier qu'il n'y a plus de doublons
SELECT name, COUNT(*) as count 
FROM categories 
GROUP BY name 
HAVING count > 1;

-- 4. Afficher toutes les catégories restantes
SELECT id, name FROM categories ORDER BY name;
