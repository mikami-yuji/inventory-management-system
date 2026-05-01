import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { logError } from '@/lib/logger'

// 価格改定インポートのリクエストボディ型
type PriceRevisionItem = {
  sku: string; // 受注№（商品マッチング用）
  newUnitPrice: number; // 新単価
  newPrintingCost?: number; // 新印刷代
  material?: string; // 材質名称（適用日グループ用）
}

type PriceRevisionRequest = {
  items: PriceRevisionItem[];
  // 材質ごとの値上げ適用手配日 (キー: 材質名称, 値: YYYY-MM-DD)
  effectiveDates: Record<string, string>;
}

// POST: 価格改定データを一括取り込み
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const body: PriceRevisionRequest = await request.json()

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { data: null, error: '取り込みデータが空です' },
        { status: 400 }
      )
    }

    // 全商品を取得してSKUでマッチング用のマップを作成
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, sku, unit_price, printing_cost, material')

    if (fetchError) {
      return NextResponse.json({ data: null, error: fetchError.message }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productMap = new Map<string, any>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allProducts?.forEach((p: any) => {
      productMap.set(p.sku, p)
    })

    let updatedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    // 各アイテムを処理
    for (const item of body.items) {
      const product = productMap.get(item.sku)
      if (!product) {
        skippedCount++
        continue
      }

      // 材質に基づく適用日を取得
      const effectiveDate = product.material
        ? body.effectiveDates[product.material] || null
        : null

      // 商品の価格を更新（旧価格を保存してから新価格に切り替え）
      const { error: updateError } = await supabase
        .from('products')
        .update({
          old_unit_price: product.unit_price,
          old_printing_cost: product.printing_cost,
          unit_price: item.newUnitPrice,
          printing_cost: item.newPrintingCost ?? product.printing_cost,
          price_increase_effective_date: effectiveDate,
        })
        .eq('id', product.id)

      if (updateError) {
        errors.push(`${item.sku}: ${updateError.message}`)
        continue
      }

      // 既存在庫を旧価格在庫に移行
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('quantity, old_price_quantity')
        .eq('product_id', product.id)
        .single()

      if (inventoryData) {
        const currentTotal = inventoryData.quantity || 0
        await supabase
          .from('inventory')
          .update({
            old_price_quantity: currentTotal, // 現在の全在庫を旧価格在庫に
          })
          .eq('product_id', product.id)
      }

      updatedCount++
    }

    return NextResponse.json({
      data: {
        updatedCount,
        skippedCount,
        errors,
      },
      error: null,
    })
  } catch (error) {
    await logError({
      route: '/api/price-revision/import',
      method: 'POST',
      error,
    })
    return NextResponse.json(
      { data: null, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
