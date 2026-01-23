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
    AlertTriangle
} from "lucide-react";
import {
    inventoryService,
    getPitch,
    isRollBag,
    getApproxBagCount
} from "@/lib/services";
import { useCart } from "@/contexts/cart-context";
import { useProducts, useInventory } from "@/hooks/use-supabase-data";
import { useSaleEvents } from "@/hooks/use-sale-events";
import { useWorkInProgress, calculateWIPByProduct, useWIPActions } from "@/hooks/use-work-in-progress";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { ProductAnalysisDialog } from "@/components/inventory/product-analysis-dialog";
import type { Product } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { SupplierStockDialog } from "@/components/inventory/supplier-stock-dialog";
import { WIPDialog } from "@/components/inventory/wip-dialog";

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

export default function InventoryPage(): React.ReactElement {
    const [currentTab, setCurrentTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [weightFilter, setWeightFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");

    // Supabase APIから商品と在庫を取得
    const { products: allProducts, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();
    const { inventory: inventoryData, loading: inventoryLoading, refetch: refetchInventory } = useInventory();
    const { events: saleEvents, loading: eventsLoading } = useSaleEvents();
    const { items: wipItems, loading: wipLoading, refetch: refetchWIP } = useWorkInProgress({ status: 'in_progress' });

    const loading = productsLoading || inventoryLoading || eventsLoading || wipLoading;
    const error = productsError;

    // 在庫マップを作成 (productId -> quantity in meters)
    const inventoryMap = useMemo(() => {
        const map = new Map<string, number>();
        inventoryData?.forEach(item => {
            map.set(item.productId, item.quantity);
        });
        return map;
    }, [inventoryData]);

    // 特売引当マップを作成 (productId -> { allocatedBags, allocatedMeters })
    const saleAllocationMap = useMemo(() => {
        const map = new Map<string, { bags: number; meters: number }>();

        saleEvents
            .filter(e => e.status === 'upcoming' || e.status === 'active')
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

    // 仕掛中マップを作成 (productId -> quantity)
    const wipMap = useMemo(() => calculateWIPByProduct(wipItems), [wipItems]);

    // メーカー在庫マップを作成 (productId -> supplierStock)
    const supplierStockMap = useMemo(() => {
        const map = new Map<string, number>();
        allProducts.forEach(product => {
            // supplier_stock カラムがあれば使う（型拡張が必要な場合は後で対応）
            const supplierStock = (product as unknown as { supplier_stock?: number }).supplier_stock || 0;
            map.set(product.id, supplierStock);
        });
        return map;
    }, [allProducts]);

    // 入荷予定マップを作成 (productId -> { quantity, nextDate })
    const incomingMap = useMemo(() => {
        const map = new Map<string, { quantity: number; nextDate: string | null }>();
        // TODO: incoming_stockテーブルからデータを取得
        return map;
    }, []);

    const refetch = (): void => {
        refetchProducts();
        refetchInventory();
        refetchWIP();
    };

    // 商品フォームダイアログの状態
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // 商品追加ハンドラ
    const handleAddProduct = (): void => {
        setEditingProduct(null);
        setFormDialogOpen(true);
    };

    // 商品編集ハンドラ
    const handleEditProduct = (product: Product): void => {
        setEditingProduct(product);
        setFormDialogOpen(true);
    };

    // 商品削除ハンドラ
    const handleDeleteProduct = async (productId: string): Promise<void> => {
        if (!confirm("この商品を削除しますか？")) return;
        try {
            const response = await fetch(`/api/products?id=${productId}`, { method: "DELETE" });
            if (response.ok) {
                refetch();
            } else {
                const result = await response.json();
                alert(result.error || "削除に失敗しました");
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("削除中にエラーが発生しました");
        }
    };

    // フィルタリングされた商品
    const filteredProducts = useMemo(() => {
        let products = currentTab === "all"
            ? allProducts
            : allProducts.filter(p => p.category === currentTab);

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

        // 在庫フィルター（有効在庫ベース）
        if (stockFilter === "low") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id) || 0;
                const allocated = saleAllocationMap.get(p.id)?.meters || 0;
                const available = qty - allocated;
                return available > 0 && available < 50;
            });
        } else if (stockFilter === "out") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id) || 0;
                const allocated = saleAllocationMap.get(p.id)?.meters || 0;
                const available = qty - allocated;
                return available <= 0;
            });
        } else if (stockFilter === "reserved") {
            products = products.filter(p => {
                const allocated = saleAllocationMap.get(p.id);
                return allocated && allocated.bags > 0;
            });
        }

        return products;
    }, [allProducts, currentTab, searchQuery, weightFilter, stockFilter, inventoryMap, saleAllocationMap]);

    // ユニークな重量リスト
    const availableWeights = useMemo(() => {
        const weights = [...new Set(allProducts.map(p => p.weight).filter(Boolean))] as number[];
        return weights.sort((a, b) => a - b);
    }, [allProducts]);

    // フィルターをクリア
    const clearFilters = (): void => {
        setSearchQuery("");
        setWeightFilter("all");
        setStockFilter("all");
    };

    const hasActiveFilters = searchQuery || weightFilter !== "all" || stockFilter !== "all";

    // サマリー統計
    const summary = useMemo(() => {
        const totalProducts = allProducts.length;
        const outOfStock = allProducts.filter(p => {
            const qty = inventoryMap.get(p.id) || 0;
            const allocated = saleAllocationMap.get(p.id)?.meters || 0;
            return (qty - allocated) <= 0;
        }).length;
        const lowStock = allProducts.filter(p => {
            const qty = inventoryMap.get(p.id) || 0;
            const allocated = saleAllocationMap.get(p.id)?.meters || 0;
            const available = qty - allocated;
            return available > 0 && available < 50;
        }).length;
        const hasReservation = allProducts.filter(p => {
            const allocated = saleAllocationMap.get(p.id);
            return allocated && allocated.bags > 0;
        }).length;

        return { totalProducts, outOfStock, lowStock, hasReservation };
    }, [allProducts, inventoryMap, saleAllocationMap]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">在庫一覧</h2>
                <div className="flex items-center gap-3">
                    {loading && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            読み込み中...
                        </div>
                    )}
                    <Button onClick={handleAddProduct} className="gap-2">
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

            {/* サマリーカード */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            総商品数
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalProducts}</div>
                    </CardContent>
                </Card>
                <Card className="border-red-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                            <TrendingDown className="h-4 w-4" />
                            欠品
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{summary.outOfStock}</div>
                    </CardContent>
                </Card>
                <Card className="border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            低在庫
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{summary.lowStock}</div>
                    </CardContent>
                </Card>
                <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            特売引当中
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{summary.hasReservation}</div>
                    </CardContent>
                </Card>
            </div>

            {/* 検索・フィルターエリア */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end">
                        {/* 検索入力 */}
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">商品検索</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="商品名、JANコード、商品IDで検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* 重量フィルター */}
                        <div className="w-full md:w-40">
                            <label className="text-sm font-medium mb-2 block">重量</label>
                            <Select value={weightFilter} onValueChange={setWeightFilter}>
                                <SelectTrigger>
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
                        <div className="w-full md:w-48">
                            <label className="text-sm font-medium mb-2 block">在庫状態</label>
                            <Select value={stockFilter} onValueChange={setStockFilter}>
                                <SelectTrigger>
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
                            <Button variant="outline" onClick={clearFilters} className="gap-2">
                                <X className="h-4 w-4" />
                                クリア
                            </Button>
                        )}
                    </div>

                    {/* アクティブフィルター表示 */}
                    {hasActiveFilters && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Filter className="h-4 w-4" />
                            <span>フィルター適用中:</span>
                            {searchQuery && (
                                <Badge variant="secondary">検索: &quot;{searchQuery}&quot;</Badge>
                            )}
                            {weightFilter !== "all" && (
                                <Badge variant="secondary">{weightFilter}kg</Badge>
                            )}
                            {stockFilter !== "all" && (
                                <Badge variant="secondary">
                                    {stockFilter === "low" ? "低在庫" : stockFilter === "out" ? "欠品" : "特売引当あり"}
                                </Badge>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* カテゴリタブ */}
            <Tabs defaultValue="all" onValueChange={setCurrentTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="all">すべて</TabsTrigger>
                    <TabsTrigger value="new_rice">新米</TabsTrigger>
                    <TabsTrigger value="bag">米袋</TabsTrigger>
                    <TabsTrigger value="sticker">シール</TabsTrigger>
                    <TabsTrigger value="other">その他</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <InventoryTable
                        products={filteredProducts}
                        inventoryMap={inventoryMap}
                        saleAllocationMap={saleAllocationMap}
                        wipMap={wipMap}
                        supplierStockMap={supplierStockMap}
                        incomingMap={incomingMap}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onRefetch={refetch}
                    />
                </TabsContent>
                <TabsContent value="bag" className="mt-4">
                    <InventoryTable
                        products={filteredProducts}
                        inventoryMap={inventoryMap}
                        saleAllocationMap={saleAllocationMap}
                        wipMap={wipMap}
                        supplierStockMap={supplierStockMap}
                        incomingMap={incomingMap}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onRefetch={refetch}
                    />
                </TabsContent>
                <TabsContent value="sticker" className="mt-4">
                    <InventoryTable
                        products={filteredProducts}
                        inventoryMap={inventoryMap}
                        saleAllocationMap={saleAllocationMap}
                        wipMap={wipMap}
                        supplierStockMap={supplierStockMap}
                        incomingMap={incomingMap}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onRefetch={refetch}
                    />
                </TabsContent>
                <TabsContent value="other" className="mt-4">
                    <InventoryTable
                        products={filteredProducts}
                        inventoryMap={inventoryMap}
                        saleAllocationMap={saleAllocationMap}
                        wipMap={wipMap}
                        supplierStockMap={supplierStockMap}
                        incomingMap={incomingMap}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onRefetch={refetch}
                    />
                </TabsContent>
                <TabsContent value="new_rice" className="mt-4">
                    <InventoryTable
                        products={filteredProducts}
                        inventoryMap={inventoryMap}
                        saleAllocationMap={saleAllocationMap}
                        wipMap={wipMap}
                        supplierStockMap={supplierStockMap}
                        incomingMap={incomingMap}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onRefetch={refetch}
                    />
                </TabsContent>
            </Tabs>

            {/* 商品フォームダイアログ */}
            <ProductFormDialog
                open={formDialogOpen}
                onOpenChange={setFormDialogOpen}
                product={editingProduct}
                onSuccess={refetch}
            />
        </div>
    );
}

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
};

