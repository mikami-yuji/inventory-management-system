"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculableInput } from "@/components/ui/calculable-input";
import { Label } from "@/components/ui/label";
import { Pencil, Package, Clock, CalendarDays, Loader2, Mic, MicOff, TrendingDown, Info, Barcode, Hash, LineChart } from "lucide-react";
import { useUpdateInventory } from "@/hooks/use-inventory";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { cn } from "@/lib/utils";
import { isRollBag, getPitch, bagsToMeters } from "@/lib/services";
import type { Product, WorkInProgress, SupplierStockLot } from "@/types";
import { ProductAnalysisDialog } from "@/components/inventory/product-analysis-dialog";

export type SaleAllocationDetail = {
    eventId: string;
    clientName: string;
    quantity: number;
    dates: string[];
};

type ProductDetailDialogProps = {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentStock: number;
    supplierStock: number;
    supplierStockLots: SupplierStockLot[];
    wipItems: WorkInProgress[];
    saleAllocations?: { bags: number; meters: number };
    detailedAllocations: SaleAllocationDetail[];
    onEditProduct: (product: Product) => void;
    onSuccess: () => void;
};

export function ProductDetailDialog({
    product,
    open,
    onOpenChange,
    currentStock,
    supplierStock,
    supplierStockLots,
    wipItems,
    saleAllocations,
    detailedAllocations,
    onEditProduct,
    onSuccess
}: ProductDetailDialogProps): React.ReactElement {
    const [quantity, setQuantity] = useState<string>("");
    const [analysisOpen, setAnalysisOpen] = useState(false);
    const { updateStock, loading, error } = useUpdateInventory();

    const isRoll = product?.shape && isRollBag(product.shape);
    const unit = isRoll ? "m" : "枚";

    const { isListening, startListening, stopListening, hasSupport } = useVoiceInput({
        onResult: (text) => {
            const normalized = text.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            const match = normalized.match(/(\d+)/);
            if (match) {
                setQuantity(match[0]);
            }
        }
    });

    useEffect(() => {
        if (open && product) {
            setQuantity(currentStock.toString());
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

        const success = await updateStock(product.id, newQuantity, "adjustment", "");

        if (success) {
            onSuccess();
            onOpenChange(false);
        }
    };

    if (!product) return <></>;

    const wipQuantity = wipItems.reduce((sum, item) => sum + item.quantity, 0);
    const allocationQty = isRoll ? (saleAllocations?.meters || 0) : (saleAllocations?.bags || 0);

    // 有効在庫計算 (ロールの場合はメーター同士、袋の場合は枚同士)
    const availableStock = Math.max(0, currentStock - allocationQty);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden max-h-[95vh] flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <div className="flex flex-col md:flex-row h-full">
                        {/* 左側: 商品画像と基本情報 (Mobile: Side-by-side, Desktop: Column) */}
                        <div className="md:w-52 bg-slate-50 p-4 border-b md:border-b-0 md:border-r">
                            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0">
                                <div className="w-24 h-24 md:w-full md:aspect-square bg-white rounded-lg border shadow-sm overflow-hidden md:mb-4 flex-shrink-0">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-slate-100">
                                            <Package className="h-8 w-8 opacity-20" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 w-full space-y-2 md:space-y-3">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold hidden md:block">Product Specs</div>

                                    <div className="space-y-0.5 md:space-y-1">
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                            <Hash className="h-3 w-3" /> SKU: {product.sku || '-'}
                                        </div>
                                        {product.productCode && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                                <Barcode className="h-3 w-3" /> Code: {product.productCode}
                                            </div>
                                        )}
                                        {product.janCode && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                                <Info className="h-3 w-3" /> JAN: {product.janCode}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {product.variety && <Badge variant="outline" className="text-[9px] px-1 h-4 bg-amber-50 text-amber-700 border-amber-200">{product.variety}</Badge>}
                                        {product.origin && <Badge variant="outline" className="text-[9px] px-1 h-4 bg-green-50 text-green-700 border-green-200">{product.origin}</Badge>}
                                        <Badge variant="outline" className="text-[9px] px-1 h-4 bg-slate-100">{product.weight}kg / {product.shape}</Badge>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-7 md:h-8 text-[10px] md:text-xs gap-1.5 mt-1 md:mt-2"
                                        onClick={() => setAnalysisOpen(true)}
                                    >
                                        <LineChart className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                        在庫分析・予測
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-7 md:h-8 text-[10px] md:text-xs gap-1.5 mt-1"
                                        onClick={() => {
                                            onOpenChange(false);
                                            onEditProduct(product);
                                        }}
                                    >
                                        <Pencil className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                        基本情報を編集
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* 右側: 在庫状況と調整フォーム */}
                        <div className="flex-1 p-6">
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-lg font-bold">{product.name} ({product.weight}kg)</DialogTitle>
                                <DialogDescription className="text-xs">
                                    在庫状況の確認と調整を行います
                                </DialogDescription>
                            </DialogHeader>

                            {/* 調整フォーム (Moved to top for accessibility) */}
                            <form onSubmit={handleSave} className="space-y-3 mb-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                <div className="flex items-center justify-between mb-1">
                                    <Label htmlFor="quantity" className="text-xs font-bold flex items-center gap-1.5 text-slate-700">
                                        <Info className="h-3.5 w-3.5 text-primary" />
                                        在庫数の調整 (棚卸し)
                                    </Label>
                                    <div className="text-[10px] text-muted-foreground bg-white px-2 py-0.5 rounded border border-slate-100 font-medium">
                                        現在: {currentStock.toLocaleString()}{unit}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <CalculableInput
                                            id="quantity"
                                            value={quantity}
                                            onChange={(value) => setQuantity(value === null ? "" : String(value))}
                                            className="pr-12 text-base font-bold h-10 border-slate-200 focus:border-primary focus:ring-primary/20"
                                            stringifyOnComplete
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                            {unit}
                                        </div>
                                    </div>
                                    {hasSupport && (
                                        <Button
                                            type="button"
                                            variant={isListening ? "destructive" : "outline"}
                                            size="icon"
                                            onClick={isListening ? stopListening : startListening}
                                            className={cn("h-10 w-10 shrink-0", isListening && "animate-pulse")}
                                        >
                                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                        </Button>
                                    )}
                                    <Button type="submit" className="h-10 px-4 font-bold shrink-0" disabled={loading || parseInt(quantity, 10) === currentStock}>
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "更新"}
                                    </Button>
                                </div>

                                {/* 増減表示 */}
                                <div className="flex justify-start min-h-[16px]">
                                    {(() => {
                                        const newQty = parseInt(quantity, 10);
                                        if (isNaN(newQty)) return null;
                                        const diff = newQty - currentStock;
                                        if (diff === 0) return null;
                                        if (diff > 0) return <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">+{diff.toLocaleString()}{unit} 増加します</span>;
                                        return <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">{diff.toLocaleString()}{unit} 減少します</span>;
                                    })()}
                                </div>

                                {error && (
                                    <p className="text-[10px] text-red-500 font-medium">{error}</p>
                                )}
                            </form>

                            {/* 在庫サマリー & 詳細 */}
                            <div className="space-y-4 mb-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <div className="flex items-center text-blue-600 mb-1">
                                            <Package className="h-3.5 w-3.5 mr-1" />
                                            <span className="text-[10px] font-semibold uppercase tracking-tight">メーカー在庫 合計</span>
                                        </div>
                                        <div className="text-base font-bold text-blue-900">{supplierStock.toLocaleString()}<span className="text-[10px] font-normal ml-0.5">{unit}</span></div>
                                    </div>
                                    <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                                        <div className="flex items-center text-orange-600 mb-1">
                                            <Clock className="h-3.5 w-3.5 mr-1" />
                                            <span className="text-[10px] font-semibold uppercase tracking-tight">仕掛中 合計</span>
                                        </div>
                                        <div className="text-base font-bold text-orange-900">{wipQuantity.toLocaleString()}<span className="text-[10px] font-normal ml-0.5">{unit}</span></div>
                                    </div>
                                    <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                                        <div className="flex items-center text-purple-600 mb-1">
                                            <CalendarDays className="h-3.5 w-3.5 mr-1" />
                                            <span className="text-[10px] font-semibold uppercase tracking-tight">特売引当 合計</span>
                                        </div>
                                        <div className="text-base font-bold text-purple-900">{(saleAllocations?.bags || 0).toLocaleString()}<span className="text-[10px] font-normal ml-0.5">枚</span></div>
                                    </div>
                                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                        <div className="flex items-center text-emerald-600 mb-1">
                                            <TrendingDown className="h-3.5 w-3.5 mr-1" />
                                            <span className="text-[10px] font-semibold uppercase tracking-tight">有効在庫</span>
                                        </div>
                                        <div className="text-base font-bold text-emerald-900">{availableStock.toLocaleString()}<span className="text-[10px] font-normal ml-0.5">{unit}</span></div>
                                    </div>
                                </div>

                                {/* 詳細リストエリア */}
                                <div className="grid grid-cols-2 gap-4 text-[11px]">
                                    {/* メーカー在庫ロット */}
                                    <div className="space-y-1.5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b pb-0.5">メーカー在庫内訳</div>
                                        <div className="max-h-32 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                            {supplierStockLots && supplierStockLots.length > 0 ? (
                                                supplierStockLots.map((lot, i) => {
                                                    const now = new Date();
                                                    const arrival = new Date(lot.stockDate);
                                                    const monthsElapsed = (now.getFullYear() - arrival.getFullYear()) * 12 + now.getMonth() - arrival.getMonth();
                                                    const isLongTerm = monthsElapsed >= 5;
                                                    return (
                                                        <div key={i} className="flex justify-between items-center py-0.5 border-b border-slate-50 last:border-0">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-slate-500">{new Date(lot.stockDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}</span>
                                                                {isLongTerm && <Badge variant="destructive" className="h-3 px-1 text-[7px] leading-none">長期</Badge>}
                                                            </div>
                                                            <span className="font-medium text-slate-700">{lot.quantity.toLocaleString()}{unit}</span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-slate-400 italic py-1">ロット情報なし</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 仕掛中リスト */}
                                    <div className="space-y-1.5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b pb-0.5">仕掛中・予定内訳</div>
                                        <div className="max-h-32 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                            {wipItems && wipItems.length > 0 ? (
                                                wipItems.map((item) => (
                                                    <div key={item.id} className="flex justify-between items-center py-0.5 border-b border-slate-50 last:border-0">
                                                        <span className="text-slate-500">
                                                            {item.expectedCompletion ? (() => {
                                                                const d = new Date(item.expectedCompletion);
                                                                const month = d.getMonth() + 1;
                                                                if (item.termType === 'early') return `${month}月上旬`;
                                                                if (item.termType === 'mid') return `${month}月中旬`;
                                                                if (item.termType === 'late') return `${month}月下旬`;
                                                                return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
                                                            })() : '未定'}
                                                        </span>
                                                        <span className="font-medium text-slate-700">{item.quantity.toLocaleString()}{unit}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-slate-400 italic py-1">仕掛情報なし</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 特売引当リスト */}
                                    <div className="space-y-1.5 col-span-2 mt-2">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b pb-0.5">特売引当内訳</div>
                                        <div className="max-h-32 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                            {detailedAllocations && detailedAllocations.length > 0 ? (
                                                detailedAllocations.map((alloc, i) => (
                                                    <div key={i} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded px-1">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-700">{alloc.clientName}</span>
                                                            <span className="text-[9px] text-slate-400">
                                                                {alloc.dates.map(d => new Date(d).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })).join(', ')}
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-purple-700">{alloc.quantity.toLocaleString()}枚</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-slate-400 italic py-1">引当情報なし</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 在庫分析ダイアログ */}
                <ProductAnalysisDialog
                    product={product}
                    currentStock={currentStock}
                    open={analysisOpen}
                    onOpenChange={setAnalysisOpen}
                />
            </DialogContent>
        </Dialog>
    );
}
