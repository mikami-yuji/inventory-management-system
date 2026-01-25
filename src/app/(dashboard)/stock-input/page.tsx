"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Check,
    X,
    Package,
    ArrowLeft,
    Save,
    Undo2,
    ChevronUp,
    ChevronDown,
    BarChart3,
    Loader2,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { StockCheckConfirmation } from "@/components/inventory/stock-check-confirmation";
import { ProductAnalysisDialog } from "@/components/inventory/product-analysis-dialog";
import { useProducts, useInventory, useUpdateInventory } from "@/hooks/use-supabase-data";

// 編集中のアイテム型
type EditingItem = {
    productId: string;
    originalQuantity: number;
    newQuantity: number;
};

export default function StockInputPage(): React.ReactElement {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [editedItems, setEditedItems] = useState<Map<string, EditingItem>>(new Map());
    const [showSaved, setShowSaved] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Supabase Hooks
    const { products: allProducts, loading: productsLoading, refetch: refetchProducts } = useProducts();
    const { inventory, loading: inventoryLoading, refetch: refetchInventory } = useInventory();
    const { updateStock, loading: updateLoading } = useUpdateInventory();

    const isLoading = productsLoading || inventoryLoading;

    // ヘルパー: IDから商品取得
    const getProduct = useCallback((id: string) => {
        return allProducts.find(p => p.id === id);
    }, [allProducts]);

    // ヘルパー: IDから在庫数取得
    const getInventoryCount = useCallback((productId: string) => {
        const item = inventory.find(i => i.productId === productId);
        return item ? item.quantity : 0;
    }, [inventory]);

    // 検索でフィルタ
    const filteredProducts = useMemo(() => {
        // 袋カテゴリのみを表示（シール、その他を除外）
        let targetProducts = allProducts.filter(p => p.category === 'bag' || p.category === 'new_rice');

        // ソート順定義: アメリカ産 -> 既製品 -> その他 (NB)
        const getPriority = (p: Product) => {
            // Priority 1: アメリカ産
            if (p.name.includes('アメリカ') || p.name.includes('米国') || p.name.includes('カルローズ')) {
                return 1;
            }
            // Priority 2: 既製品
            if (p.productType === '既製品') {
                return 2;
            }
            // Priority 3: その他 (NB等)
            return 3;
        };

        targetProducts.sort((a, b) => {
            const priorityA = getPriority(a);
            const priorityB = getPriority(b);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return 0; // 同じ優先度の場合は元の順序を維持
        });

        if (!searchQuery.trim()) return targetProducts.slice(0, 20); // 最初は20件表示
        const query = searchQuery.toLowerCase();
        return targetProducts.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.janCode?.toLowerCase().includes(query) ||
            p.id.includes(query)
        ).slice(0, 50);
    }, [allProducts, searchQuery]);

    // 商品選択
    const handleSelectProduct = useCallback((product: Product): void => {
        setSelectedProduct(product);
        const existing = editedItems.get(product.id);
        if (existing) {
            setInputValue(existing.newQuantity.toString());
        } else {
            const currentQty = getInventoryCount(product.id);
            setInputValue(currentQty.toString());
        }
    }, [editedItems, getInventoryCount]);

    // 数量変更を確定（メモリ上）
    const handleConfirmQuantity = useCallback((): void => {
        if (!selectedProduct) return;
        const newQty = parseInt(inputValue) || 0;
        const originalQty = getInventoryCount(selectedProduct.id);

        const newMap = new Map(editedItems);
        newMap.set(selectedProduct.id, {
            productId: selectedProduct.id,
            originalQuantity: originalQty,
            newQuantity: newQty,
        });
        setEditedItems(newMap);
        setSelectedProduct(null);
        setInputValue("");
    }, [selectedProduct, inputValue, editedItems, getInventoryCount]);

    // 入力キャンセル
    const handleCancel = useCallback((): void => {
        setSelectedProduct(null);
        setInputValue("");
    }, []);

    // テンキー入力
    const handleNumpadInput = useCallback((value: string): void => {
        if (value === "clear") {
            setInputValue("");
        } else if (value === "backspace") {
            setInputValue(prev => prev.slice(0, -1));
        } else {
            setInputValue(prev => prev + value);
        }
    }, []);

    // +10, -10
    const handleAdjust = useCallback((delta: number): void => {
        const current = parseInt(inputValue) || 0;
        const newVal = Math.max(0, current + delta);
        setInputValue(newVal.toString());
    }, [inputValue]);

    // 確認ダイアログ表示
    const handleSaveAll = useCallback((): void => {
        if (editedItems.size === 0) return;
        setShowConfirmation(true);
    }, [editedItems]);

    // 最終確定処理
    const handleFinalConfirm = useCallback(async () => {
        setIsSubmitting(true);
        try {
            // 各アイテムを更新 (順次実行)
            for (const item of Array.from(editedItems.values())) {
                await updateStock(
                    item.productId,
                    item.newQuantity,
                    'adjustment', // 棚卸調整として記録
                    `実在庫入力: 前${item.originalQuantity} -> 後${item.newQuantity}`
                );
            }

            // 最新の在庫情報を再取得
            refetchInventory();

            // UI更新
            setShowConfirmation(false);
            setShowSaved(true);
            setEditedItems(new Map());

            setTimeout(() => {
                setShowSaved(false);
            }, 3000);
        } catch (error) {
            console.error('Save failed:', error);
            alert('保存に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    }, [editedItems, updateStock, refetchInventory]);

    // 編集をリセット
    const handleReset = useCallback((): void => {
        if (window.confirm('入力内容をすべて破棄しますか？')) {
            setEditedItems(new Map());
        }
    }, []);

    // 削除処理
    const handleDelete = useCallback(async (e: React.MouseEvent, product: Product) => {
        e.stopPropagation();
        if (!window.confirm(`「${product.name}」を削除してもよろしいですか？\n※この操作は元に戻せません。`)) {
            return;
        }

        try {
            const response = await fetch(`/api/products?id=${product.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '削除に失敗しました');
            }

            // 成功したらリストを再取得
            await refetchProducts();

            // 編集中のものがあれば削除
            if (editedItems.has(product.id)) {
                const newMap = new Map(editedItems);
                newMap.delete(product.id);
                setEditedItems(newMap);
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('削除に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
        }
    }, [refetchProducts, editedItems]);

    return (
        <div className="space-y-4 pb-20">
            {/* ヘッダー */}
            <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">在庫入力</h2>
                <p className="text-sm text-muted-foreground">商品を選んで在庫数を入力してください</p>
            </div>

            {/* 編集済み件数バー */}
            {editedItems.size > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-lg px-3 py-1">
                                {editedItems.size}
                            </Badge>
                            <span className="text-sm font-medium">件の変更あり</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
                                <Undo2 className="h-4 w-4" />
                                リセット
                            </Button>
                            <Button size="sm" onClick={handleSaveAll} className="gap-1 bg-green-600 hover:bg-green-700">
                                <Save className="h-4 w-4" />
                                保存
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 保存完了メッセージ */}
            {showSaved && (
                <Card className="bg-green-50 border-green-300">
                    <CardContent className="py-4 text-center">
                        <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-green-800 font-medium">保存しました！</p>
                    </CardContent>
                </Card>
            )}

            {/* 商品選択モード */}
            {!selectedProduct ? (
                <>
                    {/* 検索バー - 大きく目立つ */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="商品名 / JANコード / 商品IDで検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 h-14 text-lg"
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                onClick={() => setSearchQuery("")}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    {/* 商品リスト - 大きなカード */}
                    <div className="space-y-2">
                        {isLoading && filteredProducts.length === 0 ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <>
                                {filteredProducts.map(product => {
                                    const currentQty = getInventoryCount(product.id);
                                    const edited = editedItems.get(product.id);
                                    const isEdited = !!edited;
                                    const displayQty = edited ? edited.newQuantity : currentQty;

                                    return (
                                        <Card
                                            key={product.id}
                                            className={cn(
                                                "cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors",
                                                isEdited && "border-blue-400 bg-blue-50"
                                            )}
                                            onClick={() => handleSelectProduct(product)}
                                        >
                                            <CardContent className="py-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-base truncate">
                                                            {product.name}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {product.weight}kg / {product.shape || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 ml-4">
                                                        <div className="text-right">
                                                            <div className={cn(
                                                                "text-2xl font-bold",
                                                                displayQty === 0 && "text-red-600",
                                                                displayQty > 0 && displayQty < 50 && "text-amber-600"
                                                            )}>
                                                                {displayQty}
                                                            </div>
                                                            {isEdited && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    変更済
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div
                                                            className="relative z-50"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                                onClick={(e) => handleDelete(e, product)}
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                                {filteredProducts.length === 0 && (
                                    <Card>
                                        <CardContent className="py-8 text-center text-muted-foreground">
                                            該当する商品がありません
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}
                    </div>
                </>
            ) : (
                /* 数量入力モード */
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {selectedProduct.name}
                                    <ProductAnalysisDialog
                                        product={selectedProduct}
                                        currentStock={getInventoryCount(selectedProduct.id)}
                                        trigger={
                                            <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                                                <BarChart3 className="h-3 w-3 mr-1" />
                                                分析
                                            </Button>
                                        }
                                    />
                                </CardTitle>
                                <CardDescription>
                                    {selectedProduct.weight}kg / {selectedProduct.shape || '-'}
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleCancel}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* 現在の数量表示 */}
                        <div className="text-center">
                            <div className="text-sm text-muted-foreground mb-2">新しい在庫数</div>
                            <div className="text-5xl font-bold tabular-nums">
                                {inputValue || "0"}
                            </div>
                            <div className="text-sm text-muted-foreground mt-2">
                                現在: {getInventoryCount(selectedProduct.id)}個
                            </div>
                        </div>

                        {/* クイック調整ボタン */}
                        <div className="flex gap-2 justify-center">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleAdjust(-100)}
                                className="text-lg"
                            >
                                -100
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleAdjust(-10)}
                                className="text-lg"
                            >
                                -10
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleAdjust(10)}
                                className="text-lg"
                            >
                                +10
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleAdjust(100)}
                                className="text-lg"
                            >
                                +100
                            </Button>
                        </div>

                        {/* テンキー */}
                        <div className="grid grid-cols-3 gap-2">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map(key => (
                                <Button
                                    key={key}
                                    variant="outline"
                                    className={cn(
                                        "h-14 text-xl font-medium",
                                        key === 'clear' && "text-red-600",
                                        key === 'backspace' && "text-amber-600"
                                    )}
                                    onClick={() => handleNumpadInput(key)}
                                >
                                    {key === 'clear' ? 'C' : key === 'backspace' ? '⌫' : key}
                                </Button>
                            ))}
                        </div>

                        {/* 確定・キャンセルボタン */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                size="lg"
                                className="flex-1 h-14"
                                onClick={handleCancel}
                            >
                                <ArrowLeft className="h-5 w-5 mr-2" />
                                戻る
                            </Button>
                            <Button
                                size="lg"
                                className="flex-1 h-14 bg-green-600 hover:bg-green-700"
                                onClick={handleConfirmQuantity}
                            >
                                <Check className="h-5 w-5 mr-2" />
                                確定
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* 確認ダイアログ */}
            <StockCheckConfirmation
                open={showConfirmation}
                onOpenChange={setShowConfirmation}
                items={Array.from(editedItems.values())}
                getProduct={getProduct}
                onConfirm={handleFinalConfirm}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
