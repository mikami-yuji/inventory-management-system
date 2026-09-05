import { useState, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { Product, IncomingStock, WorkInProgress, SupplierStockLot } from "@/types";
import type { SortKey, SortOrder, TableDensity } from "@/components/inventory/bags-inventory-table";
import { calculateStockStatus, calculateStockPrediction } from "@/lib/services";

export type QuickFilterType = 'all' | 'need_order' | 'urgent_prediction' | 'reserved' | 'supply' | 'wip_check';

// 都道府県リスト（北から南、最後に国内産）
export const PREFECTURES = [
    "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
    "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
    "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知",
    "三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山",
    "鳥取", "島根", "岡山", "広島", "山口",
    "徳島", "香川", "愛媛", "高知",
    "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄",
    "国内産", "国産"
] as const;

// 都道府県インデックスを取得
export const getPrefectureIndex = (text: string | undefined): number => {
    if (!text) return 999;
    for (let i = 0; i < PREFECTURES.length; i++) {
        if (text.includes(PREFECTURES[i])) {
            return i;
        }
    }
    return 999;
};

// 商品のグループ分け (0: 通常, 1: NB, 2: 新米)
export const getProductGroup = (p: Product): number => {
    const name = p.name || "";
    const prefix = p.prefix || "";

    const isNewRice = name.includes("新米") || prefix.includes("新米") || p.category === "new_rice" || name.includes("ＮＢ・新米") || prefix.includes("ＮＢ・新米");
    const isNB = name.includes("NB") || name.includes("ＮＢ") || prefix.includes("NB") || prefix.includes("ＮＢ");

    if (isNewRice) return 2;
    if (isNB) return 1;
    return 0;
};

// 商品のベース名（重量表記などを除いた同一商品グループ用のキー）
export const getBaseProductName = (name: string): string => {
    if (!name) return "";
    let base = name;
    // 重量表記の除去（例: 10kg, 10K, 5kg, 5K, 2kg, 2K, 300g, 1.4K, 1.4kg など）
    base = base.replace(/[0-9０-９]+(\.[0-9０-９]+)?\s*([kKＫgGｇ]|kg|KG|Kg|袋|枚)[^\s)]*/gi, "");
    // 末尾のロール記号（R, RZ, RA 等）の除去
    base = base.replace(/[\s　]+[rRＲ][zZＺａ-ｚＡ-Ｚ]?$/gi, "");
    // 末尾の単独Rの除去
    base = base.replace(/[rRＲ]$/g, "");
    // 空白文字（全角・半角スペース）の除去
    base = base.replace(/[\s　]+/g, "");
    return base.trim();
};

export type BagsInventoryFilterOptions = {
    bagProducts: Product[];
    inventoryMap: Map<string, { quantity: number; oldPriceQuantity: number; updatedAt?: string }>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    wipMap: Map<string, WorkInProgress[]>;
    incomingMap: Map<string, { total: number; items: IncomingStock[] }>;
    supplierStockMap: Map<string, number>;
    supplierStockLotsMap: Map<string, SupplierStockLot[]>;
    predictionMap: Map<string, ReturnType<typeof calculateStockPrediction>>;
    settings?: Record<string, unknown>;
    statusLabels: Record<string, string>;
    addToCart: (product: Product, quantity?: number) => void;
};

