-- =============================================
-- 仕掛中テーブルとメーカー在庫カラムのみ追加
-- このSQLだけをSupabase SQL Editorで実行してください
-- =============================================

-- 1. メーカー在庫カラムを追加（既存のproductsテーブルに）
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS supplier_stock INTEGER DEFAULT 0;

-- 2. 仕掛中テーブルを作成
CREATE TABLE IF NOT EXISTS work_in_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    started_at DATE NOT NULL,
    expected_completion DATE,
    completed_at DATE,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS有効化
ALTER TABLE work_in_progress ENABLE ROW LEVEL SECURITY;

-- 4. ポリシー作成（エラーが出たら無視してOK）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'work_in_progress' 
        AND policyname = 'Allow all for work_in_progress'
    ) THEN
        CREATE POLICY "Allow all for work_in_progress" 
        ON work_in_progress FOR ALL USING (true);
    END IF;
END $$;
