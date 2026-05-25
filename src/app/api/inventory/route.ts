import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { Product, Inventory, ApiResponse } from '@/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import { logError } from '@/lib/logger'

// 在庫データ（商品情報含む）の型
type InventoryWithProduct = Inventory & {
    product: Product
}

// GET: 在庫一覧を取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryWithProduct[]>>> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)

        // クエリパラメータ
        const category = searchParams.get('category')
        const search = searchParams.get('search')
        const lowStock = searchParams.get('lowStock') === 'true'

        // ベースクエリ
        let query = supabase
            .from('inventory')
            .select(`
        product_id,
        quantity,
        old_price_quantity,
        updated_at,
        product:products (
          id,
          name,
          sku,
          jan_code,
          weight,
          shape,
          material,
          unit_price,
          printing_cost,
          old_unit_price,
          old_printing_cost,
          price_increase_effective_date,
          category,
          image_url,
          description,
          status,
          min_stock_alert,
          supplier_stock,
          supplier_stock_updated_at,
          meters_per_roll
        )
      `)

        // カテゴリフィルター
        if (category && category !== 'all') {
            query = query.eq('product.category', category)
        }

        // 検索フィルター
        if (search) {
            query = query.or(`product.name.ilike.%${search}%,product.sku.ilike.%${search}%`)
        }

        const { data, error } = await query

        if (error) {
            console.error('在庫取得エラー:', error)
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        // 在庫アラート対象のみ抽出
        let result = data as unknown as InventoryWithProduct[]
        if (lowStock) {
            result = result.filter(item => {
                const minAlert = item.product?.minStockAlert ?? 100
                return item.quantity < minAlert
            })
        }

        return NextResponse.json({ data: result, error: null })
    } catch (error) {
        await logError({
            route: '/api/inventory',
            method: 'GET',
            error,
        })
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

const updateInventorySchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number(),
    type: z.enum(['incoming', 'outgoing', 'adjustment']),
    note: z.string().optional()
})

// PATCH: 在庫を更新（入出庫処理）
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<Inventory>>> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServerClient()
        const body = await request.json()

        const validated = updateInventorySchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { data: null, error: '入力値が不正です。' },
                { status: 400 }
            )
        }

        const { productId, quantity, type, note } = validated.data;

        // 現在の在庫を取得
        const { data: currentInventoryData, error: fetchError } = await supabase
            .from('inventory')
            .select('quantity, old_price_quantity')
            .eq('product_id', productId)
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
            console.error('在庫取得エラー:', fetchError)
            return NextResponse.json({ data: null, error: fetchError.message }, { status: 500 })
        }

        const currentInventory = currentInventoryData as { quantity: number; old_price_quantity: number } | null;

        // 新しい在庫数を計算
        let newQuantity = currentInventory?.quantity ?? 0
        let newOldPriceQuantity = currentInventory?.old_price_quantity ?? 0

        if (type === 'incoming') {
            newQuantity += quantity
        } else if (type === 'outgoing') {
            newQuantity -= quantity
            if (newQuantity < 0) {
                return NextResponse.json(
                    { data: null, error: '在庫数が不足しています' },
                    { status: 400 }
                )
            }
            // FIFO: 旧価格在庫から優先的に減らす
            if (newOldPriceQuantity > 0) {
                const oldReduction = Math.min(newOldPriceQuantity, quantity)
                newOldPriceQuantity -= oldReduction
            }
        } else {
            newQuantity = quantity // 調整の場合は直接設定

            // 調整（棚卸し）により在庫が減少した場合、減少分を旧価格在庫から優先的に削減する
            const currentQty = currentInventory?.quantity ?? 0;
            const diff = currentQty - newQuantity;
            if (diff > 0) {
                const currentOldQty = currentInventory?.old_price_quantity ?? 0;
                newOldPriceQuantity = Math.max(0, currentOldQty - diff);
            }
        }

        // 旧価格在庫が総在庫を超えないように補正
        if (newOldPriceQuantity > newQuantity) {
            newOldPriceQuantity = newQuantity
        }

        // 在庫を更新
        const { data: updateResults, error: updateError } = await supabase
            .from('inventory')
            .upsert({
                product_id: productId,
                quantity: newQuantity,
                old_price_quantity: newOldPriceQuantity,
                updated_at: new Date().toISOString()
            }, { onConflict: 'product_id' })
            .select();

        if (updateError) {
            console.error('在庫更新エラー:', updateError)
            return NextResponse.json({ data: null, error: updateError.message }, { status: 500 })
        }

        if (!updateResults || updateResults.length === 0) {
            return NextResponse.json({ data: null, error: '在庫の更新結果を取得できませんでした' }, { status: 500 })
        }

        const updatedInventory = updateResults[0];

        // 履歴を記録
        await supabase.from('stock_history').insert({
            product_id: productId,
            type,
            quantity,
            note
        })

        return NextResponse.json({ data: updatedInventory, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}
