import { renderHook, waitFor, act } from '@testing-library/react';
import { useIncomingStock } from '../use-incoming-stock';

describe('useIncomingStock hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    test('入荷予定データを取得する', async (): Promise<void> => {
        const mockStocks = [{ id: '1', productId: 'p1', quantity: 100 }];

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockStocks
        });

        const { result } = renderHook(() => useIncomingStock());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.incomingStocks).toEqual(mockStocks);
        expect(result.current.error).toBeNull();
        expect(global.fetch).toHaveBeenCalledWith('/api/incoming-stock');
    });

    test('addIncomingStock成功時にtrueを返しデータが再取得される', async (): Promise<void> => {
        const initialStocks = [{ id: '1', productId: 'p1', quantity: 100 }];
        const newStock = { productId: 'p2', quantity: 50, expectedDate: '2024-02-01', status: 'pending' as const };

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => initialStocks }) // 初回取得
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '2', ...newStock }) }) // 追加
            .mockResolvedValueOnce({ ok: true, json: async () => [...initialStocks, { id: '2', ...newStock }] }); // 再取得

        const { result } = renderHook(() => useIncomingStock());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        let success = false;
        await act(async (): Promise<void> => {
            success = await result.current.addIncomingStock(newStock);
        });

        expect(success).toBe(true);
        expect(result.current.incomingStocks).toHaveLength(2);
    });

    test('APIエラー時にerrorメッセージがセットされる', async (): Promise<void> => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        const { result } = renderHook(() => useIncomingStock());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('HTTP error! status: 500');
    });
});
