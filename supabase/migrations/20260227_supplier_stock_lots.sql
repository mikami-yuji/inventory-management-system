-- `updated_at` 自動更新用の共通関数（存在しない場合のために作成）
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- メーカー在庫をロット単位で管理するテーブル
CREATE TABLE IF NOT EXISTS public.supplier_stock_lots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    stock_date DATE NOT NULL DEFAULT CURRENT_DATE, -- ロットの日付・納入日など
    quantity INTEGER NOT NULL DEFAULT 0,
    note TEXT, -- ロットのメモ・備考
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLSポリシーの設定
ALTER TABLE public.supplier_stock_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
    ON public.supplier_stock_lots FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for authenticated users only"
    ON public.supplier_stock_lots FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only"
    ON public.supplier_stock_lots FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only"
    ON public.supplier_stock_lots FOR DELETE
    USING (auth.role() = 'authenticated');

-- 自動更新トリガー
CREATE TRIGGER update_supplier_stock_lots_updated_at
    BEFORE UPDATE ON public.supplier_stock_lots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ロットの合計数で products.supplier_stock を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_product_supplier_stock_total()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- 削除時は OLD.product_id を使用
        UPDATE public.products
        SET supplier_stock = COALESCE((SELECT SUM(quantity) FROM public.supplier_stock_lots WHERE product_id = OLD.product_id), 0)
        WHERE id = OLD.product_id;
        RETURN OLD;
    ELSE
        -- 挿入・更新時は NEW.product_id を使用
        UPDATE public.products
        SET supplier_stock = COALESCE((SELECT SUM(quantity) FROM public.supplier_stock_lots WHERE product_id = NEW.product_id), 0)
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_supplier_stock_total
    AFTER INSERT OR UPDATE OR DELETE ON public.supplier_stock_lots
    FOR EACH ROW
    EXECUTE FUNCTION update_product_supplier_stock_total();
