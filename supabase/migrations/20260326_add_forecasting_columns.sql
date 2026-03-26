-- 在庫切れ予測用フィールドを追加
-- daily_shipment_rate: 1日あたりの通常出荷数（枚 or メートル）
-- production_lead_days: 仕掛（製造）リードタイム（日数）

ALTER TABLE products
ADD COLUMN IF NOT EXISTS daily_shipment_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS production_lead_days INTEGER DEFAULT 0;

-- daily_shipment_rateにコメントを追加
COMMENT ON COLUMN products.daily_shipment_rate IS '1日あたりの通常出荷数';
COMMENT ON COLUMN products.production_lead_days IS '仕掛リードタイム（日数）';
