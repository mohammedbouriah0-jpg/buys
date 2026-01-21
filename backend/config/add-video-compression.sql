-- Migration: Ajouter les colonnes de compression vidéo
-- Exécuter cette migration pour activer le suivi de compression

-- Ajouter la colonne compression_status
ALTER TABLE videos 
ADD COLUMN compression_status VARCHAR(20) DEFAULT 'pending';

-- Ajouter la colonne original_size (taille originale en bytes)
ALTER TABLE videos 
ADD COLUMN original_size BIGINT DEFAULT NULL;

-- Ajouter la colonne compressed_size (taille compressée en bytes)
ALTER TABLE videos 
ADD COLUMN compressed_size BIGINT DEFAULT NULL;

-- Mettre à jour les vidéos existantes comme "skipped" (non compressées)
UPDATE videos SET compression_status = 'skipped' WHERE compression_status IS NULL OR compression_status = 'pending';
