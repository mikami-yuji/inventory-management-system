-- ================================================
-- マイグレーション: 在庫更新のアトミック化（RPC）
-- レースコンディション（競合状態）の解消とトランザクション整合性の確保
-- ================================================

CREATE OR REPLACE FUNCTION update_inventory_atomic(
    p_product_id UUID,
    p_quantity INTEGER,
    p_type TEXT,
    p_note TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_curr_quantity INTEGER := 0;
    v_curr_old_price_quantity INTEGER := 0;
    v_new_quantity INTEGER := 0;
    v_new_old_price_quantity INTEGER := 0;
    v_diff INTEGER := 0;
    v_old_reduction INTEGER := 0;
    v_res RECORD;
BEGIN
    -- 1. 行ロック（FOR UPDATE）を取得して現在の在庫を取得
    SELECT quantity, COALESCE(old_price_quantity, 0)
    INTO v_curr_quantity, v_curr_old_price_quantity
    FROM inventory
    WHERE product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        v_curr_quantity := 0;
        v_curr_old_price_quantity := 0;
    END IF;

    -- 2. 操作タイプに応じた在庫計算
    IF p_type = 'incoming' THEN
        v_new_quantity := v_curr_quantity + p_quantity;
        v_new_old_price_quantity := v_curr_old_price_quantity;
    ELSIF p_type = 'outgoing' THEN
        v_new_quantity := v_curr_quantity - p_quantity;
        IF v_new_quantity < 0 THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: 在庫数が不足しています (現在: %, 出庫要求: %)', v_curr_quantity, p_quantity;
        END IF;

        -- FIFO: 旧価格在庫から優先的に削減
        IF v_curr_old_price_quantity > 0 THEN
            v_old_reduction := LEAST(v_curr_old_price_quantity, p_quantity);
            v_new_old_price_quantity := v_curr_old_price_quantity - v_old_reduction;
        ELSE
            v_new_old_price_quantity := 0;
        END IF;
    ELSIF p_type = 'adjustment' THEN
        v_new_quantity := p_quantity;
        v_diff := v_curr_quantity - v_new_quantity;
        IF v_diff > 0 THEN
            v_new_old_price_quantity := GREATEST(0, v_curr_old_price_quantity - v_diff);
        ELSE
            v_new_old_price_quantity := v_curr_old_price_quantity;
        END IF;
    ELSE
        RAISE EXCEPTION 'INVALID_TYPE: 無効な在庫操作タイプです: %', p_type;
    END IF;

    -- 旧価格在庫が総在庫を超えないように補正
    IF v_new_old_price_quantity > v_new_quantity THEN
        v_new_old_price_quantity := v_new_quantity;
    END IF;

    -- 3. 在庫テーブルの更新 (UPSERT)
    INSERT INTO inventory (product_id, quantity, old_price_quantity, updated_at)
    VALUES (p_product_id, v_new_quantity, v_new_old_price_quantity, NOW())
    ON CONFLICT (product_id)
    DO UPDATE SET
        quantity = EXCLUDED.quantity,
        old_price_quantity = EXCLUDED.old_price_quantity,
        updated_at = EXCLUDED.updated_at
    RETURNING product_id, quantity, old_price_quantity, updated_at INTO v_res;

    -- 4. 履歴テーブルの挿入 (同一トランザクション内で不可分に実行)
    INSERT INTO stock_history (product_id, user_id, type, quantity, note, created_at)
    VALUES (p_product_id, p_user_id, p_type, p_quantity, p_note, NOW());

    -- 5. 結果をJSONとして返却
    RETURN jsonb_build_object(
        'product_id', v_res.product_id,
        'quantity', v_res.quantity,
        'old_price_quantity', v_res.old_price_quantity,
        'updated_at', v_res.updated_at
    );
END;
$$;
