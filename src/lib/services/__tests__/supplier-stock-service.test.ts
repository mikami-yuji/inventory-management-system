import { supplierStockService } from '../supplier-stock-service';
import { createServerClient } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
    createServerClient: jest.fn(),
}));

describe('supplierStockService', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            from: jest.fn(),
            rpc: jest.fn(),
        };
        (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    describe('moveToIncoming', () => {
        test('RPCが利用可能な場合、アトミックにロット移動を実行すること', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: true, movedQuantity: 300 },
                error: null
            });

            await expect(supplierStockService.moveToIncoming({
                productId: 'prod-1',
                schedules: [
                    { expectedDate: '2026-09-01', quantity: 300, note: 'テスト移動' }
                ]
            })).resolves.not.toThrow();

            expect(mockSupabase.rpc).toHaveBeenCalledWith('move_supplier_stock_to_incoming_atomic', {
                p_product_id: 'prod-1',
                p_schedules: [{ expectedDate: '2026-09-01', quantity: 300, note: 'テスト移動' }]
            });
        });

        test('RPCが利用できない場合、FIFO順にロットを正しく減算しフォールバックすること', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'RPC not found' }
            });

            const mockLots = [
                { id: 'lot-1', quantity: 100, stock_date: '2026-08-01' },
                { id: 'lot-2', quantity: 200, stock_date: '2026-08-10' }
            ];

            const mockLotsQuery = {
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        gt: jest.fn().mockReturnValue({
                            order: jest.fn().mockResolvedValue({
                                data: mockLots,
                                error: null
                            })
                        })
                    })
                }),
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null })
                })
            };

            const mockIncomingStockInsert = {
                insert: jest.fn().mockResolvedValue({ error: null })
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'supplier_stock_lots') return mockLotsQuery;
                if (table === 'incoming_stock') return mockIncomingStockInsert;
                return {};
            });

            // 150移動要求 (lot-1から100全て、lot-2から50減算)
            await supplierStockService.moveToIncoming({
                productId: 'prod-1',
                schedules: [
                    { expectedDate: '2026-09-01', quantity: 150 }
                ]
            });

            // lot-1 は 0 に更新
            expect(mockLotsQuery.update).toHaveBeenCalledWith({ quantity: 0 });
            // lot-2 は 150 (200 - 50) に更新
            expect(mockLotsQuery.update).toHaveBeenCalledWith({ quantity: 150 });
            // incoming_stock が作成されたこと
            expect(mockIncomingStockInsert.insert).toHaveBeenCalledWith([
                expect.objectContaining({
                    product_id: 'prod-1',
                    expected_date: '2026-09-01',
                    quantity: 150
                })
            ]);
        });
    });

    describe('syncAllStock', () => {
        test('全商品のロット合計数を集約して一括同期できること', async () => {
            const mockLots = [
                { product_id: 'prod-1', quantity: 100 },
                { product_id: 'prod-1', quantity: 150 },
                { product_id: 'prod-2', quantity: 50 },
            ];

            const mockProducts = [
                { id: 'prod-1', supplier_stock: 200 }, // 不一致 (250になるべき)
                { id: 'prod-2', supplier_stock: 50 },  // 一致
            ];

            const mockProductUpdate = {
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null })
                })
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'supplier_stock_lots') {
                    return {
                        select: jest.fn().mockResolvedValue({ data: mockLots, error: null })
                    };
                }
                if (table === 'products') {
                    return {
                        select: jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
                        update: mockProductUpdate.update
                    };
                }
                return {};
            });

            await supplierStockService.syncAllStock();

            // 不一致の prod-1 のみ更新されること
            expect(mockProductUpdate.update).toHaveBeenCalledTimes(1);
            expect(mockProductUpdate.update).toHaveBeenCalledWith({ supplier_stock: 250 });
        });
    });
});
