-- Table pour les paramètres de paiement (Baridimob/CCP)
CREATE TABLE IF NOT EXISTS payment_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ccp_number VARCHAR(50) NOT NULL,
  ccp_key VARCHAR(10) NOT NULL,
  account_holder_name VARCHAR(255) NOT NULL,
  subscription_amount DECIMAL(10, 2) NOT NULL DEFAULT 5000.00,
  additional_info TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insérer les paramètres par défaut
INSERT INTO payment_settings (ccp_number, ccp_key, account_holder_name, subscription_amount, additional_info)
VALUES ('00799999001234567890', '97', 'Ahmed Karim', 5000.00, 'Veuillez effectuer le paiement via Baridimob et soumettre la capture d''écran.')
ON DUPLICATE KEY UPDATE id=id;

-- Vérifier
SELECT * FROM payment_settings;
