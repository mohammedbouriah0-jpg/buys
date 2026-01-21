-- Performance Indexes for High Traffic
-- Run this script to optimize database queries

-- Video likes - speed up like checks
CREATE INDEX IF NOT EXISTS idx_video_likes_video_user ON video_likes(video_id, user_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user ON video_likes(user_id);

-- Subscriptions - speed up subscription checks
CREATE INDEX IF NOT EXISTS idx_subscriptions_shop_user ON subscriptions(shop_id, user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- Comments - speed up comment queries
CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_user ON comment_likes(comment_id, user_id);

-- Orders - speed up order queries
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_shop ON order_items(shop_id);

-- Videos - speed up video queries
CREATE INDEX IF NOT EXISTS idx_videos_shop ON videos(shop_id);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);

-- Products - speed up product queries  
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- Shops - speed up shop lookups
CREATE INDEX IF NOT EXISTS idx_shops_user ON shops(user_id);
