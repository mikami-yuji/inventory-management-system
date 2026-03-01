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
    termType?: string
    confirmationStatus?: string
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
                term_type,
                confirmation_status,
                created_at,
                products (
                    id,
                    name,
                    sku
                )
            `)
            .order('started_at', { ascending: true })

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
        const items: WorkInProgress[] = (data || []).map((item: any) => ({
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
            termType: item.term_type || undefined,
            confirmationStatus: item.confirmation_status || undefined,
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

        const { data, error } = await (supabase
            .from('work_in_progress') as any)
            .insert({
                product_id: productId,
                quantity,
                started_at: startedAt,
                expected_completion: expectedCompletion || null,
                note: note || null,
                status: 'in_progress',
                term_type: (body as any).termType || 'specific'
            })
            .select()
            .single()

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

        const { id, action, data: updateData, confirmedDate, quantity, supplierStock, expectedDate } = body as {
            id: string
            action: 'to_incoming' | 'to_supplier' | 'cancel' | 'update' | 'confirm'
            data?: Record<string, unknown>
            confirmedDate?: string
            quantity?: number
            supplierStock?: number
            expectedDate?: string
        }

        if (action === 'to_incoming') {
            // 仕掛品を入荷予定へ移動
            if (!expectedDate || !quantity) {
                return NextResponse.json({ data: null, error: '入荷予定日と数量は必須です' }, { status: 400 })
            }
            const { data: wipItem } = await supabase
                .from('work_in_progress')
                .select('product_id')
                .eq('id', id)
                .single<any>()

            if (wipItem) {
                await supabase
                    .from('incoming_stock')
                    .insert({
                        product_id: wipItem.product_id,
                        expected_date: expectedDate,
                        quantity: quantity,
                        note: '仕掛品からの予定'
                    } as any)

                // ユーザーからの要望により、入荷予定を追加しても「まだ仕上がっていない」ため、
                // 仕掛品のデータ（レコードや数量）は自動で削除・減算しないように変更。
                // 代わりに確認ステータスを「scheduled」にして入力済みであることを明示する。
                await supabase
                    .from('work_in_progress')
                    // @ts-ignore
                    .update({
                        confirmation_status: 'scheduled',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
            }
        } else if (action === 'to_supplier') {
            // 仕掛品をメーカー在庫へ移動
            if (!quantity) {
                return NextResponse.json({ data: null, error: '数量は必須です' }, { status: 400 })
            }
            const { data: wipItem } = await supabase
                .from('work_in_progress')
                .select('product_id')
                .eq('id', id)
                .single<any>()

            if (wipItem) {
                const { data: product } = await supabase
                    .from('products')
                    .select('supplier_stock')
                    .eq('id', wipItem.product_id)
                    .single<any>()

                const currentStock = product?.supplier_stock || 0

                await supabase
                    .from('products')
                    // @ts-ignore
                    .update({
                        supplier_stock: currentStock + quantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', wipItem.product_id)

                // 完了として仕掛品を削除
                await (supabase
                    .from('work_in_progress') as any)
                    .delete()
                    .eq('id', id)
            }
        } else if (action === 'confirm') {
            // 納期確定処理
            if (!confirmedDate || !quantity) {
                return NextResponse.json({ data: null, error: '日付と数量は必須です' }, { status: 400 })
            }

            // 1. 仕掛中データの更新
            const { data: wipItem, error: updateError } = await (supabase
                .from('work_in_progress') as any)
                .update({
                    quantity: quantity,
                    expected_completion: confirmedDate, // 具体的な日付で上書き
                    term_type: 'specific', // specificに変更
                    confirmation_status: 'confirmed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select('product_id')
                .single()

            if (updateError) throw updateError;
            if (!wipItem) throw new Error("仕掛中データが見つかりません");

            // 2. 入荷予定(incoming_stock)に登録
            await supabase
                .from('incoming_stock')
                .insert({
                    product_id: wipItem.product_id,
                    expected_date: confirmedDate,
                    quantity: quantity,
                    note: '仕掛中からの自動登録'
                } as any)

            // 3. メーカー在庫の更新 (指定がある場合)
            if (typeof supplierStock === 'number') {
                await supabase
                    .from('products')
                    // @ts-ignore
                    .update({
                        supplier_stock: supplierStock,
                        supplier_stock_updated_at: new Date().toISOString()
                    })
                    .eq('id', wipItem.product_id)
            }

        } else if (action === 'cancel') {
            await (supabase
                .from('work_in_progress') as any)
                // @ts-ignore
                .update({ status: 'cancelled' })
                .eq('id', id)
        } else if (action === 'update' && updateData) {
            await (supabase
                .from('work_in_progress') as any)
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

        const { error } = await (supabase
            .from('work_in_progress') as any)
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
