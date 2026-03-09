"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalculableInput } from "@/components/ui/calculable-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateInventory } from "@/hooks/use-inventory";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { Loader2, Mic, MicOff, Package, Clock, CalendarDays, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, WorkInProgress, SaleEvent } from "@/types";

type StockAdjustmentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    currentStock: number;
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
    supplierStock = 0,
    wipItems = [],
    saleAllocations,
    onSuccess
}: StockAdjustmentDialogProps): React.ReactElement {
    const [quantity, setQuantity] = useState<string>(currentStock.toString());
    const [note, setNote] = useState<string>("");
    const { updateStock, loading, error } = useUpdateInventory();

    const { isListening, startListening, stopListening, hasSupport, transcript } = useVoiceInput({
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
        }
    }, [open, product, currentStock]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        const newQuantity = parseInt(quantity, 10);
        if (isNaN(newQuantity) || newQuantity < 0) {
            alert("有効な数量を入力してください");
            return;
        }

        // 調整タイプとして実行（APIは adjustment タイプの場合、quantity を新しい在庫数として扱う）
        const success = await updateStock(product.id, newQuantity, "adjustment", note);

        if (success) {
            onSuccess();
            onOpenChange(false);
        }
    };

    if (!product) return <></>;

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

                <form onSubmit={handleSave} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="current" className="text-right">
                            現在庫
                        </Label>
                        <div className="col-span-3 font-medium">
                            {currentStock.toLocaleString()}
                        </div>
                    </div>
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

                    {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            更新
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
