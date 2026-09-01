/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalculableInput } from "@/components/ui/calculable-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateInventory } from "@/hooks/use-inventory";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useUndoToast } from "@/hooks/use-undo-toast";
import { Loader2, Mic, MicOff, Package, Clock, CalendarDays, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, WorkInProgress } from "@/types";

type StockAdjustmentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    currentStock: number;
    oldPriceQuantity?: number; // 旧価格在庫数
    supplierStock?: number;
    wipItems?: WorkInProgress[];
    saleAllocations?: { bags: number; meters: number };
    onSuccess: () => void;
};

export function StockAdjustmentDialog({
    open,
    onOpenChange,
    product,
    currentStock,
    oldPriceQuantity = 0,
    supplierStock = 0,
    wipItems = [],
    saleAllocations,
    onSuccess
}: StockAdjustmentDialogProps): React.ReactElement {
    const [quantity, setQuantity] = useState<string>(currentStock.toString());
    const [note, setNote] = useState<string>("");
    const [showConfirmLargeChange, setShowConfirmLargeChange] = useState<boolean>(false);
    const { updateStock, loading, error } = useUpdateInventory();
    const { showUndoToast } = useUndoToast();

    const { isListening, startListening, stopListening, hasSupport } = useVoiceInput({
        onResult: (text) => {
            // Case 1: Quantity (e.g. "50")
            const normalized = text.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            const match = normalized.match(/(\d+)/);
            if (match) {
                setQuantity(match[0]);
            }
        }
    });

    useEffect(() => {
        if (open && product) {
            const currentStockStr = currentStock.toString();
            setQuantity(prev => (prev !== currentStockStr) ? currentStockStr : prev);
            setNote("");
            setShowConfirmLargeChange(false);
        }
    }, [open, product, currentStock, oldPriceQuantity]);

    // 調整後の数量（手動入力）に基づいて、旧価格・新価格在庫を自動計算する (FIFO)
    const newQty = parseInt(quantity, 10);
    const diff = isNaN(newQty) ? 0 : currentStock - newQty;
    const calculatedOldPriceQty = diff > 0 ? Math.max(0, oldPriceQuantity - diff) : oldPriceQuantity;
    const calculatedNewPriceQty = isNaN(newQty) ? 0 : Math.max(0, newQty - calculatedOldPriceQty);

    // 大幅な変動（300%以上または5000以上の乖離）の判定
    const absoluteDiff = Math.abs(currentStock - (isNaN(newQty) ? currentStock : newQty));
    const isLargeVariance = currentStock > 0
        ? (absoluteDiff >= 5000 || absoluteDiff >= currentStock * 3)
        : absoluteDiff >= 5000;

    const executeSave = async () => {
        if (!product) return;
        const newQuantity = parseInt(quantity, 10);
        const previousStock = currentStock;

        // 調整タイプとして実行
        const success = await updateStock(product.id, newQuantity, "adjustment", note);

        if (success) {
            onSuccess();
            onOpenChange(false);

            // Undoトーストを表示
            showUndoToast({
                message: `${product.name} の在庫を ${previousStock.toLocaleString()} → ${newQuantity.toLocaleString()} に変更しました`,
                onUndo: async () => {
                    await updateStock(product.id, previousStock, "adjustment", "Undo: 在庫調整の取り消し");
                    onSuccess();
                }
            });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        const newQuantity = parseInt(quantity, 10);
        if (isNaN(newQuantity) || newQuantity < 0) {
            alert("有効な数量を入力してください");
            return;
        }

        // 大幅な変動がある場合は二重確認を表示
        if (isLargeVariance && !showConfirmLargeChange) {
            setShowConfirmLargeChange(true);
            return;
        }

        await executeSave();
    };

    if (!product) return <></>;

    const isRoll: boolean = product.shape?.toLowerCase().includes("roll") || product.shape === "原反";
    const unit: string = isRoll ? "m" : "枚";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>在庫数調整 (棚卸し)</DialogTitle>
                    <DialogDescription>
                        {product.name} の在庫数を直接変更します。<br />
                        この操作は「調整」として履歴に記録されます。
                    </DialogDescription>
                </DialogHeader>

                {/* 付加情報の表示 */}
                <div className="grid grid-cols-3 gap-2 py-2 mt-2 border-y border-muted">
                    <div className="flex flex-col items-center justify-center p-2 bg-blue-50/50 rounded-md border border-blue-100">
                        <div className="flex items-center text-blue-600 mb-1">
                            <Package className="h-4 w-4 mr-1" />
                            <span className="text-xs font-semibold">メーカー在庫</span>
                        </div>
                        <span className="font-bold text-blue-900">{supplierStock.toLocaleString()}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-2 bg-orange-50/50 rounded-md border border-orange-100">
                        <div className="flex items-center text-orange-600 mb-1">
                            <Clock className="h-4 w-4 mr-1" />
                            <span className="text-xs font-semibold">仕掛中・予定</span>
                        </div>
                        <span className="font-bold text-orange-900">
                            {wipItems.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                        </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-2 bg-purple-50/50 rounded-md border border-purple-100">
                        <div className="flex items-center text-purple-600 mb-1">
                            <CalendarDays className="h-4 w-4 mr-1" />
                            <span className="text-xs font-semibold">特売引当</span>
                        </div>
                        <span className="font-bold text-purple-900">
                            {product.shape?.toLowerCase().includes('roll') || product.shape === '原反'
                                ? saleAllocations?.meters || 0
                                : saleAllocations?.bags || 0}
                        </span>
                    </div>
                </div>

                <form
                    onSubmit={handleSave}
                    className="grid gap-4 py-4"
                >
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="current" className="text-right">
                            現在庫
                        </Label>
                        <div className="col-span-3 font-medium">
                            {currentStock.toLocaleString()}
                        </div>
                    </div>
                    {oldPriceQuantity > 0 && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-orange-600 text-xs">
                                旧価格在庫
                            </Label>
                            <div className="col-span-3 text-sm font-medium">
                                {calculatedOldPriceQty.toLocaleString()}{unit}
                                <span className="text-[10px] text-muted-foreground ml-3">
                                    (新価格在庫: {calculatedNewPriceQty.toLocaleString()}{unit})
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                            変更後
                        </Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <CalculableInput
                                id="quantity"
                                value={quantity === "0" ? "" : quantity}
                                onChange={(value) => setQuantity(value === null ? "" : String(value))}
                                className="flex-1"
                                placeholder="数量を入力"
                                stringifyOnComplete
                            />
                            {hasSupport && (
                                <Button
                                    type="button"
                                    variant={isListening ? "destructive" : "outline"}
                                    size="icon"
                                    onClick={isListening ? stopListening : startListening}
                                    className={cn(isListening && "animate-pulse")}
                                >
                                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 増減数の表示エリア */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <div className="col-start-2 col-span-3 min-h-[24px]">
                            {(() => {
                                const newQty = parseInt(quantity, 10);
                                if (isNaN(newQty)) return null;

                                const diff = newQty - currentStock;
                                if (diff === 0) {
                                    return <span className="text-sm font-medium text-gray-500">増減なし (±0)</span>;
                                } else if (diff > 0) {
                                    return <span className="text-sm font-bold text-green-600">+{diff.toLocaleString()} 増</span>;
                                } else {
                                    return <span className="text-sm font-bold text-red-600">{diff.toLocaleString()} 減</span>;
                                }
                            })()}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="note" className="text-right">
                            備考
                        </Label>
                        <Textarea
                            id="note"
                            placeholder="（任意）調整理由があれば入力"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    {/* 大幅変動の確認警告 */}
                    {showConfirmLargeChange && (
                        <div className="bg-amber-50 border border-amber-300 rounded-md p-3 text-amber-900 text-xs flex flex-col gap-2">
                            <div className="flex items-center gap-2 font-semibold text-amber-800">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>在庫の変動幅が非常に大きくなっています</span>
                            </div>
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                現在庫 {currentStock.toLocaleString()}{unit} に対し、{newQty.toLocaleString()}{unit}（差分: {Math.abs(currentStock - newQty).toLocaleString()}{unit}）への更新です。入力ミスがないかご確認ください。
                            </p>
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                    )}

                    <DialogFooter>
                        {showConfirmLargeChange ? (
                            <>
                                <Button type="button" variant="outline" onClick={() => setShowConfirmLargeChange(false)} disabled={loading}>
                                    数量を再確認する
                                </Button>
                                <Button type="submit" variant="destructive" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    この数量で確定する
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                                    キャンセル
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    更新
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
