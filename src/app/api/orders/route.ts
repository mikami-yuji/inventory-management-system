import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse, Order } from '@/types'
// sendOrderNotificationEmailはメール送信処理コメントアウト中のため未使用（将来の機能追加用に保留）
// import { sendOrderNotificationEmail } from '@/lib/mail'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import { logError } from '@/lib/logger'

// GET: 発注一覧を取得
type RawOrderData = {
    id: string;
    order_id: string;
    created_at: string;
    client_id: string;
    status: string;
    type: string;
    event_id: string | null;
    shipment_source: string;
    delivery_name: string | null;
    delivery_postal_code?: string | null;
    delivery_address: string | null;
    delivery_phone: string | null;
    preferred_shape: string | null;
    order_items: Array<{
        id: string;
        product_id: string;
        quantity: number;
        unit_price: number;
        printing_cost: number;
        products: {
            id: string;
            name: string;
            sku: string | null;
            weight: number | null;
            shape: string | null;
            unit_price: number;
            printing_cost: number;
            category: string;
            meters_per_roll: number | null;
        } | null;
    }>;
};

export async function GET(): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServerClient()

        // 発注データを取得（新しい順）
        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
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
            .order('created_at', { ascending: false })

        if (ordersError) {
            console.error('発注一覧取得エラー:', ordersError)
            return NextResponse.json({ error: ordersError.message }, { status: 500 })
        }

        // データ整形
        const orders = ((ordersData as unknown as RawOrderData[]) || []).map((order) => {
            // 住所から郵便番号を抽出する（ワークアラウンド用）
            const address = order.delivery_address || '';
            const postalMatch = address.match(/^〒(\d{3}-\d{4})\s/);
            const extractedPostal = postalMatch ? postalMatch[1] : null;
            const cleanAddress = postalMatch ? address.replace(/^〒\d{3}-\d{4}\s/, '') : address;

            return {
                id: order.id,
                orderId: order.order_id,
                createdAt: order.created_at,
                clientId: order.client_id,
                status: order.status,
                type: order.type,
                eventId: order.event_id,
                shipmentSource: order.shipment_source,
                deliveryName: order.delivery_name,
                deliveryPostalCode: order.delivery_postal_code || extractedPostal,
                deliveryAddress: cleanAddress,
                deliveryPhone: order.delivery_phone,
                preferredShape: order.preferred_shape,
                items: ((order.order_items as Record<string, unknown>[]) || []).map((item: Record<string, unknown>) => ({
                    productId: item.product_id,
                    quantity: item.quantity,
                    productName: (item.products as Record<string, unknown>)?.name || '不明な商品',
                    sku: (item.products as Record<string, unknown>)?.sku || '-',
                    weight: (item.products as Record<string, unknown>)?.weight || null,
                    shape: (item.products as Record<string, unknown>)?.shape || '-',
                    unitPrice: item.unit_price !== undefined ? item.unit_price : ((item.products as Record<string, unknown>)?.unit_price || 0),
                    printingCost: item.printing_cost !== undefined ? item.printing_cost : ((item.products as Record<string, unknown>)?.printing_cost || 0),
                    category: (item.products as Record<string, unknown>)?.category || 'other',
                    metersPerRoll: (item.products as Record<string, unknown>)?.meters_per_roll || null,
                })),
            };
        });

        return NextResponse.json(orders);

    } catch (error) {
        await logError({
            route: '/api/orders',
            method: 'GET',
            error,
        })
        return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
}


const createOrderSchema = z.object({
    items: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.number().positive()
    })).min(1, 'At least one item is required'),
    clientId: z.string().min(1),
    type: z.enum(['standard', 'special_event']),
    eventId: z.string().optional().nullable(),
    shipmentSource: z.enum(['inventory', 'supplier', 'wip', 'wip-request']),
    preferredShape: z.string().optional().nullable(),
    deliveryName: z.string().optional().nullable(),
    deliveryPostalCode: z.string().optional().nullable(),
    deliveryAddress: z.string().optional().nullable(),
    deliveryPhone: z.string().optional().nullable()
})

