-- ================================================
-- 在庫管理システム 完全スキーマ
-- すべてのテーブルとRLSポリシーを含む
-- ================================================

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商品マスタテーブル
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT,
    jan_code TEXT,
    weight DECIMAL,
    shape TEXT,
    material TEXT,
    unit_price DECIMAL NOT NULL DEFAULT 0,
    printing_cost DECIMAL NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('bag', 'sticker', 'other', 'new_rice')),
    image_url TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    min_stock_alert INTEGER DEFAULT 100,
    supplier_stock INTEGER DEFAULT 0,
    supplier_stock_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 在庫テーブル
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id)
);

-- 入荷予定テーブル
CREATE TABLE IF NOT EXISTS incoming_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    expected_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 在庫履歴テーブル
CREATE TABLE IF NOT EXISTS stock_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing', 'adjustment', 'check')),
    quantity INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 特売イベントテーブル（旧形式）
CREATE TABLE IF NOT EXISTS special_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'closed')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベント在庫テーブル（旧形式）
CREATE TABLE IF NOT EXISTS event_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    allocated_quantity INTEGER NOT NULL DEFAULT 0,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, product_id)
);

-- 発注テーブル
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'shipped', 'cancelled')),
    type TEXT NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'special_event')),
    event_id UUID REFERENCES special_events(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 発注明細テーブル
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL
);

-- ================================================
-- 特売イベント管理（新形式）
-- ================================================

-- 特売イベントテーブル
CREATE TABLE IF NOT EXISTS sale_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    schedule_type TEXT NOT NULL DEFAULT 'single',
    dates DATE[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    description TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 特売イベント商品テーブル
CREATE TABLE IF NOT EXISTS sale_event_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES sale_events(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    planned_quantity INTEGER NOT NULL DEFAULT 0,
    allocated_quantity INTEGER NOT NULL DEFAULT 0,
    actual_quantity INTEGER,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, product_id)
);

-- ================================================
-- 仕掛中（印刷・加工中）管理
-- ================================================

-- 仕掛中テーブル
CREATE TABLE IF NOT EXISTS work_in_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    started_at DATE NOT NULL,
    expected_completion DATE,
    completed_at DATE,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Row Level Security (RLS)
-- ================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_event_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_in_progress ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS Policies（全テーブル共通：認証済みユーザーはすべてアクセス可能）
-- ================================================

CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for inventory" ON inventory FOR ALL USING (true);
CREATE POLICY "Allow all for incoming_stock" ON incoming_stock FOR ALL USING (true);
CREATE POLICY "Allow all for stock_history" ON stock_history FOR ALL USING (true);
CREATE POLICY "Allow all for special_events" ON special_events FOR ALL USING (true);
CREATE POLICY "Allow all for event_stocks" ON event_stocks FOR ALL USING (true);
CREATE POLICY "Allow all for orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all for order_items" ON order_items FOR ALL USING (true);
CREATE POLICY "Allow all for sale_events" ON sale_events FOR ALL USING (true);
CREATE POLICY "Allow all for sale_event_items" ON sale_event_items FOR ALL USING (true);
CREATE POLICY "Allow all for work_in_progress" ON work_in_progress FOR ALL USING (true);

-- ================================================
-- インデックス
-- ================================================

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_product_id ON stock_history(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_created_at ON stock_history(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_events_status ON sale_events(status);
CREATE INDEX IF NOT EXISTS idx_sale_event_items_event_id ON sale_event_items(event_id);
CREATE INDEX IF NOT EXISTS idx_wip_product_id ON work_in_progress(product_id);
CREATE INDEX IF NOT EXISTS idx_wip_status ON work_in_progress(status);

-- ================================================
-- 更新日時自動更新トリガー
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_special_events_updated_at BEFORE UPDATE ON special_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sale_events_updated_at BEFORE UPDATE ON sale_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sale_event_items_updated_at BEFORE UPDATE ON sale_event_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_work_in_progress_updated_at BEFORE UPDATE ON work_in_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
