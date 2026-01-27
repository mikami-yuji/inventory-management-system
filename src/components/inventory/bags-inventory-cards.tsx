"use client";

import React, { useState } from "react";
import { Product, WorkInProgress } from "@/types";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2, Upload, Trash2, Camera, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPitch, isRollBag, bagsToMeters, metersToBags } from "@/lib/services";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";

type BagsInventoryCardsProps = {
    products: Product[];
    inventoryMap: Map<string, { quantity: number; updatedAt?: string }>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    wipMap: Map<string, WorkInProgress[]>;
    supplierStockMap: Map<string, number>;
    incomingMap: Map<string, { quantity: number; nextDate: string | null }>;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
    onIncomingStockClick: (product: Product) => void;
    onRefetch: () => void;
};

export function BagsInventoryCards({
    products,
    inventoryMap,
    saleAllocationMap,
    wipMap,
    supplierStockMap,
    incomingMap,
    onEdit,
    onDelete,
    onIncomingStockClick,
    onRefetch
}: BagsInventoryCardsProps): React.ReactElement {
    if (products.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                該当する商品がありません
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(product => (
                <ProductCard
                    key={product.id}
                    product={product}
                    inventoryMap={inventoryMap}
                    saleAllocationMap={saleAllocationMap}
                    wipMap={wipMap}
                    supplierStockMap={supplierStockMap}
                    incomingMap={incomingMap}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onIncomingStockClick={onIncomingStockClick}
                    onRefetch={onRefetch}
                />
            ))}
        </div>
    );
}

type ProductCardProps = {
    product: Product;
    inventoryMap: Map<string, { quantity: number; updatedAt?: string }>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    wipMap: Map<string, WorkInProgress[]>;
    supplierStockMap: Map<string, number>;
    incomingMap: Map<string, { quantity: number; nextDate: string | null }>;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
    onIncomingStockClick: (product: Product) => void;
    onRefetch: () => void;
};

