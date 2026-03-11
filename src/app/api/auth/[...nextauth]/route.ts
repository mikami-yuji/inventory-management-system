import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createServerClient } from '@/lib/supabase'

// ユーザーデータ型
type UserData = {
    id: string
    name: string
    email: string
    role: string
}

// 認証オプション

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'メールアドレス', type: 'email' },
                password: { label: 'パスワード', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                try {
                    const supabase = createServerClient()

                    // Supabaseの認証を使用
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: credentials.email,
                        password: credentials.password
                    })

                    if (error || !data.user) {
                        console.error('認証エラー:', error?.message)
                        throw new Error(`AUTH_ERROR: ${error?.message || 'No user'}`)
                    }

                    // ユーザー情報を取得
                    const { data: userData, error: dbError } = await supabase
                        .from('users')
                        .select('id, name, email, role')
                        .eq('id', data.user.id)
                        .limit(1)
                        .maybeSingle()

                    if (dbError || !userData) {
                        console.error('DB Fetchエラー:', dbError?.message)
                        throw new Error(`DB_ERROR: ${dbError?.message || 'No profile in public.users'}`)
                    }

                    if (userData.role === 'blocked') {
                        console.error('ブロックされたユーザーのログイン試行:', userData.email)
                        throw new Error('USER_BLOCKED')
                    }

                    const user = userData as UserData
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                } catch (error: any) {
                    console.error('認証処理エラー:', error)
                    if (error.message && (error.message.startsWith('AUTH_ERROR') || error.message.startsWith('DB_ERROR') || error.message === 'USER_BLOCKED')) {
                        throw error
                    }
                    throw new Error(`SYSTEM_ERROR: ${error.message}`)
                }
            }
        })
    ],
    session: {
        strategy: 'jwt'
    },
    callbacks: {
        async jwt({ token, user }) {
            // 初回ログイン時にユーザー情報をトークンに追加
            if (user) {
                token.id = user.id
                token.role = (user as { role?: string }).role
            }
            return token
        },
        async session({ session, token }) {
            // セッションにユーザー情報を追加
            if (session.user) {
                (session.user as { id?: string }).id = token.id as string
                (session.user as { role?: string }).role = token.role as string
            }
            return session
        }
    },
    pages: {
        signIn: '/login'
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

