-- Ajouter la colonne parent_id pour les réponses
ALTER TABLE comments ADD COLUMN parent_id INT DEFAULT NULL AFTER video_id;
ALTER TABLE comments ADD FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;
