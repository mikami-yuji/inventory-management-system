
-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  note TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add supplier_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

-- Create index for supplier_id
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- Add RLS policies for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert access for authenticated users" ON suppliers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update access for authenticated users" ON suppliers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete access for authenticated users" ON suppliers
  FOR DELETE USING (auth.role() = 'authenticated');
