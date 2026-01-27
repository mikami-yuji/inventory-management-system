-- 仕掛中（WIP）テーブルの拡張
-- 上中下旬表記と確定ステータスの管理

-- term_type: 'specific' (日付指定), 'early' (上旬), 'mid' (中旬), 'late' (下旬)
ALTER TABLE work_in_progress ADD COLUMN IF NOT EXISTS term_type TEXT DEFAULT 'specific' CHECK (term_type IN ('specific', 'early', 'mid', 'late'));

-- confirmation_status: 'unconfirmed' (未確定), 'confirmed' (確定済み)
ALTER TABLE work_in_progress ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'unconfirmed' CHECK (confirmation_status IN ('unconfirmed', 'confirmed'));

-- 商品テーブルにメーカー在庫カラムを追加（念のため確認）
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_stock_updated_at TIMESTAMPTZ;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_wip_confirmation_status ON work_in_progress(confirmation_status);
