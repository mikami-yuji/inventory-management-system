-- 入荷予定の着地を null 許容にするための SQL
-- Supabase の SQL Editor で実行してください

ALTER TABLE incoming_stock ALTER COLUMN expected_date DROP NOT NULL;
