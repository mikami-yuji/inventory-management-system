"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateSaleEvent, type SaleEvent } from "@/hooks/use-sale-events";
import { cn } from "@/lib/utils";
import { bagsToMeters, isRollBag, metersToBags, calculateStockPrediction } from "@/lib/services/inventory-service";
import type { Product, WorkInProgress, IncomingStock } from "@/types";
import { toast } from "react-hot-toast";

type StockAllocationDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    saleEvents: SaleEvent[];
    currentInventory?: number;
    wips?: WorkInProgress[];
    incomingItems?: IncomingStock[];
    supplierStock?: number;
    onUpdate?: () => void;
};

export function StockAllocationDialog({
    isOpen,
    onClose,
    product,
    saleEvents,
    currentInventory = 0,
    wips = [],
    incomingItems = [],
    supplierStock = 0,
    onUpdate,
}: StockAllocationDialogProps): React.ReactElement {
    const { updateAllocation, updateProducedStatus, loading } = useUpdateSaleEvent();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQuantity, setEditQuantity] = useState<string>("");

    if (!product) return <></>;

    // この商品を引き当てているイベントを抽出
    const allocations = saleEvents.flatMap(event => {
        const item = event.items.find(i => i.productId === product.id);
        if (item && (item.allocatedQuantity > 0 || item.isProduced)) {
            return [{
                eventId: event.id,
                itemId: item.id,
                eventName: event.clientName,
                dates: event.dates,
                quantity: item.allocatedQuantity,
                status: event.status,
                isProduced: item.isProduced || false,
            }];
        }
        return [];
    }).sort((a, b) => {
        const dateA = a.dates.length > 0 ? a.dates[0] : "";
        const dateB = b.dates.length > 0 ? b.dates[0] : "";
        return dateA.localeCompare(dateB);
    });

    // 現在庫（枚数ベース）を準備
    const isRoll = product.shape ? isRollBag(product.shape) : false;
    
    // 在庫予測シミュレーションを実行
    const prediction = calculateStockPrediction(
        currentInventory,
        product.dailyShipmentRate || 0,
        product.productionLeadDays || 0,
        product,
        allocations
            .filter(a => a.status !== 'completed' && a.status !== 'cancelled' && !a.isProduced)
            .map(a => ({ dates: a.dates, quantity: a.quantity, eventName: a.eventName })),
        wips
            .filter(w => w.status === 'in_progress')
            .map(w => ({
                quantity: w.quantity,
                expectedDate: w.expectedCompletion ? new Date(w.expectedCompletion) : null,
                termType: w.termType
            })),
        incomingItems.map(i => ({
            quantity: i.quantity,
            expectedDate: i.expectedDate ? new Date(i.expectedDate) : null
        })),
        supplierStock
    );

    // 有効在庫（最終的な予測値）
    const finalSimulation = prediction.simulation[prediction.simulation.length - 1];
    const effectiveStockMeters = finalSimulation ? finalSimulation.stock : 0;
    const effectiveStockPieces = isRoll && product.weight 
        ? metersToBags(effectiveStockMeters, product.weight)
        : effectiveStockMeters;
    
    // 合計引当数（計算用）
    const totalAllocated = allocations
        .filter(a => a.status !== 'completed' && a.status !== 'cancelled' && !a.isProduced)
        .reduce((sum, item) => sum + item.quantity, 0);

    // シミュレーションから特定の日付の在庫と入荷情報を取得するヘルパー
    const getSimulationAtDate = (dateStr: string) => {
        if (!prediction.simulation.length) return { stock: 0, arrivals: 0 };
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);
        
        // 日付が一致する記録を探す
        const exactRecord = prediction.simulation.find(s => {
            const d = new Date(s.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === targetDate.getTime();
        });

        if (exactRecord) return { stock: exactRecord.stock, arrivals: exactRecord.arrivals };

        // 一致しない場合は、それ以前で最も近いシミュレーション結果を探す
        const record = [...prediction.simulation]
            .reverse()
            .find(s => {
                const d = new Date(s.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime() <= targetDate.getTime();
            });
        
        return { 
            stock: record ? record.stock : prediction.simulation[0].stock,
            arrivals: 0
        };
    };

    // 巻数の計算ヘルパー（枚数 -> メートル -> 巻数）
    const calculateRolls = (quantityPieces: number) => {
        if (!product.metersPerRoll || !product.weight) return null;
        const meters = bagsToMeters(quantityPieces, product.weight);
        return (meters / product.metersPerRoll).toFixed(1);
    };

    // メートルから巻数を直接計算するヘルパー
    const calculateRollsFromMeters = (meters: number) => {
        if (!product.metersPerRoll) return null;
        return (meters / product.metersPerRoll).toFixed(1);
    };

    const handleSave = async (alloc: typeof allocations[0]) => {
        const quantity = parseInt(editQuantity, 10);
        if (isNaN(quantity) || quantity < 0) {
            toast.error("有効な数値を入力してください");
            return;
        }

        const success = await updateAllocation(alloc.eventId, alloc.itemId, quantity);
        if (success) {
            toast.success("引当数を更新しました");
            setEditingId(null);
            if (onUpdate) onUpdate();
        }
    };

    const handleToggleProduced = async (alloc: typeof allocations[0]) => {
        const success = await updateProducedStatus(alloc.eventId, alloc.itemId, !alloc.isProduced);
        if (success) {
            toast.success(alloc.isProduced ? "生産済を解除しました" : "生産済としてマークしました");
            if (onUpdate) onUpdate();
        } else {
            toast.error("更新に失敗しました");
        }
    };

    const handleEdit = (alloc: typeof allocations[0]) => {
        setEditingId(alloc.itemId);
        setEditQuantity(alloc.quantity.toString());
    };

    const unit = product.category === 'bag' || product.category === 'new_rice' ? '枚' : '個';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setEditingId(null);
                onClose();
            }
        }}>
            <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>特売引当詳細</DialogTitle>
                    <DialogDescription>
                        {product.name} の引当状況
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-6 py-2 flex-1 flex flex-col min-h-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex justify-between items-center bg-muted/50 p-2.5 rounded-lg border border-border/50">
                            <span className="font-medium text-sm">引当合計</span>
                            <span className="text-base font-bold text-blue-600">
                                {totalAllocated.toLocaleString()} {unit}
                                {product.metersPerRoll && (
                                    <span className="text-xs font-normal text-muted-foreground ml-1">
                                        / 約{calculateRolls(totalAllocated)}巻
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                            <span className="font-medium text-sm">有効在庫 (予測)</span>
                            <span className={cn(
                                "text-base font-bold",
                                effectiveStockMeters <= (product.minStockAlert || 0) ? "text-red-600" : "text-emerald-600"
                            )}>
                                {effectiveStockMeters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                <span className="text-xs ml-0.5">m</span>
                                {product.metersPerRoll && (
                                    <span className="text-xs font-normal text-muted-foreground ml-1">
                                        / 約{calculateRollsFromMeters(effectiveStockMeters)}巻
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                    {prediction.estimatedDate && (
                        <div className={cn(
                            "px-3 py-2 rounded-md text-xs border flex items-center gap-2",
                            prediction.remainingDays < 14 ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        )}>
                            <div className="flex-1">
                                <span className="font-bold">在庫枯渇予測:</span> {format(prediction.estimatedDate, "yyyy/MM/dd")}頃 (残り {prediction.remainingDays}日)
                                {product.dailyShipmentRate && product.dailyShipmentRate > 0 && (
                                    <span className="ml-2 opacity-80">通常出荷: {product.dailyShipmentRate.toLocaleString()}枚/日 を考慮</span>
                                )}
                            </div>
                            {prediction.wipStartAlert && (
                                <Badge className="bg-red-600 animate-pulse border-none">仕掛開始推奨!</Badge>
                            )}
                        </div>
                    )}

                    {allocations.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4">
                            引当中のイベントはありません
                        </div>
                    ) : (
                        <div className="border rounded-lg flex-1 min-h-0 overflow-auto shadow-sm w-full">
                            <Table className="w-full">
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="h-10 px-2 text-xs sm:text-sm">イベント / 納品先</TableHead>
                                        <TableHead className="h-10 px-2 text-xs sm:text-sm">日程</TableHead>
                                        <TableHead className="h-10 px-2 text-right text-xs sm:text-sm">数量</TableHead>
                                        <TableHead className="h-10 px-2 text-center text-xs sm:text-sm">生産済</TableHead>
                                        <TableHead className="h-10 pl-2 pr-4 text-right text-xs sm:text-sm">有効在庫</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allocations.map((alloc, i) => {
                                        const isCompleted = alloc.status === 'completed';
                                        const sim = getSimulationAtDate(alloc.dates[0]);
                                        const currentEffectiveStockMeters = sim.stock;
                                        
                                        // 同日の入荷バッジ重複を避けるため、日付が前行と同じなら非表示
                                        const prevAlloc = i > 0 ? allocations[i - 1] : null;
                                        const isFirstOfDate = !prevAlloc || prevAlloc.dates[0] !== alloc.dates[0];
                                        const showArrival = sim.arrivals > 0 && isFirstOfDate;

                                        return (
                                            <TableRow key={i} className={cn("hover:bg-muted/30", !isCompleted && currentEffectiveStockMeters <= (product.minStockAlert || 0) && "bg-red-50/30")}>
                                                <TableCell className="px-2 py-1">
                                                    <div className="font-medium text-xs sm:text-sm leading-tight">{alloc.eventName}</div>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Badge variant="outline" className="px-1.5 py-0 h-4 text-[10px] font-normal">
                                                            {alloc.status === 'active' ? '開催中' : isCompleted ? '終了' : '予定'}
                                                        </Badge>
                                                        {showArrival && (
                                                            <Badge className="bg-emerald-500 hover:bg-emerald-600 px-1 py-0 h-4 text-[9px] font-bold border-none text-white whitespace-nowrap">
                                                                +{sim.arrivals.toLocaleString()} 入荷あり
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-2 py-1 text-xs sm:text-sm">
                                                    {alloc.dates.length > 0 ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="whitespace-nowrap">{format(new Date(alloc.dates[0]), "MM/dd", { locale: ja })}</span>
                                                            {alloc.dates.length > 1 && (
                                                                <span className="text-muted-foreground text-[10px]">他{alloc.dates.length - 1}日</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-2 py-1 text-right whitespace-nowrap">
                                                    {editingId === alloc.itemId ? (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Input
                                                                type="number"
                                                                value={editQuantity === "0" ? "" : editQuantity}
                                                                onChange={(e) => setEditQuantity(e.target.value)}
                                                                className="w-16 sm:w-20 h-7 px-1 text-right text-xs sm:text-sm"
                                                                autoFocus
                                                                min={0}
                                                                placeholder="数量"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSave(alloc);
                                                                    if (e.key === 'Escape') setEditingId(null);
                                                                }}
                                                            />
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleSave(alloc)} disabled={loading}>
                                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:bg-gray-100" onClick={() => setEditingId(null)} disabled={loading}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="font-medium flex items-center justify-end gap-1 sm:gap-2 group/edit cursor-pointer" onClick={() => handleEdit(alloc)}>
                                                            <div className="flex flex-col items-end leading-tight">
                                                                <span className="text-xs sm:text-sm">{alloc.quantity.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal opacity-70">{unit}</span></span>
                                                                {product.metersPerRoll && (
                                                                    <span className="text-[9px] sm:text-[10px] text-muted-foreground">約{calculateRolls(alloc.quantity)}巻</span>
                                                                )}
                                                            </div>
                                                            <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground opacity-30 sm:opacity-0 sm:group-hover/edit:opacity-100 transition-opacity" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-2 py-1 text-center">
                                                    <div className="flex justify-center">
                                                        <Checkbox 
                                                            id={`produced-${alloc.itemId}`}
                                                            checked={alloc.isProduced}
                                                            onCheckedChange={() => handleToggleProduced(alloc)}
                                                            disabled={loading || isCompleted}
                                                            className="h-4 w-4"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="pl-2 pr-4 py-1 text-right whitespace-nowrap">
                                                    {!isCompleted ? (
                                                        <div className="flex flex-col items-end leading-tight">
                                                            <div className={cn(
                                                                "font-semibold text-xs sm:text-sm",
                                                                currentEffectiveStockMeters <= (product.minStockAlert || 0) ? "text-red-600" : "text-emerald-600"
                                                            )}>
                                                                {currentEffectiveStockMeters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                                <span className="text-[10px] ml-0.5 font-normal">m</span>
                                                            </div>
                                                                {product.metersPerRoll && (
                                                                <div className="text-[9px] sm:text-[10px] text-muted-foreground whitespace-nowrap">/ 約{calculateRollsFromMeters(currentEffectiveStockMeters)}巻</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-muted-foreground text-[10px] sm:text-xs">-</div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
