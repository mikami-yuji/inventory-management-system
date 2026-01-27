-- Add shipment_source column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_source TEXT DEFAULT 'inventory' CHECK (shipment_source IN ('inventory', 'supplier'));
