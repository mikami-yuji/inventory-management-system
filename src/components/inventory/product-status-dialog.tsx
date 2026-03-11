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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type ProductStatusDialogProps = {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ProductStatusDialog({
    product,
    open,
    onOpenChange,
    onSuccess,
}: ProductStatusDialogProps) {
    const [statusOverride, setStatusOverride] = useState<'normal' | 'low_stock' | 'out_of_stock'>('normal');
    const [status, setStatus] = useState<Product['status']>('active');
    const [discontinuedDate, setDiscontinuedDate] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && product) {
            setStatusOverride(product.statusOverride || 'normal');
            setStatus(product.status || 'active');
            setDiscontinuedDate(product.discontinuedDate || '');
        }
        setError(null);
    }, [open, product]);

    const handleSave = async () => {
        if (!product) return;

        setLoading(true);
        setError(null);

        try {
            // PUT /api/products に必要な分だけ投げる。
            // 既存のフィールドを保持するため、既存のデータをベースにする
            const payload = {
                ...product,
                statusOverride,
                status,
                discontinuedDate: (status === 'discontinued' || status === 'plate_removed' || status === 'plate_removal_scheduled') && discontinuedDate
                    ? discontinuedDate
                    : undefined,
            };

            const response = await fetch("/api/products", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            console.log("Response status:", response.status);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "保存に失敗しました");
            }

            onSuccess();
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>ステータス変更 (v2)</DialogTitle>
                    <DialogDescription>
                        {product.name} の状態を変更します。
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="statusOverride" className="text-right">
                                在庫状況
                            </Label>
                            <Select
                                value={statusOverride}
                                onValueChange={(val) => setStatusOverride(val as 'normal' | 'low_stock' | 'out_of_stock')}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">自動判定 (Normal)</SelectItem>
                                    <SelectItem value="low_stock">低在庫 (強制)</SelectItem>
                                    <SelectItem value="out_of_stock">欠品 (強制)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status" className="text-right">
                                全体状態
                            </Label>
                            <Select
                                value={status}
                                onValueChange={(val) => setStatus(val as Product['status'])}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">有効/正常</SelectItem>
                                    <SelectItem value="wip_check">仕掛確認</SelectItem>
                                    <SelectItem value="spot">スポット</SelectItem>
                                    <SelectItem value="plate_removal_scheduled">落版予定</SelectItem>
                                    <SelectItem value="plate_removed">落版</SelectItem>
                                    <SelectItem value="discontinued">廃盤</SelectItem>
                                    <SelectItem value="direct_delivery">直送先在庫</SelectItem>
                                    <SelectItem value="on_sale_break">販売中断</SelectItem>
                                    <SelectItem value="inactive">無効 (非表示)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(status === 'discontinued' || status === 'plate_removed' || status === 'plate_removal_scheduled') && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="discontinuedDate" className="text-right">
                                    日付
                                </Label>
                                <Input
                                    id="discontinuedDate"
                                    type="date"
                                    value={discontinuedDate}
                                    onChange={(e) => setDiscontinuedDate(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        キャンセル
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        保存して閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
