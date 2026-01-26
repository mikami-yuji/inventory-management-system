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
import type { Product } from "@/types";
import { SupplierStockDialog } from "@/components/inventory/supplier-stock-dialog";
import { WIPDialog } from "@/components/inventory/wip-dialog";
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog";
import { StockAllocationDialog } from "@/components/inventory/stock-allocation-dialog";
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
    wipMap: Map<string, number>;
    supplierStockMap: Map<string, number>;
    incomingMap: Map<string, { quantity: number; nextDate: string | null }>;
    saleEvents: SaleEvent[];
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
    onRefetch: () => void;
};

export function BagsInventoryTable({ products, inventoryMap, saleAllocationMap, wipMap, supplierStockMap, incomingMap, saleEvents, onEdit, onDelete, onRefetch }: BagsInventoryTableProps): React.ReactElement {
    const [editSupplierStock, setEditSupplierStock] = useState<Product | null>(null);
    const [editWIP, setEditWIP] = useState<Product | null>(null);
    const [viewAllocation, setViewAllocation] = useState<Product | null>(null);
    const [adjustStock, setAdjustStock] = useState<Product | null>(null);
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60px]">画像</TableHead>
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
                                const inventoryItem = inventoryMap.get(product.id) || { quantity: 0 };
                                const currentStock = inventoryItem.quantity;
                                const updatedAt = inventoryItem.updatedAt;

                                const allocation = saleAllocationMap.get(product.id) || { bags: 0, meters: 0 };
                                const incoming = incomingMap.get(product.id);
                                const wipQuantity = wipMap.get(product.id) || 0;
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
                                    <TableRow key={product.id} className={cn(isOutOfStock && "bg-red-50")}>
                                        <TableCell>
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-12 h-12 object-cover rounded border"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                                                    <Package className="h-5 w-5 text-gray-400" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[180px]">
                                                <div className="font-medium truncate" title={product.name}>{product.name}</div>
                                                <div className="text-sm text-gray-500 truncate">受注№: {product.sku || '-'}</div>
                                                {product.productCode && <div className="text-sm text-gray-500 truncate">商品コード: {product.productCode}</div>}
                                                <div className="text-xs text-gray-400 truncate">JAN: {product.janCode || '-'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
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
                                                <div className="text-blue-600 underline decoration-dotted underline-offset-4">
                                                    <div className="font-medium">{allocation.bags.toLocaleString()}本</div>
                                                    {isRoll && (
                                                        <div className="text-xs">({allocation.meters.toFixed(1)}m)</div>
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
                                            onClick={() => setEditSupplierStock(product)}
                                        >
                                            {supplierStock > 0 ? (
                                                <div className="text-orange-600">
                                                    <div className="font-medium">{supplierStock.toLocaleString()}{isRoll ? 'm' : '枚'}</div>
                                                    <div className="text-xs">メーカー</div>
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
                                            {wipQuantity > 0 ? (
                                                <div className="text-purple-600">
                                                    <div className="font-medium">{wipQuantity.toLocaleString()}{isRoll ? 'm' : '枚'}</div>
                                                    <div className="text-xs">加工中</div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end">
                                                    <span className="text-muted-foreground group-hover:hidden">-</span>
                                                    <Plus className="h-3 w-3 text-muted-foreground hidden group-hover:block" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {incoming ? (
                                                <div className="text-emerald-600">
                                                    <div className="font-medium">{incoming.quantity.toLocaleString()}m</div>
                                                    {incoming.nextDate && <div className="text-xs">{incoming.nextDate}</div>}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isOutOfStock ? (
                                                <Badge variant="destructive">
                                                    {product.statusOverride === 'out_of_stock' ? '欠品 (手動)' : '欠品'}
                                                </Badge>
                                            ) : isLowStock ? (
                                                <Badge variant="outline" className="border-amber-500 text-amber-600">
                                                    {product.statusOverride === 'low_stock' ? '低在庫 (手動)' : '低在庫'}
                                                </Badge>
                                            ) : hasAllocation ? (
                                                <Badge variant="outline" className="border-blue-500 text-blue-600">引当中</Badge>
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
        </Card>
    );
}
