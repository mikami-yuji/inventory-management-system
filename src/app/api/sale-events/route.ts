import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// 特売イベントの型
type SaleEvent = {
    id: string
    clientName: string
    scheduleType: 'single' | 'monthly'
    dates: string[]
    status: 'upcoming' | 'active' | 'completed' | 'cancelled'
    description: string | null
    createdAt: string
    items: SaleEventItem[]
}

type SaleEventItem = {
    id: string
    productId: string
    productName: string
    productSku: string | null
    plannedQuantity: number
    allocatedQuantity: number
    actualQuantity: number | null
    currentStock: number
}

// GET: 特売イベント一覧を取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SaleEvent[]>>> {
    try {
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        // イベント一覧を取得
        let query = supabase
            .from('sale_events')
            .select(`
                id,
                client_name,
                schedule_type,
                dates,
                status,
                description,
                created_at,
                sale_event_items (
                    id,
                    product_id,
                    planned_quantity,
                    allocated_quantity,
                    actual_quantity,
                    products (
                        id,
                        name,
                        sku
                    )
                )
            `)
            .order('created_at', { ascending: false })

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) {
            // テーブルが存在しない場合は空配列を返す
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                console.log('sale_eventsテーブルが存在しません。空配列を返します。')
                return NextResponse.json({ data: [], error: null })
            }
            console.error('特売イベント取得エラー:', error)
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        // 在庫情報を取得
        const { data: inventoryData } = await supabase
            .from('inventory')
            .select('product_id, quantity')

        const inventoryMap = new Map<string, number>()
        inventoryData?.forEach((item: { product_id: string; quantity: number }) => {
            inventoryMap.set(item.product_id, item.quantity)
        })

        // レスポンス形式に変換
        const events: SaleEvent[] = (data || []).map((event: {
            id: string
            client_name: string
            schedule_type: string
            dates: string[]
            status: string
            description: string | null
            created_at: string
            sale_event_items: Array<{
                id: string
                product_id: string
                planned_quantity: number
                allocated_quantity: number
                actual_quantity: number | null
                products: { id: string; name: string; sku: string | null }
            }>
        }) => ({
            id: event.id,
            clientName: event.client_name,
            scheduleType: event.schedule_type as 'single' | 'monthly',
            dates: event.dates,
            status: event.status as SaleEvent['status'],
            description: event.description,
            createdAt: event.created_at,
            items: event.sale_event_items.map(item => ({
                id: item.id,
                productId: item.product_id,
                productName: item.products?.name || '',
                productSku: item.products?.sku || null,
                plannedQuantity: item.planned_quantity,
                allocatedQuantity: item.allocated_quantity,
                actualQuantity: item.actual_quantity,
                currentStock: inventoryMap.get(item.product_id) || 0
            }))
        }))

        return NextResponse.json({ data: events, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// POST: 新規特売イベント作成
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<SaleEvent>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const {
            clientName,
            scheduleType,
            dates,
            description,
            items,
            allocateStock = false // 在庫引当オプション
        } = body as {
            clientName: string
            scheduleType: 'single' | 'monthly'
            dates: string[]
            description?: string
            items: Array<{ productId: string; quantity: number }>
            allocateStock?: boolean
        }

        // バリデーション
        if (!clientName || !dates || dates.length === 0 || !items || items.length === 0) {
            return NextResponse.json(
                { data: null, error: '必須項目が不足しています' },
                { status: 400 }
            )
        }

        // イベント作成
        const { data: eventData, error: eventError } = await supabase
            .from('sale_events')
            .insert({
                client_name: clientName,
                schedule_type: scheduleType,
                dates,
                description,
                status: 'upcoming'
            })
            .select()
            .single()

        if (eventError) {
            console.error('イベント作成エラー:', eventError)
            return NextResponse.json({ data: null, error: eventError.message }, { status: 500 })
        }

        // イベント商品を追加
        const eventItems = items.map(item => ({
            event_id: eventData.id,
            product_id: item.productId,
            planned_quantity: item.quantity,
            allocated_quantity: allocateStock ? item.quantity : 0
        }))

        const { error: itemsError } = await supabase
            .from('sale_event_items')
            .insert(eventItems)

        if (itemsError) {
            console.error('イベント商品追加エラー:', itemsError)
            // イベントを削除してロールバック
            await supabase.from('sale_events').delete().eq('id', eventData.id)
            return NextResponse.json({ data: null, error: itemsError.message }, { status: 500 })
        }

        // 在庫引当処理
        if (allocateStock) {
            for (const item of items) {
                // 現在の在庫を取得
                const { data: inventory } = await supabase
                    .from('inventory')
                    .select('quantity')
                    .eq('product_id', item.productId)
                    .single()

                const currentQty = inventory?.quantity || 0
                const newQty = Math.max(0, currentQty - item.quantity)

                // 在庫を減らす
                await supabase
                    .from('inventory')
                    .upsert({
                        product_id: item.productId,
                        quantity: newQty,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'product_id' })

                // 履歴を記録
                await supabase.from('stock_history').insert({
                    product_id: item.productId,
                    type: 'outgoing',
                    quantity: item.quantity,
                    note: `特売引当: ${clientName}`
                })
            }
        }

        return NextResponse.json({ data: eventData, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// PATCH: イベント更新（実績入力など）
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { eventId, action, data: updateData } = body as {
            eventId: string
            action: 'updateStatus' | 'updateActual' | 'allocateStock'
            data: Record<string, unknown>
        }

        if (action === 'updateStatus') {
            // ステータス更新
            const { error } = await supabase
                .from('sale_events')
                .update({ status: updateData.status })
                .eq('id', eventId)

            if (error) {
                return NextResponse.json({ data: null, error: error.message }, { status: 500 })
            }
        } else if (action === 'updateActual') {
            // 実績数量更新
            const items = updateData.items as Array<{ itemId: string; actualQuantity: number }>
            for (const item of items) {
                await supabase
                    .from('sale_event_items')
                    .update({ actual_quantity: item.actualQuantity })
                    .eq('id', item.itemId)
            }
        } else if (action === 'allocateStock') {
            // 在庫引当
            const { data: eventItems } = await supabase
                .from('sale_event_items')
                .select('product_id, planned_quantity, allocated_quantity')
                .eq('event_id', eventId)

            for (const item of eventItems || []) {
                const toAllocate = item.planned_quantity - item.allocated_quantity
                if (toAllocate <= 0) continue

                // 在庫を減らす
                const { data: inventory } = await supabase
                    .from('inventory')
                    .select('quantity')
                    .eq('product_id', item.product_id)
                    .single()

                const currentQty = inventory?.quantity || 0
                const newQty = Math.max(0, currentQty - toAllocate)

                await supabase
                    .from('inventory')
                    .upsert({
                        product_id: item.product_id,
                        quantity: newQty,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'product_id' })

                // 引当数量を更新
                await supabase
                    .from('sale_event_items')
                    .update({ allocated_quantity: item.planned_quantity })
                    .eq('event_id', eventId)
                    .eq('product_id', item.product_id)
            }
        }

        return NextResponse.json({ data: { success: true }, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// DELETE: イベント削除
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const eventId = searchParams.get('id')

        if (!eventId) {
            return NextResponse.json({ data: null, error: 'イベントIDが必要です' }, { status: 400 })
        }

        const { error } = await supabase
            .from('sale_events')
            .delete()
            .eq('id', eventId)

        if (error) {
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data: { success: true }, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}
