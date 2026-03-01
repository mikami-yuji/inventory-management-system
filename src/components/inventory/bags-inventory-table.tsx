"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
    Check,
    Plus,
    Pencil,
    Trash2,
    Package,
    Download,
    X,
} from "lucide-react";
import {
    getPitch,
    isRollBag,
    getDefaultMinStockAlert,
} from "@/lib/services";
import { useCart } from "@/contexts/cart-context";
import type { Product, WorkInProgress, IncomingStock } from "@/types";
import { SupplierStockDialog } from "@/components/inventory/supplier-stock-dialog";
import { WIPDialog } from "@/components/inventory/wip-dialog";
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog";
import { StockAllocationDialog } from "@/components/inventory/stock-allocation-dialog";
import { ProductStatusDialog } from "@/components/inventory/product-status-dialog";
import type { SaleEvent } from "@/hooks/use-sale-events";
import type { SupplierStockLot } from "@/types";

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

export type BagsInventoryTableProps = {
    products: Product[];
    inventoryMap: Map<string, { quantity: number; updatedAt?: string }>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    wipMap: Map<string, WorkInProgress[]>;
    supplierStockMap: Map<string, number>;
    supplierStockLotsMap: Map<string, SupplierStockLot[]>;
    incomingMap: Map<string, { total: number; items: IncomingStock[] }>;
    saleEvents: SaleEvent[];
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
    onIncomingStockClick: (product: Product) => void;
    onRefetch: () => void;
};

