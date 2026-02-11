
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { StockHistory, ApiResponse } from '@/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<StockHistory[]>>> {
    try {
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')
        const period = searchParams.get('period') // days, optional

        if (!productId) {
            return NextResponse.json(
                { data: null, error: '商品IDは必須です' },
                { status: 400 }
            )
        }

        let query = supabase
            .from('stock_history')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: true })

        if (period) {
            const days = parseInt(period)
            if (!isNaN(days)) {
                const startDate = new Date()
                startDate.setDate(startDate.getDate() - days)
                query = query.gte('created_at', startDate.toISOString())
            }
        }

        const { data, error } = await query

        if (error) {
            console.error('履歴取得エラー:', error)
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        // Map DB types (snake_case) to Frontend types (camelCase)
        const history: StockHistory[] = (data || []).map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            date: item.created_at,
            type: item.type,
            quantity: item.quantity,
            changeAmount: item.type === 'adjustment' ? undefined : item.quantity, // For consistency, though quantity is used differently
            note: item.note
        }))

        return NextResponse.json({ data: history, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}
