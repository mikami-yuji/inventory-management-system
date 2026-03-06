import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// GET: ロット一覧の取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any[]>>> {
    try {
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')

        let query = supabase
            .from('supplier_stock_lots')
            // @ts-ignore
            .select('*')

        if (productId) {
            query = query.eq('product_id', productId)
        }

        const { data, error } = await query.order('stock_date', { ascending: true })

        if (error) {
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        const lots = ((data as any[]) || []).map((lot: any) => ({
            id: lot.id,
            productId: lot.product_id,
            stockDate: lot.stock_date,
            quantity: lot.quantity,
            note: lot.note,
            createdAt: lot.created_at
        }))

        return NextResponse.json({ data: lots, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json({ data: null, error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
}

// POST: 新規ロットの追加
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { productId, quantity, stockDate, note } = body as {
            productId: string;
            quantity: number;
            stockDate: string;
            note?: string;
        }

        if (!productId || quantity === undefined || !stockDate) {
            return NextResponse.json({ data: null, error: '必須項目が不足しています' }, { status: 400 })
        }

        const { error } = await supabase
            .from('supplier_stock_lots')
            // @ts-ignore
            .insert({
                product_id: productId,
                quantity,
                stock_date: stockDate,
                note
            } as any)

        if (error) {
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data: { success: true }, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json({ data: null, error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
}

// PATCH: ロットの更新 または 入荷予定へ移動 または 旧仕様の全体在庫更新
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { productId, supplierStock, action, movementQuantity, expectedDate, note, lotId, quantity, stockDate } = body as any

        // ロットの数量・日付・メモの更新
        if (action === 'update_lot') {
            if (!lotId || quantity === undefined || !stockDate) {
                return NextResponse.json({ data: null, error: '必須項目が不足しています' }, { status: 400 })
            }

            const { error } = await supabase
                .from('supplier_stock_lots')
                // @ts-ignore
                .update({
                    quantity,
                    stock_date: stockDate,
                    note,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', lotId)

            if (error) {
                return NextResponse.json({ data: null, error: error.message }, { status: 500 })
            }

            return NextResponse.json({ data: { success: true }, error: null })
        }

        // 入荷予定へ移動 (FIFO方式で古いロットから消費)
        if (action === 'move_to_incoming') {
            if (!productId || !movementQuantity || movementQuantity <= 0 || !expectedDate) {
                return NextResponse.json({ data: null, error: '正の移動数量と入荷予定日を指定してください' }, { status: 400 })
            }

            // 1. 現在のメーカー在庫（ロット）を古い順に取得
            const { data: lots, error: lotsError } = await supabase
                .from('supplier_stock_lots')
                // @ts-ignore
                .select('*')
                .eq('product_id', productId)
                .gt('quantity', 0)
                .order('stock_date', { ascending: true })

            if (lotsError) {
                return NextResponse.json({ data: null, error: 'ロットの取得に失敗しました' }, { status: 500 })
            }

            const totalCurrentStock = ((lots as any[]) || []).reduce((sum, lot) => sum + lot.quantity, 0)
            if (totalCurrentStock < movementQuantity) {
                return NextResponse.json({ data: null, error: 'メーカー在庫が不足しています' }, { status: 400 })
            }

            // 2. FIFOでロットを減算
            let remainingToMove = movementQuantity
            for (const lot of ((lots as any[]) || [])) {
                if (remainingToMove <= 0) break

                const deductQuantity = Math.min(lot.quantity, remainingToMove)
                const newLotQuantity = lot.quantity - deductQuantity

                const { error: updateError } = await supabase
                    .from('supplier_stock_lots')
                    // @ts-ignore
                    .update({ quantity: newLotQuantity, updated_at: new Date().toISOString() } as any)
                    .eq('id', lot.id)

                if (updateError) {
                    return NextResponse.json({ data: null, error: 'ロットの更新に失敗しました' }, { status: 500 })
                }

                remainingToMove -= deductQuantity
            }

            // 3. 入荷予定を作成する
            const { error: incomingStockError } = await supabase
                .from('incoming_stock')
                .insert({
                    product_id: productId,
                    expected_date: expectedDate,
                    quantity: movementQuantity,
                    note: note || 'メーカー在庫からの出荷指示'
                } as any)

            if (incomingStockError) {
                return NextResponse.json({ data: null, error: '入荷予定の作成に失敗しました' }, { status: 500 })
            }

            return NextResponse.json({ data: { success: true }, error: null })
        }

        // 旧仕様: 互換性のための単一更新（今回は直接ロット追加に変換するか単数更新をシミュレーション）
        // supplier_stock_dialog.tsxでの利用はupdateSupplierStockとして呼ばれる古いフロー用
        if (supplierStock !== undefined && productId) {
            // 既存のロットをすべて削除して、指定された合計値で新しいロット「調整」を作る簡易的な実装
            await supabase.from('supplier_stock_lots').delete().eq('product_id', productId);
            if (supplierStock > 0) {
                await supabase.from('supplier_stock_lots').insert({
                    product_id: productId,
                    quantity: supplierStock,
                    stock_date: new Date().toISOString().split('T')[0],
                    note: '一括調整'
                } as any);
            }
            return NextResponse.json({ data: { success: true }, error: null })
        }

        // 在庫数の同期（ロットの合計値をproducts.supplier_stockへ反映）
        if (action === 'sync_all') {
            const { data: products } = await supabase
                .from('products')
                .select('id')

            if (products) {
                for (const p of products) {
                    const { data: lotSum } = await supabase
                        .from('supplier_stock_lots')
                        .select('quantity')
                        .eq('product_id', p.id)

                    const total = (lotSum as any[] || []).reduce((sum, lot) => sum + lot.quantity, 0)

                    await supabase
                        .from('products')
                        .update({ supplier_stock: total } as any)
                        .eq('id', p.id)
                }
            }

            return NextResponse.json({ data: { success: true }, error: null })
        }

        return NextResponse.json({ data: null, error: '不正なリクエストです' }, { status: 400 })

    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json({ data: null, error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
}

// DELETE: ロットの削除
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const lotId = searchParams.get('lotId')

        if (!lotId) {
            return NextResponse.json({ data: null, error: 'ロットIDが必要です' }, { status: 400 })
        }

        const { error } = await supabase
            .from('supplier_stock_lots')
            // @ts-ignore
            .delete()
            .eq('id', lotId)

        if (error) {
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data: { success: true }, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json({ data: null, error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
}
