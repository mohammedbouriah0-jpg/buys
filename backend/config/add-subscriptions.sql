-- Table pour les abonnements aux boutiques
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  shop_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  UNIQUE KEY unique_subscription (user_id, shop_id)
);

-- Index pour améliorer les performances
CREATE INDEX idx_user_subscriptions ON subscriptions(user_id);
CREATE INDEX idx_shop_subscribers ON subscriptions(shop_id);
