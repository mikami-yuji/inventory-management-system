-- ordersテーブルに郵便番号カラムを追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_postal_code TEXT;
