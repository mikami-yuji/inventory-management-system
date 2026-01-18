"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { Search, X, Filter, ShoppingCart, Check, Loader2, Plus, Pencil, Trash2, BarChart3 } from "lucide-react";
import {
    inventoryService,
    getPitch,
    isRollBag,
    getApproxBagCount
} from "@/lib/services";
import { useCart } from "@/contexts/cart-context";
import { useProducts } from "@/hooks/use-supabase-data";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { ProductAnalysisDialog } from "@/components/inventory/product-analysis-dialog";
import type { Product } from "@/types";

export default function InventoryPage(): React.ReactElement {
    const [currentTab, setCurrentTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [weightFilter, setWeightFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");

    // Supabase APIから商品を取得
    const { products: allProducts, loading, error, refetch } = useProducts();

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

        // 在庫フィルター
        if (stockFilter === "low") {
            products = products.filter(p => {
                const qty = inventoryService.getInventoryCount(p.id);
                return qty > 0 && qty < 50;
            });
        } else if (stockFilter === "out") {
            products = products.filter(p => {
                const qty = inventoryService.getInventoryCount(p.id);
                return qty === 0;
            });
        }

        return products;
    }, [allProducts, currentTab, searchQuery, weightFilter, stockFilter]);

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
                                <Badge variant="secondary">検索: "{searchQuery}"</Badge>
                            )}
                            {weightFilter !== "all" && (
                                <Badge variant="secondary">{weightFilter}kg</Badge>
                            )}
                            {stockFilter !== "all" && (
                                <Badge variant="secondary">
                                    {stockFilter === "low" ? "低在庫" : "欠品"}
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
                    <InventoryTable products={filteredProducts} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
                </TabsContent>
                <TabsContent value="bag" className="mt-4">
                    <InventoryTable products={filteredProducts} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
                </TabsContent>
                <TabsContent value="sticker" className="mt-4">
                    <InventoryTable products={filteredProducts} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
                </TabsContent>
                <TabsContent value="other" className="mt-4">
                    <InventoryTable products={filteredProducts} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
                </TabsContent>
                <TabsContent value="new_rice" className="mt-4">
                    <InventoryTable products={filteredProducts} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
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
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => Promise<void>;
};

function InventoryTable({ products, onEdit, onDelete }: InventoryTableProps): React.ReactElement {
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
                                <TableHead className="w-[80px]">画像</TableHead>
                                <TableHead>商品情報</TableHead>
                                <TableHead>スペック</TableHead>
                                <TableHead className="text-right">単価 (円)</TableHead>
                                <TableHead className="text-right">現在庫</TableHead>
                                <TableHead>入荷予定</TableHead>
                                <TableHead className="w-[100px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => {
                                // サービスから在庫情報を取得
                                const quantity = inventoryService.getInventoryCount(product.id);
                                const incomingInfo = inventoryService.getIncomingInfo(product.id);
                                const isLowStock = quantity < 50;
                                const isOutOfStock = quantity === 0;

                                return (
                                    <TableRow key={product.id} className={cn(isOutOfStock && "bg-red-50")}>
                                        <TableCell>
                                            <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-400">
                                                {product.imageUrl ? "Img" : "No Img"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-sm text-gray-500">JAN: {product.janCode || '-'}</div>
                                            <div className="text-xs text-gray-400">{product.id}</div>
                                            {product.category !== 'bag' && <Badge variant="outline" className="mt-1 text-xs">{product.category}</Badge>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {(product.category === 'bag' || product.category === 'new_rice') ? (
                                                    <>
                                                        <span className="font-medium">{product.weight}kg</span> / {product.shape}
                                                        {product.shape && isRollBag(product.shape) && (
                                                            <div className="text-xs text-blue-600 mt-1">
                                                                ロール袋 (ピッチ: {getPitch(product.weight || 0)}mm)
                                                                <br />
                                                                約{getApproxBagCount(product.weight || 0).toLocaleString()}枚/ロール
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </div>
                                            <div className="flex items-center mt-2">
                                                <ProductAnalysisDialog
                                                    product={product}
                                                    currentStock={quantity}
                                                    trigger={
                                                        <Button variant="ghost" size="sm">
                                                            <BarChart3 className="h-4 w-4 mr-1" />
                                                            分析
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                {product.category === 'bag' ? '米袋' :
                                                    product.category === 'sticker' ? 'シール' : 'その他'}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                                {product.material}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-medium">@{product.unitPrice}</div>
                                            {product.printingCost > 0 && (
                                                <div className="text-xs text-gray-500">+印 {product.printingCost}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={cn(
                                                "font-bold text-lg",
                                                isOutOfStock && "text-red-700",
                                                isLowStock && !isOutOfStock && "text-amber-600"
                                            )}>
                                                {quantity.toLocaleString()}
                                            </span>
                                            {isOutOfStock && <span className="text-xs text-red-600 block font-medium">欠品</span>}
                                            {isLowStock && !isOutOfStock && <span className="text-xs text-amber-600 block">残りわずか</span>}
                                        </TableCell>
                                        <TableCell>
                                            {incomingInfo ? (
                                                <span className="text-sm text-emerald-600 font-medium">
                                                    {incomingInfo}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
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

