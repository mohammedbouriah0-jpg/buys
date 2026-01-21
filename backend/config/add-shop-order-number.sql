-- Ajouter la colonne shop_order_number à order_items
-- Cette colonne permet d'avoir une numérotation des commandes propre à chaque boutique

ALTER TABLE order_items ADD COLUMN shop_order_number INT DEFAULT NULL;

-- Mettre à jour les commandes existantes avec un numéro séquentiel par boutique
SET @row_num := 0;
SET @prev_shop := 0;

UPDATE order_items oi
JOIN (
    SELECT 
        id,
        shop_id,
        @row_num := IF(@prev_shop = shop_id, @row_num + 1, 1) AS new_shop_order_number,
        @prev_shop := shop_id
    FROM order_items
    ORDER BY shop_id, order_id
) AS numbered ON oi.id = numbered.id
SET oi.shop_order_number = numbered.new_shop_order_number;

-- Créer un index pour accélérer les requêtes
CREATE INDEX idx_shop_order_number ON order_items(shop_id, shop_order_number);
