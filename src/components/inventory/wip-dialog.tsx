"use client";

import { useState, useEffect, useCallback } from "react";
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
import { CalculableInput } from "@/components/ui/calculable-input";
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
import { toast } from "react-hot-toast";
import type { WorkInProgress, DeliveryAddress } from "@/types";
import { X } from "lucide-react";

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

    // itemsの取得 (in_progress)
    const { items: inProgressItems, loading: loadingInProgress, refetch: refetchInProgress } = useWorkInProgress({
        productId: product?.id,
        status: 'in_progress'
    });

    // itemsの取得 (completed)
    const { items: completedItems, loading: loadingCompleted, refetch: refetchCompleted } = useWorkInProgress({
        productId: product?.id,
        status: 'completed'
    });

    // refetchをuseCallbackで安定化して無限ループを防止
    const refetch = useCallback(() => {
        refetchInProgress();
        refetchCompleted();
    }, [refetchInProgress, refetchCompleted]);

    useEffect(() => {
        if (activeTab === 'history') {
            refetchCompleted();
        }
    }, [activeTab, refetchCompleted]);

    // アクション
    const { createWIP, updateWIP, arrangeShipping, transferToIncoming, transferToSupplier, deleteWIP, loading: actionLoading } = useWIPActions();

    // フォーム状態
    const [editingWIPId, setEditingWIPId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(0);
    const [startedAt, setStartedAt] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [dateType, setDateType] = useState<'specific' | 'vague'>('specific');
    const [specificDate, setSpecificDate] = useState("");

    // 旬管理用ステート
    const [vagueMonth, setVagueMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [vagueTerm, setVagueTerm] = useState<'early' | 'mid' | 'late'>('early');

    const [note, setNote] = useState("");

    // 確定処理用ステート（分割移動対応）
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmingItem, setConfirmingItem] = useState<WorkInProgress | null>(null);
    const [supplierQuantity, setSupplierQuantity] = useState(0); // メーカー在庫への数量

    // 入荷予定の複数スケジュール管理
    type ArrivalSchedule = {
        id: string;
        expectedDate: string;
        quantity: number;
        note: string;
    };
    const [arrivalSchedules, setArrivalSchedules] = useState<ArrivalSchedule[]>([
        { id: Math.random().toString(36).substr(2, 9), expectedDate: format(new Date(), 'yyyy-MM-dd'), quantity: 0, note: '' }
    ]);

    const [lossQuantity, setLossQuantity] = useState(0); // ロス数量

    // 納品先リスト
    const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);

    const fetchDeliveryAddresses = async () => {
        try {
            const res = await fetch('/api/delivery-addresses');
            const result = await res.json();
            if (Array.isArray(result)) {
                setDeliveryAddresses(result);
            } else if (result && result.data && Array.isArray(result.data)) {
                setDeliveryAddresses(result.data);
            }
        } catch (e) {
            console.error("納品先取得エラー", e);
        }
    };

    useEffect(() => {
        if (open) {
            fetchDeliveryAddresses();
        }
    }, [open]);

    // ダイアログが開いたときに再取得（refetchを依存配列から除外して無限ループ防止）
    useEffect(() => {
        if (open && product) {
            refetchInProgress();
            setActiveTab("list");
            resetForm();
            setConfirmingId(null);
            setConfirmingItem(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, product?.id]);

    const resetForm = () => {
        setEditingWIPId(null);
        setQuantity(0);
        setNote("");
        setStartedAt(format(new Date(), 'yyyy-MM-dd'));
        setDateType('specific');
        setSpecificDate("");
    };

    const handleEditClick = (item: WorkInProgress) => {
        setEditingWIPId(item.id);
        setQuantity(item.quantity);
        setStartedAt(format(new Date(item.startedAt), 'yyyy-MM-dd'));
        setNote(item.note || "");
        if (item.termType === 'specific' || !item.termType) {
            setDateType('specific');
            setSpecificDate(item.expectedCompletion ? format(new Date(item.expectedCompletion), 'yyyy-MM-dd') : "");
        } else {
            setDateType('vague');
            setVagueTerm(item.termType as 'early' | 'mid' | 'late');
            if (item.expectedCompletion) {
                setVagueMonth(format(new Date(item.expectedCompletion), 'yyyy-MM'));
            }
        }
        setActiveTab("add");
    };

    const handleCreateOrUpdate = async () => {
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

        let result;
        if (editingWIPId) {
            result = await updateWIP(editingWIPId, {
                quantity,
                startedAt,
                expectedCompletion,
                termType,
                note: note || undefined,
            });
            result = { success: result }; // normalize hook return
        } else {
            result = await createWIP({
                productId: product.id,
                quantity,
                startedAt,
                expectedCompletion,
                termType,
                note: note || undefined,
            });
        }

        if (result.success) {
            onSuccess();
            refetch();
            setActiveTab("list");
            resetForm();
        }
    };

    const handleArrangeShipping = async (id: string) => {
        if (!confirm("手配した数量を出荷済みにし、仕掛中から完了させます。よろしいですか？")) return;
        const success = await arrangeShipping(id);
        if (success) {
            toast.success("出荷手配を完了しました");
            onSuccess();
            refetch();
        } else {
            toast.error("処理に失敗しました");
        }
    };

    // 仕上がり移動開始
    const handleStartTransfer = (item: WorkInProgress) => {
        setConfirmingId(item.id);
        setConfirmingItem(item);
        setSupplierQuantity(0);
        setArrivalSchedules([
            { id: Math.random().toString(36).substr(2, 9), expectedDate: format(new Date(), 'yyyy-MM-dd'), quantity: 0, note: '' }
        ]);
        setLossQuantity(0);
    };

    const addArrivalRow = () => {
        setArrivalSchedules([
            ...arrivalSchedules,
            { id: Math.random().toString(36).substr(2, 9), expectedDate: format(new Date(), 'yyyy-MM-dd'), quantity: 0, note: '' }
        ]);
    };

    const removeArrivalRow = (id: string) => {
        if (arrivalSchedules.length <= 1) return;
        setArrivalSchedules(arrivalSchedules.filter(s => s.id !== id));
    };

    const updateArrivalRow = (id: string, updates: Partial<ArrivalSchedule>) => {
        setArrivalSchedules(arrivalSchedules.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    // 分割移動の合計数量（ロス含む）
    const incomingTotal = arrivalSchedules.reduce((sum, s) => sum + s.quantity, 0);
    const totalTransferQuantity = supplierQuantity + incomingTotal;
    const totalConsumedQuantity = totalTransferQuantity + lossQuantity;
    const remainingQuantity = confirmingItem ? confirmingItem.quantity - totalConsumedQuantity : 0;
    const isTransferValid = totalConsumedQuantity > 0 && totalConsumedQuantity <= (confirmingItem?.quantity || 0);

    const handleSubmitConfirm = async () => {
        if (!confirmingId || !confirmingItem) return;
        if (!isTransferValid) return;

        let success = true;

        // メーカー在庫への移動
        if (supplierQuantity > 0) {
            const result = await transferToSupplier(confirmingId, supplierQuantity);
            if (!result) success = false;
        }

        // 入荷予定への移動
        const activeSchedules = arrivalSchedules.filter(s => s.quantity > 0);
        if (activeSchedules.length > 0 && success) {
            const result = await transferToIncoming(confirmingId, activeSchedules.map(s => ({
                expectedDate: s.expectedDate,
                quantity: s.quantity,
                note: s.note
            })));
            if (!result) success = false;
        }

        if (success) {
            // 全量消化の場合はWIPを削除
            if (remainingQuantity <= 0) {
                await deleteWIP(confirmingId);
                const parts = [];
                if (totalTransferQuantity > 0) parts.push(`${totalTransferQuantity.toLocaleString()}を移動`);
                if (lossQuantity > 0) parts.push(`ロス ${lossQuantity.toLocaleString()}`);
                toast.success(parts.join('、'));
            } else {
                // 残数がある場合はWIPの数量を残数に更新
                await updateWIP(confirmingId, { quantity: remainingQuantity });
                const parts = [];
                if (totalTransferQuantity > 0) parts.push(`${totalTransferQuantity.toLocaleString()}を移動`);
                if (lossQuantity > 0) parts.push(`ロス ${lossQuantity.toLocaleString()}`);
                parts.push(`${remainingQuantity.toLocaleString()}を仕掛中に残しました`);
                toast.success(parts.join('、'));
            }
            onSuccess();
            refetch();
            setConfirmingId(null);
            setConfirmingItem(null);
        } else {
            toast.error('移動処理に失敗しました');
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
                        {product.name} の仕掛品・仕掛状況管理
                    </DialogDescription>
                </DialogHeader>

                {confirmingId && confirmingItem ? (
                    // 仕上がり移動画面（分割対応）
                    <div className="space-y-4 py-2">
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm mb-4">
                            仕掛中の商品（{confirmingItem.quantity.toLocaleString()}）を移動先に振り分けてください。
                            一部のみ移動し、残りを仕掛中に残すことも可能です。
                        </div>

                        <div className="grid gap-4">
                            {/* メーカー在庫への移動 */}
                            <div className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">メーカー在庫</Badge>
                                    <span className="text-sm text-muted-foreground">に移動する数量</span>
                                </div>
                                <CalculableInput
                                    value={supplierQuantity === 0 ? "" : supplierQuantity}
                                    onChange={(value) => setSupplierQuantity(Number(value) || 0)}
                                    placeholder="0 (移動しない場合は空欄)"
                                />
                            </div>

                            {/* 入荷予定への移動 */}
                            <div className="border rounded-lg p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">入荷予定</Badge>
                                        <span className="text-sm text-muted-foreground">に移動する数量（複数回答可）</span>
                                    </div>
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addArrivalRow}>
                                        <Plus className="h-3 w-3 mr-1" />
                                        予定追加
                                    </Button>
                                </div>

                                <div className="space-y-4 pt-2">
                                    {arrivalSchedules.map((schedule, index) => (
                                        <div key={schedule.id} className="relative bg-muted/20 p-3 rounded-md border space-y-3">
                                            {arrivalSchedules.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-red-500"
                                                    onClick={() => removeArrivalRow(schedule.id)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">着日（入荷予定日）</Label>
                                                    <Input
                                                        type="date"
                                                        value={schedule.expectedDate}
                                                        onChange={(e) => updateArrivalRow(schedule.id, { expectedDate: e.target.value })}
                                                        size={1}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">数量</Label>
                                                    <CalculableInput
                                                        value={schedule.quantity === 0 ? "" : schedule.quantity}
                                                        onChange={(value) => updateArrivalRow(schedule.id, { quantity: Number(value) || 0 })}
                                                        placeholder="数量"
                                                        className="h-8"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs">出荷先（納品先マスターから選択）</Label>
                                                <Select
                                                    value={schedule.note}
                                                    onValueChange={(val) => updateArrivalRow(schedule.id, { note: val })}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue placeholder="出荷先を選択（任意）" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {deliveryAddresses.map(addr => (
                                                            <SelectItem key={addr.id} value={addr.name}>
                                                                {addr.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ロス */}
                            <div className="border rounded-lg p-4 space-y-3 border-dashed border-red-200">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">ロス</Badge>
                                    <span className="text-sm text-muted-foreground">加工ロス・廃棄分</span>
                                </div>
                                <CalculableInput
                                    value={lossQuantity === 0 ? "" : lossQuantity}
                                    onChange={(value) => setLossQuantity(Number(value) || 0)}
                                    placeholder="0 (ロスなしの場合は空欄)"
                                />
                            </div>

                            {/* 残数サマリー */}
                            <div className={`p-3 rounded-md text-sm ${totalConsumedQuantity > (confirmingItem?.quantity || 0) ? 'bg-red-50 border border-red-200 text-red-700' : remainingQuantity > 0 ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                                <div className="flex justify-between items-center">
                                    <span>仕掛中の数量:</span>
                                    <span className="font-medium">{confirmingItem.quantity.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>移動合計:</span>
                                    <span className="font-medium">{totalTransferQuantity.toLocaleString()}</span>
                                </div>
                                {lossQuantity > 0 && (
                                    <div className="flex justify-between items-center text-red-600">
                                        <span>ロス:</span>
                                        <span className="font-medium">-{lossQuantity.toLocaleString()}</span>
                                    </div>
                                )}
                                <hr className="my-1 border-current opacity-30" />
                                <div className="flex justify-between items-center font-bold">
                                    <span>{remainingQuantity > 0 ? '仕掛中に残る数量:' : '状態:'}</span>
                                    <span>{remainingQuantity > 0 ? remainingQuantity.toLocaleString() : totalConsumedQuantity > (confirmingItem?.quantity || 0) ? '超過しています' : '全量消化'}</span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button variant="outline" onClick={() => {
                                setConfirmingId(null);
                                setConfirmingItem(null);
                            }}>キャンセル</Button>
                            <Button onClick={handleSubmitConfirm} disabled={actionLoading || !isTransferValid}>
                                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                確定して移動
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="list" onClick={resetForm}>一覧 ({inProgressItems.length})</TabsTrigger>
                            <TabsTrigger value="add" onClick={resetForm}>{editingWIPId ? '編集' : '新規登録'}</TabsTrigger>
                            <TabsTrigger value="history" onClick={resetForm}>履歴 ({completedItems.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="list" className="mt-4 space-y-4">
                            {loadingInProgress ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : inProgressItems.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    仕掛中のアイテムはありません。
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {inProgressItems.map((item) => (
                                        <div key={item.id} className="flex flex-col p-4 border rounded-lg gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium flex items-center gap-2">
                                                    <span className="text-lg">{item.quantity.toLocaleString()}</span>
                                                    {item.confirmationStatus === 'confirmed' ? (
                                                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                                            仕掛確定済
                                                        </Badge>
                                                    ) : item.confirmationStatus === 'scheduled' ? (
                                                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                                            入荷予定済
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                                                            加工中
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex gap-1 flex-wrap justify-end">
                                                        <Button
                                                            size="sm"
                                                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 h-8 flex items-center gap-1"
                                                            onClick={() => handleStartTransfer(item)}
                                                        >
                                                            <PackageCheck className="h-3 w-3" />
                                                            仕上がり移動
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 text-xs px-2 h-8"
                                                            onClick={() => handleArrangeShipping(item.id)}
                                                        >
                                                            出荷手配
                                                        </Button>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-slate-500 hover:text-slate-800 h-8 w-8 p-0"
                                                        onClick={() => handleEditClick(item)}
                                                    >
                                                        編集
                                                    </Button>

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
                                    <CalculableInput
                                        id="quantity"
                                        value={quantity === 0 ? "" : quantity}
                                        onChange={(value) => setQuantity(Number(value) || 0)}
                                        className="col-span-3"
                                        placeholder="数量を入力"
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
                                        <Label htmlFor="expected" className="text-right">仕掛完了予定日</Label>
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
                                <Button variant="outline" onClick={() => { setActiveTab("list"); resetForm(); }}>
                                    キャンセル
                                </Button>
                                <Button onClick={handleCreateOrUpdate} disabled={actionLoading || quantity <= 0}>
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                                    {editingWIPId ? '更新' : '登録'}
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="mt-4 space-y-4">
                            {loadingCompleted ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : completedItems.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    完了履歴はありません。
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                    {completedItems.map((item) => (
                                        <div key={item.id} className="flex flex-col p-4 border rounded-lg gap-2 bg-slate-50 opacity-80">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium flex items-center gap-2">
                                                    <span className="text-lg">{item.quantity.toLocaleString()}</span>
                                                    {item.confirmationStatus === 'shipping_arranged' ? (
                                                        <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">
                                                            出荷手配済
                                                        </Badge>
                                                    ) : item.confirmationStatus === 'scheduled' ? (
                                                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                                            入荷予定済
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-100">
                                                            完了
                                                        </Badge>
                                                    )}
                                                </div>
                                                {item.completedAt && (
                                                    <div className="text-sm text-muted-foreground">
                                                        完了: {format(new Date(item.completedAt), 'yyyy/MM/dd')}
                                                    </div>
                                                )}
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
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
