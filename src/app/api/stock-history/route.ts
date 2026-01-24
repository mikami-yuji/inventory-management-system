import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse, StockHistory } from '@/types'

// Supabaseから取得するデータの型
type StockHistoryRow = {
    id: string
    product_id: string
    user_id: string | null
    type: string
    quantity: number
    note: string | null
    created_at: string
}

// 変換関数
const mapRowToStockHistory = (row: StockHistoryRow): StockHistory => ({
    id: row.id,
    productId: row.product_id,
    date: row.created_at,
    quantity: row.quantity,
    type: row.type as StockHistory['type'],
    changeAmount: row.quantity, // 在庫履歴ではquantityが変動量を表す
    note: row.note ?? undefined,
})

// GET: 在庫履歴を取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<StockHistory[]>>> {
    try {
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)

        // クエリパラメータ
        const productId = searchParams.get('productId')
        const limit = parseInt(searchParams.get('limit') ?? '100', 10)
        const days = parseInt(searchParams.get('days') ?? '90', 10)

        // ベースクエリ
        let query = supabase
            .from('stock_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        // 商品IDフィルター
        if (productId) {
            query = query.eq('product_id', productId)
        }

        // 期間フィルター
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        query = query.gte('created_at', startDate.toISOString())

        const { data, error } = await query

        if (error) {
            console.error('在庫履歴取得エラー:', error)
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        const stockHistory = (data as StockHistoryRow[]).map(mapRowToStockHistory)

        return NextResponse.json({ data: stockHistory, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// POST: 在庫履歴を追加（手動）
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<StockHistory>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { productId, type, quantity, note } = body as {
            productId: string
            type: StockHistory['type']
            quantity: number
            note?: string
        }

        // バリデーション
        if (!productId || !type || quantity === undefined) {
            return NextResponse.json(
                { data: null, error: '必須パラメータが不足しています' },
                { status: 400 }
            )
        }

        // 履歴を追加
        const insertData = {
            product_id: productId,
            type,
            quantity,
            note,
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('stock_history')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            console.error('在庫履歴追加エラー:', error)
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        const stockHistory = mapRowToStockHistory(data as StockHistoryRow)

        return NextResponse.json({ data: stockHistory, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}
