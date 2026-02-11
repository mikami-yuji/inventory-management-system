/**
 * ユーザー登録API
 * Supabase Authにユーザーを登録し、usersテーブルにもレコードを作成する
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// レスポンスの型定義
type RegisterResponse = {
    success: boolean
    message: string
    userId?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<RegisterResponse>> {
    try {
        const body = await request.json()
        const { email, password, name } = body as {
            email: string
            password: string
            name: string
        }

        // バリデーション
        if (!email || !password || !name) {
            return NextResponse.json(
                { success: false, message: 'メールアドレス、パスワード、名前は必須です' },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, message: 'パスワードは6文字以上で入力してください' },
                { status: 400 }
            )
        }

        const supabase = createServerClient()

        // Supabase Authにユーザーを登録
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // メール確認をスキップ（管理者が作成するため）
        })

        if (authError) {
            console.error('Supabase Auth登録エラー:', authError)
            return NextResponse.json(
                { success: false, message: `ユーザー登録に失敗しました: ${authError.message}` },
                { status: 500 }
            )
        }

        if (!authData.user) {
            return NextResponse.json(
                { success: false, message: 'ユーザー作成に失敗しました' },
                { status: 500 }
            )
        }

        // usersテーブルにもレコードを作成
        const { error: dbError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                email,
                name,
                role: 'admin', // 初回登録は管理者として設定
            } as any)

        if (dbError) {
            console.error('usersテーブル登録エラー:', dbError)
            // Auth側のユーザーは作成済みだが、DBへの登録に失敗
            // ここでは警告だけ出して成功扱い
            return NextResponse.json({
                success: true,
                message: 'ユーザーは作成されましたが、プロフィール情報の保存に失敗しました。管理者に連絡してください。',
                userId: authData.user.id,
            })
        }

        return NextResponse.json({
            success: true,
            message: 'ユーザー登録が完了しました',
            userId: authData.user.id,
        })

    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { success: false, message: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}
