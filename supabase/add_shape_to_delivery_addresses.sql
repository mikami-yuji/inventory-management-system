-- delivery_addresses テーブルに好みの形状カラムを追加
ALTER TABLE delivery_addresses 
ADD COLUMN IF NOT EXISTS preferred_shape TEXT CHECK (preferred_shape IN ('RA', 'RZ', '単袋'));

-- コメントの追加
COMMENT ON COLUMN delivery_addresses.preferred_shape IS '納品先の好みの形状 (RA, RZ, 単袋)';
