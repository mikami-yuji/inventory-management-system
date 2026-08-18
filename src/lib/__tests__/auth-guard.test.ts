import { requireAuth, requireAdmin, getAuthenticatedSession } from '@/lib/auth-guard';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body, init) => ({
            body,
            status: init?.status ?? 200,
            json: async () => body,
        })),
    },
}));

describe('Auth Guard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAuthenticatedSession', () => {
        it('セッションが存在しない場合は null を返す', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);
            const user = await getAuthenticatedSession();
            expect(user).toBeNull();
        });

        it('ユーザーIDがない無効なセッションの場合は null を返す', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: {} });
            const user = await getAuthenticatedSession();
            expect(user).toBeNull();
        });

        it('有効なユーザーセッションがある場合はユーザーオブジェクトを返す', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: 'u123', email: 'test@example.com', role: 'admin' },
            });
            const user = await getAuthenticatedSession();
            expect(user).toEqual({ id: 'u123', email: 'test@example.com', role: 'admin' });
        });
    });

    describe('requireAuth', () => {
        it('未認証の場合は 401 ステータスのレスポンスを返す', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);
            const result = await requireAuth();
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.response.status).toBe(401);
            }
        });

        it('認証済みの場合は success: true とユーザー情報を返す', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: 'u123', role: 'user' },
            });
            const result = await requireAuth();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.user.id).toBe('u123');
            }
        });
    });

    describe('requireAdmin', () => {
        it('未認証の場合は 401 を返す', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);
            const result = await requireAdmin();
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.response.status).toBe(401);
            }
        });

        it('一般ユーザー(role: user)の場合は 403 Forbidden を返す', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: 'u123', role: 'user' },
            });
            const result = await requireAdmin();
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.response.status).toBe(403);
            }
        });

        it('管理者(role: admin)の場合は success: true を返す', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: 'admin1', role: 'admin' },
            });
            const result = await requireAdmin();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.user.role).toBe('admin');
            }
        });
    });
});
