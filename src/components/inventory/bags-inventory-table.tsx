import React, { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateStockPrediction } from "@/lib/services";
import { useCart } from "@/contexts/cart-context";
import type { Product, WorkInProgress, IncomingStock, SupplierStockLot } from "@/types";
import type { SaleEvent } from "@/hooks/use-sale-events";
import { useAppSettings } from "@/hooks/use-masters";
import { useInventoryDialogs } from "./use-inventory-dialogs";
import { Skeleton } from "@/components/ui/skeleton";
import { BagsInventoryTableRow } from "./bags-inventory-table-row";
import { InventoryDialogContainers } from "./inventory-dialog-containers";

import { ArrowUpDown, ArrowUp, ArrowDown, Sparkles, LayoutList, StretchHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SortKey = 'default' | 'name' | 'weight' | 'currentStock' | 'allocation' | 'availableStock' | 'incoming' | 'supplierStock' | 'wip' | 'status' | 'remainingDays';
export type SortOrder = 'asc' | 'desc';
export type TableDensity = 'standard' | 'compact';

export type BagsInventoryTableProps = {
    products: Product[];
    inventoryMap: Map<string, { quantity: number; oldPriceQuantity: number; updatedAt?: string }>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    wipMap: Map<string, WorkInProgress[]>;
    supplierStockMap: Map<string, number>;
    supplierStockLotsMap: Map<string, SupplierStockLot[]>;
    incomingMap: Map<string, { total: number; items: IncomingStock[] }>;
    saleEvents: SaleEvent[];
    loading?: boolean;
    sortKey?: SortKey;
    sortOrder?: SortOrder;
    onSort?: (key: SortKey) => void;
    density?: TableDensity;
    onDensityChange?: (density: TableDensity) => void;
    onEdit: (product: Product) => void;
    onIncomingStockClick: (product: Product) => void;
    onAnalyze?: (product: Product) => void;
    onRefetch: () => void;
};

export function BagsInventoryTable({
    products,
    inventoryMap,
    saleAllocationMap,
    wipMap,
    supplierStockMap,
    supplierStockLotsMap,
    incomingMap,
    saleEvents,
    loading = false,
    sortKey = 'default',
    sortOrder = 'desc',
    onSort,
    density = 'standard',
    onDensityChange,
    onEdit,
    onIncomingStockClick,
    onAnalyze,
    onRefetch
}: BagsInventoryTableProps): React.ReactElement {
    const dialogs = useInventoryDialogs();
    const { addToCart, items } = useCart();
    const { settings } = useAppSettings();

    // 予測計算をメモ化
    const predictionMap = useMemo(() => {
        const map = new Map<string, ReturnType<typeof calculateStockPrediction>>();
        products.forEach(product => {
            const currentStock = inventoryMap.get(product.id)?.quantity || 0;
            const wipList = wipMap.get(product.id) || [];
            const incoming = incomingMap.get(product.id);

            const supplierStockLots = supplierStockLotsMap?.get(product.id) || [];
            const supplierStock = supplierStockLots.length > 0
                ? supplierStockLots.reduce((sum, lot) => sum + lot.quantity, 0)
                : (supplierStockMap.get(product.id) || 0);

            const relevantSaleItems = saleEvents
                .filter(event => (event.status === 'active' || event.status === 'upcoming'))
                .flatMap(event => {
                    const item = event.items.find(i => i.productId === product.id);
                    return item && !item.isProduced ? [{ dates: event.dates, quantity: item.allocatedQuantity, eventName: event.clientName }] : [];
                });

            map.set(product.id, calculateStockPrediction(
                currentStock,
                product.dailyShipmentRate || 0,
                product.productionLeadDays || 0,
                product,
                relevantSaleItems,
                wipList.filter(item => item.status === 'in_progress').map(item => ({
                    quantity: item.quantity,
                    expectedDate: item.expectedCompletion ? new Date(item.expectedCompletion) : null,
                    termType: item.termType
                })),
                incoming?.items.map(item => ({ 
                    quantity: item.quantity, 
                    expectedDate: item.expectedDate ? new Date(item.expectedDate) : null 
                })) || [],
                supplierStock
            ));
        });
        return map;
    }, [products, inventoryMap, wipMap, incomingMap, supplierStockLotsMap, supplierStockMap, saleEvents]);

    const handleAddToCart = useCallback((product: Product) => {
        addToCart(product, 0);
    }, [addToCart]);

    const renderSortIcon = (key: SortKey) => {
        if (sortKey !== key) {
            return <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-70 transition-opacity ml-1 inline shrink-0" />;
        }
        if (sortOrder === 'asc') {
            return <ArrowUp className="h-3 w-3 text-blue-600 font-bold ml-1 inline shrink-0" />;
        }
        return <ArrowDown className="h-3 w-3 text-blue-600 font-bold ml-1 inline shrink-0" />;
    };

    return (
        <Card className="shadow-none sm:shadow-sm">
            <CardHeader className="py-2.5 px-3 md:px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                    <span>米袋在庫状況</span>
                    <span className="text-xs font-normal text-muted-foreground">({products.length}件)</span>
                    {sortKey !== 'default' && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-1.5 text-[11px] text-blue-600 hover:text-blue-800"
                            onClick={() => onSort?.('default')}
                        >
                            ソート解除
                        </Button>
                    )}
                </CardTitle>
                <div className="flex items-center gap-1">
                    {onDensityChange && (
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-md border text-[11px]">
                            <Button
                                variant={density === 'standard' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-6 px-2 text-[11px] rounded-sm"
                                onClick={() => onDensityChange('standard')}
                                title="標準表示"
                            >
                                標準
                            </Button>
                            <Button
                                variant={density === 'compact' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-6 px-2 text-[11px] rounded-sm"
                                onClick={() => onDensityChange('compact')}
                                title="コンパクト表示（多くの行を一度に表示）"
                            >
                                密
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-2 sm:pt-0">
                <Table wrapperClassName="h-[calc(100vh-290px)] overflow-auto border rounded-md">
                    <TableHeader className="bg-background shadow-[0_1px_3px_rgba(0,0,0,0.1)] select-none">
                        {/* ゾーン区分ヘッダー (右から左への流れ) */}
                        <TableRow className="border-b bg-muted/40 text-[11px] font-semibold">
                            <TableHead colSpan={3} className="border-r py-1 text-slate-600 bg-slate-100/50">商品情報</TableHead>
                            <TableHead colSpan={3} className="text-center bg-blue-50/70 text-blue-900 border-r py-1">
                                手元・有効在庫エリア（◀ 出荷・引当）
                            </TableHead>
                            <TableHead colSpan={3} className="text-center bg-amber-50/70 text-amber-900 border-r py-1">
                                供給・仕入先エリア（◀ 製造・輸送）
                            </TableHead>
                            <TableHead colSpan={3} className="text-center py-1 text-slate-600 bg-slate-100/50">判定・発注</TableHead>
                        </TableRow>
                        <TableRow className="border-b text-[12px]">
                            <TableHead className="w-[50px] sticky top-0 left-0 z-50 bg-background bg-clip-padding border-r shadow-sm text-center">画像</TableHead>
                            <TableHead 
                                className="w-[180px] sticky top-0 md:left-[50px] z-40 md:z-50 bg-background bg-clip-padding md:border-r md:shadow-sm cursor-pointer hover:bg-slate-100 transition-colors group"
                                onClick={() => onSort?.('name')}
                            >
                                <div className="flex items-center justify-between">
                                    <span>商品情報</span>
                                    {renderSortIcon('name')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="w-[105px] sticky top-0 md:left-[230px] z-40 md:z-50 bg-background bg-clip-padding md:border-r md:shadow-[2px_0_5px_-1px_rgba(0,0,0,0.08)] cursor-pointer hover:bg-slate-100 transition-colors group"
                                onClick={() => onSort?.('weight')}
                            >
                                <div className="flex items-center justify-between">
                                    <span>量目 / 規格</span>
                                    {renderSortIcon('weight')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-right sticky top-0 z-40 bg-blue-50/40 font-bold text-slate-900 bg-clip-padding shadow-sm cursor-pointer hover:bg-blue-100/60 transition-colors group"
                                onClick={() => onSort?.('currentStock')}
                            >
                                <div className="flex items-center justify-end">
                                    <span>現在庫</span>
                                    {renderSortIcon('currentStock')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-right sticky top-0 z-40 bg-blue-50/30 bg-clip-padding shadow-sm cursor-pointer hover:bg-blue-100/60 transition-colors group"
                                onClick={() => onSort?.('allocation')}
                            >
                                <div className="flex items-center justify-end">
                                    <span>特売引当</span>
                                    {renderSortIcon('allocation')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-right sticky top-0 z-40 bg-blue-50/50 font-bold text-blue-950 bg-clip-padding border-r shadow-sm cursor-pointer hover:bg-blue-100/60 transition-colors group"
                                onClick={() => onSort?.('availableStock')}
                            >
                                <div className="flex items-center justify-end">
                                    <span>有効在庫</span>
                                    {renderSortIcon('availableStock')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-right sticky top-0 z-40 bg-amber-50/30 bg-clip-padding shadow-sm cursor-pointer hover:bg-amber-100/60 transition-colors group"
                                onClick={() => onSort?.('incoming')}
                            >
                                <div className="flex items-center justify-end">
                                    <span>入荷予定</span>
                                    {renderSortIcon('incoming')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-right sticky top-0 z-40 bg-amber-50/30 bg-clip-padding shadow-sm cursor-pointer hover:bg-amber-100/60 transition-colors group"
                                onClick={() => onSort?.('supplierStock')}
                            >
                                <div className="flex items-center justify-end">
                                    <span>メーカー在庫</span>
                                    {renderSortIcon('supplierStock')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-right sticky top-0 z-40 bg-amber-50/50 bg-clip-padding border-r shadow-sm cursor-pointer hover:bg-amber-100/60 transition-colors group"
                                onClick={() => onSort?.('wip')}
                            >
                                <div className="flex items-center justify-end">
                                    <span>仕掛中</span>
                                    {renderSortIcon('wip')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-center sticky top-0 z-40 bg-background bg-clip-padding shadow-sm w-[85px] cursor-pointer hover:bg-slate-100 transition-colors group"
                                onClick={() => onSort?.('status')}
                            >
                                <div className="flex items-center justify-center">
                                    <span>状況</span>
                                    {renderSortIcon('status')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-center sticky top-0 z-40 bg-background bg-clip-padding shadow-sm w-[90px] cursor-pointer hover:bg-slate-100 transition-colors group"
                                onClick={() => onSort?.('remainingDays')}
                            >
                                <div className="flex items-center justify-center">
                                    <span>在庫予測</span>
                                    {renderSortIcon('remainingDays')}
                                </div>
                            </TableHead>
                            <TableHead className="w-[80px] sticky top-0 z-40 bg-background bg-clip-padding shadow-sm text-center">発注</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`} className="animate-pulse">
                                    <TableCell className="border-r"><Skeleton className="h-10 w-10 rounded" /></TableCell>
                                    <TableCell className="md:border-r">
                                        <Skeleton className="h-4 w-28 mb-1" />
                                        <Skeleton className="h-3 w-16" />
                                    </TableCell>
                                    <TableCell className="md:border-l">
                                        <Skeleton className="h-4 w-20 mb-1" />
                                        <Skeleton className="h-3 w-12" />
                                    </TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-14 ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-5 w-14 mx-auto rounded-full" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-8 w-8 mx-auto rounded" /></TableCell>
                                </TableRow>
                            ))
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                                    該当する商品がありません
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => (
                                <BagsInventoryTableRow
                                    key={product.id}
                                    product={product}
                                    inventoryItem={inventoryMap.get(product.id) || { quantity: 0, oldPriceQuantity: 0 }}
                                    allocation={saleAllocationMap.get(product.id) || { bags: 0, meters: 0 }}
                                    wipList={wipMap.get(product.id) || []}
                                    incoming={incomingMap.get(product.id)}
                                    supplierStockLots={supplierStockLotsMap?.get(product.id)}
                                    supplierStockFallback={supplierStockMap.get(product.id) || 0}
                                    prediction={predictionMap.get(product.id)!}
                                    saleEvents={saleEvents}
                                    settings={settings}
                                    isInCart={items.some(item => item.product.id === product.id)}
                                    density={density}
                                    dialogs={dialogs}
                                    onEdit={onEdit}
                                    onIncomingStockClick={onIncomingStockClick}
                                    onAnalyze={onAnalyze}
                                    onAddToCart={handleAddToCart}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <InventoryDialogContainers
                dialogs={dialogs}
                inventoryMap={inventoryMap}
                saleAllocationMap={saleAllocationMap}
                wipMap={wipMap}
                supplierStockMap={supplierStockMap}
                supplierStockLotsMap={supplierStockLotsMap}
                incomingMap={incomingMap}
                saleEvents={saleEvents}
                predictionMap={predictionMap}
                onRefetch={onRefetch}
            />
        </Card>
    );
}
