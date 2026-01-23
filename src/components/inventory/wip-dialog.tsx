"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWIPActions, useWorkInProgress } from "@/hooks/use-work-in-progress";
import { format } from "date-fns";
import { Plus, Check, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WIPDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function WIPDialog({
    product,
    open,
    onOpenChange,
    onSuccess,
}: WIPDialogProps) {
    const [activeTab, setActiveTab] = useState("list");

    // itemsの取得
    const { items, loading: loadingItems, refetch } = useWorkInProgress({
        productId: product?.id,
        status: 'in_progress'
    });

    // アクション
    const { createWIP, completeWIP, deleteWIP, loading: actionLoading } = useWIPActions();

    // フォーム状態
    const [quantity, setQuantity] = useState(0);
    const [startedAt, setStartedAt] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [expectedCompletion, setExpectedCompletion] = useState("");
    const [note, setNote] = useState("");

    // ダイアログが開いたときに再取得
    useEffect(() => {
        if (open && product) {
            refetch();
            setActiveTab("list");
            setQuantity(0);
            setNote("");
            setExpectedCompletion("");
        }
    }, [open, product, refetch]);

    const handleCreate = async () => {
        if (!product) return;
        if (quantity <= 0) return;

        const result = await createWIP({
            productId: product.id,
            quantity,
            startedAt,
            expectedCompletion: expectedCompletion || undefined,
            note: note || undefined,
        });

        if (result.success) {
            onSuccess();
            refetch();
            setActiveTab("list");
            setQuantity(0);
            setNote("");
        }
    };

    const handleComplete = async (id: string) => {
        const success = await completeWIP(id);
        if (success) {
            onSuccess();
            refetch();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("本当に削除しますか？")) return;
        const success = await deleteWIP(id);
        if (success) {
            onSuccess();
            refetch();
        }
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>仕掛中（加工中）管理</DialogTitle>
                    <DialogDescription>
                        {product.name} の仕掛品を管理します。
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="list">一覧 ({items.length})</TabsTrigger>
                        <TabsTrigger value="add">新規登録</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="mt-4 space-y-4">
                        {loadingItems ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                仕掛中のアイテムはありません。
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-1">
                                            <div className="font-medium flex items-center gap-2">
                                                {item.quantity.toLocaleString()}
                                                <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                                                    加工中
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                開始: {format(new Date(item.startedAt), 'yyyy/MM/dd')}
                                                {item.expectedCompletion && ` → 予定: ${format(new Date(item.expectedCompletion), 'yyyy/MM/dd')}`}
                                            </div>
                                            {item.note && (
                                                <div className="text-xs text-muted-foreground bg-gray-50 p-1 rounded">
                                                    {item.note}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                onClick={() => handleComplete(item.id)}
                                                disabled={actionLoading}
                                            >
                                                <Check className="h-4 w-4 mr-1" />
                                                完了
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => handleDelete(item.id)}
                                                disabled={actionLoading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="add" className="mt-4 space-y-4">
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="quantity" className="text-right">数量</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="col-span-3"
                                    min={1}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="startedAt" className="text-right">開始日</Label>
                                <Input
                                    id="startedAt"
                                    type="date"
                                    value={startedAt}
                                    onChange={(e) => setStartedAt(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="expected" className="text-right">完了予定日</Label>
                                <Input
                                    id="expected"
                                    type="date"
                                    value={expectedCompletion}
                                    onChange={(e) => setExpectedCompletion(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="note" className="text-right">メモ</Label>
                                <Textarea
                                    id="note"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="col-span-3"
                                    placeholder="備考があれば入力"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setActiveTab("list")}>
                                キャンセル
                            </Button>
                            <Button onClick={handleCreate} disabled={actionLoading || quantity <= 0}>
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                                登録
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
