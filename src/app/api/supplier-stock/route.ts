import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// PATCH: メーカー在庫を更新 または 現在庫へ移動
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { productId, supplierStock, action, movementQuantity, expectedDate, note } = body as {
            productId: string
            supplierStock?: number
            action?: 'update' | 'move_to_incoming'
            movementQuantity?: number
            expectedDate?: string
            note?: string
        }

        if (!productId) {
            return NextResponse.json(
                { data: null, error: '商品IDが不足しています' },
                { status: 400 }
            )
        }

        // 入荷予定へ移動のアクション
        if (action === 'move_to_incoming') {
            if (!movementQuantity || movementQuantity <= 0 || !expectedDate) {
                return NextResponse.json(
                    { data: null, error: '正の移動数量と入荷予定日を指定してください' },
                    { status: 400 }
                )
            }

            // 1. 現在のメーカー在庫を確認
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('supplier_stock')
                .eq('id', productId)
                .single()

            if (productError || !product) {
                return NextResponse.json({ data: null, error: '商品が見つかりません' }, { status: 404 })
            }

            // @ts-ignore
            const currentSupplierStock = product.supplier_stock || 0
            if (currentSupplierStock < movementQuantity) {
                return NextResponse.json({ data: null, error: 'メーカー在庫が不足しています' }, { status: 400 })
            }

            // 2. メーカー在庫を減らす
            const { error: updateSupplierError } = await supabase
                .from('products')
                // @ts-ignore
                .update({
                    supplier_stock: currentSupplierStock - movementQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId)

            if (updateSupplierError) {
                return NextResponse.json({ data: null, error: 'メーカー在庫の更新に失敗しました' }, { status: 500 })
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

        // 通常の在庫更新
        if (supplierStock === undefined) {
            return NextResponse.json(
                { data: null, error: '更新する在庫数が指定されていません' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('products')
            // @ts-ignore: Schema type definition missing supplier_stock
            .update({
                supplier_stock: supplierStock,
                updated_at: new Date().toISOString()
            })
            .eq('id', productId)

        if (error) {
            console.error('メーカー在庫更新エラー:', error)
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
