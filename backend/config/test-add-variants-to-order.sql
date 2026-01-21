-- Script de test : Ajouter des variantes à la commande #8
-- Ceci est uniquement pour tester l'affichage

-- D'abord, vérifie que les colonnes existent
-- DESCRIBE order_items;

-- Ajoute des variantes de test à la commande #8
UPDATE order_items 
SET variant_size = '42', variant_color = 'Noir' 
WHERE order_id = 8;

-- Vérifie le résultat
SELECT id, order_id, product_id, quantity, variant_size, variant_color 
FROM order_items 
WHERE order_id = 8;
