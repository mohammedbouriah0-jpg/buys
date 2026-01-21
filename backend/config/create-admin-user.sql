-- Créer un utilisateur admin pour tester
-- Mot de passe: admin123 (hashé avec bcrypt)

INSERT INTO users (username, email, password, type, created_at)
VALUES (
  'admin',
  'admin@tiktokshop.com',
  '$2b$10$YourHashedPasswordHere',
  'admin',
  NOW()
)
ON DUPLICATE KEY UPDATE type = 'admin';

-- Note: Vous devez remplacer '$2b$10$YourHashedPasswordHere' par un vrai hash bcrypt
-- Ou créer l'admin via l'interface de signup en modifiant temporairement le type

-- Pour créer un hash bcrypt du mot de passe "admin123", utilisez:
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('admin123', 10);
-- console.log(hash);

SELECT 'Admin user created/updated' as message;
