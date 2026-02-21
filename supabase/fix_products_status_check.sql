-- productsテーブルのstatusカラムの制約を更新するSQL
-- これを実行することで、「直送先在庫」などの新しいステータスが保存可能になります。

-- 1. 既存の制約を削除（制約名: products_status_check）
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;

-- 2. 新しいステータスを含めた制約を再作成
ALTER TABLE products ADD CONSTRAINT products_status_check 
CHECK (status IN (
  'active', 
  'inactive', 
  'plate_removal_scheduled', 
  'plate_removed', 
  'direct_delivery', 
  'on_sale_break', 
  'discontinued'
));