export function BagsInventoryTable({ products, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, supplierStockLotsMap, incomingMap, saleEvents, onEdit, onDelete, onIncomingStockClick, onRefetch }: BagsInventoryTableProps): React.ReactElement {
    const [editSupplierStock, setEditSupplierStock] = useState<Product | null>(null);
    const [editWIP, setEditWIP] = useState<Product | null>(null);
    const [viewAllocation, setViewAllocation] = useState<Product | null>(null);
    const [adjustStock, setAdjustStock] = useState<Product | null>(null);
    const [editStatusProduct, setEditStatusProduct] = useState<Product | null>(null);
    const { addToCart, items } = useCart();

    // 画像拡大用ステート
    const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string; name: string } | null>(null);

    return (
        <Card>
            <CardHeader>
                <CardTitle>米袋在庫状況 ({products.length}件)</CardTitle>
            </CardHeader>
            <CardContent>
                {products.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        該当する商品がありません
                    </div>
                ) : (
                    <Table wrapperClassName="h-[calc(100vh-280px)] overflow-auto border rounded-md">
                        <TableHeader className="bg-background shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                            <TableRow>
                                <TableHead className="w-[60px] sticky top-0 left-0 z-50 bg-background bg-clip-padding border-r shadow-sm">画像</TableHead>
                                <TableHead className="w-[180px] sticky top-0 md:left-[60px] z-40 md:z-50 bg-background bg-clip-padding md:border-r md:shadow-sm">商品情報</TableHead>
                                <TableHead className="w-[120px] sticky top-0 md:left-[240px] z-40 md:z-50 bg-background bg-clip-padding md:border-l md:shadow-[2px_2px_5px_-1px_rgba(0,0,0,0.1)]">スペック</TableHead>
                                <TableHead className="text-right sticky top-0 z-40 bg-background bg-clip-padding shadow-sm">現在庫</TableHead>
                                <TableHead className="text-right sticky top-0 z-40 bg-background bg-clip-padding shadow-sm">特売引当</TableHead>
                                <TableHead className="text-right sticky top-0 z-40 bg-background bg-clip-padding shadow-sm">有効在庫</TableHead>
                                <TableHead className="text-right sticky top-0 z-40 bg-background bg-clip-padding shadow-sm">入荷予定</TableHead>
                                <TableHead className="text-right sticky top-0 z-40 bg-background bg-clip-padding shadow-sm">メーカー在庫</TableHead>
                                <TableHead className="text-right sticky top-0 z-40 bg-background bg-clip-padding shadow-sm">仕掛中</TableHead>
                                <TableHead className="text-center sticky top-0 z-40 bg-background bg-clip-padding shadow-sm">在庫状況</TableHead>
                                <TableHead className="text-center sticky top-0 z-40 bg-background bg-clip-padding shadow-sm">全体状況</TableHead>
                                <TableHead className="w-[100px] sticky top-0 z-40 bg-background bg-clip-padding shadow-sm">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => {
                                const inventoryItem = inventoryMap.get(product.id) || { quantity: 0 };
                                const currentStock = inventoryItem.quantity;
                                const updatedAt = inventoryItem.updatedAt;

                                const allocation = saleAllocationMap.get(product.id) || { bags: 0, meters: 0 };
                                const incoming = incomingMap.get(product.id);
                                const wipList = wipMap.get(product.id) || [];
                                const wipQuantity = wipList.reduce((sum, item) => sum + item.quantity, 0);
                                const supplierStock = supplierStockMap.get(product.id) || 0;

                                const isRoll = product.shape && isRollBag(product.shape);

                                let availableStock: number;
                                let currentBags: number;
                                let availableBags: number;

                                if (isRoll) {
                                    availableStock = currentStock - allocation.meters; // マイナスも許容
                                    currentBags = metersToBags(currentStock, product.weight || 5);
                                    availableBags = metersToBags(availableStock, product.weight || 5);
                                } else {
                                    availableStock = currentStock - allocation.bags; // マイナスも許容
                                    currentBags = currentStock;
                                    availableBags = availableStock;
                                }

                                // ステータス判定 (手動上書きを優先)
                                let isOutOfStock = false;
                                let isLowStock = false;

                                if (product.statusOverride === 'out_of_stock') {
                                    isOutOfStock = true;
                                } else if (product.statusOverride === 'low_stock') {
                                    isLowStock = true;
                                } else {
                                    // 自動判定 (直送先在庫、廃盤、販売中断は除外)
                                    const shouldCheckStockStatus = !(
                                        product.status === 'direct_delivery' ||
                                        product.status === 'discontinued' ||
                                        product.status === 'on_sale_break'
                                    );

                                    if (shouldCheckStockStatus) {
                                        isOutOfStock = availableStock <= 0;
                                        const alertThreshold = product.minStockAlert !== null && product.minStockAlert !== undefined
                                            ? product.minStockAlert
                                            : getDefaultMinStockAlert(product.shape);
                                        isLowStock = availableStock > 0 && availableStock <= alertThreshold;
                                    }
                                }

                                const hasAllocation = allocation.bags > 0;
                                const isInCart = items.some(item => item.product.id === product.id);
                                const supplierStockLots = supplierStockLotsMap?.get(product.id) || [];

                                return (
                                    <TableRow key={product.id} className={cn("group", isOutOfStock && "bg-red-50 bg-opacity-50")}>
                                        <TableCell className={cn(
                                            "sticky left-0 z-10 transition-colors border-r",
                                            isOutOfStock ? "bg-red-50" : "bg-background group-hover:bg-muted/50"
                                        )}>
                                            {product.imageUrl ? (
                                                <div
                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => setSelectedImage({ url: product.imageUrl!, alt: product.name, name: product.name })}
                                                >
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="w-12 h-12 object-cover rounded border"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                                                    <Package className="h-5 w-5 text-gray-400" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className={cn(
                                            "md:sticky md:left-[60px] z-0 md:z-10 transition-colors md:border-r",
                                            isOutOfStock ? "bg-red-50" : "bg-background group-hover:bg-muted/50"
                                        )}>
                                            <div className="max-w-[180px]">
                                                <div className="font-medium truncate" title={product.name}>{product.name}</div>
                                                <div className="text-sm text-gray-500 truncate">受注№: {product.sku || '-'}</div>
                                                {product.productCode && <div className="text-sm text-gray-500 truncate">商品コード: {product.productCode}</div>}
                                                <div className="text-xs text-gray-400 truncate">JAN: {product.janCode || '-'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className={cn(
                                            "md:sticky md:left-[240px] z-0 md:z-10 md:shadow-[2px_0_5px_-1px_rgba(0,0,0,0.1)] transition-colors",
                                            isOutOfStock ? "bg-red-50" : "bg-background group-hover:bg-muted/50"
                                        )}>
                                            <div className="text-sm">
                                                <span className="font-medium">{product.weight}kg</span> / {product.shape}
                                                {isRoll && (
                                                    <div className="text-xs text-blue-600 mt-1">
                                                        ピッチ: {getPitch(product.weight || 0)}mm
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell
                                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors group relative"
                                            onClick={() => setAdjustStock(product)}
                                        >
                                            {isRoll ? (
                                                <>
                                                    <div className="font-bold text-lg flex items-center justify-end gap-1">
                                                        {currentStock.toLocaleString()}m
                                                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                    <div className="text-xs text-muted-foreground float-right">約{currentBags.toLocaleString()}枚</div>
                                                </>
                                            ) : (
                                                <div className="font-bold text-lg flex items-center justify-end gap-1">
                                                    {currentStock.toLocaleString()}枚
                                                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                                </div>
                                            )}
                                            {updatedAt && (
                                                <div className="text-[10px] text-gray-400 clear-both pt-1">
                                                    {new Date(updatedAt).toLocaleDateString()}{" "}
                                                    {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className={cn("text-right", hasAllocation && "cursor-pointer hover:bg-blue-50 transition-colors")}
                                            onClick={() => hasAllocation && setViewAllocation(product)}
                                        >
                                            {hasAllocation ? (
                                                <div className="text-blue-600">
                                                    <div className="font-medium underline decoration-dotted underline-offset-4">
                                                        {allocation.bags.toLocaleString()}
                                                        <span className="text-xs ml-0.5">枚</span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                                        {saleEvents
                                                            .flatMap(event => {
                                                                const item = event.items.find(i => i.productId === product.id);
                                                                if (item && item.allocatedQuantity > 0 && (event.status === 'active' || event.status === 'upcoming')) {
                                                                    return [{
                                                                        date: event.dates[0],
                                                                        client: event.clientName,
                                                                        quantity: item.allocatedQuantity
                                                                    }];
                                                                }
                                                                return [];
                                                            })
                                                            .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
                                                            .map((alloc, i) => (
                                                                <div key={i} className="text-[10px] leading-tight opacity-80 whitespace-nowrap">
                                                                    {alloc.date ? (new Date(alloc.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })) : '-'}:{" "}
                                                                    {alloc.client}: {alloc.quantity.toLocaleString()}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
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
                                                        "text-xs float-right",
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
                                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors group"
                                            onClick={() => onIncomingStockClick(product)}
                                        >
                                            {incoming && incoming.total > 0 ? (
                                                <div className="text-emerald-600">
                                                    <div className="font-medium underline decoration-dotted underline-offset-4">
                                                        {incoming.total.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                                        {incoming.items.map((item, i) => (
                                                            <div key={i} className="text-[10px] leading-tight opacity-80 whitespace-nowrap">
                                                                {new Date(item.expectedDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}: {item.quantity.toLocaleString()}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end">
                                                    <span className="text-muted-foreground group-hover:hidden">-</span>
                                                    <Plus className="h-3 w-3 text-muted-foreground hidden group-hover:block" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors group"
                                            onClick={() => setEditSupplierStock(product)}
                                        >
                                            {supplierStock > 0 ? (
                                                <div className="text-orange-600">
                                                    <div className="font-medium underline decoration-dotted underline-offset-4">
                                                        {supplierStock.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                                        {supplierStockLots.map((lot, i) => {
                                                            const now = new Date();
                                                            const arrival = new Date(lot.stockDate);
                                                            const monthsElapsed = (now.getFullYear() - arrival.getFullYear()) * 12 + now.getMonth() - arrival.getMonth();
                                                            const isLongTerm = monthsElapsed >= 5;

                                                            return (
                                                                <div key={i} className="flex justify-end items-center gap-1">
                                                                    {isLongTerm && (
                                                                        <Badge variant="destructive" className="h-4 px-1 text-[8px] whitespace-nowrap">長期在庫</Badge>
                                                                    )}
                                                                    <div className="text-[10px] leading-tight opacity-80 whitespace-nowrap">
                                                                        {new Date(lot.stockDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}: {lot.quantity.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {supplierStockLots.length === 0 && (
                                                        <div className="text-[10px] mt-0.5 text-right">メーカー</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end">
                                                    <span className="text-muted-foreground group-hover:hidden">-</span>
                                                    <Pencil className="h-3 w-3 text-muted-foreground hidden group-hover:block" />
                                                </div>
                                            )}
                                        </TableCell>

                                        <TableCell
                                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors group"
                                            onClick={() => setEditWIP(product)}
                                        >
                                            {wipList && wipList.length > 0 ? (
                                                <div className="text-purple-600">
                                                    <div className="font-medium text-base">
                                                        {wipList.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                                                        <span className="text-xs ml-0.5">{isRoll ? 'm' : '枚'}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                                        {wipList.map((item, i) => (
                                                            <div key={item.id} className="text-[10px] leading-tight opacity-80 whitespace-nowrap">
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
                                            ) : (
                                                <div className="flex items-center justify-end">
                                                    <span className="text-muted-foreground group-hover:hidden">-</span>
                                                    <Plus className="h-3 w-3 text-muted-foreground hidden group-hover:block" />
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* 在庫状況 (Inventory Status) */}
                                        <TableCell
                                            className="text-center cursor-pointer hover:bg-muted/50 transition-colors group"
                                            onClick={() => setEditStatusProduct(product)}
                                        >
                                            <div className="flex flex-col items-center gap-1 relative">
                                                {isOutOfStock ? (
                                                    <Badge variant="destructive" className="group-hover:opacity-80 transition-opacity whitespace-nowrap">
                                                        {product.statusOverride === 'out_of_stock' ? '欠品 (手動)' : '欠品'}
                                                    </Badge>
                                                ) : isLowStock ? (
                                                    <Badge variant="outline" className="border-amber-500 text-amber-600 group-hover:bg-amber-50 transition-colors whitespace-nowrap">
                                                        {product.statusOverride === 'low_stock' ? '低在庫 (手動)' : '低在庫'}
                                                    </Badge>
                                                ) : hasAllocation ? (
                                                    <Badge variant="outline" className="border-blue-500 text-blue-600 group-hover:bg-blue-50 transition-colors whitespace-nowrap">引当中</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-green-500 text-green-600 group-hover:bg-green-50 transition-colors whitespace-nowrap">正常</Badge>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* 全体状況 (Overall Status) */}
                                        <TableCell
                                            className="text-center cursor-pointer hover:bg-muted/50 transition-colors group"
                                            onClick={() => setEditStatusProduct(product)}
                                        >
                                            <div className="flex flex-col items-center gap-1 relative">
                                                {product.status === 'plate_removal_scheduled' ? (
                                                    <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 group-hover:bg-amber-100 transition-colors whitespace-nowrap">落版予定</Badge>
                                                ) : product.status === 'plate_removed' ? (
                                                    <Badge variant="outline" className="border-purple-400 text-purple-600 bg-purple-50 group-hover:bg-purple-100 transition-colors whitespace-nowrap">落版</Badge>
                                                ) : product.status === 'direct_delivery' ? (
                                                    <Badge variant="outline" className="border-blue-400 text-blue-600 bg-blue-50 group-hover:bg-blue-100 transition-colors whitespace-nowrap">直送先在庫</Badge>
                                                ) : product.status === 'on_sale_break' ? (
                                                    <Badge variant="outline" className="border-yellow-400 text-yellow-600 bg-yellow-50 group-hover:bg-yellow-100 transition-colors whitespace-nowrap">販売中断</Badge>
                                                ) : product.status === 'discontinued' ? (
                                                    <Badge variant="outline" className="border-gray-400 text-gray-500 bg-gray-50 group-hover:bg-gray-100 transition-colors whitespace-nowrap">廃盤</Badge>
                                                ) : (
                                                    <span className="text-muted-foreground group-hover:hidden">-</span>
                                                )}

                                                {product.discontinuedDate && product.status !== 'active' && (
                                                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {new Date(product.discontinuedDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                                                        {(product.status === 'plate_removed' || product.status === 'plate_removal_scheduled') ? '落版' : '廃盤'}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant={isInCart ? "secondary" : "outline"}
                                                    onClick={() => addToCart(product, 1)}
                                                    disabled={isOutOfStock}
                                                    className="gap-1"
                                                >
                                                    {isInCart ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => onEdit(product)} title="編集">
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(product); }} title="削除" className="text-red-500 hover:text-red-600">
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
                supplierStock={adjustStock ? (supplierStockMap.get(adjustStock.id) || 0) : 0}
                wipItems={adjustStock ? (wipMap.get(adjustStock.id) || []) : []}
                saleAllocations={adjustStock ? saleAllocationMap.get(adjustStock.id) : undefined}
                onSuccess={onRefetch}
            />

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

            <StockAllocationDialog
                product={viewAllocation}
                isOpen={!!viewAllocation}
                onClose={() => setViewAllocation(null)}
                saleEvents={saleEvents}
                onUpdate={onRefetch}
            />
            <ProductStatusDialog
                product={editStatusProduct}
                open={!!editStatusProduct}
                onOpenChange={(open) => !open && setEditStatusProduct(null)}
                onSuccess={onRefetch}
            />

            {/* 画像拡大・ダウンロードダイアログ */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-black/95 border-none">
                    <DialogTitle className="sr-only">画像プレビュー</DialogTitle>
                    <DialogDescription className="sr-only">商品の拡大画像プレビュー</DialogDescription>
                    {selectedImage && (
                        <div className="relative flex flex-col items-center justify-center min-h-[400px] pt-12 pb-8 px-6">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-white/70 hover:text-white hover:bg-white/20 rounded-full h-10 w-10 transition-colors"
                                onClick={() => setSelectedImage(null)}
                            >
                                <X className="h-6 w-6" />
                            </Button>

                            <img
                                src={selectedImage.url}
                                alt={selectedImage.alt}
                                className="max-w-full max-h-[75vh] object-contain rounded-md"
                            />

                            <div className="mt-6 flex flex-col items-center gap-4 w-full">
                                <p className="text-white text-base font-medium text-center line-clamp-2 px-12">
                                    {selectedImage.name}
                                </p>
                                <Button
                                    variant="secondary"
                                    className="w-full sm:w-auto flex items-center gap-2 mt-2"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        // ブラウザで直接ダウンロードさせる
                                        fetch(selectedImage.url)
                                            .then(response => response.blob())
                                            .then(blob => {
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.style.display = 'none';
                                                a.href = url;

                                                // ファイル名生成 (拡張子の推測付き)
                                                const extMatch = selectedImage.url.match(/\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i);
                                                const ext = extMatch ? extMatch[1] : 'jpg';
                                                a.download = `${selectedImage.name}.${ext}`;

                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                                document.body.removeChild(a);
                                            })
                                            .catch(err => {
                                                console.error('Download failed:', err);
                                                // フォールバック（別タブで開く）
                                                window.open(selectedImage.url, '_blank');
                                            });
                                    }}
                                >
                                    <Download className="h-4 w-4" />
                                    画像をダウンロード
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card >
    );
}
