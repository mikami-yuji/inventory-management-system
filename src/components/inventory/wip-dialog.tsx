
import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription,
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWIPActions, useWorkInProgress } from "@/hooks/use-work-in-progress";
import { Product } from "@/types";
import { Plus, Trash2, Calendar as CalendarIcon, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import type { WorkInProgress, DeliveryAddress } from "@/types";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { isRollBag } from "@/lib/services";

type WIPDialogProps = {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};

type ArrivalSchedule = {
    id: string;
    expectedDate: string;
    isTBD?: boolean;
    quantity: number;
    note: string;
};

export function WIPDialog({ product, open, onOpenChange, onSuccess }: WIPDialogProps) {
    const isRoll: boolean = isRollBag(product?.shape || "", product?.category);
    const unit: string = isRoll ? "m" : "枚";

    const [activeTab, setActiveTab] = useState<string>("list");
    
    // フックを使用してデータを取得
    const { 
        items: hookedWipList = [],
        loading: fetchLoading,
        error: fetchError, 
        refetch: remoteRefetch 
    } = useWorkInProgress("in_progress", product?.id || undefined);

    const [quantity, setQuantity] = useState<number>(0);
    const [startedAt, setStartedAt] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [expectedCompletion, setExpectedCompletion] = useState<string>("");
    const [termType, setTermType] = useState<"specific" | "early" | "mid" | "late">("specific");
    const [note, setNote] = useState<string>("");

    // 移動用
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmingItem, setConfirmingItem] = useState<WorkInProgress | null>(null);
    const [supplierQuantity, setSupplierQuantity] = useState<number>(0);
    const [arrivalSchedules, setArrivalSchedules] = useState<ArrivalSchedule[]>([]);
    const [lossQuantity, setLossQuantity] = useState<number>(0);
    const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
    const [defaultAddressName, setDefaultAddressName] = useState<string>('');

    // アクション
    const { createWIP, updateWIP, transferToIncoming, transferToSupplier, deleteWIP, loading: actionLoading } = useWIPActions();

    // フォーム状態
    const [editingWIPId, setEditingWIPId] = useState<string | null>(null);

    const fetchDeliveryAddresses = useCallback(async () => {
        try {
            const res = await fetch('/api/delivery-addresses');
            const result = await res.json();
            if (Array.isArray(result)) {
                setDeliveryAddresses(result);
                const defaultAddr = result.find(a => a.isDefault);
                if (defaultAddr) {
                    setDefaultAddressName(defaultAddr.name);
                    setArrivalSchedules(prev => prev.map((s, i) => i === 0 && !s.note ? { ...s, note: defaultAddr.name } : s));
                }
            } else if (result && result.data && Array.isArray(result.data)) {
                setDeliveryAddresses(result.data);
                const defaultAddr = result.data.find((a: DeliveryAddress) => a.isDefault);
                if (defaultAddr) {
                    setDefaultAddressName(defaultAddr.name);
                    setArrivalSchedules(prev => prev.map((s, i) => i === 0 && !s.note ? { ...s, note: defaultAddr.name } : s));
                }
            }
        } catch (e) {
            console.error("納品先取得エラー", e);
        }
    }, []);

    const refetch = useCallback(async (): Promise<void> => {
        if (!product?.id) return;
        remoteRefetch();
    }, [remoteRefetch, product?.id]);

    const resetForm = useCallback((): void => {
        setQuantity(0);
        setStartedAt(format(new Date(), 'yyyy-MM-dd'));
        setExpectedCompletion("");
        setTermType("specific");
        setNote("");
        setEditingWIPId(null);
    }, []);

    useEffect(() => {
        if (open && product) {
            // ページロード時やダイアログ起動時の同期的なsetStateによる警告を避けるため、
            // わずかに遅延させて初期化処理を実行します。
            const initTimer = setTimeout(() => {
                refetch();
                fetchDeliveryAddresses();
                resetForm();
            }, 0);
            return () => clearTimeout(initTimer);
        }
    }, [open, product, refetch, fetchDeliveryAddresses, resetForm]);

    // 通信エラー時の通知
    useEffect(() => {
        if (fetchError && open) {
            toast.error(fetchError);
        }
    }, [fetchError, open]);

    const handleEdit = (item: WorkInProgress) => {
        setEditingWIPId(item.id);
        setQuantity(item.quantity);
        setStartedAt(item.startedAt ? item.startedAt.split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
        setExpectedCompletion(item.expectedCompletion ? item.expectedCompletion.split('T')[0] : "");
        setTermType(item.termType || "specific");
        setNote(item.note || "");
        setActiveTab("form");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        let result;
        if (editingWIPId) {
            const success = await updateWIP(editingWIPId, {
                quantity,
                startedAt,
                expectedCompletion: expectedCompletion || undefined,
                termType,
                note: note || undefined,
            });
            result = { success };
        } else {
            result = await createWIP({
                productId: product.id,
                quantity,
                startedAt,
                expectedCompletion: expectedCompletion || undefined,
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

    // 仕上がり移動開始
    const handleStartTransfer = (item: WorkInProgress) => {
        setConfirmingId(item.id);
        setConfirmingItem(item);
        setSupplierQuantity(0);
        setArrivalSchedules([
            { id: crypto.randomUUID(), expectedDate: format(new Date(), 'yyyy-MM-dd'), isTBD: false, quantity: 0, note: defaultAddressName }
        ]);
        setLossQuantity(0);
    };

    const addArrivalRow = () => {
        setArrivalSchedules([
            ...arrivalSchedules,
            { id: crypto.randomUUID(), expectedDate: format(new Date(), 'yyyy-MM-dd'), isTBD: false, quantity: 0, note: defaultAddressName }
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
                expectedDate: s.isTBD ? "" : s.expectedDate,
                quantity: s.quantity,
                note: s.note
            })));
            if (!result) success = false;
        }

        if (success) {
            // 全量消化の場合はWIPを削除
            if (remainingQuantity <= 0) {
                await deleteWIP(confirmingId);
            } else {
                // 残数がある場合はWIPの数量を残数に更新
                await updateWIP(confirmingId, { quantity: remainingQuantity });
            }

            const parts = [];
            if (totalTransferQuantity > 0) parts.push(`${totalTransferQuantity.toLocaleString()}を移動`);
            if (lossQuantity > 0) parts.push(`ロス ${lossQuantity.toLocaleString()}`);
            if (remainingQuantity > 0) parts.push(`${remainingQuantity.toLocaleString()}を仕掛中に残しました`);
            toast.success(parts.join('、'));

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
    const displayDate = (dateStr: string | null, termTypeArg: string) => {
        if (!dateStr) return "未定";
        if (termTypeArg === 'specific' || !termTypeArg) return format(new Date(dateStr), 'yyyy/MM/dd');

        const date = new Date(dateStr);
        const y = date.getFullYear();
        const m = date.getMonth() + 1;

        if (termTypeArg === 'early') return `${y}/${m} 上旬`;
        if (termTypeArg === 'mid') return `${y}/${m} 中旬`;
        if (termTypeArg === 'late') return `${y}/${m} 下旬`;
        return format(date, 'yyyy/MM/dd');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-center pr-6">
                        <DialogTitle>仕掛管理: {product?.name}</DialogTitle>
                        <DialogDescription className="sr-only">
                            仕掛品の状態確認、納期確定、入荷予定またはメーカー在庫への移動を行います。
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {confirmingId ? (
                    <div className="space-y-6 pt-4">
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium mb-2">移動元の仕掛</h3>
                            <div className="text-sm flex justify-between">
                                <span>数量: {confirmingItem?.quantity.toLocaleString()} {unit}</span>
                                <Badge variant="outline">{confirmingItem?.termType ? displayDate(confirmingItem.expectedCompletion, confirmingItem.termType) : '未設定'}</Badge>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-medium border-b pb-2">移動先・数量の指定</h3>
                            
                            <div className="space-y-2">
                                <Label className="text-xs">メーカー在庫へ移動</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="number" 
                                        value={supplierQuantity || ""} 
                                        onChange={e => setSupplierQuantity(Number(e.target.value))}
                                        className="h-9"
                                    />
                                    <span className="text-sm text-muted-foreground w-12 text-center">
                                        {unit}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs">入荷予定へ移動</Label>
                                {arrivalSchedules.map((schedule) => (
                                    <div key={schedule.id} className="relative bg-muted/30 p-3 rounded-md border space-y-3">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeArrivalRow(schedule.id)}
                                            disabled={arrivalSchedules.length <= 1}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">着日（入荷予定日）</Label>
                                                <Input 
                                                    type="date" 
                                                    value={schedule.expectedDate}
                                                    onChange={e => updateArrivalRow(schedule.id, { expectedDate: e.target.value })}
                                                    className="h-8 text-xs"
                                                    disabled={schedule.isTBD}
                                                />
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <Checkbox 
                                                        id={`tbd-${schedule.id}`} 
                                                        checked={schedule.isTBD} 
                                                        onCheckedChange={(checked) => updateArrivalRow(schedule.id, { isTBD: !!checked })}
                                                    />
                                                    <Label htmlFor={`tbd-${schedule.id}`} className="text-[10px] text-muted-foreground cursor-pointer select-none">納期確認中</Label>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">数量 ({unit})</Label>
                                                <Input 
                                                    type="number" 
                                                    value={schedule.quantity || ""}
                                                    onChange={e => updateArrivalRow(schedule.id, { quantity: Number(e.target.value) })}
                                                    className="h-8 text-xs"
                                                    placeholder="数量"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">納入先（出荷先）</Label>
                                            <Select
                                                value={schedule.note}
                                                onValueChange={(val) => updateArrivalRow(schedule.id, { note: val })}
                                            >
                                                <SelectTrigger className="h-8 text-xs bg-white">
                                                    <SelectValue placeholder="納入先を選択（任意）" />
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
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full h-8 text-xs border-dashed"
                                    onClick={addArrivalRow}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> 行を追加
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-destructive">不調分・ロスとして処理</Label>
                                    <Input 
                                        type="number" 
                                        value={lossQuantity || ""} 
                                        onChange={e => setLossQuantity(Number(e.target.value))}
                                        className="h-9 border-destructive/30"
                                    />
                                </div>
                                <div className="space-y-2 text-right">
                                    <Label className="text-xs text-muted-foreground">移動後の仕掛残</Label>
                                    <div className={`text-xl font-bold ${remainingQuantity < 0 ? 'text-destructive' : ''}`}>
                                        {remainingQuantity.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex gap-2 sm:justify-end">
                            <Button variant="outline" onClick={() => setConfirmingId(null)}>キャンセル</Button>
                            <Button 
                                onClick={handleSubmitConfirm} 
                                disabled={!isTransferValid || actionLoading}
                            >
                                {actionLoading ? '処理中...' : '移動を確定'}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="list">仕掛一覧</TabsTrigger>
                            <TabsTrigger value="form">{editingWIPId ? "編集" : "新規登録"}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="list" className="py-4">
                            {fetchLoading ? (
                                <div className="text-center py-8 text-muted-foreground whitespace-pre-wrap">
                                    読み込み中...
                                    {fetchError && `\nエラー: ${fetchError}`}
                                </div>
                            ) : hookedWipList.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">仕掛中のアイテムはありません</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>開始日</TableHead>
                                            <TableHead>数量</TableHead>
                                            <TableHead>納期</TableHead>
                                            <TableHead className="text-right">アクション</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {hookedWipList.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-xs">
                                                    {item.startedAt ? format(new Date(item.startedAt), 'yyyy/MM/dd') : '-'}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {item.quantity.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={item.confirmationStatus === 'confirmed' ? "default" : "outline"}>
                                                        {displayDate(item.expectedCompletion, item.termType || 'specific')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-7 px-2 text-xs"
                                                            onClick={() => handleStartTransfer(item)}
                                                        >
                                                            仕上がり移動
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7"
                                                            onClick={() => handleEdit(item)}
                                                        >
                                                            <CalendarIcon className="h-3 w-3" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-destructive"
                                                            onClick={() => handleDelete(item.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </TabsContent>

                        <TabsContent value="form">
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startedAt">開始日</Label>
                                        <Input
                                            id="startedAt"
                                            type="date"
                                            value={startedAt}
                                            onChange={(e) => setStartedAt(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">数量</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="quantity"
                                                type="number"
                                                value={quantity || ""}
                                                onChange={(e) => setQuantity(Number(e.target.value))}
                                                required
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>納期区分</Label>
                                        <Select value={termType} onValueChange={(val) => setTermType(val as "specific" | "early" | "mid" | "late")}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="specific">特定の日付</SelectItem>
                                                <SelectItem value="early">上旬</SelectItem>
                                                <SelectItem value="mid">中旬</SelectItem>
                                                <SelectItem value="late">下旬</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="expectedCompletion">
                                            {termType === 'specific' ? "完了予定日" : "対象月(の日付)"}
                                        </Label>
                                        <Input
                                            id="expectedCompletion"
                                            type="date"
                                            value={expectedCompletion}
                                            onChange={(e) => setExpectedCompletion(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="note">備考</Label>
                                    <Textarea
                                        id="note"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="メモ事項があれば入力してください"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    {editingWIPId && (
                                        <Button type="button" variant="ghost" onClick={resetForm}>キャンセル</Button>
                                    )}
                                    <Button type="submit" disabled={actionLoading} className="gap-2">
                                        <Save className="h-4 w-4" />
                                        {editingWIPId ? "更新する" : "登録する"}
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
