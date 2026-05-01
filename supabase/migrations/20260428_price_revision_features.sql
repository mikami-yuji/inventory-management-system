-- 価格改定機能: products テーブルへのカラム追加
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS old_unit_price integer,
ADD COLUMN IF NOT EXISTS old_printing_cost integer,
ADD COLUMN IF NOT EXISTS price_increase_effective_date date;

-- 価格改定機能: inventory テーブルへのカラム追加
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS old_price_quantity integer NOT NULL DEFAULT 0;

-- 価格改定機能: work_in_progress テーブルへのカラム追加
ALTER TABLE public.work_in_progress
ADD COLUMN IF NOT EXISTS is_new_price boolean NOT NULL DEFAULT true;
