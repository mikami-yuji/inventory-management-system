import { createServerClient } from './supabase';

type LogErrorParams = {
    route: string;
    method: string;
    error: unknown;
    userId?: string | null;
}

/**
 * サーバー側で発生したエラーを一元的に `error_logs` テーブルに記録する。
 * @param params エラー情報（利用ルート、メソッド、エラーオブジェクト、ユーザーID）
 */
export async function logError({ route, method, error, userId }: LogErrorParams): Promise<void> {
    try {
        const supabase = createServerClient();
        
        // Error情報の展開
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stackTrace = error instanceof Error ? error.stack : undefined;

        // DBに書き込み
        const { error: insertError } = await supabase
            .from('error_logs')
            .insert({
                route,
                method,
                error_message: errorMessage,
                stack_trace: stackTrace || null,
                user_id: userId || null
            });

        if (insertError) {
            console.error('Failed to write to error_logs table:', insertError);
        }

        // 既存のCLIでのログ出力も並行して実施
        console.error(`[API ERROR] ${method} ${route}:`, errorMessage);
        if (stackTrace) {
            console.error(stackTrace);
        }

    } catch (e) {
        // ロガー自体がエラーで落ちるのを防ぐ
        console.error('Critical failure in logError utility:', e);
    }
}
