-- 操作ログテーブル
-- システム内の操作履歴を記録する

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,           -- 操作種別 (create, update, delete, import, export, stock_update, etc.)
    target_type TEXT NOT NULL,      -- 対象種別 (product, inventory, order, event, user)
    target_id TEXT,                 -- 対象のID
    target_name TEXT,               -- 対象の名前（可読性のため）
    details TEXT,                   -- 詳細メモ
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- パフォーマンス用インデックス
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_target_type ON activity_log(target_type);

-- RLS (Row Level Security) ポリシー
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーが全ログを閲覧可能
CREATE POLICY "authenticated_select_activity_log" ON activity_log
    FOR SELECT TO authenticated
    USING (true);

-- 認証済みユーザーがログを作成可能
CREATE POLICY "authenticated_insert_activity_log" ON activity_log
    FOR INSERT TO authenticated
    WITH CHECK (true);
