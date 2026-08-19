import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { ProductImage } from "@/components/ui/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Plus,
    Pencil,
    LineChart,
    Package,
    Check,
} from "lucide-react";
import { getPitch, calculateStockStatus } from "@/lib/services";
import { format } from "date-fns";
import type { Product, WorkInProgress, IncomingStock, SupplierStockLot } from "@/types";
import type { SaleEvent } from "@/hooks/use-sale-events";
import type { calculateStockPrediction } from "@/lib/services";
import type { InventoryDialogsState } from "./use-inventory-dialogs";

export interface BagsInventoryTableRowProps {
    product: Product;
    inventoryItem: { quantity: number; oldPriceQuantity: number; updatedAt?: string };
    allocation: { bags: number; meters: number };
    wipList: WorkInProgress[];
    incoming?: { total: number; items: IncomingStock[] };
    supplierStockLots?: SupplierStockLot[];
    supplierStockFallback: number;
    prediction: ReturnType<typeof calculateStockPrediction>;
    saleEvents: SaleEvent[];
    settings?: Record<string, unknown>;
    isInCart: boolean;
    dialogs: InventoryDialogsState;
    onEdit: (product: Product) => void;
    onIncomingStockClick: (product: Product) => void;
    onAnalyze?: (product: Product) => void;
    onAddToCart: (product: Product) => void;
}

