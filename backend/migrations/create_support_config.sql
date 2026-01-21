-- Table pour les informations de contact du support
CREATE TABLE IF NOT EXISTS support_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  -- Valeurs des contacts
  phone VARCHAR(50) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  whatsapp VARCHAR(50) DEFAULT NULL,
  instagram VARCHAR(100) DEFAULT NULL,
  facebook VARCHAR(255) DEFAULT NULL,
  telegram VARCHAR(100) DEFAULT NULL,
  website VARCHAR(255) DEFAULT NULL,
  working_hours VARCHAR(255) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  -- Activation/désactivation de chaque canal
  phone_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT TRUE,
  instagram_enabled BOOLEAN DEFAULT TRUE,
  facebook_enabled BOOLEAN DEFAULT TRUE,
  telegram_enabled BOOLEAN DEFAULT TRUE,
  website_enabled BOOLEAN DEFAULT TRUE,
  working_hours_enabled BOOLEAN DEFAULT TRUE,
  address_enabled BOOLEAN DEFAULT TRUE,
  -- Activation globale
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insérer la configuration par défaut
INSERT INTO support_config 
  (phone, email, whatsapp, instagram, facebook, telegram, website, working_hours, address, is_active)
VALUES 
  ('+213 XX XX XX XX', 'support@buys.dz', '+213 XX XX XX XX', '@buys.dz', 'buys.dz', '@buys_dz', 'https://buys.dz', 'Dim - Jeu: 9h - 18h', 'Alger, Algérie', TRUE);

-- Migration pour tables existantes (ajouter les colonnes si elles n'existent pas)
-- ALTER TABLE support_config ADD COLUMN phone_enabled BOOLEAN DEFAULT TRUE;
-- ALTER TABLE support_config ADD COLUMN email_enabled BOOLEAN DEFAULT TRUE;
-- ALTER TABLE support_config ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT TRUE;
-- ALTER TABLE support_config ADD COLUMN instagram_enabled BOOLEAN DEFAULT TRUE;
-- ALTER TABLE support_config ADD COLUMN facebook_enabled BOOLEAN DEFAULT TRUE;
-- ALTER TABLE support_config ADD COLUMN telegram_enabled BOOLEAN DEFAULT TRUE;
-- ALTER TABLE support_config ADD COLUMN website_enabled BOOLEAN DEFAULT TRUE;
-- ALTER TABLE support_config ADD COLUMN working_hours_enabled BOOLEAN DEFAULT TRUE;
-- ALTER TABLE support_config ADD COLUMN address_enabled BOOLEAN DEFAULT TRUE;
