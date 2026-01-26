-- status_override カラムを追加
-- 値: 'normal' (通常/自動), 'low_stock' (低在庫), 'out_of_stock' (欠品)
-- デフォルトは NULL または 'normal'（NULLの場合は自動判定に従う）

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS status_override TEXT CHECK (status_override IN ('normal', 'low_stock', 'out_of_stock'));

COMMENT ON COLUMN products.status_override IS '手動ステータス上書き (normal, low_stock, out_of_stock)';