function ProductCard({
    product,
    inventoryMap,
    saleAllocationMap,
    wipMap,
    supplierStockMap,
    incomingMap,
    onEdit,
    onDelete,
    onIncomingStockClick,
    onRefetch
}: ProductCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    // 在庫計算
    const stockInfo = inventoryMap.get(product.id) || { quantity: 0 };
    const currentStock = stockInfo.quantity;
    const allocation = saleAllocationMap.get(product.id) || { bags: 0, meters: 0 };
    const wipList = wipMap.get(product.id) || [];
    const wipQuantity = wipList.reduce((sum, item) => sum + item.quantity, 0);
    const supplier = supplierStockMap.get(product.id) || 0;
    const incoming = incomingMap.get(product.id);

    const isRoll = product.shape && isRollBag(product.shape);
    const weight = product.weight || 5;

    // 有効在庫
    const availableStock = Math.max(0, currentStock - (isRoll ? allocation.meters : allocation.bags));

    // ステータス判定
    const isOutOfStock = availableStock <= 0;
    const isLowStock = isRoll
        ? availableStock > 0 && availableStock < 50
        : availableStock > 0 && availableStock < 100;
    const hasAllocation = allocation.bags > 0;

    // 画像アップロード処理
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (uploading) return;

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            await processImageUpload(file);
        }
    };

    const processImageUpload = async (file: File) => {
        setUploading(true);
        try {
            // 圧縮
            const compressedFile = await imageCompression(file, {
                maxSizeMB: 0.2,
                maxWidthOrHeight: 800,
                useWebWorker: true,
                fileType: "image/webp"
            });

            // Storageへアップロード
            const fileName = `products/${product.sku || product.id}_${Date.now()}.webp`;
            const { data, error: uploadError } = await supabase.storage
                .from("product-images")
                .upload(fileName, compressedFile, {
                    contentType: "image/webp",
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // URL取得
            const { data: publicUrlData } = supabase.storage
                .from("product-images")
                .getPublicUrl(data.path);

            const imageUrl = publicUrlData.publicUrl;

            // 商品更新API呼び出し
            const response = await fetch("/api/products", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: product.id,
                    imageUrl: imageUrl
                })
            });

            if (!response.ok) throw new Error("Failed to update product");

            onRefetch();
        } catch (error) {
            console.error("Upload failed:", error);
            alert("画像のアップロードに失敗しました");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card
            className={cn(
                "overflow-hidden transition-all duration-200 hover:shadow-md h-full flex flex-col",
                isDragging && "ring-2 ring-blue-500 ring-offset-2 scale-[1.02]",
                isOutOfStock ? "border-red-200 bg-red-50/10" : "hover:border-primary/50"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {/* 画像エリア - クリックで詳細でもいいが、フォームを開くのが無難 */}
            <div className="relative aspect-[4/3] bg-slate-100 group">
                {product.imageUrl ? (
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-slate-50">
                        <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                        <span className="text-xs opacity-40">No Image</span>
                        <span className="text-[10px] opacity-30 mt-1">Drop image here</span>
                    </div>
                )}

                {/* ステータスバッジ (画像の上に重ねる) */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {isOutOfStock ? (
                        <Badge variant="destructive" className="shadow-sm">欠品</Badge>
                    ) : isLowStock ? (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 shadow-sm">低在庫</Badge>
                    ) : null}
                    {hasAllocation && (
                        <Badge className="bg-blue-600 shadow-sm">特売引当中</Badge>
                    )}
                </div>

                {/* オーバーレイアクション（ホバー時 or ドラッグ時） */}
                {(isHovered || isDragging || uploading) && (
                    <div className={cn(
                        "absolute inset-0 bg-black/40 flex flex-col items-center justify-center transition-opacity duration-200",
                        isDragging ? "opacity-100 bg-blue-500/20 backdrop-blur-sm" : "opacity-0 group-hover:opacity-100"
                    )}>
                        {uploading ? (
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                        ) : isDragging ? (
                            <div className="text-white font-bold flex flex-col items-center animate-pulse">
                                <Upload className="h-10 w-10 mb-2" />
                                <span>画像を追加・更新</span>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8"
                                    onClick={() => onEdit(product)}
                                >
                                    <Pencil className="h-4 w-4 mr-1" /> 詳細
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <CardContent className="p-3 flex-1 flex flex-col gap-2">
                <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5em]" title={product.name}>
                            {product.name}
                        </h3>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                        {product.variety && <Badge variant="outline" className="text-[10px] px-1 h-4 bg-amber-50 text-amber-700 border-amber-200">{product.variety}</Badge>}
                        {product.origin && <Badge variant="outline" className="text-[10px] px-1 h-4 bg-green-50 text-green-700 border-green-200">{product.origin}</Badge>}
                        <Badge variant="outline" className="text-[10px] px-1 h-4">{product.weight}kg</Badge>
                    </div>
                </div>

                <div className="mt-auto pt-2 border-t border-dashed">
                    <div className="flex justify-between items-end">
                        <div className="text-xs text-muted-foreground">
                            <div>SKU: {product.sku}</div>
                            {wipQuantity > 0 && <div className="text-purple-600">加工中: {wipQuantity.toLocaleString()}</div>}
                        </div>
                        <div className="text-right">
                            <div className={cn(
                                "text-lg font-bold leading-none",
                                isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-slate-700"
                            )}>
                                {availableStock.toLocaleString()}
                                <span className="text-xs font-normal text-muted-foreground ml-0.5">
                                    {isRoll ? 'm' : '枚'}
                                </span>
                            </div>
                            {hasAllocation && (
                                <div className="text-[10px] text-blue-600">
                                    引当: {isRoll ? allocation.meters.toFixed(0) + 'm' : allocation.bags.toLocaleString() + '枚'}
                                </div>
                            )}

                            {/* 入荷予定の表示 */}
                            {incoming && incoming.quantity > 0 && (
                                <div
                                    className="text-[10px] text-emerald-600 font-medium cursor-pointer hover:underline mt-0.5"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onIncomingStockClick(product);
                                    }}
                                >
                                    入荷: {incoming.quantity.toLocaleString()}{isRoll ? 'm' : '枚'} ({new Date(incoming.nextDate!).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })})
                                </div>
                            )}

                            {/* 未設定の場合はクリックで開けるように "+" アイコンやテキストを出すことも検討可能だが一旦非表示 */}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

