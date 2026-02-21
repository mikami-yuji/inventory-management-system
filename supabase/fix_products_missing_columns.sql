-- productsテーブルの不足しているカラムを追加するSQL
-- これを実行することで、落版日や詳細なステータス管理が可能になります。

ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_code TEXT,      -- 本来の商品コード（Excel Col D）
ADD COLUMN IF NOT EXISTS product_type TEXT,      -- 種別（既製品/別注など）
ADD COLUMN IF NOT EXISTS status_override TEXT DEFAULT 'normal', -- 手動ステータス上書き
ADD COLUMN IF NOT EXISTS discontinued_date DATE;  -- 落版日 / 廃盤日

-- コメント追加（任意）
COMMENT ON COLUMN products.product_code IS '本来の商品コード（Excel Column D）';
COMMENT ON COLUMN products.product_type IS '種別（既製品、別注など）';
COMMENT ON COLUMN products.status_override IS '在庫数に関わらず手動で設定するステータス（normal, low_stock, out_of_stock）';
COMMENT ON COLUMN products.discontinued_date IS '自動更新や表示に使用する落版予定日または廃盤日';

-- もし以前「add_product_name_fields.sql」を実行していない場合のために、構造化フィールドも追加（IF NOT EXISTS）
ALTER TABLE products
ADD COLUMN IF NOT EXISTS prefix TEXT,
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS variety TEXT,
ADD COLUMN IF NOT EXISTS suffix TEXT;
