import { renderHook, waitFor, act } from '@testing-library/react';
import { useStockHistory } from '../use-stock-history';

describe('useStockHistory hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    test('在庫履歴データが正常に取得される', async (): Promise<void> => {
        const mockHistory = [
            { id: 'h1', productId: 'p1', quantity: 10, type: 'incoming', date: '2024-01-01' }
        ];

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: mockHistory })
        });

        const { result } = renderHook(() => useStockHistory({ productId: 'p1', days: 30 }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.history).toEqual(mockHistory);
        expect(result.current.error).toBeNull();
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/stock-history?productId=p1&days=30'),
            expect.anything()
        );
    });

    test('エラー発生時にerrorメッセージがセットされる', async (): Promise<void> => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 400
        });

        const { result } = renderHook(() => useStockHistory());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('APIエラー (400)');
        expect(result.current.history).toEqual([]);
    });

    test('refetch呼び出し時にデータを再取得する', async (): Promise<void> => {
        const mockHistory = [{ id: 'h1', productId: 'p1' }];

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockHistory })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [...mockHistory, { id: 'h2', productId: 'p1' }] })
            });

        const { result } = renderHook(() => useStockHistory());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.history).toHaveLength(1);

        await act(async (): Promise<void> => {
            await result.current.refetch();
        });

        expect(result.current.history).toHaveLength(2);
    });
});
