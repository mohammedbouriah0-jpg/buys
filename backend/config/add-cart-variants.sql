-- Add variant columns to cart table
ALTER TABLE cart ADD COLUMN IF NOT EXISTS size VARCHAR(20);
ALTER TABLE cart ADD COLUMN IF NOT EXISTS color VARCHAR(50);

-- Update the unique constraint to include variants
-- First drop the old constraint if it exists
ALTER TABLE cart DROP INDEX IF EXISTS user_product_unique;

-- Add new unique constraint including variants
ALTER TABLE cart ADD UNIQUE KEY user_product_variant_unique (user_id, product_id, size, color);
