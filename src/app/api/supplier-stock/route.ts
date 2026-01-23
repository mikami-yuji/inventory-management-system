import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// PATCH: メーカー在庫を更新
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { productId, supplierStock } = body as {
            productId: string
            supplierStock: number
        }

        if (!productId || supplierStock === undefined) {
            return NextResponse.json(
                { data: null, error: '必須項目が不足しています' },
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
