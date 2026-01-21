-- Script pour corriger les URLs de vidéos et thumbnails
-- Convertit les URLs absolues en chemins relatifs

-- Afficher l'état actuel
SELECT 'État actuel des URLs:' as info;
SELECT 
    COUNT(*) as total_videos,
    SUM(CASE WHEN video_url LIKE 'http%' THEN 1 ELSE 0 END) as urls_absolues,
    SUM(CASE WHEN video_url LIKE '/uploads/%' THEN 1 ELSE 0 END) as urls_relatives
FROM videos;

-- Corriger les video_url qui commencent par http:// ou https://
UPDATE videos 
SET video_url = CONCAT('/', SUBSTRING_INDEX(video_url, '/uploads/', -1))
WHERE video_url LIKE 'http://%/uploads/%';

UPDATE videos 
SET video_url = CONCAT('/', SUBSTRING_INDEX(video_url, '/uploads/', -1))
WHERE video_url LIKE 'https://%/uploads/%';

-- Ajouter /uploads/ si manquant
UPDATE videos 
SET video_url = CONCAT('/uploads/', video_url)
WHERE video_url NOT LIKE '/%' 
  AND video_url NOT LIKE 'http%'
  AND video_url IS NOT NULL;

-- Corriger les thumbnail_url qui commencent par http:// ou https://
UPDATE videos 
SET thumbnail_url = CONCAT('/', SUBSTRING_INDEX(thumbnail_url, '/uploads/', -1))
WHERE thumbnail_url LIKE 'http://%/uploads/%';

UPDATE videos 
SET thumbnail_url = CONCAT('/', SUBSTRING_INDEX(thumbnail_url, '/uploads/', -1))
WHERE thumbnail_url LIKE 'https://%/uploads/%';

-- Ajouter /uploads/ si manquant pour thumbnails
UPDATE videos 
SET thumbnail_url = CONCAT('/uploads/', thumbnail_url)
WHERE thumbnail_url NOT LIKE '/%' 
  AND thumbnail_url NOT LIKE 'http%'
  AND thumbnail_url IS NOT NULL;

-- Vérifier les résultats
SELECT 
    id,
    title,
    video_url,
    thumbnail_url
FROM videos
LIMIT 10;

-- Afficher un résumé
SELECT 
    COUNT(*) as total_videos,
    SUM(CASE WHEN video_url LIKE 'http%' THEN 1 ELSE 0 END) as urls_absolues_restantes,
    SUM(CASE WHEN video_url LIKE '/uploads/%' THEN 1 ELSE 0 END) as urls_relatives
FROM videos;
