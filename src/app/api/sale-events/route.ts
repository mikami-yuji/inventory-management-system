import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse, SaleEvent, SaleEventItem } from '@/types'
import { getJSTNow } from '@/lib/utils/date'

// GET: 特売イベント一覧を取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SaleEvent[]>>> {
    try {
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        // 期限切れのイベントを自動的に完了扱いにする
        // JST基準での今日の日付（YYYY-MM-DD形式）
        const nowJST = getJSTNow();
        const todayStr = nowJST.toISOString().split('T')[0];

        // 完了にすべきイベントを特定
        // status が upcoming または active で、かつ全日程が今日より前のもの
        const { data: activeEvents } = await supabase
            .from('sale_events')
            .select(`
                id, 
                dates, 
                status,
                client_name,
                sale_event_items (
                    product_id,
                    allocated_quantity
                )
            `)
            .in('status', ['upcoming', 'active'])
            .returns<any[]>();

        if (activeEvents && activeEvents.length > 0) {
            const eventsToComplete = activeEvents.filter((event: any) => {
                if (!event.dates || event.dates.length === 0) return false;
                // 全ての開催日が今日より前かチェック
                return event.dates.every((date: string) => date < todayStr);
            });

            if (eventsToComplete.length > 0) {
                console.log(`Auto-completing ${eventsToComplete.length} events`);

                for (const event of eventsToComplete) {
                    const items = event.sale_event_items as Array<{ product_id: string, allocated_quantity: number }>;

                    // 1. 在庫の差し戻し処理
                    for (const item of items) {
                        if (item.allocated_quantity > 0) {
                            // 現在の在庫を取得
                            const { data: inventory } = await supabase
                                .from('inventory')
                                .select('quantity')
                                .eq('product_id', item.product_id)
                                .single<any>();

                            const currentQty = inventory?.quantity || 0;
                            const newQty = currentQty + item.allocated_quantity;

                            // 在庫を増やす
                            await supabase
                                .from('inventory')
                                .upsert({
                                    product_id: item.product_id,
                                    quantity: newQty,
                                    updated_at: new Date().toISOString()
                                } as any, { onConflict: 'product_id' });

                            // 履歴を記録
                            await supabase.from('stock_history').insert({
                                product_id: item.product_id,
                                type: 'incoming',
                                quantity: item.allocated_quantity,
                                note: `特売期限切れによる引当解除: ${event.client_name}`
                            } as any);

                            // 引当数量をリセット
                            await supabase
                                .from('sale_event_items')
                                // @ts-ignore
                                .update({ allocated_quantity: 0 })
                                .eq('event_id', event.id)
                                .eq('product_id', item.product_id);
                        }
                    }

                    // 2. ステータスを完了に更新
                    await supabase
                        .from('sale_events')
                        // @ts-ignore
                        .update({ status: 'completed' })
                        .eq('id', event.id);
                }
            }

            // 進行中にすべきイベントを特定（開催10日前）
            const tenDaysLaterJST = new Date(nowJST.getTime() + 10 * 24 * 60 * 60 * 1000);
            const tenDaysLaterStr = tenDaysLaterJST.toISOString().split('T')[0];

            const eventsToActive = activeEvents.filter((event: any) => {
                if (event.status !== 'upcoming') return false;
                if (!event.dates || event.dates.length === 0) return false;

                // 最小の日付（開始日）を取得
                const startDate = [...event.dates].sort()[0];
                // 開始日が今日から10日以内かチェック
                return startDate <= tenDaysLaterStr;
            });

            if (eventsToActive.length > 0) {
                const ids = eventsToActive.map(e => e.id);
                console.log(`Auto-activating ${ids.length} events:`, ids);
                await supabase
                    .from('sale_events')
                    // @ts-ignore
                    .update({ status: 'active' })
                    .in('id', ids);
            }
        }

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
                        sku,
                        shape,
                        weight
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

        // 完了後5日経過したイベントを除外するフィルタリング
        const fiveDaysAgoStr = new Date(nowJST.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const filteredData = (data || []).filter((event: any) => {
            if (event.status === 'completed') {
                if (!event.dates || event.dates.length === 0) return true;
                const lastDate = [...event.dates].sort().reverse()[0];
                if (lastDate < fiveDaysAgoStr) {
                    return false; // 5日以上前の完了イベントは除外
                }
            }
            return true;
        });

        // レスポンス形式に変換
        const events: SaleEvent[] = filteredData.map((event: {
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
                products: { id: string; name: string; sku: string | null; shape: string | null; weight: number | null }
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
                currentStock: inventoryMap.get(item.product_id) || 0,
                productShape: item.products?.shape || null,
                productWeight: item.products?.weight || null
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
            } as any)
            .select()
            .single<any>()

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
            .insert(eventItems as any)

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
                    .single<any>()

                const currentQty = inventory?.quantity || 0
                const newQty = Math.max(0, currentQty - item.quantity)

                // 在庫を減らす
                await supabase
                    .from('inventory')
                    .upsert({
                        product_id: item.productId,
                        quantity: newQty,
                        updated_at: new Date().toISOString()
                    } as any, { onConflict: 'product_id' })

                // 履歴を記録
                await supabase.from('stock_history').insert({
                    product_id: item.productId,
                    type: 'outgoing',
                    quantity: item.quantity,
                    note: `特売引当: ${clientName}`
                } as any)
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
            action: 'updateStatus' | 'updateActual' | 'allocateStock' | 'updateAllocation'
            data: any
        }

        if (action === 'updateStatus') {
            // ステータス更新
            const { error } = await supabase
                .from('sale_events')
                // @ts-ignore
                .update({ status: updateData.status })
                .eq('id', eventId)

            if (error) {
                return NextResponse.json({ data: null, error: error.message }, { status: 500 })
            }
        } else if (action === 'updateActual') {
            // 実績数量更新 & 在庫自動連動
            const items = updateData.items as Array<{ itemId: string; actualQuantity: number }>

            // イベント情報を取得（履歴用）
            const { data: event } = await supabase
                .from('sale_events')
                .select('client_name')
                .eq('id', eventId)
                .single<any>()

            for (const item of items) {
                // 現在のアイテム情報を取得
                const { data: currentItem } = await supabase
                    .from('sale_event_items')
                    .select('product_id, actual_quantity, allocated_quantity')
                    .eq('id', item.itemId)
                    .single<any>()

                if (currentItem) {
                    const oldActual = currentItem.actual_quantity || 0
                    const allocated = currentItem.allocated_quantity || 0
                    const newActual = item.actualQuantity

                    // 在庫調整量の計算
                    // 初回確定時（引当があるとき）: 実績 - 引当
                    // 更新時（引当がなく、実績を上書きするとき）: 新実績 - 旧実績
                    const adjustment = (allocated > 0)
                        ? (newActual - allocated)
                        : (newActual - oldActual)

                    if (adjustment !== 0) {
                        // 在庫を更新
                        const { data: inventory } = await supabase
                            .from('inventory')
                            .select('quantity')
                            .eq('product_id', currentItem.product_id)
                            .single<any>()

                        const currentQty = inventory?.quantity || 0
                        const newQty = Math.max(0, currentQty - adjustment)

                        await supabase
                            .from('inventory')
                            .upsert({
                                product_id: currentItem.product_id,
                                quantity: newQty,
                                updated_at: new Date().toISOString()
                            } as any, { onConflict: 'product_id' })

                        // 在庫履歴を記録
                        await supabase.from('stock_history').insert({
                            product_id: currentItem.product_id,
                            type: adjustment > 0 ? 'outgoing' : 'incoming',
                            quantity: Math.abs(adjustment),
                            note: `特売実績確定調整: ${event?.client_name || '不明'}`
                        } as any)
                    }

                    // アイテムの実績を更新し、引当を0にする
                    await supabase
                        .from('sale_event_items')
                        // @ts-ignore
                        .update({
                            actual_quantity: newActual,
                            allocated_quantity: 0
                        })
                        .eq('id', item.itemId)
                }
            }
        } else if (action === 'allocateStock') {
            // 在庫引当
            const { data: eventItems } = await supabase
                .from('sale_event_items')
                .select('product_id, planned_quantity, allocated_quantity, actual_quantity')
                .eq('event_id', eventId)
                .returns<any[]>()

            for (const item of eventItems || []) {
                // すでに実績が入力されている場合は引当をスキップ（二重減算防止）
                if (item.actual_quantity > 0) continue;

                const toAllocate = item.planned_quantity - item.allocated_quantity
                if (toAllocate <= 0) continue

                // 在庫を減らす
                const { data: inventory } = await supabase
                    .from('inventory')
                    .select('quantity')
                    .eq('product_id', item.product_id)
                    .single<any>()

                const currentQty = inventory?.quantity || 0
                const newQty = Math.max(0, currentQty - toAllocate)

                await supabase
                    .from('inventory')
                    .upsert({
                        product_id: item.product_id,
                        quantity: newQty,
                        updated_at: new Date().toISOString()
                    } as any, { onConflict: 'product_id' })

                // 引当数量を更新
                await supabase
                    .from('sale_event_items')
                    // @ts-ignore
                    .update({ allocated_quantity: item.planned_quantity })
                    .eq('event_id', eventId)
                    .eq('product_id', item.product_id)
            }
        } else if (action === 'updateAllocation') {
            // 引当数の直接修正（在庫とは連動しない）
            const { itemId, newAllocatedQuantity } = updateData as { itemId: string; newAllocatedQuantity: number }

            // イベント情報を取得（履歴用）
            const { data: event } = await supabase
                .from('sale_events')
                .select('client_name')
                .eq('id', eventId)
                .single<any>()

            // 現在のアイテム情報を取得
            const { data: currentItem } = await supabase
                .from('sale_event_items')
                .select('product_id, allocated_quantity')
                .eq('id', itemId)
                .single<any>()

            if (!currentItem) {
                return NextResponse.json({ data: null, error: '対象のアイテムが見つかりません' }, { status: 404 })
            }

            const oldAllocated = currentItem.allocated_quantity || 0

            // 変更がない場合はスキップ
            if (oldAllocated === newAllocatedQuantity) {
                return NextResponse.json({ data: { success: true }, error: null })
            }

            // 引当数量を更新
            await supabase
                .from('sale_event_items')
                // @ts-ignore
                .update({ allocated_quantity: newAllocatedQuantity })
                .eq('id', itemId)
        } else if (action === 'updateEvent') {
            // イベント情報の全般的な更新
            const { clientName, scheduleType, dates, description, items } = updateData as {
                clientName: string;
                scheduleType: 'single' | 'monthly';
                dates: string[];
                description: string | null;
                items: Array<{ productId: string; plannedQuantity: number }>;
            };

            // 1. 基本情報の更新
            const { error: updateError } = await supabase
                .from('sale_events')
                // @ts-ignore
                .update({
                    client_name: clientName,
                    schedule_type: scheduleType,
                    dates,
                    description,
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventId);

            if (updateError) throw updateError;

            // 2. アイテムの更新
            // 既存のアイテムを取得
            const { data: existingItems } = await supabase
                .from('sale_event_items')
                .select('id, product_id, allocated_quantity')
                .eq('event_id', eventId)
                .returns<any[]>();

            const existingItemMap = new Map(existingItems?.map(i => [i.product_id, i]));

            // 新しく追加・更新する商品
            const newProductIds = new Set(items.map(i => i.productId));

            // 削除された商品を特定し、引当を解除する
            for (const existingItem of existingItems || []) {
                if (!newProductIds.has(existingItem.product_id)) {
                    // 引当がある場合は解除（在庫に戻す）
                    if (existingItem.allocated_quantity > 0) {
                        const { data: inventory } = await supabase
                            .from('inventory')
                            .select('quantity')
                            .eq('product_id', existingItem.product_id)
                            .single<any>();

                        const currentQty = inventory?.quantity || 0;
                        await supabase
                            .from('inventory')
                            .upsert({
                                product_id: existingItem.product_id,
                                quantity: currentQty + existingItem.allocated_quantity,
                                updated_at: new Date().toISOString()
                            } as any, { onConflict: 'product_id' });
                    }
                    // レコード削除
                    await supabase.from('sale_event_items').delete().eq('id', existingItem.id);
                }
            }

            // 追加・更新
            for (const item of items) {
                const existing = existingItemMap.get(item.productId);
                if (existing) {
                    // 更新
                    await supabase
                        .from('sale_event_items')
                        // @ts-ignore
                        .update({ planned_quantity: item.plannedQuantity })
                        .eq('id', existing.id);
                } else {
                    // 新規追加
                    await supabase
                        .from('sale_event_items')
                        .insert({
                            event_id: eventId,
                            product_id: item.productId,
                            planned_quantity: item.plannedQuantity,
                            allocated_quantity: 0
                        } as any);
                }
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
