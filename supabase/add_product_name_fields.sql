-- 商品名の構造化フィールドを追加
-- 実行方法: Supabase Dashboard > SQL Editor で実行

ALTER TABLE products
ADD COLUMN IF NOT EXISTS prefix TEXT,
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS variety TEXT,
ADD COLUMN IF NOT EXISTS suffix TEXT;

-- コメント追加（任意）
COMMENT ON COLUMN products.prefix IS '備考1（先頭注記）例: （ロゴ無）、【使用禁止】';
COMMENT ON COLUMN products.origin IS '産地 例: JA京都やましろ、魚沼';
COMMENT ON COLUMN products.variety IS '品種 例: ひのひかり、コシヒカリ';
COMMENT ON COLUMN products.suffix IS '備考2（末尾補足）例: RASP雲竜柄無地';
