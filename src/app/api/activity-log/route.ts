/**
 * アクティビティログ API
 * 操作履歴の記録と取得を提供する
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// 操作ログの型
type ActivityLogRow = {
    id: string
    user_id: string | null
    user_email: string | null
    action: string
    target_type: string
    target_id: string | null
    target_name: string | null
    details: string | null
    created_at: string
}

type ActivityLogResponse = {
    id: string
    userId: string | null
    userEmail: string | null
    action: string
    targetType: string
    targetId: string | null
    targetName: string | null
    details: string | null
    createdAt: string
}

// 変換関数
const mapRowToLog = (row: ActivityLogRow): ActivityLogResponse => ({
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetName: row.target_name,
    details: row.details,
    createdAt: row.created_at,
})

// GET: 操作ログ一覧取得
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)

        // クエリパラメータ
        const limit = parseInt(searchParams.get('limit') ?? '50', 10)
        const offset = parseInt(searchParams.get('offset') ?? '0', 10)
        const action = searchParams.get('action')
        const targetType = searchParams.get('targetType')
        const days = parseInt(searchParams.get('days') ?? '30', 10)

        // ベースクエリ
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any)
            .from('activity_log')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // 操作種別フィルター
        if (action) {
            query = query.eq('action', action)
        }

        // 対象種別フィルター
        if (targetType) {
            query = query.eq('target_type', targetType)
        }

        // 期間フィルター
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        query = query.gte('created_at', startDate.toISOString())

        const { data, error, count } = await query

        if (error) {
            // テーブルが存在しない場合は空を返す
            if (error.code === '42P01') {
                return NextResponse.json({
                    data: [],
                    total: 0,
                    error: null,
                })
            }
            console.error('操作ログ取得エラー:', error)
            return NextResponse.json({ data: null, total: 0, error: error.message }, { status: 500 })
        }

        const logs = (data as ActivityLogRow[] || []).map(mapRowToLog)

        return NextResponse.json({
            data: logs,
            total: count || 0,
            error: null,
        })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, total: 0, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// POST: 操作ログを記録
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { action, targetType, targetId, targetName, details, userEmail } = body as {
            action: string
            targetType: string
            targetId?: string
            targetName?: string
            details?: string
            userEmail?: string
        }

        // バリデーション
        if (!action || !targetType) {
            return NextResponse.json(
                { data: null, error: '操作種別と対象種別は必須です' },
                { status: 400 }
            )
        }

        const insertData = {
            action,
            target_type: targetType,
            target_id: targetId || null,
            target_name: targetName || null,
            details: details || null,
            user_email: userEmail || null,
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('activity_log')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            // テーブルが存在しない場合もエラーにならないように
            if (error.code === '42P01') {
                return NextResponse.json({
                    data: null,
                    error: 'activity_logテーブルが存在しません。マイグレーションを実行してください。',
                }, { status: 500 })
            }
            console.error('操作ログ記録エラー:', error)
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            data: mapRowToLog(data as ActivityLogRow),
            error: null,
        })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}