export type BagsInventoryFilterResult = {
    quickFilter: QuickFilterType;
    setQuickFilter: (filter: QuickFilterType) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    weightFilter: string;
    setWeightFilter: (weight: string) => void;
    stockFilter: string;
    setStockFilter: (stock: string) => void;
    originFilter: string;
    setOriginFilter: (origin: string) => void;
    varietyFilter: string;
    setVarietyFilter: (variety: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    showRemovedZeroStock: boolean;
    setShowRemovedZeroStock: (show: boolean | ((prev: boolean) => boolean)) => void;
    sortKey: SortKey;
    sortOrder: SortOrder;
    density: TableDensity;
    setDensity: (density: TableDensity) => void;
    handleSort: (key: SortKey) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
    filteredProducts: Product[];
    summary: {
        total: number;
        needOrder: number;
        urgentPrediction: number;
        reserved: number;
        inSupply: number;
        wipCheck: number;
    };
    handleExportExcel: () => Promise<void>;
    handleAutoFillCart: () => void;
};

export function useBagsInventoryFilter({
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
}: BagsInventoryFilterOptions): BagsInventoryFilterResult {
    // フィルター状態
    const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
    const [searchQuery, setSearchQuery] = useState("");
    const [weightFilter, setWeightFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");
    const [originFilter, setOriginFilter] = useState("all");
    const [varietyFilter, setVarietyFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showRemovedZeroStock, setShowRemovedZeroStock] = useState(false);

    // ソート状態
    const [sortKey, setSortKey] = useState<SortKey>('default');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // 表示密度（ローカルストレージ連携）
    const [density, setDensityState] = useState<TableDensity>('standard');

    useEffect(() => {
        const savedDensity = localStorage.getItem('bags_table_density') as TableDensity;
        if (savedDensity === 'standard' || savedDensity === 'compact') {
            setDensityState(savedDensity);
        }
    }, []);

    const setDensity = useCallback((newDensity: TableDensity): void => {
        setDensityState(newDensity);
        try {
            localStorage.setItem('bags_table_density', newDensity);
        } catch {
            // localStorage not available
        }
    }, []);

    // ソート切り替えハンドラー
    const handleSort = useCallback((key: SortKey): void => {
        if (key === 'default') {
            setSortKey('default');
            setSortOrder('desc');
            return;
        }

        if (sortKey === key) {
            if (sortOrder === 'desc') {
                setSortOrder('asc');
            } else {
                setSortKey('default');
                setSortOrder('desc');
            }
        } else {
            setSortKey(key);
            if (key === 'name' || key === 'weight') {
                setSortOrder('asc');
            } else {
                setSortOrder('desc');
            }
        }
    }, [sortKey, sortOrder]);

    const hasActiveFilters = Boolean(
        searchQuery ||
        weightFilter !== "all" ||
        stockFilter !== "all" ||
        originFilter !== "all" ||
        varietyFilter !== "all" ||
        statusFilter !== "all"
    );

    const clearFilters = useCallback((): void => {
        setSearchQuery("");
        setWeightFilter("all");
        setStockFilter("all");
        setOriginFilter("all");
        setVarietyFilter("all");
        setStatusFilter("all");
    }, []);

    // サマリー計算
    const summary = useMemo(() => {
        let lowStock = 0;
        let outOfStock = 0;
        let hasReservation = 0;
        let urgentPrediction = 0;
        let inSupply = 0;
        let wipCheck = 0;

        bagProducts.forEach(p => {
            const qty = inventoryMap.get(p.id)?.quantity || 0;
            const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
            const { isOutOfStock, isLowStock } = calculateStockStatus(p, qty, allocation, settings);

            if (isOutOfStock) outOfStock++;
            else if (isLowStock) lowStock++;
            if (allocation.bags > 0) hasReservation++;
            if (p.status === 'wip_check') wipCheck++;

            const pred = predictionMap.get(p.id);
            if (pred && (pred.wipStartAlert || (pred.remainingDays !== null && pred.remainingDays <= (p.productionLeadDays || 30)))) {
                urgentPrediction++;
            }

            const inc = incomingMap.get(p.id)?.total || 0;
            const wipCount = (wipMap.get(p.id) || []).reduce((sum, item) => sum + item.quantity, 0);
            const lots = supplierStockLotsMap?.get(p.id) || [];
            const supStock = lots.length > 0 ? lots.reduce((sum, lot) => sum + lot.quantity, 0) : (supplierStockMap.get(p.id) || 0);

            if (inc > 0 || wipCount > 0 || supStock > 0) {
                inSupply++;
            }
        });

        return {
            total: bagProducts.length,
            needOrder: lowStock + outOfStock,
            urgentPrediction,
            reserved: hasReservation,
            inSupply,
            wipCheck
        };
    }, [bagProducts, inventoryMap, saleAllocationMap, settings, predictionMap, incomingMap, wipMap, supplierStockLotsMap, supplierStockMap]);

    // フィルタリングおよびソート
    const filteredProducts = useMemo(() => {
        let products = bagProducts;

        // 廃盤（落版）で在庫が0のものを非表示にするフィルター
        if (!showRemovedZeroStock) {
            products = products.filter(p => {
                const isRemoved = p.status === 'plate_removed' || p.status === 'discontinued';
                if (!isRemoved) return true;
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                return qty > 0;
            });
        }

        // クイックフィルター
        if (quickFilter === 'need_order') {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isLowStock, isOutOfStock } = calculateStockStatus(p, qty, allocation, settings);
                return isLowStock || isOutOfStock;
            });
        } else if (quickFilter === 'urgent_prediction') {
            products = products.filter(p => {
                const pred = predictionMap.get(p.id);
                return pred && (pred.wipStartAlert || (pred.remainingDays !== null && pred.remainingDays <= (p.productionLeadDays || 30)));
            });
        } else if (quickFilter === 'reserved') {
            products = products.filter(p => (saleAllocationMap.get(p.id)?.bags || 0) > 0);
        } else if (quickFilter === 'supply') {
            products = products.filter(p => {
                const inc = incomingMap.get(p.id)?.total || 0;
                const wip = (wipMap.get(p.id) || []).reduce((sum, item) => sum + item.quantity, 0);
                const lots = supplierStockLotsMap?.get(p.id) || [];
                const supStock = lots.length > 0 ? lots.reduce((sum, lot) => sum + lot.quantity, 0) : (supplierStockMap.get(p.id) || 0);
                return inc > 0 || wip > 0 || supStock > 0;
            });
        } else if (quickFilter === 'wip_check') {
            products = products.filter(p => p.status === 'wip_check');
        }

        // 検索クエリ
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            products = products.filter(p =>
                (p.name && p.name.toLowerCase().includes(query)) ||
                (p.sku && p.sku.toLowerCase().includes(query)) ||
                (p.origin && p.origin.toLowerCase().includes(query)) ||
                (p.variety && p.variety.toLowerCase().includes(query)) ||
                (p.prefix && p.prefix.toLowerCase().includes(query))
            );
        }

        // 重量フィルター
        if (weightFilter !== "all") {
            const weightNum = parseFloat(weightFilter);
            products = products.filter(p => p.weight === weightNum);
        }

        // 在庫状態フィルター
        if (stockFilter === "in_stock") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isLowStock, isOutOfStock } = calculateStockStatus(p, qty, allocation, settings);
                return !isLowStock && !isOutOfStock;
            });
        } else if (stockFilter === "low_stock") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isLowStock } = calculateStockStatus(p, qty, allocation, settings);
                return isLowStock;
            });
        } else if (stockFilter === "out_of_stock") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isOutOfStock } = calculateStockStatus(p, qty, allocation, settings);
                return isOutOfStock;
            });
        } else if (stockFilter === "need_order") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isLowStock, isOutOfStock } = calculateStockStatus(p, qty, allocation, settings);
                return isLowStock || isOutOfStock;
            });
        } else if (stockFilter === "reserved") {
            products = products.filter(p => (saleAllocationMap.get(p.id)?.bags || 0) > 0);
        }

        // 産地フィルター
        if (originFilter !== "all") {
            products = products.filter(p => p.origin === originFilter);
        }

        // 品種フィルター
        if (varietyFilter !== "all") {
            products = products.filter(p => p.variety === varietyFilter);
        }

        // ステータスフィルター
        if (statusFilter !== "all") {
            products = products.filter(p => p.status === statusFilter);
        }

        // ソート実行
        return [...products].sort((a, b) => {
            if (sortKey !== 'default') {
                const multiplier = sortOrder === 'asc' ? 1 : -1;
                switch (sortKey) {
                    case 'name':
                        return multiplier * (a.name || '').localeCompare(b.name || '', 'ja');
                    case 'weight':
                        return multiplier * ((a.weight || 0) - (b.weight || 0));
                    case 'currentStock': {
                        const qtyA = inventoryMap.get(a.id)?.quantity || 0;
                        const qtyB = inventoryMap.get(b.id)?.quantity || 0;
                        return multiplier * (qtyA - qtyB);
                    }
                    case 'allocation': {
                        const allocA = saleAllocationMap.get(a.id)?.bags || 0;
                        const allocB = saleAllocationMap.get(b.id)?.bags || 0;
                        return multiplier * (allocA - allocB);
                    }
                    case 'availableStock': {
                        const qtyA = inventoryMap.get(a.id)?.quantity || 0;
                        const allocA = saleAllocationMap.get(a.id) || { bags: 0, meters: 0 };
                        const statA = calculateStockStatus(a, qtyA, allocA, settings);
                        const qtyB = inventoryMap.get(b.id)?.quantity || 0;
                        const allocB = saleAllocationMap.get(b.id) || { bags: 0, meters: 0 };
                        const statB = calculateStockStatus(b, qtyB, allocB, settings);
                        return multiplier * (statA.availableStock - statB.availableStock);
                    }
                    case 'incoming': {
                        const incA = incomingMap.get(a.id)?.total || 0;
                        const incB = incomingMap.get(b.id)?.total || 0;
                        return multiplier * (incA - incB);
                    }
                    case 'supplierStock': {
                        const lotsA = supplierStockLotsMap?.get(a.id) || [];
                        const supA = lotsA.length > 0 ? lotsA.reduce((sum, lot) => sum + lot.quantity, 0) : (supplierStockMap.get(a.id) || 0);
                        const lotsB = supplierStockLotsMap?.get(b.id) || [];
                        const supB = lotsB.length > 0 ? lotsB.reduce((sum, lot) => sum + lot.quantity, 0) : (supplierStockMap.get(b.id) || 0);
                        return multiplier * (supA - supB);
                    }
                    case 'wip': {
                        const wipA = (wipMap.get(a.id) || []).reduce((sum, item) => sum + item.quantity, 0);
                        const wipB = (wipMap.get(b.id) || []).reduce((sum, item) => sum + item.quantity, 0);
                        return multiplier * (wipA - wipB);
                    }
                    case 'remainingDays': {
                        const predA = predictionMap.get(a.id);
                        const predB = predictionMap.get(b.id);
                        const daysA = predA?.remainingDays ?? (sortOrder === 'asc' ? 999999 : -999999);
                        const daysB = predB?.remainingDays ?? (sortOrder === 'asc' ? 999999 : -999999);
                        return multiplier * (daysA - daysB);
                    }
                    case 'status': {
                        const statusA = a.status || '';
                        const statusB = b.status || '';
                        return multiplier * statusA.localeCompare(statusB);
                    }
                }
            }

            // 1. グループ順 (通常 -> NB -> 新米)
            const groupA = getProductGroup(a);
            const groupB = getProductGroup(b);
            if (groupA !== groupB) return groupA - groupB;

            // 2. 産地順 (北 -> 南 -> 国内産)
            const prefA = getPrefectureIndex(a.origin || a.name);
            const prefB = getPrefectureIndex(b.origin || b.name);
            if (prefA !== prefB) return prefA - prefB;

            // 3. ベース商品名順 (同一シリーズ・銘柄・補足をひとまとめにする)
            const baseA = getBaseProductName(a.name);
            const baseB = getBaseProductName(b.name);
            const nameCompare = baseA.localeCompare(baseB, "ja");
            if (nameCompare !== 0) return nameCompare;

            // 4. 量目（重量）順 (小さい順: 1kg -> 2kg -> 3kg -> 5kg -> 10kg)
            const weightA = a.weight || 0;
            const weightB = b.weight || 0;
            if (weightA !== weightB) return weightA - weightB;

            // 5. 完全商品名順
            const fullCompare = (a.name || "").localeCompare(b.name || "", "ja");
            if (fullCompare !== 0) return fullCompare;

            // 6. SKU順
            return (a.sku || "").localeCompare(b.sku || "");
        });
    }, [bagProducts, showRemovedZeroStock, quickFilter, searchQuery, weightFilter, stockFilter, originFilter, varietyFilter, statusFilter, sortKey, sortOrder, inventoryMap, saleAllocationMap, settings, predictionMap, incomingMap, wipMap, supplierStockLotsMap, supplierStockMap]);

    // Excel出力 (xlsx を動的インポート)
    const handleExportExcel = useCallback(async (): Promise<void> => {
        try {
            if (filteredProducts.length === 0) return;

            const XLSX = await import("xlsx");

            const excelData = filteredProducts.map(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const wip = wipMap.get(p.id) || [];
                const wipQty = wip.reduce((sum, item) => sum + item.quantity, 0);
                const supplierStock = p.supplierStock || 0;
                const incoming = incomingMap.get(p.id)?.total || 0;
                const effectiveStock = qty - allocation.bags + wipQty + supplierStock;

                return {
                    "商品コード": p.sku || p.id,
                    "商品名": p.name,
                    "区分": p.prefix || "",
                    "産地": p.origin || "",
                    "品種": p.variety || "",
                    "重量": p.weight ? `${p.weight}kg` : "",
                    "現在庫": qty,
                    "特売引当": allocation.bags,
                    "仕掛中": wipQty,
                    "メーカー(直送)": supplierStock,
                    "実質在庫": effectiveStock,
                    "入荷予定": incoming,
                    "状態": statusLabels[p.status] || p.status
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const colWidths = [
                { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
                { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
                { wch: 10 }, { wch: 10 }, { wch: 15 }
            ];
            worksheet["!cols"] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "在庫一覧");

            const dateStr = format(new Date(), "yyyyMMdd_HHmm");
            XLSX.writeFile(workbook, `アサヒパック_在庫一覧_${dateStr}.xlsx`);
        } catch (error) {
            console.error("Excel export error:", error);
        }
    }, [filteredProducts, inventoryMap, saleAllocationMap, wipMap, incomingMap, statusLabels]);

    // 一括発注カート追加
    const handleAutoFillCart = useCallback((): void => {
        let addedCount = 0;
        bagProducts.forEach(p => {
            const qty = inventoryMap.get(p.id)?.quantity || 0;
            const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
            const { isLowStock, isOutOfStock } = calculateStockStatus(p, qty, allocation, settings);

            if (!isLowStock && !isOutOfStock) return;

            const alertThreshold = p.minStockAlert || 500;
            const targetStock = alertThreshold * 2;
            const neededQty = Math.max(alertThreshold, targetStock - qty + allocation.bags);

            const lotSize = 500;
            const recommendedQty = Math.ceil(neededQty / lotSize) * lotSize;

            addToCart(p, recommendedQty);
            addedCount++;
        });

        toast.success(`${addedCount}件の商品を推奨数量でカートに追加しました`);
    }, [bagProducts, inventoryMap, saleAllocationMap, settings, addToCart]);

    return {
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
    };
}
