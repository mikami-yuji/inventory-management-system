/**
 * 認証ミドルウェア
 * - ページルート: 未認証ユーザーをログインページにリダイレクト
 * - APIルート: 未認証リクエストに401 JSONを返す
 */

import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest): Promise<NextResponse> {
    const token = await getToken({ req: request })
    const { pathname } = request.nextUrl

    // 認証済みの場合はそのまま通過
    if (token) {
        return NextResponse.next()
    }

    // APIルートの場合は401 JSONを返す（リダイレクトしない）
    if (pathname.startsWith('/api/')) {
        return NextResponse.json(
            { error: '認証が必要です' },
            { status: 401 }
        )
    }

    // ページルートの場合はログインページにリダイレクト
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
}

// 保護するパスの設定
// /login, /register, /api/auth, 静的ファイル(_next等) は除外
export const config = {
    matcher: [
        // ダッシュボード配下のすべてのページを保護
        '/dashboard/:path*',
        '/inventory/:path*',
        '/orders/:path*',
        '/events/:path*',
        '/reports/:path*',
        '/settings/:path*',
        '/stock-input/:path*',
        // APIルートを保護（/api/auth は除外）
        '/api/products/:path*',
        '/api/inventory/:path*',
        '/api/orders/:path*',
        '/api/stock-history/:path*',
        '/api/incoming-stock/:path*',
        '/api/sale-events/:path*',
        '/api/work-in-progress/:path*',
        '/api/supplier-stock/:path*',
    ],
}

