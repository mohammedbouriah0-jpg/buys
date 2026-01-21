-- Table pour les abonnements des boutiques (1 mois gratuit après vérification)
CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shop_id INT NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX idx_shop_subscriptions ON shop_subscriptions(shop_id);
CREATE INDEX idx_active_subscriptions ON shop_subscriptions(is_active, end_date);
