"use client";

import React, { useState } from "react";
import { Product, WorkInProgress, IncomingStock, SupplierStockLot } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, ImageIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { isRollBag, calculateStockPrediction } from "@/lib/services";
import { SaleEvent } from "@/hooks/use-sale-events";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";
import Image from "next/image";

type BagsInventoryCardsProps = {
    products: Product[];
    inventoryMap: Map<string, { quantity: number; updatedAt?: string }>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    wipMap: Map<string, WorkInProgress[]>;
    supplierStockMap: Map<string, number>;
    supplierStockLotsMap: Map<string, SupplierStockLot[]>;
    incomingMap: Map<string, { total: number; items: IncomingStock[] }>;
    saleEvents?: SaleEvent[];
    onDetail: (product: Product) => void;
    onRefetch: () => void;
};

export function BagsInventoryCards({
    products,
    inventoryMap,
    saleAllocationMap,
    wipMap,
    supplierStockMap,
    supplierStockLotsMap,
    incomingMap,
    saleEvents = [],
    onDetail,
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
                    supplierStockLotsMap={supplierStockLotsMap}
                    incomingMap={incomingMap}
                    saleEvents={saleEvents}
                    onDetail={onDetail}
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
    supplierStockLotsMap: Map<string, SupplierStockLot[]>;
    incomingMap: Map<string, { total: number; items: IncomingStock[] }>;
    saleEvents?: SaleEvent[];
    onDetail: (product: Product) => void;
    onRefetch: () => void;
};

function ProductCard({
    product,
    inventoryMap,
    saleAllocationMap,
    wipMap,
    supplierStockMap,
    supplierStockLotsMap,
    incomingMap,
    saleEvents = [],
    onDetail,
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
    const supplierLots = supplierStockLotsMap?.get(product.id) || [];
    const incoming = incomingMap.get(product.id);

    const isRoll = product.shape && isRollBag(product.shape);

    // 有効在庫
    const availableStock = Math.max(0, currentStock - (isRoll ? allocation.meters : allocation.bags));

    // ステータス判定 (直送先在庫と廃盤は除外)
    const isOutOfStock = (product.status !== 'direct_delivery' && product.status !== 'discontinued' && product.status !== 'on_sale_break') && (availableStock <= 0);
    const isLowStock = (product.status !== 'direct_delivery' && product.status !== 'discontinued') && (
        isRoll
            ? availableStock > 0 && availableStock < 50
            : availableStock > 0 && availableStock < 100
    );
    const hasAllocation = allocation.bags > 0;

    // 在庫予測の計算
    const relevantSaleItems = saleEvents
        .filter(event => (event.status === 'active' || event.status === 'upcoming'))
        .flatMap(event => {
            const item = event.items.find(i => i.productId === product.id);
            return item ? [{ dates: event.dates, quantity: item.allocatedQuantity }] : [];
        });

    const prediction = calculateStockPrediction(
        availableStock,
        product.dailyShipmentRate || 0,
        product.productionLeadDays || 0,
        product,
        relevantSaleItems
    );

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
            onClick={() => onDetail(product)}
        >
            {/* 画像エリア - クリックで詳細でもいいが、フォームを開くのが無難 */}
            <div className="relative aspect-[4/3] bg-slate-100 group">
                {product.imageUrl ? (
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
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
                    ) : product.status === 'plate_removal_scheduled' ? (
                        <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 shadow-sm">落版予定</Badge>
                    ) : product.status === 'plate_removed' ? (
                        <Badge variant="outline" className="border-purple-400 text-purple-600 bg-purple-50 shadow-sm">落版</Badge>
                    ) : product.status === 'direct_delivery' ? (
                        <Badge variant="outline" className="border-blue-400 text-blue-600 bg-blue-50 shadow-sm">直送先在庫</Badge>
                    ) : product.status === 'on_sale_break' ? (
                        <Badge variant="outline" className="border-yellow-400 text-yellow-600 bg-yellow-50 shadow-sm">販売中断</Badge>
                    ) : product.status === 'discontinued' ? (
                        <Badge variant="outline" className="border-gray-400 text-gray-500 bg-gray-50 shadow-sm">廃盤</Badge>
                    ) : null}
                    {hasAllocation && (
                        <Badge className="bg-blue-600 shadow-sm text-[10px] px-1 h-5">特売引当中</Badge>
                    )}
                </div>

                {product.discontinuedDate && product.status !== 'active' && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {new Date(product.discontinuedDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                        {(product.status === 'plate_removed' || product.status === 'plate_removal_scheduled') ? '落版' : '廃盤'}
                    </div>
                )}

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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDetail(product);
                                    }}
                                >
                                    <Info className="h-4 w-4 mr-1" /> 詳細
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <CardContent className="p-3 flex-1 flex flex-col gap-2">
                <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5em]" title={`${product.name} (${product.weight}kg)`}>
                            {product.name} ({product.weight}kg)
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
                        <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5">
                            <div>SKU: {product.sku}</div>
                            {wipList && wipList.length > 0 && (
                                <div className="text-purple-600 font-medium">
                                    仕掛中: {wipQuantity.toLocaleString()}{isRoll ? 'm' : '枚'}
                                    <div className="flex flex-col gap-0.5 mt-0.5 opacity-80 font-normal">
                                        {wipList.map((item) => (
                                            <div key={item.id}>
                                                {item.expectedCompletion ?
                                                    (() => {
                                                        const d = new Date(item.expectedCompletion);
                                                        const month = d.getMonth() + 1;
                                                        if (item.termType === 'early') return `${month}月上旬: `;
                                                        if (item.termType === 'mid') return `${month}月中旬: `;
                                                        if (item.termType === 'late') return `${month}月下旬: `;
                                                        return `${d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}: `;
                                                    })()
                                                    : '未定: '}
                                                {item.quantity.toLocaleString()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* メーカー在庫の表示 */}
                            {supplier > 0 && (
                                <div className="text-orange-600 mt-2 text-[10px] text-right">
                                    メーカー: {supplier.toLocaleString()}{isRoll ? 'm' : '枚'}
                                    <div className="flex flex-col gap-0.5 mt-0.5 opacity-80 font-normal">
                                        {supplierLots.map((lot) => {
                                            const now = new Date();
                                            const arrival = new Date(lot.stockDate);
                                            const monthsElapsed = (now.getFullYear() - arrival.getFullYear()) * 12 + now.getMonth() - arrival.getMonth();
                                            const isLongTerm = monthsElapsed >= 5 && lot.quantity > 0;

                                            return (
                                                <div key={lot.id} className="flex justify-end items-center gap-1">
                                                    {isLongTerm && (
                                                        <Badge variant="destructive" className="h-4 px-1 text-[8px] whitespace-nowrap">長期在庫</Badge>
                                                    )}
                                                    <div className="text-[10px] leading-tight whitespace-nowrap">
                                                        {new Date(lot.stockDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}: {lot.quantity.toLocaleString()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
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
                                    引当: {allocation.bags.toLocaleString()}枚
                                </div>
                            )}

                            {/* 入荷予定の表示 */}
                            {incoming && incoming.total > 0 && (
                                <div
                                    className="text-[10px] text-emerald-600 font-medium mt-1"
                                >
                                    入荷予定: {incoming.total.toLocaleString()}{isRoll ? 'm' : '枚'}
                                    <div className="flex flex-col gap-0.5 mt-0.5 opacity-80 font-normal">
                                        {incoming.items.map((item, index) => (
                                            <div key={index}>
                                                {new Date(item.expectedDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}: {item.quantity.toLocaleString()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 未設定の場合はクリックで開けるように "+" アイコンやテキストを出すことも検討可能だが一旦非表示 */}
                            {/* 在庫予測 */}
                            {prediction.estimatedDate && (
                                <div className={cn(
                                    "mt-2 p-1.5 rounded-md flex flex-col items-center border",
                                    prediction.wipStartAlert ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
                                )}>
                                    <div className={cn(
                                        "text-[10px] font-bold",
                                        prediction.wipStartAlert ? "text-red-600 animate-pulse" : "text-slate-600"
                                    )}>
                                        残り{prediction.remainingDays}日分
                                    </div>
                                    <div className="text-[9px] text-muted-foreground">
                                        {format(prediction.estimatedDate, "M/d")}頃 終了
                                    </div>
                                    {prediction.wipStartAlert && (
                                        <Badge className="mt-0.5 h-3.5 text-[8px] bg-red-600 hover:bg-red-700 px-1 border-none leading-none">
                                            仕掛開始!
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

