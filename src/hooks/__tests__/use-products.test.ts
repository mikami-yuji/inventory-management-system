import { renderHook, waitFor, act } from '@testing-library/react';
import { useProducts } from '../use-products';

describe('useProducts hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    test('初期状態およびAPI成功時の商品データ取得', async (): Promise<void> => {
        const mockProducts = [
            { id: '1', name: '袋 A', sku: 'SKU01', category: '袋' },
            { id: '2', name: '袋 B', sku: 'SKU02', category: '袋' }
        ];

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockProducts
        });

        const { result } = renderHook(() => useProducts());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.products).toEqual(mockProducts);
        expect(result.current.error).toBeNull();
        expect(global.fetch).toHaveBeenCalledWith('/api/products');
    });

    test('APIエラー時にerrorメッセージがセットされる', async (): Promise<void> => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        const { result } = renderHook(() => useProducts());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('HTTP error! status: 500');
        expect(result.current.products).toEqual([]);
    });

    test('refetch呼び出し時に再度APIが取得される', async (): Promise<void> => {
        const mockProducts = [{ id: '1', name: '袋 A' }];

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockProducts
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [...mockProducts, { id: '2', name: '袋 B' }]
            });

        const { result } = renderHook(() => useProducts());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.products).toHaveLength(1);

        await act(async (): Promise<void> => {
            await result.current.refetch();
        });

        expect(result.current.products).toHaveLength(2);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
