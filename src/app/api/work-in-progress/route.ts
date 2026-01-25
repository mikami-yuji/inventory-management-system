import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// 仕掛中アイテムの型
type WorkInProgress = {
    id: string
    productId: string
    productName?: string
    productSku?: string
    quantity: number
    startedAt: string
    expectedCompletion: string | null
    completedAt: string | null
    note: string | null
    status: 'in_progress' | 'completed' | 'cancelled'
    createdAt: string
}

// GET: 仕掛中一覧を取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<WorkInProgress[]>>> {
    try {
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'in_progress'
        const productId = searchParams.get('productId')

        let query = supabase
            .from('work_in_progress')
            .select(`
                id,
                product_id,
                quantity,
                started_at,
                expected_completion,
                completed_at,
                note,
                status,
                created_at,
                products (
                    id,
                    name,
                    sku
                )
            `)
            .order('started_at', { ascending: false })

        if (status !== 'all') {
            query = query.eq('status', status)
        }

        if (productId) {
            query = query.eq('product_id', productId)
        }

        const { data, error } = await query

        if (error) {
            // テーブルが存在しない場合は空配列を返す
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                return NextResponse.json({ data: [], error: null })
            }
            console.error('仕掛中取得エラー:', error)
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        // レスポンス形式に変換
        const items: WorkInProgress[] = (data || []).map((item: {
            id: string
            product_id: string
            quantity: number
            started_at: string
            expected_completion: string | null
            completed_at: string | null
            note: string | null
            status: string
            created_at: string
            products: { id: string; name: string; sku: string | null } | null
        }) => ({
            id: item.id,
            productId: item.product_id,
            productName: item.products?.name || '',
            productSku: item.products?.sku || '',
            quantity: item.quantity,
            startedAt: item.started_at,
            expectedCompletion: item.expected_completion,
            completedAt: item.completed_at,
            note: item.note,
            status: item.status as WorkInProgress['status'],
            createdAt: item.created_at
        }))

        return NextResponse.json({ data: items, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// POST: 仕掛中を登録
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<WorkInProgress>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { productId, quantity, startedAt, expectedCompletion, note } = body as {
            productId: string
            quantity: number
            startedAt: string
            expectedCompletion?: string
            note?: string
        }

        // バリデーション
        if (!productId || !quantity || !startedAt) {
            return NextResponse.json(
                { data: null, error: '必須項目が不足しています' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('work_in_progress')
            .insert({
                product_id: productId,
                quantity,
                started_at: startedAt,
                expected_completion: expectedCompletion || null,
                note: note || null,
                status: 'in_progress'
            } as any)
            .select()
            .single<any>()

        if (error) {
            console.error('仕掛中登録エラー:', error)
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// PATCH: 仕掛中を更新（完了など）
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { id, action, data: updateData } = body as {
            id: string
            action: 'complete' | 'cancel' | 'update'
            data?: Record<string, unknown>
        }

        if (action === 'complete') {
            // 完了処理：在庫に反映
            const { data: wipItem } = await supabase
                .from('work_in_progress')
                .select('product_id, quantity')
                .eq('id', id)
                .single<any>()

            if (wipItem) {
                // 現在の在庫を取得
                const { data: inventory } = await supabase
                    .from('inventory')
                    .select('quantity')
                    .eq('product_id', wipItem.product_id)
                    .single<any>()

                const currentQty = inventory?.quantity || 0
                const newQty = currentQty + wipItem.quantity

                // 在庫を増やす
                await supabase
                    .from('inventory')
                    .upsert({
                        product_id: wipItem.product_id,
                        quantity: newQty,
                        updated_at: new Date().toISOString()
                    } as any, { onConflict: 'product_id' })

                // 履歴を記録
                await supabase.from('stock_history').insert({
                    product_id: wipItem.product_id,
                    type: 'incoming',
                    quantity: wipItem.quantity,
                    note: '仕掛中完了'
                } as any)

                // 仕掛中を完了に更新
                await supabase
                    .from('work_in_progress')
                    // @ts-ignore
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString().split('T')[0]
                    })
                    .eq('id', id)
            }
        } else if (action === 'cancel') {
            await supabase
                .from('work_in_progress')
                // @ts-ignore
                .update({ status: 'cancelled' })
                .eq('id', id)
        } else if (action === 'update' && updateData) {
            await supabase
                .from('work_in_progress')
                // @ts-ignore
                .update(updateData)
                .eq('id', id)
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

// DELETE: 仕掛中を削除
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ data: null, error: 'IDが必要です' }, { status: 400 })
        }

        const { error } = await supabase
            .from('work_in_progress')
            .delete()
            .eq('id', id)

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
