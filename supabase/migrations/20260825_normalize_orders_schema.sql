-- ==========================================================
-- マイグレーション: ordersテーブルの配送先郵便番号カラム正規化
-- delivery_address に埋め込まれた郵便番号を delivery_postal_code に分離・移行
-- ==========================================================

-- 1. カラムの追加（未追加の場合）
ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS delivery_postal_code TEXT;

-- 2. 既存データで delivery_address に 〒xxx-xxxx が含まれているものを delivery_postal_code へ移行
UPDATE public.orders
SET 
    delivery_postal_code = substring(delivery_address from '^〒([0-9]{3}-[0-9]{4})'),
    delivery_address = trim(regexp_replace(delivery_address, '^〒[0-9]{3}-[0-9]{4}\s*', ''))
WHERE 
    delivery_postal_code IS NULL 
    AND delivery_address ~ '^〒[0-9]{3}-[0-9]{4}';
