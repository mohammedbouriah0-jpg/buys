-- Script pour créer un client à risque (avec plusieurs retours) pour tester les badges

-- Mettre à jour un utilisateur existant avec 3 retours
UPDATE users 
SET returns_count = 3 
WHERE id = 2;

-- Vérifier
SELECT id, name, email, returns_count FROM users WHERE id = 2;
