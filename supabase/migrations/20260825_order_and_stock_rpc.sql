-- ====================================================================
-- マイグレーション: 発注およびメーカー在庫移動のアトミック化（RPC）
-- レースコンディション（二重減算・競合）の防止とトランザクション保護
-- ====================================================================

-- 1. 発注作成と在庫引き落としのアトミックRPC
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_client_id UUID,
    p_type TEXT,
    p_event_id UUID DEFAULT NULL,
    p_shipment_source TEXT DEFAULT 'supplier',
    p_delivery_name TEXT DEFAULT NULL,
    p_delivery_postal_code TEXT DEFAULT NULL,
    p_delivery_address TEXT DEFAULT NULL,
    p_delivery_phone TEXT DEFAULT NULL,
    p_preferred_shape TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_qty INTEGER;
    v_product RECORD;
    v_unit_price NUMERIC := 0;
    v_printing_cost NUMERIC := 0;
    v_revision RECORD;
    v_today_str TEXT := to_char(CURRENT_DATE, 'YYYY-MM-DD');
    v_curr_inv RECORD;
    v_new_inv_qty INTEGER;
    v_curr_supp_stock INTEGER;
    v_new_supp_stock INTEGER;
    v_order_row RECORD;
BEGIN
    -- 1. 発注レコード作成
    INSERT INTO public.orders (
        client_id,
        status,
        type,
        event_id,
        shipment_source,
        delivery_name,
        delivery_postal_code,
        delivery_address,
        delivery_phone,
        preferred_shape,
        created_at,
        updated_at
    )
    VALUES (
        p_client_id,
        'shipped', -- 即時出荷扱い
        p_type,
        p_event_id,
        p_shipment_source,
        p_delivery_name,
        p_delivery_postal_code,
        p_delivery_address,
        p_delivery_phone,
        p_preferred_shape,
        NOW(),
        NOW()
    )
    RETURNING * INTO v_order_row;

    v_order_id := v_order_row.id;

    -- 2. 明細レコード作成 & 在庫引き落とし
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'productId')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: 発注数量は1以上である必要があります';
        END IF;

        -- 商品情報と価格取得
        SELECT * INTO v_product
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: 商品が見つかりません (ID: %)', v_product_id;
        END IF;

        v_unit_price := COALESCE(v_product.unit_price, 0);
        v_printing_cost := COALESCE(v_product.printing_cost, 0);

        -- 有効な価格改定があるか確認
        SELECT unit_price, printing_cost INTO v_revision
        FROM public.price_revisions
        WHERE product_id = v_product_id AND effective_date <= v_today_str
        ORDER BY effective_date DESC
        LIMIT 1;

        IF FOUND THEN
            v_unit_price := v_revision.unit_price;
            v_printing_cost := v_revision.printing_cost;
        END IF;

        -- 発注明細挿入
        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            printing_cost
        )
        VALUES (
            v_order_id,
            v_product_id,
            v_qty,
            v_unit_price,
            v_printing_cost
        );

        -- 出荷元に応じた在庫引き落とし
        IF p_shipment_source = 'supplier' THEN
            v_curr_supp_stock := COALESCE(v_product.supplier_stock, 0);
            v_new_supp_stock := GREATEST(0, v_curr_supp_stock - v_qty);

            UPDATE public.products
            SET 
                supplier_stock = v_new_supp_stock,
                supplier_stock_updated_at = NOW()
            WHERE id = v_product_id;

            INSERT INTO public.stock_history (
                product_id,
                user_id,
                type,
                quantity,
                note,
                created_at
            )
            VALUES (
                v_product_id,
                p_client_id,
                'order',
                v_qty,
                format('メーカー在庫出荷 (残: %s)', v_new_supp_stock),
                NOW()
            );

        ELSIF p_shipment_source = 'inventory' THEN
            SELECT * INTO v_curr_inv
            FROM public.inventory
            WHERE product_id = v_product_id
            FOR UPDATE;

            v_new_inv_qty := COALESCE(v_curr_inv.quantity, 0) - v_qty;

            INSERT INTO public.inventory (product_id, quantity, updated_at)
            VALUES (v_product_id, v_new_inv_qty, NOW())
            ON CONFLICT (product_id)
            DO UPDATE SET
                quantity = EXCLUDED.quantity,
                updated_at = EXCLUDED.updated_at;

            INSERT INTO public.stock_history (
                product_id,
                user_id,
                type,
                quantity,
                change_amount,
                note,
                created_at
            )
            VALUES (
                v_product_id,
                p_client_id,
                'order',
                v_new_inv_qty,
                -v_qty,
                '出荷依頼',
                NOW()
            );

        ELSIF p_shipment_source = 'wip' THEN
            INSERT INTO public.stock_history (
                product_id,
                user_id,
                type,
                quantity,
                change_amount,
                note,
                created_at
            )
            VALUES (
                v_product_id,
                p_client_id,
                'order',
                0,
                -v_qty,
                '仕掛仕上がり後出荷',
                NOW()
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'id', v_order_row.id,
        'clientId', v_order_row.client_id,
        'createdAt', v_order_row.created_at,
        'status', v_order_row.status,
        'type', v_order_row.type,
        'eventId', v_order_row.event_id,
        'shipmentSource', v_order_row.shipment_source,
        'deliveryName', v_order_row.delivery_name,
        'deliveryPostalCode', v_order_row.delivery_postal_code,
        'deliveryAddress', v_order_row.delivery_address,
        'deliveryPhone', v_order_row.delivery_phone,
        'preferredShape', v_order_row.preferred_shape
    );
