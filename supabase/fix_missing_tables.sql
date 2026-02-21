-- まとめて実行するSQL
-- これを実行することで、app_settings, suppliers, profiles テーブルが作成され、APIエラーが解消されます。

-- 1. app_settings テーブルの作成
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. suppliers テーブルの作成
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

-- 3. products テーブルに supplier_id を追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- 4. RLSの有効化とポリシー設定
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings are viewable by authenticated users" ON app_settings;
CREATE POLICY "Settings are viewable by authenticated users" ON app_settings FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Settings are updatable by authenticated users" ON app_settings;
CREATE POLICY "Settings are updatable by authenticated users" ON app_settings FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Settings are insertable by authenticated users" ON app_settings;
CREATE POLICY "Settings are insertable by authenticated users" ON app_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON suppliers;
CREATE POLICY "Allow read access for authenticated users" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow insert access for authenticated users" ON suppliers;
CREATE POLICY "Allow insert access for authenticated users" ON suppliers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow update access for authenticated users" ON suppliers;
CREATE POLICY "Allow update access for authenticated users" ON suppliers FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow delete access for authenticated users" ON suppliers;
CREATE POLICY "Allow delete access for authenticated users" ON suppliers FOR DELETE USING (auth.role() = 'authenticated');

-- 5. 初期データの投入
INSERT INTO app_settings (key, value, description)
VALUES ('default_min_stock_alert', '100', 'Default minimum stock threshold for alerts')
ON CONFLICT (key) DO NOTHING;

-- 6. orders テーブルの不足カラムを追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_source TEXT DEFAULT 'inventory';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone TEXT;

-- 7. delivery_addresses テーブルの作成 (もし必要なら)
CREATE TABLE IF NOT EXISTS delivery_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    postal_code TEXT,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON delivery_addresses;
CREATE POLICY "Users can manage their own addresses" ON delivery_addresses FOR ALL USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
