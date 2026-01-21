-- Ajouter les colonnes pour les différentes qualités de vidéo

-- Ajouter les colonnes si elles n'existent pas
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS video_url_high VARCHAR(500) AFTER video_url,
ADD COLUMN IF NOT EXISTS video_url_medium VARCHAR(500) AFTER video_url_high,
ADD COLUMN IF NOT EXISTS video_url_low VARCHAR(500) AFTER video_url_medium;

-- Ajouter un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_videos_qualities ON videos(video_url_high, video_url_medium, video_url_low);

-- Afficher la structure mise à jour
DESCRIBE videos;

-- Afficher un résumé
SELECT 
    COUNT(*) as total_videos,
    SUM(CASE WHEN video_url_high IS NOT NULL THEN 1 ELSE 0 END) as with_high,
    SUM(CASE WHEN video_url_medium IS NOT NULL THEN 1 ELSE 0 END) as with_medium,
    SUM(CASE WHEN video_url_low IS NOT NULL THEN 1 ELSE 0 END) as with_low
FROM videos;
