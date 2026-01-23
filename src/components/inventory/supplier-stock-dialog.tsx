"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useWIPActions } from "@/hooks/use-work-in-progress";

interface SupplierStockDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentStock: number;
    onSuccess: () => void;
}

export function SupplierStockDialog({
    product,
    open,
    onOpenChange,
    currentStock,
    onSuccess,
}: SupplierStockDialogProps) {
    const [stock, setStock] = useState(currentStock);
    const { updateSupplierStock, loading } = useWIPActions();

    // ダイアログが開くたび、または商品が変わるたびに初期値をセット
    useEffect(() => {
        if (open) {
            setStock(currentStock);
        }
    }, [open, currentStock]);

    const handleSave = async () => {
        if (!product) return;

        const success = await updateSupplierStock(product.id, stock);
        if (success) {
            onSuccess();
            onOpenChange(false);
        }
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>メーカー在庫の更新</DialogTitle>
                    <DialogDescription>
                        {product.name} のメーカー在庫数を入力してください。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">
                            在庫数
                        </Label>
                        <Input
                            id="stock"
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(Number(e.target.value))}
                            className="col-span-3"
                            min={0}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        キャンセル
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "更新中..." : "保存"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
