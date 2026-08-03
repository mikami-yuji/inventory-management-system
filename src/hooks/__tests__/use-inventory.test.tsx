import { renderHook, waitFor, act } from '@testing-library/react';
import { useInventory, useDashboardStats, useUpdateInventory } from '../use-inventory';
import { useAppSettings } from '../use-masters';

jest.mock('../use-masters', () => ({
    useAppSettings: jest.fn()
}));

const mockUseAppSettings = useAppSettings as jest.Mock;

describe('use-inventory hooks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    describe('useInventory', () => {
        test('初期状態はloading=trueで、inventoryは空配列', async () => {
            mockUseAppSettings.mockReturnValue({ settings: null });
            (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
            
            const { result } = renderHook(() => useInventory());
            
            expect(result.current.loading).toBe(true);
            expect(result.current.inventory).toEqual([]);
            expect(result.current.error).toBeNull();
        });

        test('settingsがロードされた後、APIからデータを取得して格納する', async () => {
            mockUseAppSettings.mockReturnValue({ settings: { default_min_stock_alert: 100 } });
            
            const mockData = {
                data: [
                    { productId: 'p1', quantity: 50, updatedAt: '2024-01-01', product: { id: 'p1', name: 'Product 1' } }
                ]
            };
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockData
            });

            const { result } = renderHook(() => useInventory());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.inventory).toHaveLength(1);
            expect(result.current.inventory[0].productId).toBe('p1');
            expect(result.current.inventory[0].quantity).toBe(50);
            expect(result.current.error).toBeNull();
            // apiFetchはデフォルトで Content-Type ヘッダーを追加する
            expect(global.fetch).toHaveBeenCalledWith('/api/inventory', expect.objectContaining({
                headers: expect.objectContaining({ 'Content-Type': 'application/json' })
            }));
        });

        test('APIエラー時にerrorがセットされる', async () => {
            mockUseAppSettings.mockReturnValue({ settings: { default_min_stock_alert: 100 } });
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const { result } = renderHook(() => useInventory());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // apiFetchのエラーメッセージ形式: 'APIエラー (ステータスコード)'
            expect(result.current.error).toBe('APIエラー (500)');
            expect(result.current.inventory).toEqual([]);
        });
    });

    describe('useDashboardStats', () => {
        test('statsを正しく計算する', async () => {
            mockUseAppSettings.mockReturnValue({ settings: { default_min_stock_alert: 100 } });
            
            const mockProducts = [
                { id: '1', minStockAlert: 100, unitPrice: 1000 },
                { id: '2', minStockAlert: 50, unitPrice: 2000 },
                { id: '3', minStockAlert: 100, unitPrice: 500 }
            ];
            
            const mockInventory = {
                data: [
                    { quantity: 150, product: mockProducts[0] }, 
                    { quantity: 40, product: mockProducts[1] },  
                    { quantity: 0, product: mockProducts[2] },   
                ]
            };

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({ ok: true, json: async () => mockProducts })
                .mockResolvedValueOnce({ ok: true, json: async () => mockInventory }); 

            const { result } = renderHook(() => useDashboardStats());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.stats).toEqual({
                totalProducts: 3,
                lowStockCount: 1, 
                outOfStockCount: 1, 
                totalInventoryValue: (150 * 1000) + (40 * 2000) + (0 * 500)
            });
        });
    });

    describe('useUpdateInventory', () => {
        test('updateStockが成功した場合trueを返す', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { success: true } })
            });

            const { result } = renderHook(() => useUpdateInventory());
            
            let success;
            await act(async () => {
                success = await result.current.updateStock('p1', 10, 'incoming');
            });

            expect(success).toBe(true);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(global.fetch).toHaveBeenCalledWith('/api/inventory', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: 'p1', quantity: 10, type: 'incoming', note: undefined })
            });
        });

        test('updateStockが失敗した場合falseを返しエラーをセットする', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400
            });

            const { result } = renderHook(() => useUpdateInventory());
            
            let success;
            await act(async () => {
                success = await result.current.updateStock('p1', 10, 'incoming');
            });

            expect(success).toBe(false);
            expect(result.current.error).toBe('HTTP error! status: 400');
        });
    });
});
