"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    Search,
    X,
    Filter,
    Check,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Box,
    TrendingDown,
    AlertTriangle
} from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useProducts, useInventory } from "@/hooks/use-supabase-data";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import type { Product } from "@/types";
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog";

export default function OthersInventoryPage(): React.ReactElement {
    const [searchQuery, setSearchQuery] = useState("");
    const [stockFilter, setStockFilter] = useState("all");

    // Supabase APIから商品と在庫を取得
    const { products: allProducts, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();
    const { inventory: inventoryData, loading: inventoryLoading, refetch: refetchInventory } = useInventory();

    const loading = productsLoading || inventoryLoading;
    const error = productsError;

    // その他カテゴリのみをフィルタ
    const otherProducts = useMemo(() =>
        allProducts.filter(p => p.category === 'other'),
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

    const refetch = (): void => {
        refetchProducts();
        refetchInventory();
    };

    // 商品フォームダイアログの状態
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const handleAddProduct = (): void => {
        setEditingProduct(null);
        setFormDialogOpen(true);
    };

    const handleEditProduct = (product: Product): void => {
        setEditingProduct(product);
        setFormDialogOpen(true);
    };

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
        let products = otherProducts;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.janCode?.toLowerCase().includes(query) ||
                p.id.includes(query) ||
                p.sku?.toLowerCase().includes(query)
            );
        }

        if (stockFilter === "low") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const minAlert = p.minStockAlert || 100;
                return qty > 0 && qty < minAlert;
            });
        } else if (stockFilter === "out") {
            products = products.filter(p => (inventoryMap.get(p.id)?.quantity || 0) <= 0);
        }

        return products;
    }, [otherProducts, searchQuery, stockFilter, inventoryMap]);

    // サマリー計算
    const summary = useMemo(() => {
        let lowStock = 0;
        let outOfStock = 0;

        otherProducts.forEach(p => {
            const qty = inventoryMap.get(p.id)?.quantity || 0;
            const minAlert = p.minStockAlert || 100;
            if (qty <= 0) outOfStock++;
            else if (qty < minAlert) lowStock++;
        });

        return { total: otherProducts.length, lowStock, outOfStock };
    }, [otherProducts, inventoryMap]);

    const hasActiveFilters = searchQuery || stockFilter !== "all";

    const clearFilters = (): void => {
        setSearchQuery("");
        setStockFilter("all");
    };

    // 初回ロード時のみローディング表示（データがある場合は更新中も表示し続ける）
    if (loading && otherProducts.length === 0) {
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">その他在庫管理</h1>
                    <p className="text-muted-foreground">その他資材の在庫を確認・管理します</p>
                </div>
                <Button onClick={handleAddProduct} className="gap-2">
                    <Plus className="h-4 w-4" />
                    商品追加
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Box className="h-4 w-4" />
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
            </div>

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
                            {stockFilter !== "all" && (
                                <Badge variant="secondary">{stockFilter === "low" ? "低在庫" : "欠品"}</Badge>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>その他在庫状況 ({filteredProducts.length}件)</CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">該当する商品がありません</div>
                    ) : (
                        <OthersInventoryTable
                            products={filteredProducts}
                            inventoryMap={inventoryMap}
                            onEdit={handleEditProduct}
                            onDelete={handleDeleteProduct}
                            onRefetch={refetch}
                        />
                    )}
                </CardContent>
            </Card>

            <ProductFormDialog
                open={formDialogOpen}
                onOpenChange={setFormDialogOpen}
                product={editingProduct}
                onSuccess={refetch}
            />
        </div>
    );
}

type OthersInventoryTableProps = {
    products: Product[];
    inventoryMap: Map<string, { quantity: number; updatedAt?: string }>;
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => Promise<void>;
    onRefetch: () => void;
};

function OthersInventoryTable({ products, inventoryMap, onEdit, onDelete, onRefetch }: OthersInventoryTableProps): React.ReactElement {
    const { addToCart, items } = useCart();
    const [adjustStock, setAdjustStock] = useState<Product | null>(null);

    return (
        <Card>
            <CardHeader>
                <CardTitle>その他在庫状況 ({products.length}件)</CardTitle>
            </CardHeader>
            <CardContent>
                {products.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">該当する商品がありません</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>商品情報</TableHead>
                                <TableHead className="text-right">現在庫</TableHead>
                                <TableHead className="text-right">発注点</TableHead>
                                <TableHead className="text-center">状態</TableHead>
                                <TableHead className="w-[100px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => {
                                const inventoryItem = inventoryMap.get(product.id) || { quantity: 0 };
                                const currentStock = inventoryItem.quantity;
                                const updatedAt = inventoryItem.updatedAt;
                                const minAlert = product.minStockAlert || 100;
                                const isOutOfStock = currentStock <= 0;
                                const isLowStock = currentStock > 0 && currentStock < minAlert;
                                const isInCart = items.some(item => item.product.id === product.id);

                                return (
                                    <TableRow key={product.id} className={cn(isOutOfStock && "bg-red-50")}>
                                        <TableCell>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-sm text-gray-500">受注№: {product.sku || '-'}</div>
                                            {product.productCode && <div className="text-sm text-gray-500">商品コード: {product.productCode}</div>}
                                        </TableCell>
                                        <TableCell
                                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors group relative"
                                            onClick={() => setAdjustStock(product)}
                                        >
                                            <div className={cn(
                                                "font-bold text-lg flex items-center justify-end gap-1",
                                                isOutOfStock && "text-red-600",
                                                isLowStock && "text-amber-600"
                                            )}>
                                                {currentStock.toLocaleString()}
                                                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                            </div>
                                            {updatedAt && (
                                                <div className="text-[10px] text-gray-400 clear-both pt-1">
                                                    {new Date(updatedAt).toLocaleDateString()}{" "}
                                                    {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {minAlert.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isOutOfStock ? (
                                                <Badge variant="destructive">欠品</Badge>
                                            ) : isLowStock ? (
                                                <Badge variant="outline" className="border-amber-500 text-amber-600">低在庫</Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-green-500 text-green-600">正常</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant={isInCart ? "secondary" : "outline"}
                                                    onClick={() => addToCart(product, 1)}
                                                    disabled={isOutOfStock}
                                                >
                                                    {isInCart ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => onEdit(product)}>
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => onDelete(product.id)} className="text-red-500">
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

            <StockAdjustmentDialog
                product={adjustStock}
                open={!!adjustStock}
                onOpenChange={(open) => !open && setAdjustStock(null)}
                currentStock={adjustStock ? (inventoryMap.get(adjustStock.id)?.quantity || 0) : 0}
                onSuccess={onRefetch}
            />
        </Card>
    );
}
