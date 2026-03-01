"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Search,
    X,
    Filter,
    ShoppingCart,
    Check,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    BarChart3,
    Package,
    TrendingDown,
    TrendingUp,
    Calendar,
    AlertTriangle,
    MoreHorizontal,
    Star
} from "lucide-react";
import {
    getPitch,
    isRollBag,
    getApproxBagCount
} from "@/lib/services";
import { useCart } from "@/contexts/cart-context";
import { useProducts } from "@/hooks/use-products";
import { useInventory } from "@/hooks/use-inventory";
import { useSaleEvents } from "@/hooks/use-sale-events";
import { useWorkInProgress, calculateWIPByProduct, useWIPActions } from "@/hooks/use-work-in-progress";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { ProductAnalysisDialog } from "@/components/inventory/product-analysis-dialog";
import { StockLevelBar } from "@/components/inventory/stock-level-bar";
import type { Product } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { SupplierStockDialog } from "@/components/inventory/supplier-stock-dialog";
import { WIPDialog } from "@/components/inventory/wip-dialog";
import { OrderSheetDialog } from "@/components/inventory/order-sheet-dialog";
import { useFavorites } from "@/hooks/use-favorites";

// 枚数からメートルに変換
const bagsToMeters = (bags: number, weight: number): number => {
    const pitch = getPitch(weight);
    return (bags * pitch) / 1000;
};

// メートルから枚数に変換
const metersToBags = (meters: number, weight: number): number => {
    const pitch = getPitch(weight);
    return Math.floor((meters * 1000) / pitch);
};

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
const getProductGroup = (p: Product): number => {
    const name = p.name || "";
    const prefix = p.prefix || "";
    const isNewRice = name.includes("新米") || prefix.includes("新米") || p.category === "new_rice" || name.includes("ＮＢ・新米") || prefix.includes("ＮＢ・新米");
    const isNB = name.includes("NB") || name.includes("ＮＢ") || prefix.includes("NB") || prefix.includes("ＮＢ");

    if (isNewRice) return 2;
    if (isNB) return 1;
    return 0;
};

// Helper: Calculate Stock Status (Extracted logic)
const calculateStockStatus = (
    product: Product,
    inventoryMap: Map<string, number>,
    saleAllocationMap: Map<string, { bags: number; meters: number }>,
    wipMap: Map<string, number>,
    supplierStockMap: Map<string, number>,
    incomingMap: Map<string, { quantity: number; nextDate: string | null }>
) => {
    const currentStock = inventoryMap.get(product.id) || 0;
    const allocation = saleAllocationMap.get(product.id) || { bags: 0, meters: 0 };
    const incoming = incomingMap.get(product.id);
    const wipQuantity = wipMap.get(product.id) || 0;
    const supplierStock = supplierStockMap.get(product.id) || 0;

    const isRoll = product.shape && isRollBag(product.shape);

    let availableStock: number;
    let currentBags: number;
    let availableBags: number;

    if (isRoll) {
        availableStock = Math.max(0, currentStock - allocation.meters);
        currentBags = metersToBags(currentStock, product.weight || 5);
        availableBags = metersToBags(availableStock, product.weight || 5);
    } else {
        availableStock = Math.max(0, currentStock - allocation.bags);
        currentBags = currentStock;
        availableBags = availableStock;
    }

    const isOutOfStock = availableStock <= 0 && product.status !== 'direct_delivery' && product.status !== 'discontinued' && product.status !== 'on_sale_break';
    const isLowStock = isRoll
        ? (availableStock > 0 && availableStock < 50)
        : (availableStock > 0 && availableStock < 100);
    const hasAllocation = allocation.bags > 0;

    return {
        currentStock,
        allocation,
        incoming,
        wipQuantity,
        supplierStock,
        isRoll,
        availableStock,
        currentBags,
        availableBags,
        isOutOfStock,
        isLowStock,
        hasAllocation
    };
};

