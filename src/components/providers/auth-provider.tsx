'use client'

import { SessionProvider } from 'next-auth/react'

type Props = {
    children: React.ReactNode
}

// NextAuth.jsのセッションプロバイダー
export default function AuthProvider({ children }: Props): React.ReactNode {
    return <SessionProvider>{children}</SessionProvider>
}
