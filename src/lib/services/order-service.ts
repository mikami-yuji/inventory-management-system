import { createServerClient } from '@/lib/supabase';
import type { Order, OrderStatus, OrderType } from '@/types';

export type CreateOrderInput = {
    clientId: string;
    type: OrderType;
    eventId?: string | null;
    shipmentSource: 'inventory' | 'supplier' | 'wip' | 'wip-request';
    preferredShape?: string | null;
    deliveryName?: string | null;
    deliveryPostalCode?: string | null;
    deliveryAddress?: string | null;
    deliveryPhone?: string | null;
    items: Array<{
        productId: string;
        quantity: number;
    }>;
};

export const orderService = {
    /**
     * 発注一覧を取得（最新順）
     */
    async getOrders(): Promise<Order[]> {
        const supabase = createServerClient();

        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select(`
                id,
                created_at,
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
                order_items (
                    id,
                    product_id,
                    quantity,
                    unit_price,
                    printing_cost,
                    products (
                        id,
                        name,
                        sku,
                        weight,
                        shape,
                        unit_price,
                        printing_cost,
                        category,
                        meters_per_roll
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (ordersError) {
            throw new Error(`発注一覧取得エラー: ${ordersError.message}`);
        }

        return (ordersData || []).map((order) => {
            // 住所から郵便番号を抽出（未移行データに対するセーフティフォールバック）
            const address = order.delivery_address || '';
            const postalMatch = address.match(/^〒(\d{3}-\d{4})\s*/);
            const extractedPostal = postalMatch ? postalMatch[1] : null;
            const cleanAddress = postalMatch ? address.replace(/^〒\d{3}-\d{4}\s*/, '') : address;

            const rawItems = (order.order_items as unknown as Array<{
                id: string;
                product_id: string;
                quantity: number;
                unit_price?: number;
                printing_cost?: number;
                products?: {
                    id: string;
                    name: string;
                    sku?: string | null;
                    weight?: number | null;
                    shape?: string | null;
                    unit_price?: number;
                    printing_cost?: number;
                    category?: string;
                    meters_per_roll?: number | null;
                } | null;
            }>) || [];

            return {
                id: order.id,
                clientId: order.client_id,
                createdAt: order.created_at,
                status: (order.status as OrderStatus) || 'requested',
                type: (order.type as OrderType) || 'standard',
                eventId: order.event_id || undefined,
                shipmentSource: (order.shipment_source as Order['shipmentSource']) || 'supplier',
                deliveryName: order.delivery_name || undefined,
                deliveryPostalCode: order.delivery_postal_code || extractedPostal || undefined,
                deliveryAddress: cleanAddress || undefined,
                deliveryPhone: order.delivery_phone || undefined,
                preferredShape: order.preferred_shape || undefined,
                items: rawItems.map((item) => ({
                    productId: item.product_id,
                    quantity: item.quantity,
                    productName: item.products?.name || '不明な商品',
                    sku: item.products?.sku || '-',
                    weight: item.products?.weight ?? null,
                    shape: item.products?.shape || '-',
                    unitPrice: item.unit_price ?? item.products?.unit_price ?? 0,
                    printingCost: item.printing_cost ?? item.products?.printing_cost ?? 0,
                    category: item.products?.category || 'other',
                    metersPerRoll: item.products?.meters_per_roll ?? null,
                })),
            };
        });
    },

    /**
     * 新規発注を作成（RPCトランザクション優先、フォールバック付き）
     */
    async createOrder(input: CreateOrderInput): Promise<Order> {
        const supabase = createServerClient();

        // 1. RPCトランザクションの呼び出しを試行
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_order_atomic', {
            p_client_id: input.clientId,
            p_type: input.type,
            p_event_id: input.eventId || null,
            p_shipment_source: input.shipmentSource || 'supplier',
            p_delivery_name: input.deliveryName || null,
            p_delivery_postal_code: input.deliveryPostalCode || null,
            p_delivery_address: input.deliveryAddress || null,
            p_delivery_phone: input.deliveryPhone || null,
            p_preferred_shape: input.preferredShape || null,
            p_items: input.items as unknown as import('@/types/database').Json,
        });

        if (!rpcError && rpcResult) {
            return {
                id: rpcResult.id,
                clientId: rpcResult.clientId,
                createdAt: rpcResult.createdAt,
                status: (rpcResult.status as OrderStatus) || 'shipped',
                type: (rpcResult.type as OrderType) || input.type,
                eventId: rpcResult.eventId || undefined,
                shipmentSource: input.shipmentSource,
                deliveryName: rpcResult.deliveryName || undefined,
                deliveryPostalCode: rpcResult.deliveryPostalCode || undefined,
                deliveryAddress: rpcResult.deliveryAddress || undefined,
                deliveryPhone: rpcResult.deliveryPhone || undefined,
                preferredShape: rpcResult.preferredShape || undefined,
                items: input.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                }))
            };
        }

        // RPCが未適用環境などの場合のフォールバック処理
        console.warn('RPC create_order_atomic unavailable or failed, falling back to direct write:', rpcError?.message);

        // 1. 発注ヘッダー挿入
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                client_id: input.clientId,
                status: 'shipped',
                type: input.type,
                event_id: input.eventId || null,
                shipment_source: input.shipmentSource || 'supplier',
                delivery_name: input.deliveryName || null,
                delivery_postal_code: input.deliveryPostalCode || null,
                delivery_address: input.deliveryAddress || null,
                delivery_phone: input.deliveryPhone || null,
                preferred_shape: input.preferredShape || null,
            })
            .select()
            .single();

        if (orderError || !orderData) {
            throw new Error(`発注作成エラー: ${orderError?.message}`);
        }

        const orderId = orderData.id;

        // 2. 有効価格を取得
        const productIds = input.items.map(item => item.productId);
        const { data: productsInfo } = await supabase
            .from('products')
            .select('id, unit_price, printing_cost, price_revisions(unit_price, printing_cost, effective_date)')
            .in('id', productIds);

        const todayStr = new Date().toISOString().split('T')[0];

        const orderItems = input.items.map(item => {
            const product = productsInfo?.find(p => p.id === item.productId);
            let activeUnitPrice = product?.unit_price || 0;
            let activePrintingCost = product?.printing_cost || 0;

            if (product && product.price_revisions && product.price_revisions.length > 0) {
                const revisions = [...product.price_revisions];
                revisions.sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
                const activeRevision = revisions.find(r => r.effective_date <= todayStr);
                if (activeRevision) {
                    activeUnitPrice = activeRevision.unit_price;
                    activePrintingCost = activeRevision.printing_cost;
                }
            }

            return {
                order_id: orderId,
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: activeUnitPrice,
                printing_cost: activePrintingCost
            };
        });

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            throw new Error(`発注明細作成エラー: ${itemsError.message}`);
        }

        // 3. 在庫の引き落とし
        for (const item of input.items) {
            if (input.shipmentSource === 'supplier') {
                const { data: product } = await supabase
                    .from('products')
                    .select('supplier_stock')
                    .eq('id', item.productId)
                    .single();

                if (product && typeof product.supplier_stock === 'number') {
                    const newStock = Math.max(0, product.supplier_stock - item.quantity);
                    await supabase
                        .from('products')
                        .update({
                            supplier_stock: newStock,
                            supplier_stock_updated_at: new Date().toISOString()
                        })
                        .eq('id', item.productId);

                    await supabase.from('stock_history').insert({
                        product_id: item.productId,
                        user_id: input.clientId,
                        type: 'order',
                        quantity: item.quantity,
                        note: `メーカー在庫出荷 (残: ${newStock})`
                    });
                }
            } else if (input.shipmentSource === 'inventory') {
                const { data: inv } = await supabase
                    .from('inventory')
                    .select('quantity')
                    .eq('product_id', item.productId)
                    .single();

                const currentQty = inv?.quantity || 0;
                const newQty = currentQty - item.quantity;

                await supabase
                    .from('inventory')
                    .upsert({
                        product_id: item.productId,
                        quantity: newQty,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'product_id' });

                await supabase.from('stock_history').insert({
                    product_id: item.productId,
                    user_id: input.clientId,
                    type: 'order',
                    quantity: item.quantity,
                    note: `出荷依頼 (残: ${newQty})`
                });
            } else if (input.shipmentSource === 'wip') {
                await supabase.from('stock_history').insert({
                    product_id: item.productId,
                    user_id: input.clientId,
                    type: 'order',
                    quantity: 0,
                    note: '仕掛仕上がり後出荷'
                });
            }
        }

        return {
            id: orderId,
            clientId: input.clientId,
            createdAt: orderData.created_at,
            status: 'shipped',
            type: input.type,
            eventId: input.eventId || undefined,
            shipmentSource: input.shipmentSource,
            deliveryName: input.deliveryName || undefined,
            deliveryPostalCode: input.deliveryPostalCode || undefined,
            deliveryAddress: input.deliveryAddress || undefined,
            deliveryPhone: input.deliveryPhone || undefined,
            preferredShape: input.preferredShape || undefined,
            items: input.items.map(i => ({ productId: i.productId, quantity: i.quantity }))
        };
    }
};
