"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Check,
    Plus,
    Pencil,
    Trash2,
    Package,
} from "lucide-react";
import {
    getPitch,
    isRollBag,
} from "@/lib/services";
import { useCart } from "@/contexts/cart-context";
import type { Product, WorkInProgress, IncomingStock } from "@/types";
import { SupplierStockDialog } from "@/components/inventory/supplier-stock-dialog";
import { WIPDialog } from "@/components/inventory/wip-dialog";
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog";
import { StockAllocationDialog } from "@/components/inventory/stock-allocation-dialog";
import { ProductStatusDialog } from "@/components/inventory/product-status-dialog";
import type { SaleEvent } from "@/hooks/use-sale-events";

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
    incomingMap: Map<string, { total: number; items: IncomingStock[] }>;
    saleEvents: SaleEvent[];
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
    onIncomingStockClick: (product: Product) => void;
    onRefetch: () => void;
};

export function BagsInventoryTable({ products, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, incomingMap, saleEvents, onEdit, onDelete, onIncomingStockClick, onRefetch }: BagsInventoryTableProps): React.ReactElement {
    const [editSupplierStock, setEditSupplierStock] = useState<Product | null>(null);
    const [editWIP, setEditWIP] = useState<Product | null>(null);
    const [viewAllocation, setViewAllocation] = useState<Product | null>(null);
    const [adjustStock, setAdjustStock] = useState<Product | null>(null);
    const [editStatusProduct, setEditStatusProduct] = useState<Product | null>(null);
    const { addToCart, items } = useCart();

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
                    <div className="h-[calc(100vh-280px)] overflow-auto border rounded-md relative [&_div[data-slot=table-container]]:overflow-visible">
                        <Table className="text-xs">
                            <TableHeader className="sticky top-0 z-30 bg-background shadow-sm border-b">
                                <TableRow>
                                    <TableHead className="w-[40px] px-1">画像</TableHead>
                                    <TableHead className="px-1 min-w-[120px]">商品情報</TableHead>
                                    <TableHead className="px-1">スペック</TableHead>
                                    <TableHead className="text-right px-1">現在庫</TableHead>
                                    <TableHead className="text-right px-1">特売引当</TableHead>
                                    <TableHead className="text-right px-1">有効在庫</TableHead>
                                    <TableHead className="text-right px-1">入荷予定</TableHead>
                                    <TableHead className="text-right px-1">メーカー</TableHead>
                                    <TableHead className="text-right px-1">仕掛中</TableHead>
                                    <TableHead className="text-center px-1">状態</TableHead>
                                    <TableHead className="w-[80px] px-1">操作</TableHead>
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
                                        // 自動判定
                                        isOutOfStock = availableStock <= 0;
                                        const alertThreshold = product.minStockAlert || 100;
                                        isLowStock = availableStock > 0 && availableStock <= alertThreshold;
                                    }

                                    const hasAllocation = allocation.bags > 0;
                                    const isInCart = items.some(item => item.product.id === product.id);

                                    return (
                                        <TableRow key={product.id} className={cn("group text-[11px]", isOutOfStock && "bg-red-50 bg-opacity-50")}>
                                            <TableCell className={cn(
                                                "px-1 py-1.5 transition-colors",
                                                isOutOfStock ? "bg-red-50" : "bg-background group-hover:bg-muted/50"
                                            )}>
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="w-8 h-8 object-cover rounded border"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 bg-gray-100 rounded border flex items-center justify-center">
                                                        <Package className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className={cn(
                                                "px-1 py-1.5 transition-colors",
                                                isOutOfStock ? "bg-red-50" : "bg-background group-hover:bg-muted/50"
                                            )}>
                                                <div className="max-w-[160px] whitespace-normal leading-tight">
                                                    <div className="font-bold text-[11px]" title={product.name}>{product.name}</div>
                                                    <div className="text-[10px] text-gray-500 mt-0.5">受注№: {product.sku || '-'}</div>
                                                    {product.productCode && <div className="text-[10px] text-gray-500">商品コード: {product.productCode}</div>}
                                                    <div className="text-[10px] text-gray-400">JAN: {product.janCode || '-'}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "px-1 py-1.5 transition-colors",
                                                isOutOfStock ? "bg-red-50" : "bg-background group-hover:bg-muted/50"
                                            )}>
                                                <div className="text-[11px]">
                                                    <span className="font-medium">{product.weight}kg</span> / {product.shape}
                                                    {isRoll && (
                                                        <div className="text-[10px] text-blue-600 mt-0.5">
                                                            ピッチ: {getPitch(product.weight || 0)}mm
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell
                                                className="text-right px-1 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors group relative"
                                                onClick={() => setAdjustStock(product)}
                                            >
                                                {isRoll ? (
                                                    <>
                                                        <div className="font-bold text-[13px] flex items-center justify-end gap-1">
                                                            {currentStock.toLocaleString()}m
                                                            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground float-right">約{currentBags.toLocaleString()}枚</div>
                                                    </>
                                                ) : (
                                                    <div className="font-bold text-[13px] flex items-center justify-end gap-1">
                                                        {currentStock.toLocaleString()}枚
                                                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                )}
                                                {updatedAt && (
                                                    <div className="text-[9px] text-gray-400 clear-both pt-0.5">
                                                        {new Date(updatedAt).toLocaleDateString()}{" "}
                                                        {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className={cn("text-right px-1 py-1.5", hasAllocation && "cursor-pointer hover:bg-blue-50 transition-colors")}
                                                onClick={() => hasAllocation && setViewAllocation(product)}
                                            >
                                                {hasAllocation ? (
                                                    <div className="text-blue-600">
                                                        <div className="font-medium text-[12px] underline decoration-dotted underline-offset-4">
                                                            {allocation.bags.toLocaleString()}
                                                            <span className="text-[9px] ml-0.5">枚</span>
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
                                                                    <div key={i} className="text-[9px] leading-tight opacity-80 whitespace-nowrap">
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
                                            <TableCell className="text-right px-1 py-1.5">
                                                {isRoll ? (
                                                    <>
                                                        <div className={cn(
                                                            "font-bold text-[13px]",
                                                            isOutOfStock && "text-red-600",
                                                            isLowStock && "text-amber-600"
                                                        )}>
                                                            {availableStock.toLocaleString()}m
                                                        </div>
                                                        <div className={cn(
                                                            "text-[10px] float-right",
                                                            isOutOfStock && "text-red-500",
                                                            isLowStock && "text-amber-500"
                                                        )}>
                                                            約{availableBags.toLocaleString()}枚
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className={cn(
                                                        "font-bold text-[13px]",
                                                        isOutOfStock && "text-red-600",
                                                        isLowStock && "text-amber-600"
                                                    )}>
                                                        {availableStock.toLocaleString()}枚
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className="text-right px-1 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors group"
                                                onClick={() => onIncomingStockClick(product)}
                                            >
                                                {incoming && incoming.total > 0 ? (
                                                    <div className="text-emerald-600">
                                                        <div className="font-medium text-[12px] underline decoration-dotted underline-offset-4">
                                                            {incoming.total.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                                            {incoming.items.map((item, i) => (
                                                                <div key={i} className="text-[9px] leading-tight opacity-80 whitespace-nowrap">
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
                                                className="text-right px-1 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors group"
                                                onClick={() => setEditSupplierStock(product)}
                                            >
                                                {supplierStock > 0 ? (
                                                    <div className="text-orange-600">
                                                        <div className="font-medium text-[12px]">{supplierStock.toLocaleString()}{isRoll ? 'm' : '枚'}</div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end">
                                                        <span className="text-muted-foreground group-hover:hidden">-</span>
                                                        <Pencil className="h-3 w-3 text-muted-foreground hidden group-hover:block" />
                                                    </div>
                                                )}
                                            </TableCell>

                                            <TableCell
                                                className="text-right px-1 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors group"
                                                onClick={() => setEditWIP(product)}
                                            >
                                                {wipList && wipList.length > 0 ? (
                                                    <div className="text-purple-600">
                                                        <div className="font-medium text-[12px]">
                                                            {wipList.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                                                            <span className="text-[9px] ml-0.5">{isRoll ? 'm' : '枚'}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                                            {wipList.map((item, i) => (
                                                                <div key={item.id} className="text-[9px] leading-tight opacity-80 whitespace-nowrap">
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

                                            <TableCell
                                                className="text-center px-1 py-1 cursor-pointer hover:bg-muted/50 transition-colors group"
                                                onClick={() => setEditStatusProduct(product)}
                                            >
                                                <div className="flex flex-col items-center gap-1 relative scale-90 origin-center">
                                                    {isOutOfStock ? (
                                                        <Badge variant="destructive" className="group-hover:opacity-80 transition-opacity">
                                                            {product.statusOverride === 'out_of_stock' ? '欠品 (手動)' : '欠品'}
                                                        </Badge>
                                                    ) : isLowStock ? (
                                                        <Badge variant="outline" className="border-amber-500 text-amber-600 group-hover:bg-amber-50 transition-colors">
                                                            {product.statusOverride === 'low_stock' ? '低在庫 (手動)' : '低在庫'}
                                                        </Badge>
                                                    ) : product.status === 'plate_removal_scheduled' ? (
                                                        <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 group-hover:bg-amber-100 transition-colors">落版予定</Badge>
                                                    ) : product.status === 'plate_removed' ? (
                                                        <Badge variant="outline" className="border-purple-400 text-purple-600 bg-purple-50 group-hover:bg-purple-100 transition-colors">落版</Badge>
                                                    ) : product.status === 'direct_delivery' ? (
                                                        <Badge variant="outline" className="border-blue-400 text-blue-600 bg-blue-50 group-hover:bg-blue-100 transition-colors">直送先在庫</Badge>
                                                    ) : product.status === 'on_sale_break' ? (
                                                        <Badge variant="outline" className="border-yellow-400 text-yellow-600 bg-yellow-50 group-hover:bg-yellow-100 transition-colors">販売開始中断</Badge>
                                                    ) : product.status === 'discontinued' ? (
                                                        <Badge variant="outline" className="border-gray-400 text-gray-500 bg-gray-50 group-hover:bg-gray-100 transition-colors">廃盤</Badge>
                                                    ) : hasAllocation ? (
                                                        <Badge variant="outline" className="border-blue-500 text-blue-600 group-hover:bg-blue-50 transition-colors">引当中</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-green-500 text-green-600 group-hover:bg-green-50 transition-colors">正常</Badge>
                                                    )}

                                                    {product.discontinuedDate && product.status !== 'active' && (
                                                        <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                            {new Date(product.discontinuedDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                                                            {(product.status === 'plate_removed' || product.status === 'plate_removal_scheduled') ? '落版' : '廃盤'}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-1 py-1">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant={isInCart ? "secondary" : "outline"}
                                                        onClick={() => addToCart(product, 1)}
                                                        disabled={isOutOfStock}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        {isInCart ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => onEdit(product)} title="編集" className="h-6 w-6 p-0">
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(product); }} title="削除" className="h-6 w-6 p-0 text-red-500 hover:text-red-600">
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            <StockAdjustmentDialog
                product={adjustStock}
                open={!!adjustStock}
                onOpenChange={(open) => !open && setAdjustStock(null)}
                currentStock={adjustStock ? (inventoryMap.get(adjustStock.id)?.quantity || 0) : 0}
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
            />
            <ProductStatusDialog
                product={editStatusProduct}
                open={!!editStatusProduct}
                onOpenChange={(open) => !open && setEditStatusProduct(null)}
                onSuccess={onRefetch}
            />
        </Card >
    );
}
