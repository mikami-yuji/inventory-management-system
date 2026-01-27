"use client";

/**
 * 入荷予定ダイアログ
 * 商品の入荷予定を登録・編集します。
 */

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Product, IncomingStock } from "@/types";
import { useIncomingStock } from "@/hooks/use-supabase-data";

interface IncomingStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    onSuccess?: () => void;
}

export function IncomingStockDialog({ open, onOpenChange, product, onSuccess }: IncomingStockDialogProps) {
    // 状態管理
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [quantity, setQuantity] = useState<string>("");
    const [note, setNote] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 商品ごとの入荷予定データ
    const { incomingStocks, loading: loadingStocks, addIncomingStock, deleteIncomingStock, refetch } = useIncomingStock(product?.id);

    // ダイアログが開いたときに初期化
    useEffect(() => {
        if (open) {
            setDate(new Date());
            setQuantity("");
            setNote("");
            refetch();
        }
    }, [open, product, refetch]);

    // 送信ハンドラ
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !date || !quantity) return;

        setIsSubmitting(true);
        try {
            const success = await addIncomingStock({
                productId: product.id,
                expectedDate: format(date, "yyyy-MM-dd"),
                quantity: parseInt(quantity, 10),
                note: note
            });

            if (success) {
                // フォームをリセット
                setQuantity("");
                setNote("");
                // 親コンポーネントに通知
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            console.error("入荷予定の登録に失敗しました", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 削除ハンドラ
    const handleDelete = async (id: string) => {
        const success = await deleteIncomingStock(id);
        if (success && onSuccess) onSuccess();
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>入荷予定の管理: {product.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* 新規登録フォーム */}
                    <form onSubmit={handleSubmit} className="space-y-4 border-b pb-6">
                        <Label className="text-base font-semibold">新規登録</Label>

                        <div className="grid gap-2">
                            <Label htmlFor="date">入荷予定日</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "yyyy年MM月dd日", { locale: ja }) : <span>日付を選択</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="quantity">数量</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="quantity"
                                    type="number"
                                    placeholder="0"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    required
                                />
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                    {product.shape?.includes('RZ') || product.shape?.includes('RA') ? 'm' : '枚'}
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="note">備考</Label>
                            <Input
                                id="note"
                                placeholder="発注番号など"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            登録する
                        </Button>
                    </form>

                    {/* 登録済みリスト */}
                    <div>
                        <Label className="text-base font-semibold mb-2 block">登録済みの入荷予定</Label>

                        {loadingStocks ? (
                            <div className="text-center py-4 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                読み込み中...
                            </div>
                        ) : incomingStocks.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground bg-muted/30 rounded-lg">
                                入荷予定はありません
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {incomingStocks.map((stock) => (
                                    <div key={stock.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                        <div>
                                            <div className="font-medium">
                                                {format(new Date(stock.expectedDate), "yyyy年MM月dd日", { locale: ja })}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {stock.quantity.toLocaleString()}
                                                {product.shape?.includes('RZ') || product.shape?.includes('RA') ? 'm' : '枚'}
                                                {stock.note && ` · ${stock.note}`}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(stock.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
