-- Migration script to add preferred_shape to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS preferred_shape TEXT;
