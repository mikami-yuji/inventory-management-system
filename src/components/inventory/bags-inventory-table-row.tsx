import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { ProductImage } from "@/components/ui/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Plus,
    Pencil,
    Package,
    Check,
    Info,
    Calendar,
    Clock,
    Truck,
    Layers,
} from "lucide-react";
import { getPitch, calculateStockStatus } from "@/lib/services";
import { format } from "date-fns";
import type { Product, WorkInProgress, IncomingStock, SupplierStockLot } from "@/types";
import type { SaleEvent } from "@/hooks/use-sale-events";
import type { calculateStockPrediction } from "@/lib/services";
import type { InventoryDialogsState } from "./use-inventory-dialogs";
import type { TableDensity } from "./bags-inventory-table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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
    density?: TableDensity;
    dialogs: InventoryDialogsState;
    onEdit: (product: Product) => void;
    onIncomingStockClick: (product: Product) => void;
    onAnalyze?: (product: Product) => void;
    onAddToCart: (product: Product) => void;
}

// 量目バッジのカラーリングヘルパー
const renderWeightBadge = (weight?: number | null, isCompact?: boolean) => {
    if (!weight) return <span className="text-[10px] text-muted-foreground font-medium">-</span>;

    let badgeClass = "bg-blue-600 text-white"; // 5kg 標準
    if (weight === 10) badgeClass = "bg-indigo-950 text-white ring-1 ring-indigo-400/30"; // 10kg
    else if (weight === 5) badgeClass = "bg-blue-600 text-white shadow-xs"; // 5kg
    else if (weight === 2 || weight === 3) badgeClass = "bg-emerald-700 text-white shadow-xs"; // 2kg, 3kg
    else if (weight === 1.4) badgeClass = "bg-amber-600 text-white shadow-xs"; // 1.4kg
    else if (weight < 1) badgeClass = "bg-purple-800 text-white shadow-xs"; // 0.75kg等小袋

    return (
        <span className={cn(
            "inline-flex items-center justify-center rounded font-black tracking-tight",
            isCompact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
            badgeClass
        )}>
            {weight}kg
        </span>
    );
};

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
    density = 'standard',
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

    const isCompact = density === 'compact';

    const currentStock = inventoryItem.quantity;
    const oldPriceQty = inventoryItem.oldPriceQuantity || 0;
    const regularQty = Math.max(0, currentStock - oldPriceQty);
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
    const isPlateRemoved = product.status === 'plate_removed';
    const isDiscontinued = product.status === 'discontinued';

    const hasAllocation = allocation.bags > 0 || (isRoll && allocation.meters > 0);

    // 左端のステータスカラーボーダー
    const statusBorderColor = isPlateRemoved
        ? "border-l-slate-400"
        : isOutOfStock
            ? "border-l-red-500"
            : isLowStock
                ? "border-l-amber-400"
                : "border-l-emerald-500";

    return (
        <TableRow className={cn(
            "group transition-colors border-b odd:bg-white even:bg-slate-50/40 hover:bg-sky-50/60",
            isPlateRemoved && "!bg-slate-100/80 hover:!bg-slate-200/80 text-slate-600",
            isOutOfStock && !isPlateRemoved && "!bg-red-50/50 hover:!bg-red-100/50",
            isCompact ? "h-9" : ""
        )}>
            {/* 1. 画像 */}
            <TableCell className={cn(
                "sticky left-0 z-10 transition-colors border-r border-l-4 text-center",
                isCompact ? "p-1" : "p-1.5",
                statusBorderColor,
                isPlateRemoved
                    ? "bg-slate-100 group-hover:bg-slate-200/80"
                    : isOutOfStock
                        ? "bg-red-50"
                        : "bg-white group-hover:bg-sky-50"
            )}>
                {product.imageUrl ? (
                    <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        variant="thumbnail"
                        className={cn(
                            isCompact ? "w-7 h-7" : "w-10 h-10",
                            isPlateRemoved && "opacity-80"
                        )}
                        onClick={() => setSelectedImage({ url: product.imageUrl!, alt: product.name, name: product.name })}
                    />
                ) : (
                    <div className={cn(
                        "mx-auto bg-gray-100 rounded border flex items-center justify-center",
                        isCompact ? "w-7 h-7" : "w-10 h-10",
                        isPlateRemoved && "opacity-75"
                    )}>
                        <Package className={cn(isCompact ? "h-3 w-3" : "h-4 w-4", "text-gray-400")} />
                    </div>
                )}
            </TableCell>

            {/* 2. 商品情報 */}
            <TableCell className={cn(
                "md:sticky md:left-[50px] z-0 md:z-10 transition-colors md:border-r",
                isCompact ? "p-1.5 min-w-[180px] max-w-[240px]" : "p-2 min-w-[200px] max-w-[280px]",
                isPlateRemoved
                    ? "bg-slate-100 group-hover:bg-slate-200/80"
                    : isOutOfStock
                        ? "bg-red-50"
                        : "bg-white group-hover:bg-sky-50"
            )}>
                <div className="space-y-0.5">
                    <div className={cn(
                        "font-bold leading-snug break-words",
                        isCompact ? "text-xs" : "text-xs md:text-sm",
                        isPlateRemoved ? "text-slate-600" : "text-slate-900"
                    )} title={product.name}>
                        {product.name}
                    </div>
                    <div className={cn("text-slate-500", isCompact ? "text-[10px]" : "text-[11px]")}>
                        №: <span className="font-mono font-medium text-slate-700 select-all">{product.sku || '-'}</span>
                    </div>
                    {!isCompact && product.janCode && (
                        <div className="text-[10px] text-slate-400 font-mono select-all">
                            JAN: {product.janCode}
                        </div>
                    )}
                </div>
            </TableCell>

            {/* 3. スペック */}
            <TableCell className={cn(
                "md:sticky md:left-[270px] z-0 md:z-10 md:shadow-[2px_0_5px_-1px_rgba(0,0,0,0.06)] md:border-r transition-colors",
                isCompact ? "p-1" : "p-2",
                isPlateRemoved
                    ? "bg-slate-100 group-hover:bg-slate-200/80"
                    : isOutOfStock
                        ? "bg-red-50"
                        : "bg-white group-hover:bg-sky-50"
            )}>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                        {renderWeightBadge(product.weight, isCompact)}
                        <span className={cn("font-semibold", isCompact ? "text-[11px]" : "text-xs", isPlateRemoved ? "text-slate-500" : "text-slate-700")}>
                            {product.shape || "-"}
                        </span>
                    </div>
                    {isRoll ? (
                        <div className="flex items-center gap-1 text-[9px] text-slate-500">
                            <span className="bg-slate-100 px-1 py-0.2 rounded font-mono">P:{getPitch(product.weight || 0)}</span>
                            <span className="bg-slate-100 px-1 py-0.2 rounded font-mono">{product.metersPerRoll || 400}m</span>
                        </div>
                    ) : (
                        product.material && !isCompact && <div className="text-[10px] text-slate-400 truncate max-w-[90px]">{product.material}</div>
                    )}
                </div>
            </TableCell>

            {/* 4. 現在庫 (内訳プレビュー Tooltip 連携) */}
            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <TableCell
                            className={cn(
                                "text-right cursor-pointer hover:bg-blue-100/70 transition-colors group relative tabular-nums",
                                isPlateRemoved ? "bg-slate-100/60" : "bg-blue-50/25",
                                isCompact ? "p-1" : "p-2"
                            )}
                            onClick={() => setAdjustStock(product)}
                        >
                            {isRoll ? (
                                <div>
                                    <div className={cn(
                                        "tracking-tight flex items-center justify-end gap-0.5",
                                        isCompact ? "font-bold text-xs md:text-sm" : "font-black text-base md:text-lg",
                                        currentStock === 0 ? "text-red-600" : "text-slate-950"
                                    )}>
                                        {currentStock.toLocaleString()}<span className="text-[10px] font-bold text-slate-600">m</span>
                                        <Pencil className="h-2.5 w-2.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                                    </div>
                                    <div className={cn("text-slate-500 font-semibold", isCompact ? "text-[9px]" : "text-[11px]")}>
                                        約{currentBags.toLocaleString()}枚
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className={cn(
                                        "tracking-tight flex items-center justify-end gap-0.5",
                                        isCompact ? "font-bold text-xs md:text-sm" : "font-black text-base md:text-lg",
                                        currentStock === 0 ? "text-red-600" : "text-slate-950"
                                    )}>
                                        {currentStock.toLocaleString()}<span className="text-[10px] font-bold text-slate-600">枚</span>
                                        <Pencil className="h-2.5 w-2.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                                    </div>
                                </div>
                            )}
                            {oldPriceQty > 0 && (
                                <div className="text-[8px] text-orange-600 font-bold leading-none mt-0.5" title="旧価格在庫">
                                    旧:{oldPriceQty.toLocaleString()}{isRoll ? 'm' : '枚'}
                                </div>
                            )}
                        </TableCell>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end" className="p-2.5 max-w-[260px] text-xs bg-slate-900 text-white shadow-xl border-slate-700">
                        <div className="space-y-1.5">
                            <div className="font-bold border-b border-slate-700 pb-1 flex items-center justify-between text-slate-200">
                                <span>{product.name}</span>
                                <span className="text-[10px] text-blue-400 font-normal">クリックで調整</span>
                            </div>
                            <div className="space-y-0.5 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">現在庫:</span>
                                    <span className="font-bold font-mono">{currentStock.toLocaleString()} {isRoll ? 'm' : '枚'}</span>
                                </div>
                                {oldPriceQty > 0 && (
                                    <>
                                        <div className="flex justify-between text-slate-300 pl-2 text-[10px]">
                                            <span>└ 通常価格:</span>
                                            <span className="font-mono">{regularQty.toLocaleString()} {isRoll ? 'm' : '枚'}</span>
                                        </div>
                                        <div className="flex justify-between text-amber-400 pl-2 text-[10px]">
                                            <span>└ 旧価格在庫:</span>
                                            <span className="font-mono font-bold">{oldPriceQty.toLocaleString()} {isRoll ? 'm' : '枚'}</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between text-blue-300 border-t border-slate-800 pt-0.5">
                                    <span>有効在庫 (引当差引後):</span>
                                    <span className="font-bold font-mono">{availableStock.toLocaleString()} {isRoll ? 'm' : '枚'}</span>
                                </div>
                                {allocation.bags > 0 && (
                                    <div className="flex justify-between text-slate-300">
                                        <span className="text-slate-400">特売引当:</span>
                                        <span className="font-mono">{allocation.bags.toLocaleString()} 枚</span>
                                    </div>
                                )}
                                {incoming && incoming.total > 0 && (
                                    <div className="flex justify-between text-emerald-400">
                                        <span>入荷予定:</span>
                                        <span className="font-mono">{incoming.total.toLocaleString()} {isRoll ? 'm' : '枚'}</span>
                                    </div>
                                )}
                                {wipList.length > 0 && (
                                    <div className="flex justify-between text-amber-300">
                                        <span>仕掛中:</span>
                                        <span className="font-mono">{wipList.reduce((s, i) => s + i.quantity, 0).toLocaleString()} {isRoll ? 'm' : '枚'}</span>
                                    </div>
                                )}
                            </div>
                            {updatedAt && (
                                <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-800 flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5 text-slate-500" />
                                    <span>最終更新: {new Date(updatedAt).toLocaleString('ja-JP')}</span>
                                </div>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* 5. 特売引当 */}
            <TableCell
                className={cn(
                    "text-right tabular-nums p-2",
                    isPlateRemoved ? "bg-slate-100/40" : "bg-blue-50/15",
                    hasAllocation && "cursor-pointer hover:bg-blue-100/50 transition-colors"
                )}
                onClick={() => hasAllocation && setViewAllocation(product)}
            >
                {hasAllocation ? (
                    <div className={isPlateRemoved ? "text-slate-600" : "text-blue-600"}>
                        <div className="font-bold text-xs md:text-sm underline decoration-dotted underline-offset-2">
                            {isRoll ? `${allocation.meters.toLocaleString()}m` : `${allocation.bags.toLocaleString()}枚`}
                        </div>
                        {isRoll && (
                            <div className="text-[10px] text-slate-400">
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
                                .map((evt, idx) => (
                                    <div key={idx} className="text-[9px] text-blue-600/90 truncate max-w-[120px] ml-auto" title={`${evt.client}: ${evt.qty.toLocaleString()}枚`}>
                                        {evt.client}: {evt.qty.toLocaleString()}枚
                                    </div>
                                ))}
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-300 text-xs">-</span>
                )}
            </TableCell>

            {/* 6. 有効在庫 (手元の実質在庫: 最重要) */}
            <TableCell className={cn(
                "text-right tabular-nums border-r border-slate-200 p-2",
                isPlateRemoved ? "bg-slate-200/40" : "bg-blue-50/40"
            )}>
                <div className={cn(
                    "font-black text-base md:text-lg tracking-tight",
                    isPlateRemoved ? "text-slate-600" : availableStock < 0 ? "text-red-600" : availableStock === 0 ? "text-orange-500" : "text-emerald-700"
                )}>
                    {isRoll ? `${availableStock.toLocaleString()}m` : `${availableStock.toLocaleString()}枚`}
                </div>
                {isRoll && (
                    <div className="text-[10px] text-slate-500 font-medium">
                        約{availableBags.toLocaleString()}枚
                    </div>
                )}
            </TableCell>

            {/* 7. 入荷予定 */}
            <TableCell
                className={cn(
                    "text-right cursor-pointer hover:bg-amber-100/50 transition-colors tabular-nums p-2",
                    isPlateRemoved ? "bg-slate-100/40" : "bg-amber-50/15"
                )}
                onClick={() => onIncomingStockClick(product)}
            >
                {incoming && incoming.total > 0 ? (
                    <div>
                        {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const hasOverdue = incoming.items.some(item => {
                                if (!item.expectedDate) return false;
                                const itemDate = new Date(item.expectedDate);
                                return itemDate.setHours(0, 0, 0, 0) < today.getTime();
                            });

                            return (
                                <>
                                    <div className={cn(
                                        "font-bold text-xs md:text-sm underline decoration-dotted underline-offset-2 flex items-center justify-end gap-1",
                                        isPlateRemoved ? "text-slate-600" : hasOverdue ? "text-red-600" : "text-blue-700"
                                    )}>
                                        {hasOverdue && !isPlateRemoved && (
                                            <span className="text-[10px] px-1 py-0.2 rounded bg-red-100 text-red-700 font-normal no-underline">超過</span>
                                        )}
                                        <span>{incoming.total.toLocaleString()}{isRoll ? 'm' : '枚'}</span>
                                    </div>
                                    {incoming.items.length > 0 && (
                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                            {incoming.items.map((item, idx) => {
                                                const itemDate = item.expectedDate ? new Date(item.expectedDate) : null;
                                                const isOverdue = itemDate ? itemDate.setHours(0, 0, 0, 0) < today.getTime() : false;

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "text-[9px] truncate max-w-[140px] ml-auto",
                                                            isOverdue && !isPlateRemoved
                                                                ? "text-red-600 font-bold bg-red-50/60 px-1 py-0.2 rounded"
                                                                : "text-slate-600"
                                                        )}
                                                        title={`${item.expectedDate ? new Date(item.expectedDate).toLocaleDateString('ja-JP') : '納期確認中'}: ${item.quantity.toLocaleString()}${isRoll ? 'm' : '枚'}${item.note ? ` (${item.note})` : ''}${isOverdue ? ' [入荷予定日超過]' : ''}`}
                                                    >
                                                        {item.expectedDate ? `${new Date(item.expectedDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}: ` : '納期確認中: '}
                                                        {item.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                        {item.note && ` (${item.note})`}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                ) : (
                    <span className="text-slate-300 text-xs">-</span>
                )}
            </TableCell>

            {/* 8. メーカー在庫 (すべてのロットを表示) */}
            <TableCell
                className={cn(
                    "text-right cursor-pointer hover:bg-amber-100/50 transition-colors group relative tabular-nums p-2",
                    isPlateRemoved ? "bg-slate-100/40" : "bg-amber-50/15"
                )}
                onClick={() => setEditSupplierStock(product)}
            >
                {supplierStock > 0 ? (
                    <div>
                        <div className={cn("font-bold text-xs md:text-sm flex items-center justify-end gap-0.5", isPlateRemoved ? "text-slate-600" : "text-purple-800")}>
                            {supplierStock.toLocaleString()}{isRoll ? 'm' : '枚'}
                            <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
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
                                            <div key={lot.id} className="text-[10px] text-purple-700 flex items-center justify-end gap-1 whitespace-nowrap" title={lot.note || undefined}>
                                                {isLongTerm && (
                                                    <Badge variant="destructive" className="h-3 px-1 text-[7px] leading-none">長期</Badge>
                                                )}
                                                <span>
                                                    {new Date(lot.stockDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}: {lot.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : product.supplierStockUpdatedAt && (
                            <div className="text-[9px] text-gray-400">
                                {new Date(product.supplierStockUpdatedAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-slate-300 text-xs flex items-center justify-end gap-1">
                        -
                        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                    </span>
                )}
            </TableCell>

            {/* 9. 仕掛中 (すべての仕掛品を表示) */}
            <TableCell
                className={cn(
                    "text-right cursor-pointer hover:bg-amber-100/50 transition-colors group relative tabular-nums border-r border-slate-200 p-2",
                    isPlateRemoved ? "bg-slate-100/60" : "bg-amber-50/35"
                )}
                onClick={() => setEditWIP(product)}
            >
                {wipList.length > 0 ? (
                    <div>
                        <div className="font-bold text-xs md:text-sm text-amber-700 flex items-center justify-end gap-0.5">
                            {wipList.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}{isRoll ? 'm' : '枚'}
                            <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            {wipList.map((item) => (
                                <div key={item.id} className="text-[10px] text-slate-600 truncate max-w-[130px] ml-auto" title={item.note || undefined}>
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
                    <span className="text-slate-300 text-xs flex items-center justify-end gap-1">
                        -
                        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                    </span>
                )}
            </TableCell>

            {/* 10. 状況 (在庫状況 + 全体状況) */}
            <TableCell
                className="text-center cursor-pointer hover:bg-muted/50 transition-colors p-1"
                onClick={() => setEditStatusProduct(product)}
                title="クリックで状況を変更"
            >
                <div className="flex flex-col items-center justify-center gap-1">
                    {/* 在庫状況 */}
                    {isOutOfStock ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 font-bold">欠品</Badge>
                    ) : isLowStock ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] px-1.5 py-0 h-5 font-bold">少在庫</Badge>
                    ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] px-1.5 py-0 h-5 font-bold">適正</Badge>
                    )}

                    {/* 全体状況 */}
                    {product.status === 'plate_removal_scheduled' && (
                        <Badge variant="destructive" className="bg-purple-600 text-[9px] px-1 py-0 h-4">落版予定</Badge>
                    )}
                    {product.status === 'plate_removed' && (
                        <Badge variant="destructive" className="bg-gray-600 text-[9px] px-1 py-0 h-4">落版済</Badge>
                    )}
                    {product.status === 'direct_delivery' && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[9px] px-1 py-0 h-4">直送先</Badge>
                    )}
                    {product.status === 'on_sale_break' && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 text-[9px] px-1 py-0 h-4">中断</Badge>
                    )}
                    {product.status === 'discontinued' && (
                        <Badge variant="destructive" className="bg-red-800 text-[9px] px-1 py-0 h-4">廃盤</Badge>
                    )}
                    {product.status === 'spot' && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0 h-4">スポット</Badge>
                    )}
                    {product.status === 'wip_check' && (
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 text-[9px] px-1 py-0 h-4">仕掛確認</Badge>
                    )}
                </div>
            </TableCell>

            {/* 12. 在庫予測 */}
            <TableCell 
                className="text-center bg-slate-50/50 border-x cursor-pointer hover:bg-slate-100 transition-colors p-1"
                onClick={() => setViewPrediction(product)}
            >
                <div className="flex flex-col items-center">
                    {prediction.estimatedDate ? (
                        <>
                            <div className={cn(
                                "font-bold text-xs md:text-sm tabular-nums",
                                prediction.wipStartAlert ? "text-red-600 animate-pulse font-black" : "text-slate-700"
                            )}>
                                残{prediction.remainingDays}日
                            </div>
                            <div className="text-[9px] text-muted-foreground whitespace-nowrap">
                                {format(prediction.estimatedDate, "M/d")}頃終了
                            </div>
                        </>
                    ) : (
                        <span className="text-slate-300 text-xs">-</span>
                    )}
                </div>
            </TableCell>

            {/* 13. アクション（発注・編集） */}
            <TableCell className="p-1 text-center">
                <div className="flex items-center justify-center gap-1">
                    <Button
                        size="icon"
                        variant={isInCart ? "secondary" : "outline"}
                        onClick={() => onAddToCart(product)}
                        disabled={isOutOfStock}
                        className="h-7 w-7"
                    >
                        {isInCart ? <Check className="h-3 w-3 text-emerald-600" /> : <Plus className="h-3 w-3" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(product); }} title="編集" className="h-7 w-7 text-slate-500 hover:text-slate-900">
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
});
