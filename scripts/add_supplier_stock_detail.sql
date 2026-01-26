-- メーカー在庫の内訳詳細を保存するカラムを追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_stock_detail TEXT;
