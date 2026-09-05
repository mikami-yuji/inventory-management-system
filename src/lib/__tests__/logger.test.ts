import { logError } from '../logger';
import { createServerClient } from '../supabase';

jest.mock('../supabase', () => ({
    createServerClient: jest.fn(),
}));

describe('logger', () => {
    let mockInsert: jest.Mock;
    let mockFrom: jest.Mock;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockInsert = jest.fn().mockResolvedValue({ error: null });
        mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
        (createServerClient as jest.Mock).mockReturnValue({ from: mockFrom });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('エラー情報をDBのerror_logsテーブルに正常に記録すること', async () => {
        const error = new Error('Test DB Error');
        await logError({
            route: '/api/test',
            method: 'GET',
            error,
            userId: 'user-123',
        });

        expect(mockFrom).toHaveBeenCalledWith('error_logs');
        expect(mockInsert).toHaveBeenCalledWith({
            route: '/api/test',
            method: 'GET',
            error_message: 'Test DB Error',
            stack_trace: expect.any(String),
            user_id: 'user-123',
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith('[API ERROR] GET /api/test:', 'Test DB Error');
    });

    it('文字列型エラーやuserId未指定でも正しくハンドリングすること', async () => {
        await logError({
            route: '/api/other',
            method: 'POST',
            error: 'Plain string error',
        });

        expect(mockInsert).toHaveBeenCalledWith({
            route: '/api/other',
            method: 'POST',
            error_message: 'Plain string error',
            stack_trace: null,
            user_id: null,
        });
    });

    it('DB書き込みエラーが発生した場合でもコンソールに出力し例外を投げないこと', async () => {
        mockInsert.mockResolvedValueOnce({ error: { message: 'Insert failed' } });

        await expect(logError({
            route: '/api/test',
            method: 'DELETE',
            error: new Error('Some error'),
        })).resolves.not.toThrow();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to write to error_logs table:', { message: 'Insert failed' });
    });

    it('createServerClientで例外が発生した場合でもキャッチしてログ出力すること', async () => {
        (createServerClient as jest.Mock).mockImplementationOnce(() => {
            throw new Error('Supabase client failed');
        });

        await expect(logError({
            route: '/api/test',
            method: 'GET',
            error: 'fail',
        })).resolves.not.toThrow();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Critical failure in logError utility:', expect.any(Error));
    });
});
