"use client";

/**
 * 入荷予定ダイアログ
 * 商品の入荷予定を登録・編集します。
 */

import React, { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculableInput } from "@/components/ui/calculable-input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2, Edit2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Product, DeliveryAddress, IncomingStock } from "@/types";
import { useIncomingStock } from "@/hooks/use-incoming-stock";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { isRollBag } from "@/lib/services/inventory-service";

type IncomingStockDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    onSuccess?: () => void;
    deliveryAddressId?: string;
}

export function IncomingStockDialog({ open, onOpenChange, product, onSuccess }: IncomingStockDialogProps) {
    // 状態管理
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [quantity, setQuantity] = useState<string>("");
    const [note, setNote] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);

    const [isTBD, setIsTBD] = useState(false);

    // 商品ごとの入荷予定データ
    const { incomingStocks, loading: loadingStocks, addIncomingStock, updateIncomingStock, deleteIncomingStock, receiveIncomingStock, refetch } = useIncomingStock(product?.id);

    const fetchAddresses = useCallback(async () => {
        try {
            const res = await fetch('/api/delivery-addresses');
            const data = await res.json();
            if (Array.isArray(data)) {
                setAddresses(data);
            } else if (data?.data && Array.isArray(data.data)) {
                setAddresses(data.data);
            }
        } catch (e) {
            console.error("fetchAddresses error", e);
        }
    }, []);

    // ダイアログが開いたときに初期化
    useEffect(() => {
        if (open) {
            setDate(new Date());
            setIsTBD(false);
            setQuantity("");
            setNote("");
            setEditingId(null);
            refetch();
            fetchAddresses();
        }
    }, [open, refetch, fetchAddresses]);

    // 送信ハンドラ
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || (!date && !isTBD) || !quantity) return;

        setIsSubmitting(true);
        try {
            if (editingId) {
                const success = await updateIncomingStock(editingId, {
                    expectedDate: isTBD || !date ? null : format(date, "yyyy-MM-dd"),
                    quantity: parseInt(quantity, 10),
                    note: note
                });
                if (success) {
                    toast.success("更新しました");
                    setEditingId(null);
                    setQuantity("");
                    setNote("");
                    setIsTBD(false);
                    if (onSuccess) onSuccess();
                }
            } else {
                const success = await addIncomingStock({
                    productId: product.id,
                    expectedDate: isTBD || !date ? null : format(date, "yyyy-MM-dd"),
                    quantity: parseInt(quantity, 10),
                    note: note
                });

                if (success) {
                    toast.success("登録しました");
                    setQuantity("");
                    setNote("");
                    if (onSuccess) onSuccess();
                }
            }
        } catch (error) {
            console.error("入荷予定の登録・更新に失敗しました", error);
            toast.error("エラーが発生しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 編集モード切替
    const handleEdit = (stock: IncomingStock): void => {
        setEditingId(stock.id);
        if (stock.expectedDate) {
            setDate(new Date(stock.expectedDate));
            setIsTBD(false);
        } else {
            setDate(undefined);
            setIsTBD(true);
        }
        setQuantity(String(stock.quantity));
        setNote(stock.note || "");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setDate(new Date());
        setIsTBD(false);
        setQuantity("");
        setNote("");
    };

    // 削除ハンドラ
    const handleDelete = async (id: string) => {
        const success = await deleteIncomingStock(id);
        if (success && onSuccess) onSuccess();
    };

    if (!product) return null;

    const isRoll = isRollBag(product.shape || "", product.category);
    const unit = isRoll ? "m" : "枚";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>入荷予定の管理: {product.name}</DialogTitle>
                    <DialogDescription className="sr-only">
                        商品の入荷予定日、数量、出荷先などの情報を登録・編集します。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* 編集フォーム (編集モード時のみ表示) */}
                    {editingId && (
                        <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg bg-orange-50/50 border-orange-100">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold text-orange-700">
                                    予定を編集
                                </Label>
                                <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} className="h-7 text-xs">
                                    キャンセル
                                </Button>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="date">入荷（納品）予定日</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                (!date && !isTBD) && "text-muted-foreground",
                                                isTBD && "opacity-50"
                                            )}
                                            disabled={isTBD}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {isTBD ? (
                                                <span className="text-orange-600 font-bold">納期確認中</span>
                                            ) : date ? (
                                                format(date, "yyyy年MM月dd日", { locale: ja })
                                            ) : (
                                                <span>日付を選択</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    {!isTBD && (
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={date}
                                                onSelect={setDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    )}
                                </Popover>
                                <div className="flex items-center space-x-2 mt-1">
                                    <input
                                        type="checkbox"
                                        id="edit-isTBD"
                                        checked={isTBD}
                                        onChange={(e) => setIsTBD(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                                    />
                                    <Label htmlFor="edit-isTBD" className="text-xs text-orange-700 cursor-pointer">納期確認中（着日未定）</Label>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="quantity">数量</Label>
                                <div className="flex items-center gap-2">
                                    <CalculableInput
                                        id="quantity"
                                        placeholder="数量を入力"
                                        value={quantity === "0" ? "" : quantity}
                                        onChange={(value) => setQuantity(value === null ? "" : String(value))}
                                        required
                                        stringifyOnComplete
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                                        {unit}
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="note">出荷先（備考）</Label>
                                <div className="flex flex-col gap-2">
                                    <Select
                                        value={addresses.some(a => a.name === note) ? note : "other"}
                                        onValueChange={(val) => {
                                            if (val !== "other") setNote(val);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="出荷先を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="other">直接入力・その他</SelectItem>
                                            {addresses.map(addr => (
                                                <SelectItem key={addr.id} value={addr.name}>
                                                    {addr.name}{addr.isDefault ? " (デフォルト)" : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        id="note"
                                        placeholder="自由入力（出荷先名やメモ）"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                更新する
                            </Button>
                        </form>
                    )}

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
                                {incomingStocks.map((stock) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const isOverdue = stock.expectedDate
                                        ? new Date(stock.expectedDate).setHours(0, 0, 0, 0) < today.getTime()
                                        : false;

                                    return (
                                        <div key={stock.id} className={cn("flex items-center justify-between p-3 border rounded-lg", isOverdue ? "bg-red-50/50 border-red-200" : "bg-card")}>
                                            <div>
                                                <div className="text-sm flex items-center gap-1.5">
                                                    <span className={cn(isOverdue ? "text-red-600 font-bold" : "text-muted-foreground")}>
                                                        納品: {stock.expectedDate ? format(new Date(stock.expectedDate), "M/d") : <span className="text-orange-600 font-bold italic">納期確認中</span>}
                                                    </span>
                                                    {isOverdue && (
                                                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">超過</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {stock.quantity.toLocaleString()}
                                                    {unit}
                                                    {stock.note && ` · ${stock.note}`}
                                                </div>
                                            </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEdit(stock)}
                                                className="h-8 w-8 p-0"
                                                title="編集"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={async () => {
                                                    const success = await receiveIncomingStock(stock.id);
                                                    if (success && onSuccess) onSuccess();
                                                }}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-8 px-2"
                                                title="在庫に反映します"
                                            >
                                                入荷完了
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(stock.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    );
                                })}
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