export default function InventoryPage(): React.ReactElement {
    const [currentTab, setCurrentTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [weightFilter, setWeightFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false); // Mobile filter state
    const { toggleFavorite, isFavorite } = useFavorites();

    const { products: allProducts, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();
    const { inventory: inventoryData, loading: inventoryLoading, refetch: refetchInventory } = useInventory();
    const { events: saleEvents, loading: eventsLoading } = useSaleEvents();
    const { items: wipItems, loading: wipLoading, refetch: refetchWIP } = useWorkInProgress({ status: 'in_progress' });

    // 在庫マップ (Restored)
    const inventoryMap = useMemo(() => {
        const map = new Map<string, number>();
        inventoryData?.forEach(item => {
            map.set(item.productId, item.quantity);
        });
        return map;
    }, [inventoryData]);

    const saleAllocationMap = useMemo(() => {
        const map = new Map<string, { bags: number; meters: number }>();
        saleEvents.forEach(event => {
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

    const wipMap = useMemo(() => calculateWIPByProduct(wipItems), [wipItems]);
    const wipQuantityMap = useMemo(() => {
        const map = new Map<string, number>();
        wipMap.forEach((items, productId) => {
            const total = items.reduce((sum, item) => sum + item.quantity, 0);
            map.set(productId, total);
        });
        return map;
    }, [wipMap]);

    const supplierStockMap = useMemo(() => {
        const map = new Map<string, number>();
        allProducts.forEach(product => {
            const supplierStock = (product as unknown as { supplier_stock?: number }).supplier_stock || 0;
            map.set(product.id, supplierStock);
        });
        return map;
    }, [allProducts]);

    const incomingMap = useMemo(() => new Map(), []);

    // Filters
    const filteredProducts = useMemo(() => {
        let products = currentTab === "all" ? allProducts : allProducts.filter(p => p.category === currentTab);
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.janCode?.toLowerCase().includes(query) ||
                p.id.includes(query) ||
                p.sku?.toLowerCase().includes(query)
            );
        }
        if (weightFilter !== "all") {
            const weight = parseFloat(weightFilter);
            products = products.filter(p => p.weight === weight);
        }
        if (stockFilter === "low") {
            products = products.filter(p => {
                const { isLowStock } = calculateStockStatus(p, inventoryMap, saleAllocationMap, wipQuantityMap, supplierStockMap, incomingMap);
                return isLowStock;
            });
        } else if (stockFilter === "out") {
            products = products.filter(p => {
                const { isOutOfStock } = calculateStockStatus(p, inventoryMap, saleAllocationMap, wipQuantityMap, supplierStockMap, incomingMap);
                return isOutOfStock;
            });
        } else if (stockFilter === "reserved") {
            products = products.filter(p => {
                const allocated = saleAllocationMap.get(p.id);
                return allocated && allocated.bags > 0;
            });
        }
        return products.sort((a, b) => {
            // お気に入りを最上部に表示
            const favA = isFavorite(a.id) ? 0 : 1;
            const favB = isFavorite(b.id) ? 0 : 1;
            if (favA !== favB) return favA - favB;
            const groupA = getProductGroup(a);
            const groupB = getProductGroup(b);
            if (groupA !== groupB) return groupA - groupB;
            const prefA = getPrefectureIndex(a.origin || a.name);
            const prefB = getPrefectureIndex(b.origin || b.name);
            if (prefA !== prefB) return prefA - prefB;
            return (a.weight || 0) - (b.weight || 0);
        });
    }, [allProducts, currentTab, searchQuery, weightFilter, stockFilter, inventoryMap, saleAllocationMap, wipQuantityMap, supplierStockMap, incomingMap, isFavorite]);

    const loading = productsLoading || inventoryLoading || eventsLoading || wipLoading;
    const error = productsError;

    const refetch = (): void => {
        const scrollY = window.scrollY;
        Promise.all([refetchProducts(), refetchInventory(), refetchWIP()]).then(() => {
            requestAnimationFrame(() => window.scrollTo(0, scrollY));
        });
    };

    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
    const [analyzingProduct, setAnalyzingProduct] = useState<Product | null>(null);

    const handleAddProduct = () => { setEditingProduct(null); setFormDialogOpen(true); };
    const handleEditProduct = (product: Product) => { setEditingProduct(product); setFormDialogOpen(true); };
    const handleAnalyzeProduct = (product: Product) => { setAnalyzingProduct(product); setAnalysisDialogOpen(true); };

    const handleDeleteProduct = async (productId: string) => {
        if (!confirm("この商品を削除しますか？")) return;
        try {
            const response = await fetch(`/api/products?id=${productId}`, { method: "DELETE" });
            if (response.ok) refetch();
            else alert("削除に失敗しました");
        } catch (err) { console.error(err); }
    };

    const hasActiveFilters = searchQuery || weightFilter !== "all" || stockFilter !== "all";
    const availableWeights = useMemo(() => {
        const weights = [...new Set(allProducts.map(p => p.weight).filter(Boolean))] as number[];
        return weights.sort((a, b) => a - b);
    }, [allProducts]);

    const clearFilters = () => { setSearchQuery(""); setWeightFilter("all"); setStockFilter("all"); };

    // Summary (Restored)
    const summary = useMemo(() => {
        const totalProducts = allProducts.length;
        const outOfStock = allProducts.filter(p => {
            const qty = inventoryMap.get(p.id) || 0;
            const allocated = saleAllocationMap.get(p.id)?.meters || 0;
            return (qty - allocated) <= 0 && p.status !== 'direct_delivery' && p.status !== 'discontinued' && p.status !== 'on_sale_break';
        }).length;
        const lowStock = allProducts.filter(p => {
            const qty = inventoryMap.get(p.id) || 0;
            const allocated = saleAllocationMap.get(p.id)?.meters || 0;
            const available = qty - allocated;
            const isRoll = p.shape && isRollBag(p.shape);
            const threshold = isRoll ? 50 : 100; // Assuming 50 for roll, 100 for others as per calculateStockStatus
            return available > 0 && available < threshold && p.status !== 'direct_delivery' && p.status !== 'discontinued' && p.status !== 'on_sale_break';
        }).length;
        const hasReservation = allProducts.filter(p => {
            const allocated = saleAllocationMap.get(p.id);
            return allocated && allocated.bags > 0;
        }).length;
        return { totalProducts, outOfStock, lowStock, hasReservation };
    }, [allProducts, inventoryMap, saleAllocationMap]);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-3xl font-bold tracking-tight">在庫一覧</h2>
                <div className="flex items-center gap-3">
                    {loading && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            読み込み中...
                        </div>
                    )}
                    <OrderSheetDialog
                        products={allProducts}
                        inventoryMap={inventoryMap}
                    />
                    <Button onClick={handleAddProduct} className="gap-2 w-full md:w-auto">
                        <Plus className="h-4 w-4" />
                        商品追加
                    </Button>
                </div>
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <p className="text-red-600">エラー: {error}</p>
                        <Button onClick={refetch} variant="outline" className="mt-2">
                            再読み込み
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* サマリーカード (Restored) */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card>
                    <CardHeader className="p-2 pb-0 md:p-3 md:pb-0">
                        <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            総商品
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 pt-1 md:p-3 md:pt-1">
                        <div className="text-lg md:text-xl font-bold">{summary.totalProducts}</div>
                    </CardContent>
                </Card>
                <Card className="border-red-200">
                    <CardHeader className="p-2 pb-0 md:p-3 md:pb-0">
                        <CardTitle className="text-xs md:text-sm font-medium text-red-600 flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            欠品
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 pt-1 md:p-3 md:pt-1">
                        <div className="text-lg md:text-xl font-bold text-red-600">{summary.outOfStock}</div>
                    </CardContent>
                </Card>
                <Card className="border-amber-200">
                    <CardHeader className="p-2 pb-0 md:p-3 md:pb-0">
                        <CardTitle className="text-xs md:text-sm font-medium text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            低在庫
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 pt-1 md:p-3 md:pt-1">
                        <div className="text-lg md:text-xl font-bold text-amber-600">{summary.lowStock}</div>
                    </CardContent>
                </Card>
                <Card className="border-blue-200">
                    <CardHeader className="p-2 pb-0 md:p-3 md:pb-0">
                        <CardTitle className="text-xs md:text-sm font-medium text-blue-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            引当
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 pt-1 md:p-3 md:pt-1">
                        <div className="text-lg md:text-xl font-bold text-blue-600">{summary.hasReservation}</div>
                    </CardContent>
                </Card>
            </div>

            {/* 検索・フィルターエリア (Restored & Mobile Polish) */}
            <Card>
                <div className="md:hidden p-4 border-b flex justify-between items-center bg-gray-50/50 cursor-pointer" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                    <div className="flex items-center gap-2 font-medium text-sm">
                        <Filter className="h-4 w-4" />
                        検索・絞り込み
                        {hasActiveFilters && <Badge variant="secondary" className="ml-2 text-[10px] bg-sky-100 text-sky-800">適用中</Badge>}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 pointer-events-none">
                        {isFilterOpen ? <TrendingUp className="h-4 w-4 rotate-180" /> : <TrendingDown className="h-4 w-4" />}
                    </Button>
                </div>
                <CardContent className={cn("pt-4 pb-4 md:pt-4", isFilterOpen ? "block" : "hidden md:block")}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                        {/* 検索入力 */}
                        <div className="flex-1">
                            <label className="text-xs font-medium mb-1 block">商品検索</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="商品名、JAN、ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-sm"
                                />
                            </div>
                        </div>
                        {/* 重量フィルター */}
                        <div className="w-full md:w-32">
                            <label className="text-xs font-medium mb-1 block">重量</label>
                            <Select value={weightFilter} onValueChange={setWeightFilter}>
                                <SelectTrigger className="h-9 text-sm">
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
                        {/* 在庫状態フィルター */}
                        <div className="w-full md:w-40">
                            <label className="text-xs font-medium mb-1 block">在庫状態</label>
                            <Select value={stockFilter} onValueChange={setStockFilter}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="すべて" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべて</SelectItem>
                                    <SelectItem value="low">低在庫</SelectItem>
                                    <SelectItem value="out">欠品</SelectItem>
                                    <SelectItem value="reserved">特売引当あり</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* クリアボタン */}
                        {hasActiveFilters && (
                            <Button variant="outline" onClick={clearFilters} className="gap-2 h-9 text-sm">
                                <X className="h-4 w-4" />
                                クリア
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Content Switcher */}
            <Tabs defaultValue="all" onValueChange={setCurrentTab} className="w-full">
                <div className="overflow-x-auto pb-1">
                    <TabsList className="w-full justify-start md:justify-center">
                        <TabsTrigger value="all">すべて</TabsTrigger>
                        <TabsTrigger value="new_rice">新米</TabsTrigger>
                        <TabsTrigger value="bag">米袋</TabsTrigger>
                        <TabsTrigger value="sticker">シール</TabsTrigger>
                        <TabsTrigger value="other">その他</TabsTrigger>
                    </TabsList>
                </div>

                <div className="mt-4">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <InventoryTable
                            products={filteredProducts}
                            inventoryMap={inventoryMap}
                            saleAllocationMap={saleAllocationMap}
                            wipMap={wipQuantityMap}
                            supplierStockMap={supplierStockMap}
                            incomingMap={incomingMap}
                            onEdit={handleEditProduct}
                            onDelete={handleDeleteProduct}
                            onRefetch={refetch}
                            onAnalyze={handleAnalyzeProduct}
                            onToggleFavorite={toggleFavorite}
                            isFavorite={isFavorite}
                        />
                    </div>
                    {/* Mobile List */}
                    <div className="md:hidden">
                        <MobileInventoryList
                            products={filteredProducts}
                            inventoryMap={inventoryMap}
                            saleAllocationMap={saleAllocationMap}
                            wipMap={wipQuantityMap}
                            supplierStockMap={supplierStockMap}
                            incomingMap={incomingMap}
                            onEdit={handleEditProduct}
                            onDelete={handleDeleteProduct}
                            onRefetch={refetch}
                            onAnalyze={handleAnalyzeProduct}
                            onToggleFavorite={toggleFavorite}
                            isFavorite={isFavorite}
                        />
                    </div>
                </div >
            </Tabs >

            <ProductFormDialog
                open={formDialogOpen}
                onOpenChange={setFormDialogOpen}
                product={editingProduct}
                onSuccess={refetch}
            />

            {
                analyzingProduct && (
                    <ProductAnalysisDialog
                        open={analysisDialogOpen}
                        onOpenChange={setAnalysisDialogOpen}
                        product={analyzingProduct}
                        currentStock={inventoryMap.get(analyzingProduct.id) || 0}
                    />
                )
            }
        </div >
    );
}

// ... (InventoryTableProps & Components - Same as before)
type InventoryTableProps = {
    products: Product[];
    inventoryMap: Map<string, number>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    wipMap: Map<string, number>;
    supplierStockMap: Map<string, number>;
    incomingMap: Map<string, { quantity: number; nextDate: string | null }>;
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => Promise<void>;
    onRefetch: () => void;
    onAnalyze: (product: Product) => void;
    onToggleFavorite: (productId: string) => void;
    isFavorite: (productId: string) => boolean;
};

function InventoryTable({ products, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, incomingMap, onEdit, onDelete, onRefetch, onAnalyze, onToggleFavorite, isFavorite }: InventoryTableProps) {
    const [editSupplierStock, setEditSupplierStock] = useState<Product | null>(null);
    const [editWIP, setEditWIP] = useState<Product | null>(null);

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>商品情報</TableHead>
                            <TableHead className="hidden lg:table-cell">スペック</TableHead>
                            <TableHead className="text-right">現在庫</TableHead>
                            <TableHead className="text-right hidden sm:table-cell">引当</TableHead>
                            <TableHead className="text-right">有効在庫</TableHead>
                            <TableHead className="text-right hidden lg:table-cell">メーカー</TableHead>
                            <TableHead className="text-right hidden lg:table-cell">仕掛中</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map(product => {
                            const status = calculateStockStatus(product, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, incomingMap);
                            // ... (render rows using status object) ...
                            return (
                                <TableRow key={product.id} className={cn(status.isOutOfStock && "bg-red-50")}>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => onToggleFavorite(product.id)}
                                                className="shrink-0 hover:scale-110 transition-transform"
                                                title={isFavorite(product.id) ? "お気に入り解除" : "お気に入り登録"}
                                            >
                                                <Star className={cn("h-4 w-4", isFavorite(product.id) ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600")} />
                                            </button>
                                            <div>
                                                <div className="font-medium">{product.name}</div>
                                                <div className="text-xs text-gray-400">{product.productCode}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <div className="text-sm">{product.weight}kg / {product.shape}</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {status.isRoll ? `${status.currentStock.toLocaleString()}m` : `${status.currentStock.toLocaleString()}枚`}
                                    </TableCell>
                                    <TableCell className="text-right hidden sm:table-cell">
                                        {status.hasAllocation ? <span className="text-blue-600">{status.allocation.bags.toLocaleString()}枚</span> : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className={cn("font-bold", status.isOutOfStock && "text-red-600", status.isLowStock && "text-amber-600")}>
                                            {status.availableStock.toLocaleString()}{status.isRoll ? 'm' : '枚'}
                                        </div>
                                        <StockLevelBar
                                            currentStock={status.availableStock}
                                            threshold={product.minStockAlert || 100}
                                            isOutOfStock={status.isOutOfStock}
                                            isLowStock={status.isLowStock}
                                            compact
                                        />
                                    </TableCell>
                                    <TableCell className="text-right hidden lg:table-cell">
                                        {status.supplierStock > 0 ? `${status.supplierStock.toLocaleString()}` : "-"}
                                    </TableCell>
                                    <TableCell className="text-right hidden lg:table-cell">
                                        {status.wipQuantity > 0 ? `${status.wipQuantity.toLocaleString()}` : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => onAnalyze(product)} title="分析">
                                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(product)}><Pencil className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>

            {editSupplierStock && (
                <SupplierStockDialog
                    open={!!editSupplierStock}
                    onOpenChange={(open) => !open && setEditSupplierStock(null)}
                    product={editSupplierStock}
                    currentStock={calculateStockStatus(editSupplierStock, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, incomingMap).supplierStock}
                    onSuccess={onRefetch}
                />
            )}

            {editWIP && (
                <WIPDialog
                    open={!!editWIP}
                    onOpenChange={(open) => !open && setEditWIP(null)}
                    product={editWIP}
                    onSuccess={onRefetch}
                />
            )}
        </Card>
    );
}

function MobileInventoryList({ products, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, incomingMap, onEdit, onDelete, onRefetch, onAnalyze, onToggleFavorite, isFavorite }: InventoryTableProps) {
    const [editSupplierStock, setEditSupplierStock] = useState<Product | null>(null);
    const [editWIP, setEditWIP] = useState<Product | null>(null);

    if (products.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">該当する商品がありません</div>;
    }

    return (
        <div className="space-y-4">
            {products.map(product => {
                const status = calculateStockStatus(product, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, incomingMap);
                return (
                    <Card key={product.id} className={cn("overflow-hidden", status.isOutOfStock && "border-red-200 bg-red-50/50")}>
                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onToggleFavorite(product.id)}
                                        className="shrink-0 hover:scale-110 transition-transform"
                                        title={isFavorite(product.id) ? "お気に入り解除" : "お気に入り登録"}
                                    >
                                        <Star className={cn("h-5 w-5", isFavorite(product.id) ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600")} />
                                    </button>
                                    <div>
                                        <h3 className="font-bold text-lg">{product.name}</h3>
                                        <p className="text-sm text-muted-foreground">{product.productCode} / {product.janCode}</p>
                                    </div>
                                </div>
                                <div>
                                    {status.isOutOfStock ? (
                                        <Badge variant="destructive">欠品</Badge>
                                    ) : status.isLowStock ? (
                                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">残りわずか</Badge>
                                    ) : (
                                        <Badge variant="secondary">在庫あり</Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-white dark:bg-card p-2 rounded border">
                                    <div className="text-muted-foreground text-xs">有効在庫</div>
                                    <div className={cn("font-bold text-xl", status.isOutOfStock && "text-red-600")}>
                                        {status.availableStock.toLocaleString()}
                                        <span className="text-xs font-normal text-muted-foreground ml-1">{status.isRoll ? 'm' : '枚'}</span>
                                    </div>
                                    <StockLevelBar
                                        currentStock={status.availableStock}
                                        threshold={product.minStockAlert || 100}
                                        isOutOfStock={status.isOutOfStock}
                                        isLowStock={status.isLowStock}
                                    />
                                    {status.isRoll && <div className="text-xs text-muted-foreground mt-1">約{status.availableBags.toLocaleString()}枚</div>}
                                </div>
                                <div className="bg-white dark:bg-card p-2 rounded border">
                                    <div className="text-muted-foreground text-xs">実在庫</div>
                                    <div className="font-bold text-lg">{status.currentStock.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">{status.isRoll ? 'm' : '枚'}</span></div>
                                    {status.hasAllocation && (
                                        <div className="text-xs text-blue-600">引当: {status.allocation.bags.toLocaleString()}枚</div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 text-xs">
                                <div className="flex-1 bg-slate-50 p-2 rounded">
                                    <span className="text-muted-foreground block">メーカー在庫</span>
                                    <span className="font-medium">{status.supplierStock > 0 ? status.supplierStock.toLocaleString() : '-'}</span>
                                </div>
                                <div className="flex-1 bg-slate-50 p-2 rounded">
                                    <span className="text-muted-foreground block">加工中</span>
                                    <span className="font-medium">{status.wipQuantity > 0 ? status.wipQuantity.toLocaleString() : '-'}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                <Button variant="ghost" size="sm" onClick={() => onAnalyze(product)}>
                                    <BarChart3 className="h-4 w-4 mr-1" /> 分析
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditSupplierStock(product)}>
                                    <Package className="h-4 w-4 mr-1" /> メーカー
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditWIP(product)}>
                                    <TrendingUp className="h-4 w-4 mr-1" /> 加工
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
                                    <Pencil className="h-4 w-4 mr-1" /> 編集
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            {editSupplierStock && (
                <SupplierStockDialog
                    open={!!editSupplierStock}
                    onOpenChange={(open) => !open && setEditSupplierStock(null)}
                    product={editSupplierStock}
                    currentStock={calculateStockStatus(editSupplierStock, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, incomingMap).supplierStock}
                    onSuccess={onRefetch}
                />
            )}

            {editWIP && (
                <WIPDialog
                    open={!!editWIP}
                    onOpenChange={(open) => !open && setEditWIP(null)}
                    product={editWIP}
                    onSuccess={onRefetch}
                />
            )}
        </div>
    );
}
