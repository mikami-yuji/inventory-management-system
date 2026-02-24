-- 1. テーブルがなければ作成、あればそのまま
CREATE TABLE IF NOT EXISTS delivery_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    postal_code TEXT,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 形状カラム（preferred_shape）がなければ追加
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_addresses' AND column_name='preferred_shape') THEN
        ALTER TABLE delivery_addresses ADD COLUMN preferred_shape TEXT CHECK (preferred_shape IN ('RA', 'RZ', '単袋'));
    END IF;
END $$;

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_client_id ON delivery_addresses(client_id);

-- 4. RLSの設定（既になければ）
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;

-- 5. ポリシーの作成 (DROP & CREATEで確実に更新)
DROP POLICY IF EXISTS "Users can manage their own delivery addresses" ON delivery_addresses;
CREATE POLICY "Users can manage their own delivery addresses" 
ON delivery_addresses 
FOR ALL 
TO authenticated 
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- 6. コメントの更新
COMMENT ON TABLE delivery_addresses IS '出荷先名称、住所、TEL、好みの形状を管理するマスターデータ';
COMMENT ON COLUMN delivery_addresses.preferred_shape IS '好みの形状 (RA, RZ, 単袋)';
