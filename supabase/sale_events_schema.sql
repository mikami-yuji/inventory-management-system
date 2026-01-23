-- 特売イベント機能拡張用スキーマ
-- このSQLをSupabaseのSQL Editorで実行してください

-- 既存のspecial_eventsテーブルを削除して再作成（データがある場合は注意）
-- DROP TABLE IF EXISTS event_stocks CASCADE;
-- DROP TABLE IF EXISTS special_events CASCADE;

-- 特売イベントテーブル（拡張版）
CREATE TABLE IF NOT EXISTS sale_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,                          -- 特売先名
  schedule_type TEXT NOT NULL DEFAULT 'single' 
    CHECK (schedule_type IN ('single', 'monthly')),   -- 単発 or 月間
  dates DATE[] NOT NULL,                              -- 実施日（配列）
  status TEXT NOT NULL DEFAULT 'upcoming' 
    CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  description TEXT,                                    -- 備考
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 特売イベント商品テーブル
CREATE TABLE IF NOT EXISTS sale_event_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES sale_events(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  planned_quantity INTEGER NOT NULL DEFAULT 0,        -- 計画数量
  allocated_quantity INTEGER NOT NULL DEFAULT 0,     -- 引当数量
  actual_quantity INTEGER,                            -- 実績数量（出荷後入力）
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, product_id)
);

-- RLSを有効化
ALTER TABLE sale_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_event_items ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（全ユーザーがアクセス可能、認証済みの場合）
CREATE POLICY "Authenticated users can manage sale_events" ON sale_events
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage sale_event_items" ON sale_event_items
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 更新トリガー
CREATE TRIGGER update_sale_events_updated_at BEFORE UPDATE ON sale_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sale_event_items_updated_at BEFORE UPDATE ON sale_event_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- インデックス
CREATE INDEX IF NOT EXISTS idx_sale_events_status ON sale_events(status);
CREATE INDEX IF NOT EXISTS idx_sale_events_dates ON sale_events USING GIN(dates);
CREATE INDEX IF NOT EXISTS idx_sale_event_items_event_id ON sale_event_items(event_id);
CREATE INDEX IF NOT EXISTS idx_sale_event_items_product_id ON sale_event_items(product_id);
