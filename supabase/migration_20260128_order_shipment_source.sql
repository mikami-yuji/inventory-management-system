-- 2026/01/28: 出荷先情報の改善

-- 納品先住所テーブル
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

-- RLS設定
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own addresses" ON delivery_addresses
    FOR ALL
    USING (auth.uid() = client_id)
    WITH CHECK (auth.uid() = client_id);

-- 管理者は全アクセス可能（必要であれば）
CREATE POLICY "Admins can manage all addresses" ON delivery_addresses
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));


-- 注文テーブルに配送先情報を追加
-- 既存のordersテーブルにカラム追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
-- 出荷元は supplier 固定になるため、既存の shipmentSource 概念があれば更新、なければ無視
-- 今回は shipment_source カラムの追加は不要（必須要件ではないため、コード側で制御）

-- 更新日時トリガー
CREATE TRIGGER update_delivery_addresses_updated_at BEFORE UPDATE ON delivery_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
