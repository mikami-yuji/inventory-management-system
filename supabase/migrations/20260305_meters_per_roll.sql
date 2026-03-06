-- 商品テーブルに「1巻あたりメートル数」カラムを追加
-- デフォルト値は400m、選択肢は300または400
ALTER TABLE products
ADD COLUMN IF NOT EXISTS meters_per_roll numeric DEFAULT 400;

-- コメント追加
COMMENT ON COLUMN products.meters_per_roll IS '1巻あたりのメートル数 (300 or 400)';