END;
$$;


-- 2. メーカー在庫ロットのFIFO引き落とし＋入荷予定作成のアトミックRPC
CREATE OR REPLACE FUNCTION public.move_supplier_stock_to_incoming_atomic(
    p_product_id UUID,
    p_schedules JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_movement INTEGER := 0;
    v_total_current_stock INTEGER := 0;
    v_schedule JSONB;
    v_lot RECORD;
    v_remaining_to_move INTEGER;
    v_deduct_qty INTEGER;
    v_new_lot_qty INTEGER;
BEGIN
    -- 移動総数の算出
    FOR v_schedule IN SELECT * FROM jsonb_array_elements(p_schedules)
    LOOP
        v_total_movement := v_total_movement + COALESCE((v_schedule->>'quantity')::INTEGER, 0);
    END LOOP;

    IF v_total_movement <= 0 THEN
        RAISE EXCEPTION 'INVALID_QUANTITY: 正の移動数量を指定してください';
    END IF;

    -- 現在の有効在庫（ロット合計）を行ロック付きで確認
    SELECT COALESCE(SUM(quantity), 0) INTO v_total_current_stock
    FROM public.supplier_stock_lots
    WHERE product_id = p_product_id AND quantity > 0;

    IF v_total_current_stock < v_total_movement THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: メーカー在庫が不足しています (現在: %, 要求: %)', v_total_current_stock, v_total_movement;
    END IF;

    -- FIFOで古いロットから減算
    v_remaining_to_move := v_total_movement;
    FOR v_lot IN 
        SELECT id, quantity
        FROM public.supplier_stock_lots
        WHERE product_id = p_product_id AND quantity > 0
        ORDER BY stock_date ASC, created_at ASC
        FOR UPDATE
    LOOP
        IF v_remaining_to_move <= 0 THEN
            EXIT;
        END IF;

        v_deduct_qty := LEAST(v_lot.quantity, v_remaining_to_move);
        IF v_new_lot_qty <= 0 THEN
            DELETE FROM public.supplier_stock_lots WHERE id = v_lot.id;
        ELSE
            UPDATE public.supplier_stock_lots
            SET 
                quantity = v_new_lot_qty,
                updated_at = NOW()
            WHERE id = v_lot.id;
        END IF;

        v_remaining_to_move := v_remaining_to_move - v_deduct_qty;
    END LOOP;

    -- 入荷予定（incoming_stock）レコード作成
    FOR v_schedule IN SELECT * FROM jsonb_array_elements(p_schedules)
    LOOP
        INSERT INTO public.incoming_stock (
            product_id,
            expected_date,
            quantity,
            note,
            created_at
        )
        VALUES (
            p_product_id,
            (v_schedule->>'expectedDate')::DATE,
            (v_schedule->>'quantity')::INTEGER,
            COALESCE(v_schedule->>'note', 'メーカー在庫からの移動'),
            NOW()
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'movedQuantity', v_total_movement
    );
END;
$$;