export const BagsInventoryTableRow = React.memo(function BagsInventoryTableRow({
    product,
    inventoryItem,
    allocation,
    wipList,
    incoming,
    supplierStockLots = [],
    supplierStockFallback,
    prediction,
    saleEvents,
    settings,
    isInCart,
    dialogs,
    onEdit,
    onIncomingStockClick,
    onAnalyze,
    onAddToCart
}: BagsInventoryTableRowProps) {
    const {
        setAdjustStock,
        setViewAllocation,
        setEditSupplierStock,
        setEditWIP,
        setEditStatusProduct,
        setViewPrediction,
        setSelectedImage
    } = dialogs;

    const currentStock = inventoryItem.quantity;
    const oldPriceQty = inventoryItem.oldPriceQuantity || 0;
    const updatedAt = inventoryItem.updatedAt;

    const supplierStock = supplierStockLots.length > 0
        ? supplierStockLots.reduce((sum, lot) => sum + lot.quantity, 0)
        : supplierStockFallback;

    const status = calculateStockStatus(product, currentStock, allocation, settings);
    const isRoll = status.isRoll;
    const availableStock = status.availableStock;
    const currentBags = status.currentBags;
    const availableBags = status.availableBags;
    const isOutOfStock = status.isOutOfStock;
    const isLowStock = status.isLowStock;

    const hasAllocation = allocation.bags > 0 || (isRoll && allocation.meters > 0);

    return (
        <TableRow className={cn("group", isOutOfStock && "bg-red-50 bg-opacity-50")}>
            {/* 1. 画像 */}
            <TableCell className={cn(
                "sticky left-0 z-10 transition-colors border-r",
                isOutOfStock ? "bg-red-50" : "bg-background group-hover:bg-muted/50"
            )}>
                {product.imageUrl ? (
                    <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        variant="thumbnail"
                        onClick={() => setSelectedImage({ url: product.imageUrl!, alt: product.name, name: product.name })}
                    />
                ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-400" />
                    </div>
                )}
            </TableCell>

            {/* 2. 商品情報 */}
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

            {/* 3. スペック */}
            <TableCell className={cn(
                "md:sticky md:left-[240px] z-0 md:z-10 md:shadow-[2px_0_5px_-1px_rgba(0,0,0,0.1)] transition-colors",
                isOutOfStock ? "bg-red-50" : "bg-background group-hover:bg-muted/50"
            )}>
                <div className="text-sm">
                    <span className="font-medium">{product.weight}kg</span> / {product.shape}
                    {isRoll && (
                        <>
                            <div className="text-xs text-blue-600 mt-1">
                                ピッチ: {getPitch(product.weight || 0)}mm
                            </div>
                            <div className="text-xs text-green-600">
                                1巻: {product.metersPerRoll || 400}m
                            </div>
                        </>
                    )}
                </div>
            </TableCell>

            {/* 4. 現在庫 */}
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
                {oldPriceQty > 0 && (
                    <div className="text-[10px] text-orange-600 clear-both mt-0.5" title="旧価格在庫の内訳">
                        旧価格: {oldPriceQty.toLocaleString()}{isRoll ? 'm' : '枚'}
                    </div>
                )}
            </TableCell>

            {/* 5. 特売引当 */}
            <TableCell
                className={cn("text-right", hasAllocation && "cursor-pointer hover:bg-blue-50 transition-colors")}
                onClick={() => hasAllocation && setViewAllocation(product)}
            >
                {hasAllocation ? (
                    <div className="text-blue-600">
                        <div className="font-medium underline decoration-dotted underline-offset-4">
                            {isRoll ? `${allocation.meters.toLocaleString()}m` : `${allocation.bags.toLocaleString()}枚`}
                        </div>
                        {isRoll && (
                            <div className="text-xs text-muted-foreground">
                                約{allocation.bags.toLocaleString()}枚
                            </div>
                        )}
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            {saleEvents
                                .flatMap(event => {
                                    const item = event.items.find(i => i.productId === product.id);
                                    if (item && item.allocatedQuantity > 0 && (event.status === 'active' || event.status === 'upcoming')) {
                                        return [{
                                            date: event.dates[0],
                                            client: event.clientName,
                                            qty: item.allocatedQuantity
                                        }];
                                    }
                                    return [];
                                })
                                .slice(0, 2)
                                .map((evt, idx) => (
                                    <div key={idx} className="text-[10px] text-slate-500 truncate" title={`${evt.client}: ${evt.qty.toLocaleString()}枚`}>
                                        {evt.client}: {evt.qty.toLocaleString()}枚
                                    </div>
                                ))}
                        </div>
                    </div>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )}
            </TableCell>

            {/* 6. 有効在庫 */}
            <TableCell className="text-right">
                <div className={cn(
                    "font-bold text-lg",
                    availableStock < 0 ? "text-red-600" : availableStock === 0 ? "text-orange-500" : ""
                )}>
                    {isRoll ? `${availableStock.toLocaleString()}m` : `${availableStock.toLocaleString()}枚`}
                </div>
                {isRoll && (
                    <div className="text-xs text-muted-foreground">
                        約{availableBags.toLocaleString()}枚
                    </div>
                )}
            </TableCell>

            {/* 7. 入荷予定 */}
            <TableCell
                className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onIncomingStockClick(product)}
            >
                {incoming && incoming.total > 0 ? (
                    <div>
                        <div className="font-medium text-blue-600 underline decoration-dotted underline-offset-4">
                            {incoming.total.toLocaleString()}{isRoll ? 'm' : '枚'}
                        </div>
                        {incoming.items.length > 0 && (
                            <div className="flex flex-col gap-0.5 mt-0.5">
                                {incoming.items.map((item, idx) => (
                                    <div key={idx} className="text-[10px] text-gray-500 truncate" title={`${item.note || ''}`}>
                                        {item.expectedDate ? `${new Date(item.expectedDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}予定: ` : '納期確認中: '}
                                        {item.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}
                                        {item.note && ` (${item.note})`}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )}
            </TableCell>

            {/* 8. メーカー在庫 */}
            <TableCell
                className="text-right cursor-pointer hover:bg-muted/50 transition-colors group relative"
                onClick={() => setEditSupplierStock(product)}
            >
                {supplierStock > 0 ? (
                    <div>
                        <div className="font-medium text-purple-700 flex items-center justify-end gap-1">
                            {supplierStock.toLocaleString()}{isRoll ? 'm' : '枚'}
                            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                        {supplierStockLots.length > 0 ? (
                            <div className="flex flex-col gap-0.5 mt-1">
                                {[...supplierStockLots]
                                    .sort((a, b) => new Date(a.stockDate).getTime() - new Date(b.stockDate).getTime())
                                    .map((lot) => {
                                        const now = new Date();
                                        const arrival = new Date(lot.stockDate);
                                        const monthsElapsed = (now.getFullYear() - arrival.getFullYear()) * 12 + now.getMonth() - arrival.getMonth();
                                        const isLongTerm = monthsElapsed >= 5 && lot.quantity > 0;
                                        return (
                                            <div key={lot.id} className="text-[10px] text-purple-600 flex items-center justify-end gap-1 whitespace-nowrap" title={lot.note || undefined}>
                                                {isLongTerm && (
                                                    <Badge variant="destructive" className="h-3 px-1 text-[7px] leading-none">長期在庫</Badge>
                                                )}
                                                <span>
                                                    {new Date(lot.stockDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}: {lot.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : product.supplierStockUpdatedAt && (
                            <div className="text-[10px] text-gray-400">
                                {new Date(product.supplierStockUpdatedAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-muted-foreground group-hover:text-foreground flex items-center justify-end gap-1">
                        -
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                    </span>
                )}
            </TableCell>

            {/* 9. 仕掛中 */}
            <TableCell
                className="text-right cursor-pointer hover:bg-muted/50 transition-colors group relative"
                onClick={() => setEditWIP(product)}
            >
                {wipList.length > 0 ? (
                    <div>
                        <div className="font-medium text-amber-600 flex items-center justify-end gap-1">
                            {wipList.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}{isRoll ? 'm' : '枚'}
                            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            {wipList.map((item) => (
                                <div key={item.id} className="text-[10px] text-slate-500 truncate" title={item.note || undefined}>
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
                                    {item.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}
                                    {item.note && <span className="text-amber-700 ml-1">({item.note})</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <span className="text-muted-foreground group-hover:text-foreground flex items-center justify-end gap-1">
                        -
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                    </span>
                )}
            </TableCell>

            {/* 10. 在庫状況 */}
            <TableCell className="text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setEditStatusProduct(product)}>
                <div className="flex flex-col items-center gap-1">
                    {isOutOfStock ? (
                        <Badge variant="destructive">在庫なし</Badge>
                    ) : isLowStock ? (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">少在庫</Badge>
                    ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">適正</Badge>
                    )}
                </div>
            </TableCell>

            {/* 11. 全体状況 */}
            <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1">
                    {product.status === 'plate_removal_scheduled' && (
                        <Badge variant="destructive" className="bg-purple-600 hover:bg-purple-700">落版予定</Badge>
                    )}
                    {product.status === 'plate_removed' && (
                        <Badge variant="destructive" className="bg-gray-600 hover:bg-gray-700">落版済</Badge>
                    )}
                    {product.status === 'direct_delivery' && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">直送先在庫</Badge>
                    )}
                    {product.status === 'on_sale_break' && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">販売中断</Badge>
                    )}
                    {product.status === 'discontinued' && (
                        <Badge variant="destructive" className="bg-red-800 hover:bg-red-900">廃盤</Badge>
                    )}
                    {product.status === 'spot' && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">スポット</Badge>
                    )}
                    {product.status === 'wip_check' && (
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-indigo-300">仕掛中確認</Badge>
                    )}
                </div>
            </TableCell>

            {/* 12. 在庫予測 */}
            <TableCell 
                className="text-center max-w-[120px] bg-slate-50/50 border-x cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setViewPrediction(product)}
            >
                <div className="flex flex-col items-center">
                    {prediction.estimatedDate ? (
                        <>
                            <div className={cn(
                                "font-bold text-sm",
                                prediction.wipStartAlert ? "text-red-600 animate-pulse" : "text-slate-700"
                            )}>
                                残り{prediction.remainingDays}日
                            </div>
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {format(prediction.estimatedDate, "M/d")}頃 終了
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1 whitespace-nowrap opacity-80">
                                通常: {product.dailyShipmentRate?.toLocaleString() || 0}枚/日
                            </div>
                            {prediction.wipStartAlert && (
                                <Badge className="mt-1 h-3.5 text-[8px] bg-red-600 hover:bg-red-700 px-1 border-none leading-none">
                                    仕掛開始!
                                </Badge>
                            )}
                        </>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}
                    {prediction.hasUnconfirmedWIP && (
                        <div className="text-[10px] text-red-600 font-bold mt-1 animate-pulse leading-tight">
                            納期を確定してください
                        </div>
                    )}
                </div>
            </TableCell>

            {/* 13. アクション（発注・分析・編集） */}
            <TableCell>
                <div className="flex items-center gap-1">
                    <Button
                        size="icon"
                        variant={isInCart ? "secondary" : "outline"}
                        onClick={() => onAddToCart(product)}
                        disabled={isOutOfStock}
                        className="h-8 w-8"
                    >
                        {isInCart ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onAnalyze?.(product); }} title="在庫分析" className="h-8 w-8">
                        <LineChart className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(product); }} title="編集" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
});
