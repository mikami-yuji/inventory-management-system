-- 納品先マスタ（出荷先データベース）の作成
CREATE TABLE IF NOT EXISTS delivery_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 発送先名（配送先名）
    postal_code TEXT, -- 郵便番号
    address TEXT NOT NULL, -- 住所
    phone TEXT NOT NULL, -- TEL
    preferred_shape TEXT CHECK (preferred_shape IN ('RA', 'RZ', '単袋')), -- 形状RA, RZ, 単袋
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_client_id ON delivery_addresses(client_id);

-- RLS（Row Level Security）の設定
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;

-- 自分のデータのみ操作可能にするポリシー
CREATE POLICY "Users can manage their own delivery addresses" 
ON delivery_addresses 
FOR ALL 
TO authenticated 
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- コメントの追加
COMMENT ON TABLE delivery_addresses IS '出荷先名称、住所、TEL、好みの形状を管理するマスターデータ';
COMMENT ON COLUMN delivery_addresses.preferred_shape IS '好みの形状 (RA, RZ, 単袋)';
