-- Vérifier les boutiques
SELECT id, user_id, shop_name FROM shops;

-- Vérifier les commandes avec items
SELECT 
  o.id as order_id,
  o.status,
  o.total_amount,
  oi.shop_id,
  s.shop_name,
  p.name as product_name
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN shops s ON oi.shop_id = s.id
LEFT JOIN products p ON oi.product_id = p.id
ORDER BY o.created_at DESC;

-- Vérifier si votre user a une boutique
SELECT u.id, u.email, u.type, s.id as shop_id, s.shop_name
FROM users u
LEFT JOIN shops s ON s.user_id = u.id
WHERE u.type = 'shop';