// POST: 新規発注作成
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Order>>> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServerClient()
        const body = await request.json()

        const validated = createOrderSchema.safeParse(body);
        if (!validated.success) {
            console.error('Order Validation Error:', JSON.stringify(validated.error.format(), null, 2));
            return NextResponse.json(
                { data: null, error: '入力値が不正です。', details: validated.error.format() },
                { status: 400 }
            )
        }

        const { items, clientId, type, eventId, shipmentSource, preferredShape, deliveryName, deliveryPostalCode, deliveryAddress, deliveryPhone } = validated.data;

        // 1. 発注レコード作成
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                client_id: clientId,
                status: 'requested',
                type,
                event_id: eventId || null,
                shipment_source: shipmentSource || 'supplier',
                delivery_name: deliveryName,
                // 配送先住所に郵便番号を連結して保存（カラム追加が失敗している場合のワークアラウンド）
                delivery_address: deliveryPostalCode ? `〒${deliveryPostalCode} ${deliveryAddress}` : deliveryAddress,
                delivery_phone: deliveryPhone,
                preferred_shape: preferredShape
            })
            .select()
            .single();

        if (orderError) {
            console.error('発注作成エラー:', orderError)
            return NextResponse.json({ data: null, error: orderError.message }, { status: 500 })
        }

        const orderId = orderData.id

        // 2. 発注明細作成 (各商品の現在有効な価格を取得して保存)
        const productIds = items.map(item => item.productId);
        
        // 現在の価格情報と価格改定情報を取得
        const { data: productsInfo } = await supabase
            .from('products')
            .select('id, unit_price, printing_cost, price_revisions(unit_price, printing_cost, effective_date)')
            .in('id', productIds);

        const todayStr = new Date().toISOString().split('T')[0];

        const orderItems = items.map(item => {
            const product = productsInfo?.find(p => p.id === item.productId);
            let activeUnitPrice = product?.unit_price || 0;
            let activePrintingCost = product?.printing_cost || 0;

            if (product && product.price_revisions && product.price_revisions.length > 0) {
                const revisions = product.price_revisions;
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
            console.error('発注明細作成エラー:', itemsError)
            // ロールバック的なことはSupabaseのクライアント機能では難しいので、エラーログのみ
            return NextResponse.json({ data: null, error: itemsError.message }, { status: 500 })
        }

        // 3. 在庫引き落とし処理
        // statusが 'shipped' (出荷済み) になったタイミングですべきだが、
        // 簡易フローとして発注時に在庫を減らす、あるいは "出荷指示" というアクションで減らす。
        // ここでは「出荷依頼＝即時在庫確保」とみなして減らすか、あるいはステータス更新で減らすか。
        // 文脈的に「メーカー在庫からの出荷」なので、ここで減らす処理を入れる。

        // 今回は「出荷依頼」を作成するだけで、実際の引き落としは出荷完了時とすべきだが、
        // ユーザーの手間を減らすために即時反映を希望されている可能性が高い。
        // 特に「メーカー在庫からの出荷」は、我々の倉庫在庫ではないので、即時反映しないと忘れる。

        // そこで、今回は発注作成時に在庫を変動させる（仮実装）。
        // 本来はトランザクションを使うべき。

        for (const item of items) {
            if (shipmentSource === 'supplier') {
                // メーカー在庫から減らす
                const { data: product } = await supabase
                    .from('products')
                    .select('supplier_stock')
                    .eq('id', item.productId)
                    .single()

                if (product && typeof product.supplier_stock === 'number') {
                    const newStock = Math.max(0, product.supplier_stock - item.quantity)
                    await supabase
                        .from('products')
                        .update({
                            supplier_stock: newStock,
                            supplier_stock_updated_at: new Date().toISOString()
                        })
                        .eq('id', item.productId)

                    // 履歴記録（メーカー直送）
                    await supabase.from('stock_history').insert({
                        product_id: item.productId,
                        quantity: item.quantity,
                        type: 'order',
                        note: `メーカー在庫出荷 (残: ${newStock})`
                    })

                }
            } else if (shipmentSource === 'inventory') {
                // 自社在庫から減らす (従来のInventory)
                const { data: inv } = await supabase
                    .from('inventory')
                    .select('quantity')
                    .eq('product_id', item.productId)
                    .single<{ quantity: number }>()

                const currentQty = inv?.quantity || 0
                const newQty = currentQty - item.quantity

                await supabase
                    .from('inventory')
                    .upsert({
                        product_id: item.productId,
                        quantity: newQty,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'product_id' })

                // 履歴記録
                await supabase.from('stock_history').insert({
                    product_id: item.productId,
                    type: 'order',
                    quantity: newQty,
                    change_amount: -item.quantity,
                    note: '出荷依頼'
                })
            } else if (shipmentSource === 'wip') {
                // 仕掛分からの出荷
                // WIPの在庫自体は 'completed' タイミングで inventory に入るが、
                // ユーザーの意図は「仕掛中のものをそのまま発送する（自社在庫を経由しない、あるいは出荷予約）」
                // ここでは WIPに関連する note を残すにとどめる（WIPの減算ロジックは必要に応じて拡張）
                await supabase.from('stock_history').insert({
                    product_id: item.productId,
                    type: 'order',
                    quantity: 0, // WIPなので現在庫には影響させない
                    change_amount: -item.quantity,
                    note: '仕掛仕上がり後出荷'
                })
            }
        }

        // ステータスを 'shipped' に更新（即時出荷扱いにするなら）
        // とりあえず requested のままだが、在庫は減らした。整合性をとるため shipped にする？
        // User request is "Shipment from..." implies the action IS shipment.
        // Let's set status to 'shipped' to reflect that stock has moved.
        await supabase
            .from('orders')
            .update({ status: 'shipped' })
            .eq('id', orderId)

        // -------------------------
        // メール送信処理 (自動通知から手動コピー方式へ移行)
        // -------------------------
        /*
        try {
            // 送信者情報（ユーザー名）の取得
            const { data: userProfile } = await supabase
                .from('users')
                .select('name')
                .eq('id', clientId)
                .single();

            // メール用の商品情報の取得
            const productIds = items.map(i => i.productId);
            const { data: products } = await supabase
                .from('products')
                .select('id, name, shape')
                .in('id', productIds);

            const emailItems = items.map(item => {
                const product = products?.find(p => p.id === item.productId);
                return {
                    productName: product?.name || '不明な商品',
                    quantity: item.quantity,
                    unit: product?.shape?.includes('巻') || product?.shape?.includes('ロール') ? 'm' : '枚'
                };
            });

            // 通知先メールアドレス（管理者かつ通知ONのユーザー）の取得
            const { data: adminUsers } = await supabase
                .from('users')
                .select('email')
                .eq('receives_order_emails', true);

            const toAddresses = (adminUsers || [])
                .map((u: { email: string }) => u.email)
                .filter(Boolean);

            await sendOrderNotificationEmail({
                orderId: orderId,
                clientName: userProfile?.name || 'ユーザー',
                items: emailItems,
                shipmentSource: shipmentSource,
                deliveryName: body.deliveryName,
                deliveryAddress: body.deliveryAddress,
                deliveryPhone: body.deliveryPhone,
                toAddresses: toAddresses
            });
        } catch (emailError) {
            console.error('Failed to send order notification email:', emailError);
            // メール送信失敗でも発注処理自体は成功として扱う
        }
        */

        return NextResponse.json({
            data: {
                id: orderId,
                clientId,
                createdAt: new Date().toISOString(),
                status: 'shipped',
                type,
                items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
                shipmentSource,
                deliveryName,
                deliveryPostalCode,
                deliveryAddress,
                deliveryPhone,
                preferredShape
            } as Order, error: null
        })

    } catch (error) {
        await logError({
            route: '/api/orders',
            method: 'POST',
            error,
        })
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}
