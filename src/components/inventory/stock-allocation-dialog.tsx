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
import { useUpdateSaleEvent, type SaleEvent } from "@/hooks/use-sale-events";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { toast } from "react-hot-toast";

type StockAllocationDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    saleEvents: SaleEvent[];
    currentInventory?: number; // 追加
    onUpdate?: () => void;
};

export function StockAllocationDialog({
    isOpen,
    onClose,
    product,
    saleEvents,
    currentInventory = 0, // 追加
    onUpdate,
}: StockAllocationDialogProps): React.ReactElement {
    const { updateAllocation, loading } = useUpdateSaleEvent();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQuantity, setEditQuantity] = useState<string>("");

    if (!product) return <></>;

    // この商品を引き当てているイベントを抽出
    const allocations = saleEvents.flatMap(event => {
        const item = event.items.find(i => i.productId === product.id);
        if (item && item.allocatedQuantity > 0) {
            return [{
                eventId: event.id,
                itemId: item.id,
                eventName: event.clientName, // クライアント名をイベント名として使用
                dates: event.dates,
                quantity: item.allocatedQuantity,
                status: event.status,
            }];
        }
        return [];
    }).sort((a, b) => {
        const dateA = a.dates.length > 0 ? a.dates[0] : "";
        const dateB = b.dates.length > 0 ? b.dates[0] : "";
        return dateA.localeCompare(dateB);
    });

    const totalAllocated = allocations.reduce((sum, item) => sum + item.quantity, 0);
    const effectiveStock = currentInventory - totalAllocated; // 有効在庫を計算

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
        } else {
            toast.error("更新に失敗しました");
        }
    };

    const handleEdit = (alloc: typeof allocations[0]) => {
        setEditingId(alloc.itemId);
        setEditQuantity(alloc.quantity.toString());
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setEditingId(null);
                onClose();
            }
        }}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>特売引当詳細</DialogTitle>
                    <DialogDescription>
                        {product.name} の引当状況
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex justify-between items-center bg-muted p-2 rounded">
                            <span className="font-medium text-sm">引当合計</span>
                            <span className="text-base font-bold text-blue-600">
                                {totalAllocated.toLocaleString()} {product.category === 'bag' || product.category === 'new_rice' ? '枚' : '個'}
                                {product.metersPerRoll && (
                                    <span className="text-xs font-normal text-muted-foreground ml-1">
                                        / 約{(totalAllocated / product.metersPerRoll).toFixed(1)}巻
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                            <span className="font-medium text-sm">有効在庫</span>
                            <span className={cn(
                                "text-base font-bold",
                                effectiveStock <= 0 ? "text-red-600" : "text-emerald-600"
                            )}>
                                {effectiveStock.toLocaleString()} {product.category === 'bag' || product.category === 'new_rice' ? '枚' : '個'}
                                {product.metersPerRoll && (
                                    <span className="text-xs font-normal text-muted-foreground ml-1">
                                        / 約{(effectiveStock / product.metersPerRoll).toFixed(1)}巻
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                    {allocations.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4">
                            引当中のイベントはありません
                        </div>
                    ) : (
                        <div className="border rounded-md max-h-[60vh] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        <TableHead>イベント / 納品先</TableHead>
                                        <TableHead>日程</TableHead>
                                        <TableHead className="text-right">数量</TableHead>
                                        <TableHead className="text-right">有効在庫</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allocations.map((alloc, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div className="font-medium">{alloc.eventName}</div>
                                                <Badge variant="outline" className="mt-1 text-xs">
                                                    {alloc.status === 'active' ? '開催中' : alloc.status === 'completed' ? '終了' : '予定'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {alloc.dates.length > 0 ? (
                                                    <div className="flex flex-col">
                                                        <span>{format(new Date(alloc.dates[0]), "MM/dd", { locale: ja })}</span>
                                                        {alloc.dates.length > 1 && (
                                                            <span className="text-muted-foreground text-xs">他{alloc.dates.length - 1}日</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                {editingId === alloc.itemId ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Input
                                                            type="number"
                                                            value={editQuantity === "0" ? "" : editQuantity}
                                                            onChange={(e) => setEditQuantity(e.target.value)}
                                                            className="w-20 h-7 text-right text-sm"
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
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-500 hover:bg-gray-100" onClick={() => setEditingId(null)} disabled={loading}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="font-medium flex items-center justify-end gap-2 group/edit cursor-pointer" onClick={() => handleEdit(alloc)}>
                                                        <div className="flex flex-col items-end">
                                                            <span>{alloc.quantity.toLocaleString()}</span>
                                                            {product.metersPerRoll && (
                                                                <span className="text-[10px] text-muted-foreground">約{(alloc.quantity / product.metersPerRoll).toFixed(1)}巻</span>
                                                            )}
                                                        </div>
                                                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                <div className={cn(
                                                    "font-medium",
                                                    effectiveStock <= 0 ? "text-red-600" : "text-emerald-600"
                                                )}>
                                                    {effectiveStock.toLocaleString()}
                                                </div>
                                                {product.metersPerRoll && (
                                                    <div className="text-[10px] text-muted-foreground">約{(effectiveStock / product.metersPerRoll).toFixed(1)}巻</div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
