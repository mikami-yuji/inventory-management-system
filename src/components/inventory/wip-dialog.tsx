"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWIPActions, useWorkInProgress } from "@/hooks/use-work-in-progress";
import { format, endOfMonth, setDate } from "date-fns";
import { Plus, Check, Loader2, Trash2, CalendarClock, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    const { createWIP, completeWIP, confirmWIP, deleteWIP, loading: actionLoading } = useWIPActions();

    // フォーム状態 (新規作成)
    const [quantity, setQuantity] = useState(0);
    const [startedAt, setStartedAt] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [dateType, setDateType] = useState<'specific' | 'vague'>('specific');
    const [specificDate, setSpecificDate] = useState("");

    // 旬管理用ステート
    const [vagueMonth, setVagueMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [vagueTerm, setVagueTerm] = useState<'early' | 'mid' | 'late'>('early');

    const [note, setNote] = useState("");

    // 確定処理用ステート
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmDate, setConfirmDate] = useState(format(new Date(), 'yyyy-MM-dd')); // 出荷日
    const [confirmQuantity, setConfirmQuantity] = useState(0); // 出荷数
    const [supplierStock, setSupplierStock] = useState(0); // メーカー在庫

    // ダイアログが開いたときに再取得
    useEffect(() => {
        if (open && product) {
            refetch();
            setActiveTab("list");
            setQuantity(0);
            setNote("");
            setSpecificDate("");
            setConfirmingId(null);
            // メーカー在庫の初期値をセット
            setSupplierStock(product.supplierStock || 0);
        }
    }, [open, product, refetch]);

    const handleCreate = async () => {
        if (!product) return;
        if (quantity <= 0) return;

        let expectedCompletion: string | undefined = undefined;
        let termType: 'specific' | 'early' | 'mid' | 'late' = 'specific';

        if (dateType === 'specific') {
            expectedCompletion = specificDate || undefined;
        } else {
            termType = vagueTerm;
            // ソート用に仮の日付を設定
            const [year, month] = vagueMonth.split('-').map(Number);
            const baseDate = new Date(year, month - 1, 1);

            if (vagueTerm === 'early') {
                expectedCompletion = format(setDate(baseDate, 10), 'yyyy-MM-dd');
            } else if (vagueTerm === 'mid') {
                expectedCompletion = format(setDate(baseDate, 20), 'yyyy-MM-dd');
            } else {
                expectedCompletion = format(endOfMonth(baseDate), 'yyyy-MM-dd');
            }
        }

        const result = await createWIP({
            productId: product.id,
            quantity,
            startedAt,
            expectedCompletion,
            termType,
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

    const handleConfirmClick = (item: any) => {
        setConfirmingId(item.id);
        setConfirmQuantity(item.quantity); // 初期値は予定数
        setConfirmDate(format(new Date(), 'yyyy-MM-dd'));
        // メーカー在庫は現在の値（もしあれば）
        setSupplierStock(product?.supplierStock || 0);
    };

    const handleSubmitConfirm = async () => {
        if (!confirmingId) return;

        const success = await confirmWIP(confirmingId, confirmDate, confirmQuantity, supplierStock);
        if (success) {
            onSuccess();
            refetch();
            setConfirmingId(null);
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

    // 日付表示フォーマッター
    const displayDate = (dateStr: string | null, termType: string) => {
        if (!dateStr) return "未定";
        if (termType === 'specific' || !termType) return format(new Date(dateStr), 'yyyy/MM/dd');

        const date = new Date(dateStr);
        const month = format(date, 'M月');

        switch (termType) {
            case 'early': return `${month}上旬`;
            case 'mid': return `${month}中旬`;
            case 'late': return `${month}下旬`;
            default: return format(date, 'yyyy/MM/dd');
        }
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>仕掛中（加工中）管理</DialogTitle>
                    <DialogDescription>
                        {product.name} の仕掛品・納期管理
                    </DialogDescription>
                </DialogHeader>

                {confirmingId ? (
                    // 確定処理画面
                    <div className="space-y-4 py-2">
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm mb-4">
                            納期を確定し、入荷予定日として登録します。<br />
                            同時にメーカー在庫数も更新できます。
                        </div>

                        <div className="grid gap-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">出荷確定数</Label>
                                <Input
                                    type="number"
                                    value={confirmQuantity}
                                    onChange={(e) => setConfirmQuantity(Number(e.target.value))}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">出荷日</Label>
                                <Input
                                    type="date"
                                    value={confirmDate}
                                    onChange={(e) => setConfirmDate(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">メーカー在庫</Label>
                                <Input
                                    type="number"
                                    value={supplierStock}
                                    onChange={(e) => setSupplierStock(Number(e.target.value))}
                                    className="col-span-3"
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button variant="outline" onClick={() => setConfirmingId(null)}>キャンセル</Button>
                            <Button onClick={handleSubmitConfirm} disabled={actionLoading}>
                                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                確定して入荷予定へ
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    // 通常画面 (一覧/登録)
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
                                        <div key={item.id} className="flex flex-col p-4 border rounded-lg gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium flex items-center gap-2">
                                                    <span className="text-lg">{item.quantity.toLocaleString()}</span>
                                                    {item.confirmationStatus === 'confirmed' ? (
                                                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                                            納期確定済
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                                                            加工中
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {item.confirmationStatus !== 'confirmed' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                                            onClick={() => handleConfirmClick(item)}
                                                        >
                                                            <PackageCheck className="h-4 w-4 mr-1" />
                                                            納期確定
                                                        </Button>
                                                    )}

                                                    {/* 完了ボタンは確定済みの場合のみ表示するか、フローによるが一旦残す */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-500 hover:text-red-600 h-8 w-8 p-0"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                                <div className="flex items-center gap-1">
                                                    <CalendarClock className="h-3 w-3" />
                                                    開始: {format(new Date(item.startedAt), 'yyyy/MM/dd')}
                                                </div>
                                                <div className="flex items-center gap-1 font-medium text-foreground">
                                                    → 予定: {displayDate(item.expectedCompletion, item.termType)}
                                                </div>
                                            </div>

                                            {item.note && (
                                                <div className="text-xs text-muted-foreground">
                                                    メモ: {item.note}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="add" className="mt-4 space-y-4">
                            <div className="grid gap-4 py-4">
                                {/* 数量 */}
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

                                {/* 開始日 */}
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

                                {/* 完了予定日タイプ選択 */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">予定日タイプ</Label>
                                    <RadioGroup
                                        defaultValue="specific"
                                        value={dateType}
                                        onValueChange={(val: 'specific' | 'vague') => setDateType(val)}
                                        className="col-span-3 flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="specific" id="r1" />
                                            <Label htmlFor="r1">日付指定</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="vague" id="r2" />
                                            <Label htmlFor="r2">上/中/下旬</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {/* 完了予定日入力エリア */}
                                {dateType === 'specific' ? (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="expected" className="text-right">完了予定日</Label>
                                        <Input
                                            id="expected"
                                            type="date"
                                            value={specificDate}
                                            onChange={(e) => setSpecificDate(e.target.value)}
                                            className="col-span-3"
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">予定時期</Label>
                                        <div className="col-span-3 flex gap-2">
                                            <Input
                                                type="month"
                                                value={vagueMonth}
                                                onChange={(e) => setVagueMonth(e.target.value)}
                                                className="w-40"
                                            />
                                            <Select value={vagueTerm} onValueChange={(val: 'early' | 'mid' | 'late') => setVagueTerm(val)}>
                                                <SelectTrigger className="w-32">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="early">上旬</SelectItem>
                                                    <SelectItem value="mid">中旬</SelectItem>
                                                    <SelectItem value="late">下旬</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {/* メモ */}
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
                )}
            </DialogContent>
        </Dialog>
    );
}
