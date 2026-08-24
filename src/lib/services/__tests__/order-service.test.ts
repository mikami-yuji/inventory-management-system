/* eslint-disable @typescript-eslint/no-explicit-any */
import { orderService } from '../order-service';
import { createServerClient } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
    createServerClient: jest.fn(),
}));

describe('orderService', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            from: jest.fn(),
            rpc: jest.fn(),
        };
        (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    describe('createOrder', () => {
        test('RPCが利用可能な場合、アトミックに関数を呼び出して発注を作成すること', async () => {
            const mockRpcResult = {
                id: 'order-123',
                clientId: 'client-1',
                createdAt: '2026-08-25T00:00:00.000Z',
                status: 'shipped',
                type: 'standard',
                eventId: null,
                shipmentSource: 'supplier',
                deliveryName: 'テスト配送先',
                deliveryPostalCode: '100-0001',
                deliveryAddress: '東京都千代田区1-1',
                deliveryPhone: '03-1234-5678',
                preferredShape: null,
            };

            mockSupabase.rpc.mockResolvedValueOnce({
                data: mockRpcResult,
                error: null,
            });

            const order = await orderService.createOrder({
                clientId: 'client-1',
                type: 'standard',
                shipmentSource: 'supplier',
                deliveryName: 'テスト配送先',
                deliveryPostalCode: '100-0001',
                deliveryAddress: '東京都千代田区1-1',
                deliveryPhone: '03-1234-5678',
                items: [
                    { productId: 'prod-1', quantity: 100 }
                ]
            });

            expect(mockSupabase.rpc).toHaveBeenCalledWith('create_order_atomic', expect.objectContaining({
                p_client_id: 'client-1',
                p_type: 'standard',
                p_shipment_source: 'supplier',
                p_delivery_name: 'テスト配送先',
            }));

            expect(order.id).toBe('order-123');
            expect(order.deliveryPostalCode).toBe('100-0001');
            expect(order.items).toHaveLength(1);
        });

        test('RPCが失敗した場合、フォールバックで発注・明細・在庫更新を実行すること', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'RPC function not found' },
            });

            const mockOrderInsert = {
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { id: 'order-fallback-1', created_at: '2026-08-25T00:00:00.000Z' },
                            error: null
                        })
                    })
                })
            };

            const mockProductsQuery = {
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockResolvedValue({
                        data: [{ id: 'prod-1', unit_price: 50, printing_cost: 10, price_revisions: [] }],
                        error: null
                    })
                })
            };

            const mockOrderItemsInsert = {
                insert: jest.fn().mockResolvedValue({ error: null })
            };

            const mockProductSingle = {
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { supplier_stock: 500 },
                            error: null
                        })
                    })
                }),
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null })
                })
            };

            const mockStockHistoryInsert = {
                insert: jest.fn().mockResolvedValue({ error: null })
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'orders') return mockOrderInsert;
                if (table === 'products') return mockProductSingle;
                if (table === 'order_items') return mockOrderItemsInsert;
                if (table === 'stock_history') return mockStockHistoryInsert;
                return {};
            });

            // productsの初期価格取得用
            mockProductSingle.select.mockReturnValueOnce(mockProductsQuery.select());

            const order = await orderService.createOrder({
                clientId: 'client-1',
                type: 'standard',
                shipmentSource: 'supplier',
                items: [{ productId: 'prod-1', quantity: 100 }]
            });

            expect(order.id).toBe('order-fallback-1');
            expect(mockOrderItemsInsert.insert).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    order_id: 'order-fallback-1',
                    product_id: 'prod-1',
                    quantity: 100,
                })
            ]));
        });
    });

    describe('getOrders', () => {
        test('発注一覧を正常に取得・フォーマットできること', async () => {
            const mockDbOrders = [
                {
                    id: 'order-1',
                    client_id: 'client-1',
                    status: 'shipped',
                    type: 'standard',
                    created_at: '2026-08-25T00:00:00.000Z',
                    delivery_name: '東京支店',
                    delivery_postal_code: '123-4567',
                    delivery_address: '東京都港区1-2-3',
                    order_items: [
                        {
                            id: 'item-1',
                            product_id: 'prod-1',
                            quantity: 50,
                            unit_price: 100,
                            printing_cost: 20,
                            products: {
                                id: 'prod-1',
                                name: 'テスト袋',
                                sku: 'TEST-001',
                                category: 'bag',
                                weight: 5,
                            }
                        }
                    ]
                }
            ];

            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                        data: mockDbOrders,
                        error: null
                    })
                })
            });

            const orders = await orderService.getOrders();
            expect(orders).toHaveLength(1);
            expect(orders[0].deliveryPostalCode).toBe('123-4567');
            expect(orders[0].items[0].productName).toBe('テスト袋');
            expect(orders[0].items[0].unitPrice).toBe(100);
        });
    });
});
