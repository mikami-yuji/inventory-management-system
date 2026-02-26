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
import { Separator } from "@/components/ui/separator";
import { useWIPActions } from "@/hooks/use-work-in-progress";
import { Package, ArrowRight, Loader2 } from "lucide-react";

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
    const [moveQuantity, setMoveQuantity] = useState<number>(0);
    const [expectedDate, setExpectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const { updateSupplierStock, moveSupplierStockToIncoming, loading } = useWIPActions();

    // ダイアログが開くたび、または商品が変わるたびに初期値をセット
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line
            setStock(currentStock);
            setMoveQuantity(0);
            setExpectedDate(new Date().toISOString().split('T')[0]);
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

    const handleMove = async () => {
        if (!product || moveQuantity <= 0 || !expectedDate) return;

        const success = await moveSupplierStockToIncoming(product.id, moveQuantity, expectedDate);
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
                    <DialogTitle>メーカー在庫管理</DialogTitle>
                    <DialogDescription>
                        {product.name} の在庫管理を行います。
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* 在庫数更新セクション */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium leading-none">在庫数の直接更新</h4>
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
                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={loading} size="sm">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                在庫数を保存
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* 在庫移動セクション */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium leading-none text-orange-600">入荷予定へ移動（出荷指示）</h4>
                        <p className="text-xs text-muted-foreground">
                            メーカー在庫から出荷され、入荷予定に追加されます。
                        </p>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="moveQuantity" className="text-right">
                                出荷数量
                            </Label>
                            <Input
                                id="moveQuantity"
                                type="number"
                                value={moveQuantity || ""}
                                onChange={(e) => setMoveQuantity(Number(e.target.value))}
                                placeholder="出荷する数量"
                                className="col-span-3"
                                min={0}
                                max={currentStock}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="expectedDate" className="text-right">
                                入荷予定日
                            </Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input
                                    id="expectedDate"
                                    type="date"
                                    value={expectedDate}
                                    onChange={(e) => setExpectedDate(e.target.value)}
                                />
                                <Button
                                    variant="default"
                                    onClick={handleMove}
                                    disabled={loading || moveQuantity <= 0 || moveQuantity > currentStock || !expectedDate}
                                    className="whitespace-nowrap bg-orange-500 hover:bg-orange-600 text-white"
                                >
                                    <ArrowRight className="h-4 w-4 mr-1" />
                                    移動実行
                                </Button>
                            </div>
                        </div>
                        {currentStock < moveQuantity && (
                            <p className="text-[10px] text-red-500 text-right">
                                メーカー在庫以上の数量は移動できません
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
