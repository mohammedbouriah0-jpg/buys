-- Table pour les factures d'abonnement
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shop_id INT NOT NULL,
  invoice_document VARCHAR(500) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by INT NULL,
  rejection_reason TEXT NULL,
  subscription_start_date TIMESTAMP NULL,
  subscription_end_date TIMESTAMP NULL,
  FOREIGN KEY (shop_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table pour suivre les abonnements actifs
CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shop_id INT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  invoice_id INT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES subscription_invoices(id) ON DELETE SET NULL
);

-- Index pour améliorer les performances
CREATE INDEX idx_shop_invoices ON subscription_invoices(shop_id);
CREATE INDEX idx_invoice_status ON subscription_invoices(status);
CREATE INDEX idx_shop_active_subscription ON shop_subscriptions(shop_id, is_active);

-- Ajouter colonne pour suivre l'abonnement dans users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT FALSE;
