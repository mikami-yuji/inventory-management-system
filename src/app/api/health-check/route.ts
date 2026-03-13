import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
    try {
        const supabase = createServerClient()
        
        // 1. 基本的な接続テスト (productsテーブルの件数取得)
        const { count, error: connError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
        
        // 2. 環境変数の存在確認 (中身は隠す)
        const envStatus = {
            url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }

        if (connError) {
            return NextResponse.json({
                status: 'error',
                message: 'Supabase接続エラー',
                error: connError,
                env: envStatus
            }, { status: 500 })
        }

        return NextResponse.json({
            status: 'ok',
            database: 'connected',
            productCount: count,
            env: envStatus
        })
    } catch (e) {
        return NextResponse.json({
            status: 'server_error',
            error: e instanceof Error ? e.message : String(e)
        }, { status: 500 })
    }
}
