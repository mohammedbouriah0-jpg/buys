-- Désactiver les qualités multiples
-- Mettre toutes les colonnes de qualité à NULL

UPDATE videos 
SET video_url_high = NULL,
    video_url_medium = NULL,
    video_url_low = NULL;

-- Vérifier le résultat
SELECT 
    COUNT(*) as total_videos,
    SUM(CASE WHEN video_url IS NOT NULL THEN 1 ELSE 0 END) as with_original,
    SUM(CASE WHEN video_url_high IS NOT NULL THEN 1 ELSE 0 END) as with_high,
    SUM(CASE WHEN video_url_medium IS NOT NULL THEN 1 ELSE 0 END) as with_medium,
    SUM(CASE WHEN video_url_low IS NOT NULL THEN 1 ELSE 0 END) as with_low
FROM videos;

-- Afficher les dernières vidéos
SELECT id, video_url, video_url_high, video_url_medium, video_url_low
FROM videos
ORDER BY id DESC
LIMIT 5;
