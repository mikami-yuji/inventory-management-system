"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    bagsToMeters,
    calculateStockPrediction
} from "@/lib/services";
import { useProducts } from "@/hooks/use-products";
import { useInventory } from "@/hooks/use-inventory";
import { useIncomingStock } from "@/hooks/use-incoming-stock";
import { useSaleEvents } from "@/hooks/use-sale-events";
import { useSupplierStockLots } from "@/hooks/use-supplier-stock-lots";
import { useAppSettings } from "@/hooks/use-masters";
import { useWorkInProgress, calculateWIPByProduct } from "@/hooks/use-work-in-progress";
import { useCart } from "@/contexts/cart-context";
import type { Product } from "@/types";
import { BagsInventoryTable } from "@/components/inventory/bags-inventory-table";
import { BagsInventoryCards } from "@/components/inventory/bags-inventory-cards";
import { InventoryPrintView } from "@/components/inventory/inventory-print-view";
import { useBagsInventoryFilter } from "@/hooks/use-bags-inventory-filter";
import { BagsQuickFilterTabs } from "./bags-quick-filter-tabs";
import { BagsFilterBar } from "./bags-filter-bar";
import { BagsDialogContainers } from "./bags-dialog-containers";

export function BagsInventoryView(): React.ReactElement {
    // 表示モード (grid | table)
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { addToCart } = useCart();

    // / キーで検索バーにフォーカスするショートカット
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (e.key === '/') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return (): void => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Supabase APIから商品と在庫を取得
    const { products: allProducts, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();
    const { inventory: inventoryData, loading: inventoryLoading, refetch: refetchInventory } = useInventory();
    const { events: saleEvents, loading: eventsLoading, refetch: refetchEvents } = useSaleEvents();
    const { items: wipItems, loading: wipLoading, refetch: refetchWIP } = useWorkInProgress('in_progress');
    const { incomingStocks, loading: incomingLoading, refetch: refetchIncoming } = useIncomingStock();
    const { lotsMap: supplierStockLotsMap, loading: lotsLoading, refetch: refetchLots } = useSupplierStockLots();
    const { settings } = useAppSettings();

    const loading = productsLoading || inventoryLoading || eventsLoading || wipLoading || incomingLoading || lotsLoading;
    const error = productsError;

    // 米袋カテゴリのみをフィルタ (bag + new_rice)
    const bagProducts = useMemo(() =>
        allProducts.filter(p => p.category === 'bag' || p.category === 'new_rice'),
        [allProducts]
    );

    // 在庫マップを作成
    const inventoryMap = useMemo(() => {
        const map = new Map<string, { quantity: number; oldPriceQuantity: number; updatedAt?: string }>();
        inventoryData?.forEach(item => {
            map.set(item.productId, { quantity: item.quantity, oldPriceQuantity: item.oldPriceQuantity || 0, updatedAt: item.updatedAt });
        });
        return map;
    }, [inventoryData]);

    // 特売引当マップを作成
    const saleAllocationMap = useMemo(() => {
        const map = new Map<string, { bags: number; meters: number }>();
        saleEvents
            .filter(event => event.status !== 'completed' && event.status !== 'cancelled')
            .forEach(event => {
                event.items.forEach(item => {
                    if (item.isProduced) return;
                    const current = map.get(item.productId) || { bags: 0, meters: 0 };
                    const product = allProducts.find(p => p.id === item.productId);
                    const weight = product?.weight || 5;
                    const allocatedMeters = bagsToMeters(item.allocatedQuantity, weight);
                    map.set(item.productId, {
                        bags: current.bags + item.allocatedQuantity,
                        meters: current.meters + allocatedMeters
                    });
                });
            });
        return map;
    }, [saleEvents, allProducts]);

    // 特売引当の詳細マップを作成
    const detailedSaleAllocationMap = useMemo(() => {
        const map = new Map<string, Array<{ eventId: string; clientName: string; quantity: number; dates: string[] }>>();
        saleEvents.forEach(event => {
            if (event.status === 'completed' || event.status === 'cancelled') return;
            event.items.forEach(item => {
                if (item.isProduced) return;
                const list = map.get(item.productId) || [];
                list.push({
                    eventId: event.id,
                    clientName: event.clientName,
                    quantity: item.allocatedQuantity,
                    dates: event.dates
                });
                map.set(item.productId, list);
            });
        });
        return map;
    }, [saleEvents]);

    // 仕掛中マップを作成
    const wipMap = useMemo(() => {
        return calculateWIPByProduct(wipItems);
    }, [wipItems]);

    // 入荷予定マップを作成
    const incomingMap = useMemo(() => {
        const map = new Map<string, { total: number; items: typeof incomingStocks }>();
        incomingStocks.forEach(item => {
            const current = map.get(item.productId) || { total: 0, items: [] };
            map.set(item.productId, {
                total: current.total + item.quantity,
                items: [...current.items, item]
            });
        });
        return map;
    }, [incomingStocks]);

    // メーカー在庫マップを作成
    const supplierStockMap = useMemo(() => {
        const map = new Map<string, number>();
        allProducts.forEach(p => {
            if (p.supplierStock !== undefined && p.supplierStock !== null) {
                map.set(p.id, p.supplierStock);
            }
        });
        return map;
    }, [allProducts]);

    // 在庫予測マップを事前計算
    const predictionMap = useMemo(() => {
        const map = new Map<string, ReturnType<typeof calculateStockPrediction>>();
        bagProducts.forEach(product => {
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
    }, [bagProducts, inventoryMap, wipMap, incomingMap, supplierStockLotsMap, supplierStockMap, saleEvents]);

    // 利用可能なフィルター選択肢を抽出
    const availableWeights = useMemo(() => {
        const weights = new Set<number>();
        bagProducts.forEach(p => {
            if (p.weight) weights.add(p.weight);
        });
        return Array.from(weights).sort((a, b) => a - b);
    }, [bagProducts]);

    const availableOrigins = useMemo(() => {
        const origins = new Set<string>();
        bagProducts.forEach(p => {
            if (p.origin) origins.add(p.origin);
        });
        return Array.from(origins).sort();
    }, [bagProducts]);

    const availableVarieties = useMemo(() => {
        const varieties = new Set<string>();
        bagProducts.forEach(p => {
            if (p.variety) varieties.add(p.variety);
        });
        return Array.from(varieties).sort();
    }, [bagProducts]);

    const statusLabels: Record<string, string> = useMemo(() => ({
        active: "通常",
        spot: "スポット",
        on_sale_break: "特売休止中",
        wip_check: "仕掛確認中",
        plate_removal_scheduled: "落版予定",
        plate_removed: "落版",
        discontinued: "廃盤",
    }), []);

    // フィルタ・ソートカスタムフック呼び出し
    const {
        quickFilter,
        setQuickFilter,
        searchQuery,
        setSearchQuery,
        weightFilter,
        setWeightFilter,
        stockFilter,
        setStockFilter,
        originFilter,
        setOriginFilter,
        varietyFilter,
        setVarietyFilter,
        statusFilter,
        setStatusFilter,
        showRemovedZeroStock,
        setShowRemovedZeroStock,
        sortKey,
        sortOrder,
        density,
        setDensity,
        handleSort,
        clearFilters,
        hasActiveFilters,
        filteredProducts,
        summary,
        handleExportExcel,
        handleAutoFillCart,
    } = useBagsInventoryFilter({
        bagProducts,
        inventoryMap,
        saleAllocationMap,
        wipMap,
        incomingMap,
        supplierStockMap,
        supplierStockLotsMap,
        predictionMap,
        settings,
        statusLabels,
        addToCart,
    });

    // ダイアログ状態管理
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [incomingDialogOpen, setIncomingDialogOpen] = useState(false);
    const [incomingStockProduct, setIncomingStockProduct] = useState<Product | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    // 全データ再取得
    const refetch = useCallback(async (): Promise<void> => {
        await Promise.all([
            refetchProducts(),
            refetchInventory(),
            refetchEvents(),
            refetchWIP(),
            refetchIncoming(),
            refetchLots()
        ]);
    }, [refetchProducts, refetchInventory, refetchEvents, refetchWIP, refetchIncoming, refetchLots]);

    // 印刷 (PDF保存)
    const handlePrint = useCallback((): void => {
        const originalTitle = document.title;
        document.title = `アサヒパック_在庫一覧_${format(new Date(), "yyyyMMdd_HHmm")}`;

        const restoreTitle = (): void => {
            document.title = originalTitle;
            window.removeEventListener("afterprint", restoreTitle);
        };
        window.addEventListener("afterprint", restoreTitle);

        window.print();

        // afterprint がサポートされない環境や非同期ダイアログのための安全フォールバック
        setTimeout(restoreTitle, 1000);
    }, []);

    // 商品追加
    const handleAddProduct = useCallback((): void => {
        setEditingProduct(null);
        setFormDialogOpen(true);
    }, []);

    // 詳細ダイアログを開く
    const handleOpenDetail = useCallback((product: Product): void => {
        setDetailProduct(product);
        setDetailDialogOpen(true);
    }, []);

    // 削除確認を開く
    const handleDeleteClick = useCallback((product: Product): void => {
        setProductToDelete(product);
        setDeleteConfirmOpen(true);
    }, []);

    // 削除実行
    const executeDelete = useCallback(async (): Promise<void> => {
        if (!productToDelete) return;
        try {
            const res = await fetch(`/api/products?id=${productToDelete.id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("削除に失敗しました");
            toast.success("商品を削除しました");
            setDeleteConfirmOpen(false);
            setFormDialogOpen(false);
            await refetch();
        } catch (err) {
            console.error(err);
            toast.error("削除中にエラーが発生しました");
        }
    }, [productToDelete, refetch]);

    // 初回ロード時のみローディング表示
    if (loading && allProducts.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500">{error}</p>
                <Button onClick={refetch} className="mt-4">再読み込み</Button>
            </div>
        );
    }

    return (
        <div className="space-y-2.5 print:space-y-0">
            {/* クイックステータスタブバー */}
            <BagsQuickFilterTabs
                quickFilter={quickFilter}
                setQuickFilter={setQuickFilter}
                setStockFilter={setStockFilter}
                totalCount={filteredProducts.length}
                summary={summary}
            />

            {/* 統合検索＆フィルターバー */}
            <BagsFilterBar
                viewMode={viewMode}
                setViewMode={setViewMode}
                handleExportExcel={handleExportExcel}
                handlePrint={handlePrint}
                handleAddProduct={handleAddProduct}
                handleAddAllLowStockToCart={handleAutoFillCart}
                needOrderCount={summary.needOrder}
                searchInputRef={searchInputRef}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                weightFilter={weightFilter}
                setWeightFilter={setWeightFilter}
                availableWeights={availableWeights}
                originFilter={originFilter}
                setOriginFilter={setOriginFilter}
                availableOrigins={availableOrigins}
                varietyFilter={varietyFilter}
                setVarietyFilter={setVarietyFilter}
                availableVarieties={availableVarieties}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                statusLabels={statusLabels}
                stockFilter={stockFilter}
                setStockFilter={setStockFilter}
                showRemovedZeroStock={showRemovedZeroStock}
                setShowRemovedZeroStock={setShowRemovedZeroStock}
                hasActiveFilters={hasActiveFilters}
                clearFilters={clearFilters}
            />

            {/* メインテーブル / カード表示 */}
            <div className="print:hidden">
                {viewMode === "table" ? (
                    <BagsInventoryTable
                        products={filteredProducts}
                        inventoryMap={inventoryMap}
                        saleAllocationMap={saleAllocationMap}
                        wipMap={wipMap}
                        incomingMap={incomingMap}
                        supplierStockMap={supplierStockMap}
                        supplierStockLotsMap={supplierStockLotsMap}
                        saleEvents={saleEvents}
                        density={density}
                        onDensityChange={setDensity}
                        sortKey={sortKey}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        onEdit={(product): void => {
                            setEditingProduct(product);
                            setFormDialogOpen(true);
                        }}
                        onIncomingStockClick={(product): void => {
                            setIncomingStockProduct(product);
                            setIncomingDialogOpen(true);
                        }}
                        onRefetch={refetch}
                    />
                ) : (
                    <BagsInventoryCards
                        products={filteredProducts}
                        inventoryMap={inventoryMap}
                        saleAllocationMap={saleAllocationMap}
                        wipMap={wipMap}
                        supplierStockMap={supplierStockMap}
                        supplierStockLotsMap={supplierStockLotsMap}
                        incomingMap={incomingMap}
                        saleEvents={saleEvents}
                        onDetail={handleOpenDetail}
                        onRefetch={refetch}
                    />
                )}
            </div>

            {/* 各種モーダルダイアログ群 */}
            <BagsDialogContainers
                detailProduct={detailProduct}
                detailDialogOpen={detailDialogOpen}
                setDetailDialogOpen={setDetailDialogOpen}
                editingProduct={editingProduct}
                setEditingProduct={setEditingProduct}
                formDialogOpen={formDialogOpen}
                setFormDialogOpen={setFormDialogOpen}
                incomingStockProduct={incomingStockProduct}
                incomingDialogOpen={incomingDialogOpen}
                setIncomingDialogOpen={setIncomingDialogOpen}
                deleteConfirmOpen={deleteConfirmOpen}
                setDeleteConfirmOpen={setDeleteConfirmOpen}
                productToDelete={productToDelete}
                executeDelete={executeDelete}
                handleDeleteClick={handleDeleteClick}
                refetch={refetch}
                inventoryMap={inventoryMap}
                supplierStockMap={supplierStockMap}
                supplierStockLotsMap={supplierStockLotsMap}
                wipMap={wipMap}
                saleAllocationMap={saleAllocationMap}
                detailedSaleAllocationMap={detailedSaleAllocationMap}
            />

            {/* 印刷用ビュー（印刷時のみ表示） */}
            <InventoryPrintView
                products={filteredProducts}
                inventoryMap={inventoryMap}
                saleAllocationMap={saleAllocationMap}
                detailedSaleAllocationMap={detailedSaleAllocationMap}
                wipMap={wipMap}
                incomingMap={incomingMap}
                supplierStockMap={supplierStockMap}
                supplierStockLotsMap={supplierStockLotsMap}
                saleEvents={saleEvents}
                settings={settings}
            />
        </div>
    );
}
