/**
 * 認証セッション情報を取得するカスタムフック
 * NextAuthのセッションから拡張ユーザー情報を取得する
 */

'use client'

import { useSession } from 'next-auth/react'

// セッションユーザーの型定義
export type SessionUser = {
    id: string
    name: string
    email: string
    role: 'admin' | 'client'
}

// フックの戻り値の型定義
type UseAuthSessionReturn = {
    user: SessionUser | null
    isAuthenticated: boolean
    isAdmin: boolean
    isLoading: boolean
}

/**
 * 認証セッション情報を取得するフック
 * ログイン済みユーザーのID、名前、メール、ロールを取得できる
 */
export function useAuthSession(): UseAuthSessionReturn {
    const { data: session, status } = useSession()

    const isLoading = status === 'loading'
    const isAuthenticated = status === 'authenticated'

    // セッションからユーザー情報を取得
    const user: SessionUser | null = isAuthenticated && session?.user
        ? {
            id: (session.user as { id?: string }).id || '',
            name: session.user.name || '',
            email: session.user.email || '',
            role: ((session.user as { role?: string }).role as 'admin' | 'client') || 'client',
        }
        : null

    const isAdmin = user?.role === 'admin'

    return {
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
    }
}
