"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Search,
    X,
    Filter,
    Loader2,
    Plus,
    Package,
    TrendingDown,
    Calendar,
    AlertTriangle
} from "lucide-react";
import {
    getPitch,
} from "@/lib/services";
import { useProducts, useInventory } from "@/hooks/use-supabase-data";
import { useSaleEvents } from "@/hooks/use-sale-events";
import { useWorkInProgress, calculateWIPByProduct } from "@/hooks/use-work-in-progress";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import type { Product } from "@/types";
import { BagsInventoryTable } from "@/components/inventory/bags-inventory-table";

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

// 枚数からメートルに変換
const bagsToMeters = (bags: number, weight: number): number => {
    const pitch = getPitch(weight);
    return (bags * pitch) / 1000;
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
    const [searchQuery, setSearchQuery] = useState("");
    const [weightFilter, setWeightFilter] = useState("all");
    const [shapeFilter, setShapeFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");

    // Supabase APIから商品と在庫を取得
    const { products: allProducts, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();
    const { inventory: inventoryData, loading: inventoryLoading, refetch: refetchInventory } = useInventory();
    const { events: saleEvents, loading: eventsLoading } = useSaleEvents();
    const { items: wipItems, loading: wipLoading, refetch: refetchWIP } = useWorkInProgress({ status: 'in_progress' });

    const loading = productsLoading || inventoryLoading || eventsLoading || wipLoading;
    const error = productsError;

    // 米袋カテゴリのみをフィルタ (bag + new_rice)
    const bagProducts = useMemo(() =>
        allProducts.filter(p => p.category === 'bag' || p.category === 'new_rice'),
        [allProducts]
    );

    // 在庫マップを作成
    const inventoryMap = useMemo(() => {
        const map = new Map<string, number>();
        inventoryData?.forEach(item => {
            map.set(item.productId, item.quantity);
        });
        return map;
    }, [inventoryData]);

    // 特売引当マップを作成
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

    // 仕掛中マップを作成
    const wipMap = useMemo(() => calculateWIPByProduct(wipItems), [wipItems]);

    // メーカー在庫マップを作成
    const supplierStockMap = useMemo(() => {
        const map = new Map<string, number>();
        allProducts.forEach(product => {
            const supplierStock = (product as unknown as { supplier_stock?: number }).supplier_stock || 0;
            map.set(product.id, supplierStock);
        });
        return map;
    }, [allProducts]);

    // 入荷予定マップ
    const incomingMap = useMemo(() => new Map<string, { quantity: number; nextDate: string | null }>(), []);

    const refetch = (): void => {
        refetchProducts();
        refetchInventory();
        refetchWIP();
    };

    // 商品フォームダイアログの状態
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // 削除確認ダイアログの状態
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    const handleAddProduct = (): void => {
        setEditingProduct(null);
        setFormDialogOpen(true);
    };

    const handleEditProduct = (product: Product): void => {
        setEditingProduct(product);
        setFormDialogOpen(true);
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

    // 利用可能な形状リストを取得
    const availableShapes = useMemo(() => {
        const shapes = new Set(bagProducts.map(p => p.shape).filter(Boolean));
        return Array.from(shapes) as string[];
    }, [bagProducts]);

    // フィルタリングされた商品
    const filteredProducts = useMemo(() => {
        let products = bagProducts;

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

        // 形状フィルター
        if (shapeFilter !== "all") {
            products = products.filter(p => p.shape === shapeFilter);
        }

        // 在庫フィルター
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
                return qty - allocated <= 0;
            });
        } else if (stockFilter === "reserved") {
            products = products.filter(p => (saleAllocationMap.get(p.id)?.bags || 0) > 0);
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
    }, [bagProducts, searchQuery, weightFilter, shapeFilter, stockFilter, inventoryMap, saleAllocationMap]);

    // サマリー計算
    const summary = useMemo(() => {
        let lowStock = 0;
        let outOfStock = 0;
        let hasReservation = 0;

        bagProducts.forEach(p => {
            const qty = inventoryMap.get(p.id) || 0;
            const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
            const available = qty - allocation.meters;
            // minStockAlertを使って低在庫判定（設定がない場合はデフォルト100）
            const alertThreshold = p.minStockAlert || 100;

            if (available <= 0) outOfStock++;
            else if (available <= alertThreshold) lowStock++;
            if (allocation.bags > 0) hasReservation++;
        });

        return { total: bagProducts.length, lowStock, outOfStock, hasReservation };
    }, [bagProducts, inventoryMap, saleAllocationMap]);

    const hasActiveFilters = searchQuery || weightFilter !== "all" || shapeFilter !== "all" || stockFilter !== "all";

    const clearFilters = (): void => {
        setSearchQuery("");
        setWeightFilter("all");
        setShapeFilter("all");
        setStockFilter("all");
    };

    if (loading) {
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
        <div className="space-y-6 p-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">米袋在庫管理</h1>
                    <p className="text-muted-foreground">米袋・新米関連商品の在庫を確認・管理します</p>
                </div>
                <Button onClick={handleAddProduct} className="gap-2">
                    <Plus className="h-4 w-4" />
                    商品追加
                </Button>
            </div>

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
                        <div className="text-2xl font-bold">{summary.total}</div>
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

                        <div className="w-full md:w-32">
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

                        <div className="w-full md:w-40">
                            <label className="text-sm font-medium mb-2 block">形状</label>
                            <Select value={shapeFilter} onValueChange={setShapeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="すべて" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべて</SelectItem>
                                    {availableShapes.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-full md:w-40">
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

                        {hasActiveFilters && (
                            <Button variant="outline" onClick={clearFilters} className="gap-2">
                                <X className="h-4 w-4" />
                                クリア
                            </Button>
                        )}
                    </div>

                    {hasActiveFilters && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Filter className="h-4 w-4" />
                            <span>フィルター適用中:</span>
                            {searchQuery && <Badge variant="secondary">検索: &quot;{searchQuery}&quot;</Badge>}
                            {weightFilter !== "all" && <Badge variant="secondary">{weightFilter}kg</Badge>}
                            {shapeFilter !== "all" && <Badge variant="secondary">{shapeFilter}</Badge>}
                            {stockFilter !== "all" && (
                                <Badge variant="secondary">
                                    {stockFilter === "low" ? "低在庫" : stockFilter === "out" ? "欠品" : "特売引当あり"}
                                </Badge>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 在庫テーブル */}
            <BagsInventoryTable
                products={filteredProducts}
                inventoryMap={inventoryMap}
                saleAllocationMap={saleAllocationMap}
                wipMap={wipMap}
                supplierStockMap={supplierStockMap}
                incomingMap={incomingMap}
                onEdit={handleEditProduct}
                onDelete={handleDeleteClick}
                onRefetch={refetch}
            />

            {/* 商品フォームダイアログ */}
            <ProductFormDialog
                open={formDialogOpen}
                onOpenChange={setFormDialogOpen}
                product={editingProduct}
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
        </div>
    );
}
