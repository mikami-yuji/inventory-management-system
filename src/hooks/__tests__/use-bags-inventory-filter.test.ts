import { renderHook, act } from '@testing-library/react';
import {
    useBagsInventoryFilter,
    getPrefectureIndex,
    getProductGroup,
    getBaseProductName,
    type BagsInventoryFilterOptions,
} from '../use-bags-inventory-filter';
import type { Product, WorkInProgress, IncomingStock, SupplierStockLot } from '@/types';

describe('use-bags-inventory-filter', () => {
    describe('ヘルパーユーティリティ関数', () => {
        it('getPrefectureIndex: 正しい都道府県順のインデックスを返すこと', () => {
            expect(getPrefectureIndex('北海道産ななつぼし')).toBe(0);
            expect(getPrefectureIndex('青森県産まっしぐら')).toBe(1);
            expect(getPrefectureIndex('魚沼産コシヒカリ（新潟）')).toBe(14);
            expect(getPrefectureIndex('国内産ブレンド')).toBe(47);
            expect(getPrefectureIndex('未指定商品')).toBe(999);
            expect(getPrefectureIndex(undefined)).toBe(999);
        });

        it('getProductGroup: 商品のグループ分類（通常=0, NB=1, 新米=2）を正しく判定すること', () => {
            const normalProduct: Product = {
                id: 'p1',
                name: 'コシヒカリ 5kg',
                sku: 'BAG-001',
                unitPrice: 50,
                printingCost: 10,
                category: 'bag',
                status: 'active',
            };
            const nbProduct: Product = {
                id: 'p2',
                name: 'NB コシヒカリ 5kg',
                sku: 'BAG-002',
                unitPrice: 50,
                printingCost: 10,
                category: 'bag',
                status: 'active',
            };
            const newRiceProduct: Product = {
                id: 'p3',
                name: '新米 あきたこまち 5kg',
                sku: 'BAG-003',
                unitPrice: 55,
                printingCost: 12,
                category: 'new_rice',
                status: 'active',
            };

            expect(getProductGroup(normalProduct)).toBe(0);
            expect(getProductGroup(nbProduct)).toBe(1);
            expect(getProductGroup(newRiceProduct)).toBe(2);
        });

        it('getBaseProductName: 重量表記やロール記号を除去したベース名を抽出すること', () => {
            expect(getBaseProductName('あきたこまち 5kg R')).toBe('あきたこまち');
            expect(getBaseProductName('つや姫 10K RZ')).toBe('つや姫');
            expect(getBaseProductName('ゆめぴりか 2kg')).toBe('ゆめぴりか');
            expect(getBaseProductName('魚沼コシヒカリ 300g')).toBe('魚沼コシヒカリ');
            expect(getBaseProductName('')).toBe('');
        });
    });

    describe('useBagsInventoryFilter フック', () => {
        const mockProducts: Product[] = [
            {
                id: 'prod-1',
                name: '新潟産 コシヒカリ 5kg',
                sku: 'BAG-P1',
                unitPrice: 50,
                printingCost: 10,
                category: 'bag',
                status: 'active',
                weight: 5,
                origin: '新潟',
                variety: 'コシヒカリ',
                minStockAlert: 100,
            },
            {
                id: 'prod-2',
                name: '秋田産 あきたこまち 10kg',
                sku: 'BAG-P2',
                unitPrice: 60,
                printingCost: 10,
                category: 'bag',
                status: 'active',
                weight: 10,
                origin: '秋田',
                variety: 'あきたこまち',
                minStockAlert: 200,
            },
            {
                id: 'prod-3',
                name: '北海道産 ゆめぴりか 5kg',
                sku: 'BAG-P3',
                unitPrice: 70,
                printingCost: 15,
                category: 'bag',
                status: 'wip_check',
                weight: 5,
                origin: '北海道',
                variety: 'ゆめぴりか',
                minStockAlert: 50,
            },
        ];

        const mockInventoryMap = new Map<string, { quantity: number; oldPriceQuantity: number; updatedAt?: string }>([
            ['prod-1', { quantity: 50, oldPriceQuantity: 0 }], // 在庫僅少 (50 <= 100)
            ['prod-2', { quantity: 500, oldPriceQuantity: 0 }], // 在庫潤沢
            ['prod-3', { quantity: 0, oldPriceQuantity: 0 }], // 在庫切れ
        ]);

        const mockSaleAllocationMap = new Map<string, { bags: number; meters: number }>([
            ['prod-2', { bags: 50, meters: 250 }],
        ]);

        const mockWipMap = new Map<string, WorkInProgress[]>([
            ['prod-3', [{ id: 'wip-1', productId: 'prod-3', quantity: 200, status: 'in_progress', clientName: 'A社' } as unknown as WorkInProgress]],
        ]);

        const mockIncomingMap = new Map<string, { total: number; items: IncomingStock[] }>([
            ['prod-1', { total: 100, items: [{ id: 'inc-1', productId: 'prod-1', quantity: 100, expectedDate: '2026-09-20' } as unknown as IncomingStock] }],
        ]);

        const mockSupplierStockMap = new Map<string, number>([
            ['prod-2', 300],
        ]);

        const mockSupplierStockLotsMap = new Map<string, SupplierStockLot[]>();

        const mockPredictionMap = new Map();

        const mockAddToCart = jest.fn();

        const defaultOptions: BagsInventoryFilterOptions = {
            bagProducts: mockProducts,
            inventoryMap: mockInventoryMap,
            saleAllocationMap: mockSaleAllocationMap,
            wipMap: mockWipMap,
            incomingMap: mockIncomingMap,
            supplierStockMap: mockSupplierStockMap,
            supplierStockLotsMap: mockSupplierStockLotsMap,
            predictionMap: mockPredictionMap,
            statusLabels: { active: '通常', wip_check: '仕掛確認' },
            addToCart: mockAddToCart,
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('初期状態で全件表示およびサマリーが正しく集計されること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            expect(result.current.filteredProducts.length).toBe(3);
            expect(result.current.summary.total).toBe(3);
            expect(result.current.summary.needOrder).toBe(2); // prod-1 (低在庫) と prod-3 (欠品)
            expect(result.current.summary.reserved).toBe(1); // prod-2
            expect(result.current.summary.wipCheck).toBe(1); // prod-3
        });

        it('検索クエリで正しくフィルタリングされること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            act(() => {
                result.current.setSearchQuery('ゆめぴりか');
            });

            expect(result.current.filteredProducts.length).toBe(1);
            expect(result.current.filteredProducts[0].name).toContain('ゆめぴりか');
            expect(result.current.hasActiveFilters).toBe(true);
        });

        it('重量フィルターで正しく絞り込めること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            act(() => {
                result.current.setWeightFilter('10');
            });

            expect(result.current.filteredProducts.length).toBe(1);
            expect(result.current.filteredProducts[0].weight).toBe(10);
        });

        it('クイックフィルター need_order で要発注商品のみ絞り込めること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            act(() => {
                result.current.setQuickFilter('need_order');
            });

            expect(result.current.filteredProducts.length).toBe(2);
            expect(result.current.filteredProducts.map(p => p.id)).toEqual(expect.arrayContaining(['prod-1', 'prod-3']));
        });

        it('クイックフィルター reserved で引当あり商品のみ絞り込めること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            act(() => {
                result.current.setQuickFilter('reserved');
            });

            expect(result.current.filteredProducts.length).toBe(1);
            expect(result.current.filteredProducts[0].id).toBe('prod-2');
        });

        it('clearFiltersでフィルターがリセットされること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            act(() => {
                result.current.setSearchQuery('テスト');
                result.current.setWeightFilter('5');
            });

            expect(result.current.hasActiveFilters).toBe(true);

            act(() => {
                result.current.clearFilters();
            });

            expect(result.current.searchQuery).toBe('');
            expect(result.current.weightFilter).toBe('all');
            expect(result.current.hasActiveFilters).toBe(false);
        });

        it('handleAutoFillCart で要発注商品がカートに追加されること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            act(() => {
                result.current.handleAutoFillCart();
            });

            expect(mockAddToCart).toHaveBeenCalledTimes(2);
            expect(mockAddToCart).toHaveBeenCalledWith(mockProducts[0], expect.any(Number));
            expect(mockAddToCart).toHaveBeenCalledWith(mockProducts[2], expect.any(Number));
        });

        it('クイックフィルター supply で入荷・仕掛・メーカー在庫のいずれかがある商品のみ絞り込めること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            act(() => {
                result.current.setQuickFilter('supply');
            });

            // prod-1 (入荷あり), prod-2 (メーカー在庫あり), prod-3 (仕掛あり)
            expect(result.current.filteredProducts.length).toBe(3);
        });

        it('クイックフィルター wip_check でステータスが仕掛確認中の商品のみ絞り込めること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            act(() => {
                result.current.setQuickFilter('wip_check');
            });

            expect(result.current.filteredProducts.length).toBe(1);
            expect(result.current.filteredProducts[0].id).toBe('prod-3');
        });

        it('在庫状態フィルター (in_stock / low_stock / out_of_stock) で正しく絞り込めること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            // 通常在庫あり
            act(() => {
                result.current.setStockFilter('in_stock');
            });
            expect(result.current.filteredProducts.length).toBe(1);
            expect(result.current.filteredProducts[0].id).toBe('prod-2');

            // 在庫僅少
            act(() => {
                result.current.setStockFilter('low_stock');
            });
            expect(result.current.filteredProducts.length).toBe(1);
            expect(result.current.filteredProducts[0].id).toBe('prod-1');

            // 欠品
            act(() => {
                result.current.setStockFilter('out_of_stock');
            });
            expect(result.current.filteredProducts.length).toBe(1);
            expect(result.current.filteredProducts[0].id).toBe('prod-3');
        });

        it('産地、品種、ステータスフィルターで正しく絞り込めること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            act(() => {
                result.current.setOriginFilter('新潟');
            });
            expect(result.current.filteredProducts.length).toBe(1);
            expect(result.current.filteredProducts[0].origin).toBe('新潟');

            act(() => {
                result.current.setOriginFilter('all');
                result.current.setVarietyFilter('あきたこまち');
            });
            expect(result.current.filteredProducts.length).toBe(1);
            expect(result.current.filteredProducts[0].variety).toBe('あきたこまち');

            act(() => {
                result.current.setVarietyFilter('all');
                result.current.setStatusFilter('wip_check');
            });
            expect(result.current.filteredProducts.length).toBe(1);
            expect(result.current.filteredProducts[0].status).toBe('wip_check');
        });

        it('ソートキー切り替えで順序が正しく変更されること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            // 在庫昇順
            act(() => {
                result.current.handleSort('currentStock');
            });
            expect(result.current.sortKey).toBe('currentStock');

            // 重量ソート
            act(() => {
                result.current.handleSort('weight');
            });
            expect(result.current.sortKey).toBe('weight');

            // 特売引当ソート
            act(() => {
                result.current.handleSort('allocation');
            });
            expect(result.current.sortKey).toBe('allocation');

            // 有効在庫ソート
            act(() => {
                result.current.handleSort('availableStock');
            });
            expect(result.current.sortKey).toBe('availableStock');

            // 入荷予定ソート
            act(() => {
                result.current.handleSort('incoming');
            });
            expect(result.current.sortKey).toBe('incoming');

            // メーカー在庫ソート
            act(() => {
                result.current.handleSort('supplierStock');
            });
            expect(result.current.sortKey).toBe('supplierStock');

            // 仕掛ソート
            act(() => {
                result.current.handleSort('wip');
            });
            expect(result.current.sortKey).toBe('wip');

            // 在庫切れ予測日数ソート
            act(() => {
                result.current.handleSort('remainingDays');
            });
            expect(result.current.sortKey).toBe('remainingDays');

            // デフォルトソートに戻す
            act(() => {
                result.current.handleSort('default');
            });
            expect(result.current.sortKey).toBe('default');
        });

        it('表示密度の変更がlocalStorageと同期すること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            act(() => {
                result.current.setDensity('compact');
            });

            expect(result.current.density).toBe('compact');
            expect(localStorage.getItem('bags_table_density')).toBe('compact');
        });

        it('Excel出力関数がエラーなく実行されること', () => {
            const { result } = renderHook(() => useBagsInventoryFilter(defaultOptions));

            expect(() => {
                act(() => {
                    result.current.handleExportExcel();
                });
            }).not.toThrow();
        });
    });
});
