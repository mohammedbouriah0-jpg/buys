-- Table pour les notifications des boutiques
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shop_id INT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'new_order', 'return_request', 'order_cancelled'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  order_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_shop_read (shop_id, is_read),
  INDEX idx_created (created_at DESC)
);

-- Vérifier
SELECT 'Table notifications créée avec succès!' as status;
DESCRIBE notifications;