function InventoryTable({ products, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, incomingMap, onEdit, onDelete, onRefetch }: InventoryTableProps): React.ReactElement {
    const [editSupplierStock, setEditSupplierStock] = useState<Product | null>(null);
    const [editWIP, setEditWIP] = useState<Product | null>(null);

    return (
        <Card>
            <CardHeader>
                <CardTitle>商品在庫状況 ({products.length}件)</CardTitle>
            </CardHeader>
            <CardContent>
                {products.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        該当する商品がありません
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>商品情報</TableHead>
                                <TableHead>スペック</TableHead>
                                <TableHead className="text-right">現在庫</TableHead>
                                <TableHead className="text-right">特売引当</TableHead>
                                <TableHead className="text-right">有効在庫</TableHead>
                                <TableHead className="text-right">メーカー在庫</TableHead>
                                <TableHead className="text-right">仕掛中</TableHead>
                                <TableHead className="text-right">入荷予定</TableHead>
                                <TableHead className="text-center">状態</TableHead>
                                <TableHead className="w-[100px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => {
                                // 在庫情報を取得
                                const currentStock = inventoryMap.get(product.id) || 0;
                                const allocation = saleAllocationMap.get(product.id) || { bags: 0, meters: 0 };
                                const incoming = incomingMap.get(product.id);
                                const wipQuantity = wipMap.get(product.id) || 0;
                                const supplierStock = supplierStockMap.get(product.id) || 0;

                                // ロール袋かどうか判定
                                const isRoll = product.shape && isRollBag(product.shape);

                                // 単袋の場合：在庫は枚数、特売引当も枚数
                                // ロール袋の場合：在庫はメートル、特売引当は枚数→メートル換算
                                let availableStock: number;
                                let currentBags: number;
                                let availableBags: number;

                                if (isRoll) {
                                    // ロール袋: 在庫はメートル
                                    availableStock = Math.max(0, currentStock - allocation.meters);
                                    currentBags = metersToBags(currentStock, product.weight || 5);
                                    availableBags = metersToBags(availableStock, product.weight || 5);
                                } else {
                                    // 単袋: 在庫は枚数
                                    availableStock = Math.max(0, currentStock - allocation.bags);
                                    currentBags = currentStock;
                                    availableBags = availableStock;
                                }

                                // ステータス判定
                                const isOutOfStock = availableStock <= 0;
                                const isLowStock = isRoll
                                    ? (availableStock > 0 && availableStock < 50)  // ロール: 50m未満
                                    : (availableStock > 0 && availableStock < 100); // 単袋: 100枚未満
                                const hasAllocation = allocation.bags > 0;

                                return (
                                    <TableRow key={product.id} className={cn(isOutOfStock && "bg-red-50")}>
                                        <TableCell>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-sm text-gray-500">商品CD: {product.sku || '-'}</div>
                                            <div className="text-xs text-gray-400">JAN: {product.janCode || '-'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {(product.category === 'bag' || product.category === 'new_rice') ? (
                                                    <>
                                                        <span className="font-medium">{product.weight}kg</span> / {product.shape}
                                                        {product.shape && isRollBag(product.shape) && (
                                                            <div className="text-xs text-blue-600 mt-1">
                                                                ピッチ: {getPitch(product.weight || 0)}mm
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isRoll ? (
                                                <>
                                                    <div className="font-bold text-lg">
                                                        {currentStock.toLocaleString()}m
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        約{currentBags.toLocaleString()}枚
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="font-bold text-lg">
                                                    {currentStock.toLocaleString()}枚
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {hasAllocation ? (
                                                <div className="text-blue-600">
                                                    <div className="font-medium">
                                                        {allocation.bags.toLocaleString()}本
                                                    </div>
                                                    {isRoll && (
                                                        <div className="text-xs">
                                                            ({allocation.meters.toFixed(1)}m)
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isRoll ? (
                                                <>
                                                    <div className={cn(
                                                        "font-bold text-lg",
                                                        isOutOfStock && "text-red-600",
                                                        isLowStock && "text-amber-600"
                                                    )}>
                                                        {availableStock.toLocaleString()}m
                                                    </div>
                                                    <div className={cn(
                                                        "text-xs",
                                                        isOutOfStock && "text-red-500",
                                                        isLowStock && "text-amber-500"
                                                    )}>
                                                        約{availableBags.toLocaleString()}枚
                                                    </div>
                                                </>
                                            ) : (
                                                <div className={cn(
                                                    "font-bold text-lg",
                                                    isOutOfStock && "text-red-600",
                                                    isLowStock && "text-amber-600"
                                                )}>
                                                    {availableStock.toLocaleString()}枚
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors group relative"
                                            onClick={() => setEditSupplierStock(product)}
                                        >
                                            {supplierStock > 0 ? (
                                                <div className="text-orange-600">
                                                    <div className="font-medium">
                                                        {supplierStock.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                    </div>
                                                    <div className="text-xs">メーカー</div>
                                                </div>
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-end">
                                                    <span className="text-muted-foreground group-hover:hidden">-</span>
                                                    <Pencil className="h-3 w-3 text-muted-foreground hidden group-hover:block" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors group relative"
                                            onClick={() => setEditWIP(product)}
                                        >
                                            {wipQuantity > 0 ? (
                                                <div className="text-purple-600">
                                                    <div className="font-medium">
                                                        {wipQuantity.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                    </div>
                                                    <div className="text-xs">加工中</div>
                                                </div>
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-end">
                                                    <span className="text-muted-foreground group-hover:hidden">-</span>
                                                    <Plus className="h-3 w-3 text-muted-foreground hidden group-hover:block" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {incoming ? (
                                                <div className="text-emerald-600">
                                                    <div className="font-medium">
                                                        {incoming.quantity.toLocaleString()}m
                                                    </div>
                                                    {incoming.nextDate && (
                                                        <div className="text-xs">
                                                            {incoming.nextDate}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isOutOfStock ? (
                                                <Badge variant="destructive">欠品</Badge>
                                            ) : isLowStock ? (
                                                <Badge variant="outline" className="border-amber-500 text-amber-600">
                                                    低在庫
                                                </Badge>
                                            ) : hasAllocation ? (
                                                <Badge variant="outline" className="border-blue-500 text-blue-600">
                                                    引当中
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-green-500 text-green-600">
                                                    正常
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <AddToCartButton product={product} disabled={isOutOfStock} />
                                                <Button size="sm" variant="ghost" onClick={() => onEdit(product)} title="編集">
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => onDelete(product.id)} title="削除" className="text-red-500 hover:text-red-600">
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <SupplierStockDialog
                product={editSupplierStock}
                open={!!editSupplierStock}
                onOpenChange={(open) => !open && setEditSupplierStock(null)}
                currentStock={editSupplierStock ? (supplierStockMap.get(editSupplierStock.id) || 0) : 0}
                onSuccess={onRefetch}
            />

            <WIPDialog
                product={editWIP}
                open={!!editWIP}
                onOpenChange={(open) => !open && setEditWIP(null)}
                onSuccess={onRefetch}
            />
        </Card>
    );
}

// カート追加ボタンコンポーネント
function AddToCartButton({ product, disabled }: { product: Product; disabled: boolean }): React.ReactElement {
    const { addToCart, items } = useCart();
    const [added, setAdded] = useState(false);

    const isInCart = items.some(item => item.product.id === product.id);

    const handleClick = (): void => {
        addToCart(product, 1);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    };

    return (
        <Button
            size="sm"
            variant={isInCart ? "secondary" : "outline"}
            onClick={handleClick}
            disabled={disabled}
            className="gap-1"
        >
            {added ? (
                <><Check className="h-3 w-3" /> 追加済</>
            ) : isInCart ? (
                <><ShoppingCart className="h-3 w-3" /> +1</>
            ) : (
                <><ShoppingCart className="h-3 w-3" /> 追加</>
            )}
        </Button>
    );
}

