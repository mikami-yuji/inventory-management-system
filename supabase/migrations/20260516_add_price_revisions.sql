-- order_itemsテーブルに履歴用価格カラムを追加
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS printing_cost DECIMAL DEFAULT 0;

-- 既存の order_items に対して現在の製品価格をバックフィルする
-- （すでに発注済みのデータは、とりあえず現状のマスタ価格で固定する）
UPDATE order_items
SET 
  unit_price = p.unit_price,
  printing_cost = p.printing_cost
FROM products p
WHERE order_items.product_id = p.id
AND (order_items.unit_price IS NULL OR order_items.unit_price = 0);

-- price_revisions テーブルを作成
CREATE TABLE IF NOT EXISTS price_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_price DECIMAL NOT NULL DEFAULT 0,
    printing_cost DECIMAL NOT NULL DEFAULT 0,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- 同じ商品に対して同じ改定日のレコードが複数存在しないようにする
    UNIQUE(product_id, effective_date)
);

-- RLS を有効化
ALTER TABLE price_revisions ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全操作可能
CREATE POLICY "Allow all for price_revisions" ON price_revisions FOR ALL USING (true);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_price_revisions_product_id ON price_revisions(product_id);
CREATE INDEX IF NOT EXISTS idx_price_revisions_effective_date ON price_revisions(effective_date);

-- 更新日時トリガー
CREATE TRIGGER update_price_revisions_updated_at BEFORE UPDATE ON price_revisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
