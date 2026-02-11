/**
 * APIクライアントユーティリティ
 * 統一的なAPI呼び出しとエラーハンドリングを提供
 */

/**
 * APIエラークラス
 * ステータスコードとメッセージを保持する
 */
export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

/**
 * APIレスポンスの共通型
 */
type ApiResponse<T> = {
    data: T | null;
    error: string | null;
};

/**
 * 認証エラーかどうかを判定
 */
export function isAuthError(error: unknown): boolean {
    return error instanceof ApiError && error.status === 401;
}

/**
 * 統一的なfetchラッパー
 * - 認証エラー時にログインページへリダイレクト
 * - レスポンスのJSONパースを自動化
 * - エラーメッセージの統一化
 */
export async function apiFetch<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    try {
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
            ...options,
        });

        // 認証エラー: ログインページへリダイレクト
        if (response.status === 401) {
            if (typeof window !== "undefined") {
                window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
            }
            throw new ApiError("認証が必要です。ログインしてください。", 401);
        }

        // その他のエラー
        if (!response.ok) {
            let errorMessage = `APIエラー (${response.status})`;
            try {
                const errorBody = await response.json();
                errorMessage = errorBody.error || errorBody.message || errorMessage;
            } catch {
                // JSONパース失敗時はデフォルトメッセージを使用
            }
            throw new ApiError(errorMessage, response.status);
        }

        return await response.json() as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        // ネットワークエラー等
        throw new ApiError(
            "サーバーに接続できません。ネットワーク接続を確認してください。",
            0
        );
    }
}

/**
 * Supabase形式のAPIレスポンスをアンラップする
 * { data: T, error: string | null } 形式を処理
 */
export async function apiFetchWrapped<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    const result = await apiFetch<ApiResponse<T>>(url, options);
    if (result.error) {
        throw new ApiError(result.error, 500);
    }
    return result.data as T;
}
