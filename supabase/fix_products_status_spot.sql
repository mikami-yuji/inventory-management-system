-- productsテーブルのstatusカラムに関連するすべての制約をクリーンアップして再作成するSQL
-- これを実行することで、「スポット」ステータス追加時の制約エラーを解消します。

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- status という名前を含むすべての CHECK 制約を自動的に削除
    FOR r IN (
        SELECT conname 
        FROM pg_constraint c 
        JOIN pg_class t ON t.oid = c.conrelid 
        WHERE t.relname = 'products' 
          AND c.contype = 'c' -- 'c' は CHECK 制約
          AND (c.conname LIKE '%status%' OR c.conname LIKE '%products_%_check%')
    ) 
    LOOP
        EXECUTE 'ALTER TABLE products DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 新しく、すべての有効なステータス（'spot'を含む）を含む制約を1つだけ追加
ALTER TABLE products ADD CONSTRAINT products_status_check 
CHECK (status IN (
  'active', 
  'inactive', 
  'plate_removal_scheduled', 
  'plate_removed', 
  'direct_delivery', 
  'on_sale_break', 
  'discontinued',
  'spot',
  'wip_check'
));
