-- 商品種別（Excel Column Type）を格納するためのカラムを追加
ALTER TABLE products ADD COLUMN product_type TEXT;

-- インデックス追加
CREATE INDEX idx_products_product_type ON products(product_type);
