-- Migration: Ajouter les colonnes de compression vidéo
-- Date: 2024

-- Ajouter les colonnes pour le suivi de la compression
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS compression_status ENUM('pending', 'processing', 'completed', 'error', 'skipped') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS original_size BIGINT DEFAULT NULL COMMENT 'Taille originale en bytes',
ADD COLUMN IF NOT EXISTS compressed_size BIGINT DEFAULT NULL COMMENT 'Taille compressée en bytes';

-- Index pour les requêtes sur le statut de compression
CREATE INDEX IF NOT EXISTS idx_videos_compression_status ON videos(compression_status);
