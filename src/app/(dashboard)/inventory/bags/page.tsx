"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Search,
    Filter,
    Loader2,
    Plus,
    Package,
    TrendingDown,
    Smartphone,
    LayoutGrid,
    List,
    Monitor,
    X,
    AlertTriangle,
    Calendar,
    Printer,
    Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
    bagsToMeters,
    calculateStockStatus
} from "@/lib/services";
import { useProducts } from "@/hooks/use-products";
import { useInventory } from "@/hooks/use-inventory";
import { useIncomingStock } from "@/hooks/use-incoming-stock";
import { useSaleEvents } from "@/hooks/use-sale-events";
import { useSupplierStockLots } from "@/hooks/use-supplier-stock-lots";
import { useAppSettings } from "@/hooks/use-masters";
import { useWorkInProgress, calculateWIPByProduct } from "@/hooks/use-work-in-progress";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { IncomingStockDialog } from "@/components/inventory/incoming-stock-dialog";
import type { Product, IncomingStock } from "@/types";
import { BagsInventoryTable } from "@/components/inventory/bags-inventory-table";
import { BagsInventoryCards } from "@/components/inventory/bags-inventory-cards";
import { ProductDetailDialog } from "@/components/inventory/product-detail-dialog";
import { ProductAnalysisDialog } from "@/components/inventory/product-analysis-dialog";
import { cn } from "@/lib/utils";
import { InventoryPrintView } from "@/components/inventory/inventory-print-view";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 都道府県リスト（北から南、最後に国内産）
const PREFECTURES = [
    "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
    "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
    "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知",
    "三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山",
    "鳥取", "島根", "岡山", "広島", "山口",
    "徳島", "香川", "愛媛", "高知",
    "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄",
    "国内産", "国産" // 国内産を最後に追加
];

// 都道府県インデックスを取得
const getPrefectureIndex = (text: string | undefined): number => {
    if (!text) return 999;
    for (let i = 0; i < PREFECTURES.length; i++) {
        if (text.includes(PREFECTURES[i])) {
            return i;
        }
    }
    return 999;
};

// 商品のグループ分け
// 0: 通常
// 1: NB (NBかつ新米でない)
// 2: 新米 (新米を含む、NB・新米も含む)
const getProductGroup = (p: Product): number => {
    const name = p.name || "";
    const prefix = p.prefix || "";

    // カテゴリ判定ロジック強化
    const isNewRice = name.includes("新米") || prefix.includes("新米") || p.category === "new_rice" || name.includes("ＮＢ・新米") || prefix.includes("ＮＢ・新米");
    const isNB = name.includes("NB") || name.includes("ＮＢ") || prefix.includes("NB") || prefix.includes("ＮＢ");

    if (isNewRice) return 2;
    if (isNB) return 1;
    return 0;
};

