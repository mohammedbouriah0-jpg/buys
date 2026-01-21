-- Nettoyer les URLs d'avatars pour enlever l'IP du serveur
-- Convertir les URLs complètes en chemins relatifs

-- Mettre à jour les avatars des utilisateurs
UPDATE users 
SET avatar_url = CONCAT('/uploads/images/', SUBSTRING_INDEX(avatar_url, '/', -1))
WHERE avatar_url IS NOT NULL 
  AND avatar_url LIKE 'http://%/uploads/images/%';

-- Mettre à jour les logos des boutiques
UPDATE shops 
SET logo_url = CONCAT('/uploads/images/', SUBSTRING_INDEX(logo_url, '/', -1))
WHERE logo_url IS NOT NULL 
  AND logo_url LIKE 'http://%/uploads/images/%';

-- Mettre à jour les bannières des boutiques
UPDATE shops 
SET banner_url = CONCAT('/uploads/images/', SUBSTRING_INDEX(banner_url, '/', -1))
WHERE banner_url IS NOT NULL 
  AND banner_url LIKE 'http://%/uploads/images/%';

-- Mettre à jour les URLs des vidéos
UPDATE videos 
SET video_url = CONCAT('/uploads/videos/', SUBSTRING_INDEX(video_url, '/', -1))
WHERE video_url IS NOT NULL 
  AND video_url LIKE 'http://%/uploads/videos/%';

-- Mettre à jour les miniatures des vidéos
UPDATE videos 
SET thumbnail_url = CONCAT('/uploads/images/', SUBSTRING_INDEX(thumbnail_url, '/', -1))
WHERE thumbnail_url IS NOT NULL 
  AND thumbnail_url LIKE 'http://%/uploads/images/%';

-- Mettre à jour les images des produits
UPDATE product_images 
SET image_url = CONCAT('/uploads/images/', SUBSTRING_INDEX(image_url, '/', -1))
WHERE image_url IS NOT NULL 
  AND image_url LIKE 'http://%/uploads/images/%';

-- Vérifier les résultats
SELECT 'Avatars mis à jour:' as info;
SELECT id, name, avatar_url FROM users WHERE avatar_url IS NOT NULL LIMIT 5;

SELECT 'Logos boutiques mis à jour:' as info;
SELECT id, shop_name, logo_url FROM shops WHERE logo_url IS NOT NULL LIMIT 5;

SELECT 'Vidéos mises à jour:' as info;
SELECT id, title, video_url FROM videos LIMIT 5;

SELECT 'Images produits mises à jour:' as info;
SELECT id, product_id, image_url FROM product_images LIMIT 5;
