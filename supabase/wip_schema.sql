-- 仕掛中・メーカー在庫管理用スキーマ
-- このSQLをSupabaseのSQL Editorで実行してください

-- 仕掛中テーブル（印刷・加工中の商品）
CREATE TABLE IF NOT EXISTS work_in_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,           -- 数量（ロール袋はm、単袋は枚）
    started_at DATE NOT NULL,            -- 加工開始日
    expected_completion DATE,            -- 完了予定日
    completed_at DATE,                   -- 実際の完了日
    note TEXT,                           -- 備考
    status TEXT NOT NULL DEFAULT 'in_progress' 
        CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商品マスタにメーカー在庫カラムを追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_stock INTEGER DEFAULT 0;
-- メーカー在庫の最終更新日
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_stock_updated_at TIMESTAMPTZ;

-- RLSを有効化
ALTER TABLE work_in_progress ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがアクセス可能なポリシー
CREATE POLICY "Allow all for work_in_progress" ON work_in_progress FOR ALL USING (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_wip_product_id ON work_in_progress(product_id);
CREATE INDEX IF NOT EXISTS idx_wip_status ON work_in_progress(status);

-- 更新トリガー
CREATE TRIGGER update_work_in_progress_updated_at BEFORE UPDATE ON work_in_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
