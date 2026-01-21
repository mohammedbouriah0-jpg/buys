-- Table pour gérer les versions de l'app et forcer les mises à jour
CREATE TABLE IF NOT EXISTS app_version_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  min_android_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  min_ios_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  latest_android_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  latest_ios_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  force_update BOOLEAN DEFAULT FALSE,
  update_message TEXT,
  android_store_url VARCHAR(500) DEFAULT 'https://play.google.com/store/apps/details?id=com.buys.app',
  ios_store_url VARCHAR(500) DEFAULT 'https://apps.apple.com/app/buys/id123456789',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insérer la configuration par défaut
INSERT INTO app_version_config 
  (min_android_version, min_ios_version, latest_android_version, latest_ios_version, force_update, update_message, android_store_url, ios_store_url)
VALUES 
  ('1.0.0', '1.0.0', '1.0.0', '1.0.0', FALSE, 'Une nouvelle version de Buys est disponible. Mettez à jour pour profiter des dernières fonctionnalités.', 
   'https://play.google.com/store/apps/details?id=com.buys.app',
   'https://apps.apple.com/app/buys/id123456789');
