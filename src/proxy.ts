/**
 * 認証プロキシ（Next.js 16対応）
 * - ページルート: 未認証ユーザーをログインページにリダイレクト
 * - APIルート: 未認証リクエストに401 JSONを返す
 */

import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl
    console.log(`[Proxy] Request: ${pathname}`);

    try {
        // getTokenがハングする場合があるため、タイムアウトを設ける
        const tokenPromise = getToken({ req: request });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 5000));
        
        const token = await Promise.race([tokenPromise, timeoutPromise]) as unknown;

        // 認証済みの場合はそのまま通過
        if (token) {
            return NextResponse.next()
        }
    } catch (error) {
        console.error(`[Proxy] Auth Error at ${pathname}:`, error);
        // エラー時はフェイルセーフとして未認証扱いにする（ハングさせるより良い）
    }

    // APIルートの場合は401 JSONを返す（リダイレクトしない）
    if (pathname.startsWith('/api/')) {
        console.log(`[Proxy] Blocking API request: ${pathname}`);
        return NextResponse.json(
            { error: '認証が必要です' },
            { status: 401 }
        )
    }

    // ページルートの場合はログインページにリダイレクト
    console.log(`[Proxy] Redirecting to login: ${pathname}`);
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
