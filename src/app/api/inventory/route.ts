import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { Product, Inventory, ApiResponse } from '@/types'

// 在庫データ（商品情報含む）の型
type InventoryWithProduct = Inventory & {
    product: Product
}

// GET: 在庫一覧を取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryWithProduct[]>>> {
    try {
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
          category,
          image_url,
          description,
          status,
          min_stock_alert
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
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// PATCH: 在庫を更新（入出庫処理）
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<Inventory>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { productId, quantity, type, note } = body as {
            productId: string
            quantity: number
            type: 'incoming' | 'outgoing' | 'adjustment'
            note?: string
        }

        // バリデーション
        if (!productId || quantity === undefined || !type) {
            return NextResponse.json(
                { data: null, error: '必須パラメータが不足しています' },
                { status: 400 }
            )
        }

        // 現在の在庫を取得
        const { data: currentInventoryData, error: fetchError } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('product_id', productId)
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
            console.error('在庫取得エラー:', fetchError)
            return NextResponse.json({ data: null, error: fetchError.message }, { status: 500 })
        }

        const currentInventory = currentInventoryData as { quantity: number } | null;

        // 新しい在庫数を計算
        let newQuantity = currentInventory?.quantity ?? 0
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
        } else {
            newQuantity = quantity // 調整の場合は直接設定
        }

        // 在庫を更新
        const { data: updatedInventory, error: updateError } = await supabase
            .from('inventory')
            .upsert({
                product_id: productId,
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            } as any, { onConflict: 'product_id' })
            .select()
            .single()

        if (updateError) {
            console.error('在庫更新エラー:', updateError)
            return NextResponse.json({ data: null, error: updateError.message }, { status: 500 })
        }

        // 履歴を記録
        await supabase.from('stock_history').insert({
            product_id: productId,
            type,
            quantity,
            note
        } as any)

        return NextResponse.json({ data: updatedInventory, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}
