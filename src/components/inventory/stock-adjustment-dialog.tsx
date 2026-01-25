"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateInventory } from "@/hooks/use-supabase-data";
import { Loader2 } from "lucide-react";
import type { Product } from "@/types";

type StockAdjustmentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    currentStock: number;
    onSuccess: () => void;
};

export function StockAdjustmentDialog({
    open,
    onOpenChange,
    product,
    currentStock,
    onSuccess
}: StockAdjustmentDialogProps): React.ReactElement {
    const [quantity, setQuantity] = useState<string>("");
    const [note, setNote] = useState<string>("");
    const { updateStock, loading, error } = useUpdateInventory();

    useEffect(() => {
        if (open && product) {
            setQuantity(currentStock.toString());
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
                    <DialogTitle>在庫数調整</DialogTitle>
                    <DialogDescription>
                        {product.name} の在庫数を直接変更します。<br />
                        この操作は「調整」として履歴に記録されます。
                    </DialogDescription>
                </DialogHeader>

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
                        <Input
                            id="quantity"
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="col-span-3"
                        />
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