export default function BagsInventoryPage(): React.ReactElement {
    // 表示モード (grid | table)
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    // フィルターの表示・非表示 (スマホ・風景モード用)
    const [showFilters, setShowFilters] = useState(true);
    const [isSmallHeight, setIsSmallHeight] = useState(false);

    // 画面の高さが低い場合（横向きなど）は初期状態でフィルターを閉じる
    useEffect(() => {
        const checkHeight = () => {
            const smallHeight = window.innerHeight < 768 || window.innerWidth > window.innerHeight;
            setIsSmallHeight(smallHeight);
            if (smallHeight) {
                setShowFilters(false);
            }
        };

        checkHeight();
        window.addEventListener('resize', checkHeight);
        return () => window.removeEventListener('resize', checkHeight);
    }, []);

    const [searchQuery, setSearchQuery] = useState("");
    const [weightFilter, setWeightFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");
    const [originFilter, setOriginFilter] = useState("all");
    const [varietyFilter, setVarietyFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showRemovedZeroStock, setShowRemovedZeroStock] = useState(false);

    // Supabase APIから商品と在庫を取得
    const { products: allProducts, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();
    const { inventory: inventoryData, loading: inventoryLoading, refetch: refetchInventory } = useInventory();
    const { events: saleEvents, loading: eventsLoading, refetch: refetchEvents } = useSaleEvents();
    const { items: wipItems, loading: wipLoading, refetch: refetchWIP } = useWorkInProgress({ status: 'in_progress' });
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
        const map = new Map<string, { quantity: number; updatedAt?: string }>();
        inventoryData?.forEach(item => {
            map.set(item.productId, { quantity: item.quantity, updatedAt: item.updatedAt });
        });
        return map;
    }, [inventoryData]);

    // 特売引当マップを作成
    const saleAllocationMap = useMemo(() => {
        const map = new Map<string, { bags: number; meters: number }>();
        saleEvents
            .forEach(event => {
                event.items.forEach(item => {
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

    // 特売引当の詳細マップを作成 (Client Name, Dates, Qty)
    const detailedSaleAllocationMap = useMemo(() => {
        const map = new Map<string, Array<{ eventId: string; clientName: string; quantity: number; dates: string[] }>>();
        saleEvents.forEach(event => {
            if (event.status === 'completed' || event.status === 'cancelled') return;
            event.items.forEach(item => {
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
    const wipMap = useMemo(() => calculateWIPByProduct(wipItems), [wipItems]);

    // メーカー在庫マップを作成
    const supplierStockMap = useMemo(() => {
        const map = new Map<string, number>();
        allProducts.forEach(product => {
            const supplierStock = product.supplierStock || 0;
            map.set(product.id, supplierStock);
        });
        return map;
    }, [allProducts]);

    // 入荷予定マップ
    const incomingMap = useMemo(() => {
        const map = new Map<string, { total: number; items: IncomingStock[] }>();

        // 商品ごとに入荷予定をグループ化
        incomingStocks.forEach(stock => {
            const current = map.get(stock.productId) || { total: 0, items: [] };

            map.set(stock.productId, {
                total: current.total + stock.quantity,
                items: [...current.items, stock].sort((a, b) => a.expectedDate.localeCompare(b.expectedDate))
            });
        });

        return map;
    }, [incomingStocks]);

    const refetch = useCallback((): void => {
        refetchProducts();
        refetchInventory();
        refetchWIP();
        refetchIncoming();
        refetchLots();
        refetchEvents();
    }, [refetchProducts, refetchInventory, refetchWIP, refetchIncoming, refetchLots, refetchEvents]);

    // 商品フォームダイアログの状態
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // 削除確認ダイアログの状態
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    // 入荷予定ダイアログの状態
    const [incomingDialogOpen, setIncomingDialogOpen] = useState(false);
    const [incomingStockProduct, setIncomingStockProduct] = useState<Product | null>(null);

    // 商品詳細ダイアログの状態
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);

    // 商品分析ダイアログの状態
    const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
    const [analysisProduct, setAnalysisProduct] = useState<Product | null>(null);

    const handlePrint = useCallback(() => {
        const originalTitle = document.title;
        document.title = `アサヒパック_在庫一覧_${format(new Date(), "yyyyMMdd_HHmm")}`;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 100);
    }, []);



    const handleAddProduct = (): void => {
        setEditingProduct(null);
        setFormDialogOpen(true);
    };

    const handleEditProduct = (product: Product): void => {
        setEditingProduct(product);
        setFormDialogOpen(true);
    };

    const handleOpenDetail = (product: Product): void => {
        setDetailProduct(product);
        setDetailDialogOpen(true);
    };

    // 削除ボタンクリック時
    const handleDeleteClick = (product: Product): void => {
        setProductToDelete(product);
        setDeleteConfirmOpen(true);
    };

    // 削除実行
    const executeDelete = async (): Promise<void> => {
        if (!productToDelete) return;

        try {
            const response = await fetch(`/api/products?id=${productToDelete.id}`, { method: "DELETE" });
            if (response.ok) {
                refetch();
                setDeleteConfirmOpen(false);
                setProductToDelete(null);
            } else {
                const result = await response.json();
                alert(result.error || "削除に失敗しました");
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("削除中にエラーが発生しました");
        }
    };

    // 利用可能な重量リストを取得
    const availableWeights = useMemo(() => {
        const weights = new Set(bagProducts.map(p => p.weight).filter(Boolean));
        return Array.from(weights).sort((a, b) => (a || 0) - (b || 0)) as number[];
    }, [bagProducts]);

    // 利用可能な産地リストを取得
    const availableOrigins = useMemo(() => {
        const origins = new Set(bagProducts.map(p => p.origin).filter(Boolean));
        return Array.from(origins).sort((a, b) => (a || "").localeCompare(b || "", "ja")) as string[];
    }, [bagProducts]);

    // 利用可能な品種リストを取得
    const availableVarieties = useMemo(() => {
        const varieties = new Set(bagProducts.map(p => p.variety).filter(Boolean));
        return Array.from(varieties).sort((a, b) => (a || "").localeCompare(b || "", "ja")) as string[];
    }, [bagProducts]);

    // ステータスの表示名マップ
    const statusLabels: Record<string, string> = {
        active: "通常 (稼働中)",
        plate_removal_scheduled: "落版予定",
        plate_removed: "落版",
        direct_delivery: "直送先在庫",
        on_sale_break: "販売中断",
        discontinued: "廃盤",
    };

    // フィルタリングされた商品
    const filteredProducts = useMemo(() => {
        let products = bagProducts;

        // 落版かつ現在庫0のものをデフォルトで非表示にする
        if (!showRemovedZeroStock) {
            products = products.filter(p => {
                const isPlateRemoved = p.status === 'plate_removed';
                const currentStock = inventoryMap.get(p.id)?.quantity || 0;
                return !(isPlateRemoved && currentStock === 0);
            });
        }

        // 検索フィルター
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.janCode?.toLowerCase().includes(query) ||
                p.id.includes(query) ||
                p.sku?.toLowerCase().includes(query)
            );
        }

        // 重量フィルター
        if (weightFilter !== "all") {
            const weight = parseFloat(weightFilter);
            products = products.filter(p => p.weight === weight);
        }

        // 在庫フィルター
        if (stockFilter === "low") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isLowStock } = calculateStockStatus(p, qty, allocation, settings);
                return isLowStock;
            });
        } else if (stockFilter === "out") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isOutOfStock } = calculateStockStatus(p, qty, allocation, settings);
                return isOutOfStock;
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

        // ソート実行（filter後の配列をソート）
        return [...products].sort((a, b) => {
            // 1. グループ順 (通常 -> NB -> 新米)
            const groupA = getProductGroup(a);
            const groupB = getProductGroup(b);
            if (groupA !== groupB) return groupA - groupB;

            // 2. 産地順 (北 -> 南 -> 国内産)
            const prefA = getPrefectureIndex(a.origin || a.name);
            const prefB = getPrefectureIndex(b.origin || b.name);
            if (prefA !== prefB) return prefA - prefB;

            // 3. 品種順 (五十音順)
            const varA = a.variety || "";
            const varB = b.variety || "";
            if (varA !== varB) return varA.localeCompare(varB, "ja");

            // 4. 重量順 (小さい順)
            return (a.weight || 0) - (b.weight || 0);
        });
    }, [bagProducts, searchQuery, weightFilter, stockFilter, originFilter, varietyFilter, statusFilter, showRemovedZeroStock, inventoryMap, saleAllocationMap, settings]);

    // Excel出力
    const handleExportExcel = useCallback((): void => {
        try {
            if (filteredProducts.length === 0) return;

            const excelData = filteredProducts.map(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const wip = wipMap.get(p.id) || [];
                const wipQty = wip.reduce((sum, item) => sum + item.quantity, 0);
                const supplierStock = p.supplierStock || 0;
                const incoming = incomingMap.get(p.id)?.total || 0;

                // 実質在庫
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
    }, [filteredProducts, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, incomingMap]);

    // サマリー計算
    const summary = useMemo(() => {
        let lowStock = 0;
        let outOfStock = 0;
        let hasReservation = 0;

        bagProducts.forEach(p => {
            const qty = inventoryMap.get(p.id)?.quantity || 0;
            const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
            const { isOutOfStock, isLowStock } = calculateStockStatus(p, qty, allocation);

            if (isOutOfStock) outOfStock++;
            else if (isLowStock) lowStock++;
            if (allocation.bags > 0) hasReservation++;
        });

        return { total: bagProducts.length, lowStock, outOfStock, hasReservation };
    }, [bagProducts, inventoryMap, saleAllocationMap]);

    const hasActiveFilters = searchQuery || weightFilter !== "all" || stockFilter !== "all" || originFilter !== "all" || varietyFilter !== "all" || statusFilter !== "all";

    const clearFilters = (): void => {
        setSearchQuery("");
        setWeightFilter("all");
        setStockFilter("all");
        setOriginFilter("all");
        setVarietyFilter("all");
        setStatusFilter("all");
    };

    // 初回ロード時のみローディング表示（データがある場合は更新中も表示し続ける）
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
        <div className={cn("space-y-2 sm:space-y-4 md:space-y-6", isSmallHeight && "space-y-0.5")}>
            {/* ヘッダー・アクション */}
            <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden", isSmallHeight && "flex-row items-center gap-2 mb-1")}>
                <div className={cn("transition-all", isSmallHeight ? "flex items-center gap-2" : "block")}>
                    <h1 className={cn("text-xl md:text-3xl font-bold", isSmallHeight && "text-sm whitespace-nowrap")}>
                        {isSmallHeight ? `在庫状況 (${filteredProducts.length})` : "米袋在庫管理"}
                    </h1>
                    {!isSmallHeight && <p className="text-[11px] sm:text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">米袋・新米関連商品の在庫を確認・管理します</p>}
                </div>
                <div className={cn("flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar", isSmallHeight && "pb-0 ml-auto")}>
                    {!isSmallHeight && (
                        <div className="bg-slate-100 p-1 rounded-lg border flex items-center shrink-0">
                            <Button
                                variant={viewMode === "table" ? "secondary" : "ghost"}
                                size="sm"
                                className={cn("px-2 sm:px-3 h-8 text-xs sm:text-sm", viewMode === "table" && "bg-white shadow-sm")}
                                onClick={() => setViewMode("table")}
                            >
                                <List className="h-4 w-4 mr-1 sm:mr-2" />
                                リスト
                            </Button>
                            <Button
                                variant={viewMode === "grid" ? "secondary" : "ghost"}
                                size="sm"
                                className={cn("px-2 sm:px-3 h-8 text-xs sm:text-sm", viewMode === "grid" && "bg-white shadow-sm")}
                                onClick={() => setViewMode("grid")}
                            >
                                <LayoutGrid className="h-4 w-4 mr-1 sm:mr-2" />
                                カード
                            </Button>
                        </div>
                    )}
                    <Button 
                        variant="outline" 
                        onClick={handleExportExcel} 
                        className={cn("gap-1.5 h-10 px-2 sm:px-4 text-xs sm:text-sm shrink-0 border-green-600 text-green-600 hover:bg-green-50", isSmallHeight && "h-7 px-2")}
                    >
                        <Download className="h-3.5 w-3.5" />
                        {isSmallHeight ? 'Excel' : 'Excel出力'}
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handlePrint} 
                        className={cn("gap-1.5 h-10 px-2 sm:px-4 text-xs sm:text-sm shrink-0 border-slate-300", isSmallHeight && "h-7 px-2")}
                    >
                        <Printer className="h-3.5 w-3.5" />
                        {isSmallHeight ? 'PDF' : 'PDF出力'}
                    </Button>
                    <Button onClick={handleAddProduct} className={cn("gap-1.5 h-10 px-2 sm:px-4 text-xs sm:text-sm shrink-0", isSmallHeight && "h-7 px-2")}>
                        <Plus className="h-3 w-3" />
                        {isSmallHeight ? '追加' : '商品追加'}
                    </Button>
                </div>
            </div>

            {/* サマリーカード (縦幅が狭い場合、またはフィルター表示時はスマホで非表示) */}
            <div className={cn(
                "grid grid-cols-4 gap-1.5 md:gap-4 transition-all print:hidden",
                (isSmallHeight || !showFilters) ? "hidden" : "hidden md:grid"
            )}>
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="p-1.5 sm:p-3 pb-0 sm:pb-0">
                        <CardTitle className="text-[9px] sm:text-xs md:text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <Package className="h-3 w-3 hidden sm:inline" />
                            総数
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-1.5 pt-0.5 sm:p-3 sm:pt-1">
                        <div className="text-sm sm:text-lg md:text-xl font-bold">{summary.total}</div>
                    </CardContent>
                </Card>
                <Card className="border-red-100 shadow-none sm:shadow-sm">
                    <CardHeader className="p-1.5 sm:p-3 pb-0 sm:pb-0">
                        <CardTitle className="text-[9px] sm:text-xs md:text-sm font-medium text-red-600 flex items-center gap-1">
                            <TrendingDown className="h-3 w-3 hidden sm:inline" />
                            欠品
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-1.5 pt-0.5 sm:p-3 sm:pt-1">
                        <div className="text-sm sm:text-lg md:text-xl font-bold text-red-600">{summary.outOfStock}</div>
                    </CardContent>
                </Card>
                <Card className="border-amber-100 shadow-none sm:shadow-sm">
                    <CardHeader className="p-1.5 sm:p-3 pb-0 sm:pb-0">
                        <CardTitle className="text-[9px] sm:text-xs md:text-sm font-medium text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 hidden sm:inline" />
                            低在庫
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-1.5 pt-0.5 sm:p-3 sm:pt-1">
                        <div className="text-sm sm:text-lg md:text-xl font-bold text-amber-600">{summary.lowStock}</div>
                    </CardContent>
                </Card>
                <Card className="border-blue-100 shadow-none sm:shadow-sm">
                    <CardHeader className="p-1.5 sm:p-3 pb-0 sm:pb-0">
                        <CardTitle className="text-[9px] sm:text-xs md:text-sm font-medium text-blue-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3 hidden sm:inline" />
                            引当
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-1.5 pt-0.5 sm:p-3 sm:pt-1">
                        <div className="text-sm sm:text-lg md:text-xl font-bold text-blue-600">{summary.hasReservation}</div>
                    </CardContent>
                </Card>
            </div>

            {/* 検索・フィルターエリア */}
            <Card className={cn("shadow-none sm:shadow-sm overflow-hidden border-none sm:border print:hidden", isSmallHeight && "mb-0")}>
                <CardContent className={cn("p-1 sm:p-4", isSmallHeight && "p-1 pb-0")}>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="商品名、JAN、商品ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-8 md:h-9 text-xs md:text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 md:flex md:gap-3 md:items-end">
                            <div className="md:w-28">
                                <label className="text-[10px] md:text-xs font-medium mb-1 block text-muted-foreground">重量</label>
                                <Select value={weightFilter} onValueChange={setWeightFilter}>
                                    <SelectTrigger className="h-8 md:h-9 text-xs px-2">
                                        <SelectValue placeholder="すべて" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">すべて</SelectItem>
                                        {availableWeights.map(w => (
                                            <SelectItem key={w} value={w.toString()}>
                                                {w}kg
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:w-36">
                                <label className="text-[10px] md:text-xs font-medium mb-1 block text-muted-foreground">産地</label>
                                <Select value={originFilter} onValueChange={setOriginFilter}>
                                    <SelectTrigger className="h-8 md:h-9 text-xs px-2">
                                        <SelectValue placeholder="すべて" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">すべて</SelectItem>
                                        {availableOrigins.map(o => (
                                            <SelectItem key={o} value={o}>{o}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:w-36">
                                <label className="text-[10px] md:text-xs font-medium mb-1 block text-muted-foreground">品種</label>
                                <Select value={varietyFilter} onValueChange={setVarietyFilter}>
                                    <SelectTrigger className="h-8 md:h-9 text-xs px-2">
                                        <SelectValue placeholder="すべて" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">すべて</SelectItem>
                                        {availableVarieties.map(v => (
                                            <SelectItem key={v} value={v}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:w-36">
                                <label className="text-[10px] md:text-xs font-medium mb-1 block text-muted-foreground">状態</label>
                                <Select value={stockFilter} onValueChange={setStockFilter}>
                                    <SelectTrigger className="h-8 md:h-9 text-xs px-2">
                                        <SelectValue placeholder="すべて" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">すべて</SelectItem>
                                        <SelectItem value="low">低在庫</SelectItem>
                                        <SelectItem value="out">欠品</SelectItem>
                                        <SelectItem value="reserved">引当あり</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:w-40">
                                <label className="text-[10px] md:text-xs font-medium mb-1 block text-muted-foreground">全体状況</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-8 md:h-9 text-xs px-2">
                                        <SelectValue placeholder="すべて" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">すべて</SelectItem>
                                        {Object.entries(statusLabels).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {hasActiveFilters && (
                            <Button variant="outline" onClick={clearFilters} className="gap-1.5 h-8 md:h-9 text-xs">
                                <X className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">クリア</span>
                            </Button>
                        )}
                    </div>

                    {hasActiveFilters && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Filter className="h-4 w-4" />
                            <span>フィルター適用中:</span>
                            {searchQuery && <Badge variant="secondary">検索: &quot;{searchQuery}&quot;</Badge>}
                            {weightFilter !== "all" && <Badge variant="secondary">{weightFilter}kg</Badge>}
                            {stockFilter !== "all" && (
                                <Badge variant="secondary">
                                    {stockFilter === "low" ? "低在庫" : stockFilter === "out" ? "欠品" : "特売引当あり"}
                                </Badge>
                            )}
                            {originFilter !== "all" && <Badge variant="secondary">産地: {originFilter}</Badge>}
                            {varietyFilter !== "all" && <Badge variant="secondary">品種: {varietyFilter}</Badge>}
                            {statusFilter !== "all" && <Badge variant="secondary">状況: {statusLabels[statusFilter]}</Badge>}
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium whitespace-nowrap text-muted-foreground">落版(在庫0)を表示:</Label>
                            <RadioGroup
                                defaultValue="off"
                                className="flex items-center gap-4"
                                onValueChange={(val) => setShowRemovedZeroStock(val === "on")}
                                value={showRemovedZeroStock ? "on" : "off"}
                            >
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="off" id="removed-off-bags" />
                                    <Label htmlFor="removed-off-bags" className="text-xs font-normal">OFF</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="on" id="removed-on-bags" />
                                    <Label htmlFor="removed-on-bags" className="text-xs font-normal">ON</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 在庫表示 (テーブル or カード) */}
            <div className="print:hidden">
                {viewMode === "table" ? (
                <BagsInventoryTable
                    products={filteredProducts}
                    inventoryMap={inventoryMap}
                    saleAllocationMap={saleAllocationMap}
                    wipMap={wipMap}
                    supplierStockMap={supplierStockMap}
                    supplierStockLotsMap={supplierStockLotsMap}
                    incomingMap={incomingMap}
                    saleEvents={saleEvents || []}
                    onEdit={handleEditProduct}
                    onIncomingStockClick={(product) => {
                        setIncomingStockProduct(product);
                        setIncomingDialogOpen(true);
                    }}
                    onAnalyze={(product) => {
                        setAnalysisProduct(product);
                        setAnalysisDialogOpen(true);
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

            {/* 商品詳細ダイアログ */}
            <ProductDetailDialog
                product={detailProduct}
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
                currentStock={detailProduct ? (inventoryMap.get(detailProduct.id)?.quantity || 0) : 0}
                supplierStock={detailProduct ? (supplierStockMap.get(detailProduct.id) || 0) : 0}
                supplierStockLots={detailProduct ? (supplierStockLotsMap.get(detailProduct.id) || []) : []}
                wipItems={detailProduct ? (wipMap.get(detailProduct.id) || []) : []}
                saleAllocations={detailProduct ? saleAllocationMap.get(detailProduct.id) : undefined}
                detailedAllocations={detailProduct ? (detailedSaleAllocationMap.get(detailProduct.id) || []) : []}
                onEditProduct={(product) => {
                    setEditingProduct(product);
                    setFormDialogOpen(true);
                }}
                onSuccess={refetch}
            />

            {/* 商品分析ダイアログ */}
            {analysisProduct && (
                <ProductAnalysisDialog
                    product={analysisProduct}
                    currentStock={inventoryMap.get(analysisProduct.id)?.quantity || 0}
                    open={analysisDialogOpen}
                    onOpenChange={setAnalysisDialogOpen}
                />
            )}

            {/* 商品フォームダイアログ */}
            <ProductFormDialog
                open={formDialogOpen}
                onOpenChange={setFormDialogOpen}
                product={editingProduct}
                onSuccess={refetch}
                onDelete={handleDeleteClick}
            />

            {/* 入荷予定ダイアログ */}
            <IncomingStockDialog
                open={incomingDialogOpen}
                onOpenChange={setIncomingDialogOpen}
                product={incomingStockProduct}
                onSuccess={refetch}
            />

            {/* 削除確認ダイアログ */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            「{productToDelete?.name}」を削除してもよろしいですか？<br />
                            この操作は元に戻せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmOpen(false)}>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">削除する</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 印刷用ビュー（画面には表示されず、印刷時のみ使用） */}
            <InventoryPrintView 
                products={filteredProducts}
                inventoryMap={inventoryMap}
                saleAllocationMap={saleAllocationMap}
                detailedSaleAllocationMap={detailedSaleAllocationMap}
                wipMap={wipMap}
                incomingMap={incomingMap}
                supplierStockMap={supplierStockMap}
                supplierStockLotsMap={supplierStockLotsMap}
                settings={settings}
            />
        </div>
    );
}
