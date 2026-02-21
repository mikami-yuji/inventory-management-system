-- Add shipped_date column to incoming_stock table
ALTER TABLE incoming_stock ADD COLUMN IF NOT EXISTS shipped_date DATE;
