import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export interface AuthenticatedUser {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
}

export type AuthResult =
    | { success: true; user: AuthenticatedUser }
    | { success: false; response: NextResponse };

/**
 * ログイン中ユーザーのセッションを取得・検証する
 */
export async function getAuthenticatedSession(): Promise<AuthenticatedUser | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return null;
    }
    const user = session.user as AuthenticatedUser;
    if (!user.id) {
        return null;
    }
    return user;
}

/**
 * 認証が必須のエンドポイント用ガード
 * 未認証の場合は 401 Unauthorized を返す
 */
export async function requireAuth(): Promise<AuthResult> {
    const user = await getAuthenticatedSession();
    if (!user) {
        return {
            success: false,
            response: NextResponse.json(
                { error: 'Unauthorized: ログインが必要です' },
                { status: 401 }
            ),
        };
    }
    return { success: true, user };
}

/**
 * 管理者(admin)権限が必須のエンドポイント用ガード
 * 未認証時は 401、非管理者の場合は 403 Forbidden を返す
 */
export async function requireAdmin(): Promise<AuthResult> {
    const auth = await requireAuth();
    if (!auth.success) {
        return auth;
    }

    if (auth.user.role !== 'admin') {
        return {
            success: false,
            response: NextResponse.json(
                { error: 'Forbidden: 管理者権限が必要です' },
                { status: 403 }
            ),
        };
    }

    return auth;
}
