-- 商品コード（Excel Column D）を格納するためのカラムを追加
ALTER TABLE products ADD COLUMN product_code TEXT;

-- 必要に応じてインデックスを追加（検索用）
CREATE INDEX idx_products_product_code ON products(product_code);
