"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product, SupplierStockLot, DeliveryAddress } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CalculableInput } from "@/components/ui/calculable-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWIPActions } from "@/hooks/use-work-in-progress";
import { Package, ArrowRight, Loader2, Plus, Trash2, Save, X, Edit2 } from "lucide-react";
import toast from "react-hot-toast";
import { isRollBag } from "@/lib/services/inventory-service";

type SupplierStockDialogProps = {
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
    const [lots, setLots] = useState<SupplierStockLot[]>([]);
    const [isLoadingLots, setIsLoadingLots] = useState(false);

    const [newLotQuantity, setNewLotQuantity] = useState<number>(0);
    const [newLotDate, setNewLotDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [newLotNote, setNewLotNote] = useState<string>('');
    const [isAddingLot, setIsAddingLot] = useState(false);

    const [editingLotId, setEditingLotId] = useState<string | null>(null);
    const [editLotQuantity, setEditLotQuantity] = useState<number>(0);
    const [editLotDate, setEditLotDate] = useState<string>('');
    const [editLotNote, setEditLotNote] = useState<string>('');

    type ArrivalSchedule = {
        id: string;
        expectedDate: string;
        quantity: number;
        note: string;
    };
    const [arrivalSchedules, setArrivalSchedules] = useState<ArrivalSchedule[]>([]);

    const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
    const [defaultAddressName, setDefaultAddressName] = useState<string>('');

    const fetchDeliveryAddresses = useCallback(async () => {
        try {
            const res = await fetch('/api/delivery-addresses');
            const result = await res.json();
            const addresses = Array.isArray(result) ? result : (result?.data || []);
            setDeliveryAddresses(addresses);
            const defaultAddr = addresses.find((a: DeliveryAddress) => a.isDefault);
            if (defaultAddr) {
                setDefaultAddressName(defaultAddr.name);
                setArrivalSchedules((prev: ArrivalSchedule[]) => prev.map((s, i) => i === 0 && !s.note ? { ...s, note: defaultAddr.name } : s));
            }
        } catch (e) {
            console.error("納品先取得エラー", e);
        }
    }, []);

    const {
        getSupplierStockLots,
        addSupplierStockLot,
        updateSupplierStockLot,
        deleteSupplierStockLot,
        moveSupplierStockToIncoming,
        syncSupplierStock,
        loading
    } = useWIPActions();

    const fetchLots = useCallback(async () => {
        if (!product) return;
        setIsLoadingLots(true);
        const data = await getSupplierStockLots(product.id);
        setLots(data);
        setIsLoadingLots(false);
    }, [product, getSupplierStockLots]);

    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                fetchDeliveryAddresses();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [open, fetchDeliveryAddresses]);

    useEffect(() => {
        if (open && product) {
            const timer = setTimeout(() => {
                fetchLots();
                setArrivalSchedules([
                    { id: crypto.randomUUID(), expectedDate: new Date().toISOString().split('T')[0], quantity: 0, note: defaultAddressName }
                ]);

                setNewLotQuantity(0);
                setNewLotDate(new Date().toISOString().split('T')[0]);
                setNewLotNote('');
                setIsAddingLot(false);
                setEditingLotId(null);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [open, product, fetchLots, defaultAddressName]);

    const totalStock = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    const displayStock = lots.length > 0 ? totalStock : currentStock;

    const handleSync = async () => {
        if (!confirm("すべての商品のメーカー在庫を、ロットの合計値に合わせる再計算（同期）を行ってもよろしいですか？")) return;

        const success = await syncSupplierStock();
        if (success) {
            toast.success("在庫数を再計算しました");
            fetchLots();
            onSuccess();
        } else {
            toast.error("再計算に失敗しました");
        }
    };

    const handleAddLot = async () => {
        if (!product || newLotQuantity <= 0 || !newLotDate) return;

        const success = await addSupplierStockLot(product.id, newLotQuantity, newLotDate, newLotNote);
        if (success) {
            toast.success("ロットを追加しました");
            setNewLotQuantity(0);
            setNewLotNote('');
            setIsAddingLot(false);
            fetchLots();
            onSuccess();
        } else {
            toast.error("ロットの追加に失敗しました");
        }
    };

    const handleStartEdit = (lot: SupplierStockLot) => {
        setEditingLotId(lot.id);
        setEditLotQuantity(lot.quantity);
        setEditLotDate(lot.stockDate);
        setEditLotNote(lot.note || '');
    };

    const handleSaveEdit = async () => {
        if (!editingLotId || editLotQuantity < 0 || !editLotDate) return;

        const success = await updateSupplierStockLot(editingLotId, editLotQuantity, editLotDate, editLotNote);
        if (success) {
            toast.success("ロットを更新しました");
            setEditingLotId(null);
            fetchLots();
            onSuccess();
        } else {
            toast.error("ロットの更新に失敗しました");
        }
    };

    const handleDeleteLot = async (lotId: string) => {
        if (!confirm("このロットを削除してもよろしいですか？")) return;

        const success = await deleteSupplierStockLot(lotId);
        if (success) {
            toast.success("ロットを削除しました");
            fetchLots();
            onSuccess();
        } else {
            toast.error("ロットの削除に失敗しました");
        }
    };

    const addArrivalRow = () => {
        setArrivalSchedules([
            ...arrivalSchedules,
            { id: crypto.randomUUID(), expectedDate: new Date().toISOString().split('T')[0], quantity: 0, note: defaultAddressName }
        ]);
    };

    const removeArrivalRow = (id: string) => {
        if (arrivalSchedules.length <= 1) return;
        setArrivalSchedules(arrivalSchedules.filter(s => s.id !== id));
    };

    const updateArrivalRow = (id: string, updates: Partial<ArrivalSchedule>) => {
        setArrivalSchedules(arrivalSchedules.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleMove = async () => {
        const activeSchedules = arrivalSchedules.filter(s => s.quantity > 0);
        if (!product || activeSchedules.length === 0) return;

        const totalMoveQuantity = activeSchedules.reduce((sum, s) => sum + s.quantity, 0);

        if (totalMoveQuantity > displayStock) {
            toast.error("メーカー在庫以上の数量は移動できません");
            return;
        }

        const success = await moveSupplierStockToIncoming(product.id, activeSchedules.map(s => ({
            expectedDate: s.expectedDate,
            quantity: s.quantity,
            note: s.note
        })));

        if (success) {
            toast.success("入荷予定へ移動しました");
            onSuccess();
            onOpenChange(false);
        } else {
            toast.error("移動に失敗しました");
        }
    };

    if (!product) return null;

    const isRoll = isRollBag(product.shape || "", product.category);
    const unit = isRoll ? "m" : "枚";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>メーカー在庫（ロット管理）</DialogTitle>
                    <DialogDescription>
                        {product.name} のメーカー在庫管理を行います。
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* 合算値表示 */}
                    <div className="bg-blue-50/50 p-4 rounded-lg flex items-center justify-between border border-blue-100">
                        <div className="flex items-center gap-3">
                            <Package className="h-8 w-8 text-blue-500" />
                            <div>
                                <p className="text-sm font-medium text-blue-600">現在のメーカー在庫合算</p>
                                <p className="text-3xl font-bold">{displayStock.toLocaleString()}<span className="text-lg ml-1 font-normal">{unit}</span></p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={handleSync}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                            再計算
                        </Button>
                    </div>

                    <Separator />

                    {/* ロット一覧と追加 */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium leading-none">ロット一覧</h4>
                            {!isAddingLot && (
                                <Button size="sm" variant="outline" onClick={() => setIsAddingLot(true)}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    新規追加
                                </Button>
                            )}
                        </div>

                        {/* 新規追加フォーム */}
                        {isAddingLot && (
                            <div className="bg-muted/50 p-4 rounded-md border space-y-3 relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={() => setIsAddingLot(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <h5 className="text-xs font-semibold text-muted-foreground uppercase">新しいロットの追加</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">入庫/製造日</Label>
                                        <Input type="date" size={1} className="h-8" value={newLotDate} onChange={e => setNewLotDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">数量 ({unit})</Label>
                                        <CalculableInput className="h-8" value={newLotQuantity === 0 ? "" : newLotQuantity} onChange={value => setNewLotQuantity(Number(value) || 0)} placeholder="数量" />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-xs">メモ (任意)</Label>
                                        <Input className="h-8" placeholder="ロット番号や備考..." value={newLotNote} onChange={e => setNewLotNote(e.target.value)} />
                                    </div>
                                </div>
                                <Button className="w-full h-8 flex items-center justify-center" disabled={loading || newLotQuantity <= 0} onClick={handleAddLot}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    追加する
                                </Button>
                            </div>
                        )}

                        {/* ロットリスト */}
                        <div className="border rounded-md divide-y">
                            {isLoadingLots ? (
                                <div className="p-8 text-center text-muted-foreground flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    読み込み中...
                                </div>
                            ) : lots.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    登録されているロットはありません。
                                </div>
                            ) : (
                                lots.map(lot => (
                                    <div key={lot.id} className="p-3 bg-white flex flex-col gap-2">
                                        {editingLotId === lot.id ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input type="date" value={editLotDate} onChange={e => setEditLotDate(e.target.value)} className="h-8 text-sm" />
                                                <CalculableInput value={editLotQuantity === 0 ? "" : editLotQuantity} onChange={value => setEditLotQuantity(Number(value) || 0)} className="h-8 text-sm" placeholder="数量" />
                                                <Input value={editLotNote} onChange={e => setEditLotNote(e.target.value)} placeholder="メモ" className="col-span-2 h-8 text-sm" />
                                                <div className="col-span-2 flex justify-end gap-2 mt-1">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingLotId(null)}>キャンセル</Button>
                                                    <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit} disabled={loading}>保存</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-lg">{lot.quantity.toLocaleString()}<span className="text-sm ml-0.5 font-normal">{unit}</span></span>
                                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border">{lot.stockDate}</span>
                                                    </div>
                                                    {lot.note && <div className="text-xs text-gray-500 mt-0.5">{lot.note}</div>}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(lot)}>
                                                        <Edit2 className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteLot(lot.id)}>
                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* 在庫移動セクション */}
                    <div className="space-y-4 bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                        <h4 className="text-sm font-medium leading-none text-orange-800 flex items-center">
                            <ArrowRight className="h-4 w-4 mr-1.5" />
                            入荷予定へ移動（出荷指示）
                        </h4>
                        <p className="text-[11px] text-orange-700/80 leading-relaxed">
                            メーカー在庫の合算値から指定数量を出荷させ、自社の入荷予定に移動します。<br />
                            内部的には、最も古い日付のロットから順に自動で消費されます（FIFO方式）。
                        </p>
                        <div className="flex items-center justify-between mb-4 mt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-orange-900 border-b-2 border-orange-500 pb-0.5">入荷予定</span>
                                <span className="text-xs text-orange-700">に移動する数量（複数回答可）</span>
                            </div>
                            <Button variant="outline" size="sm" className="h-7 text-xs bg-white hover:bg-orange-50 text-orange-700 border-orange-200" onClick={addArrivalRow}>
                                <Plus className="h-3 w-3 mr-1" />
                                予定追加
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {arrivalSchedules.map((schedule) => (
                                <div key={schedule.id} className="relative bg-white p-3 rounded-md border border-orange-200 shadow-sm space-y-3">
                                    {arrivalSchedules.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                            onClick={() => removeArrivalRow(schedule.id)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-orange-800">着日（入荷予定日）</Label>
                                            <Input
                                                type="date"
                                                value={schedule.expectedDate}
                                                onChange={(e) => updateArrivalRow(schedule.id, { expectedDate: e.target.value })}
                                                size={1}
                                                className="h-8 border-orange-100 focus-visible:ring-orange-500 input-placeholder-orange focus:border-orange-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-orange-800">移動数量 ({unit})</Label>
                                            <CalculableInput
                                                value={schedule.quantity === 0 ? "" : schedule.quantity}
                                                onChange={(value) => updateArrivalRow(schedule.id, { quantity: Number(value) || 0 })}
                                                placeholder="数量"
                                                className="h-8 border-orange-100 focus-visible:ring-orange-500 input-placeholder-orange focus:border-orange-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs text-orange-800">出荷先（納品先マスターから選択）</Label>
                                        <Select
                                            value={schedule.note}
                                            onValueChange={(val) => updateArrivalRow(schedule.id, { note: val })}
                                        >
                                            <SelectTrigger className="h-8 border-orange-100 bg-white focus:ring-orange-500">
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

                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-orange-200">
                            <div className="text-sm">
                                <span className="text-orange-900">移動合計: </span>
                                <span className="font-bold text-orange-700 text-lg">{arrivalSchedules.reduce((sum, s) => sum + s.quantity, 0).toLocaleString()}{unit}</span>
                            </div>
                            <Button
                                variant="default"
                                onClick={handleMove}
                                disabled={loading || arrivalSchedules.reduce((sum, s) => sum + s.quantity, 0) <= 0 || arrivalSchedules.reduce((sum, s) => sum + s.quantity, 0) > displayStock}
                                className="whitespace-nowrap bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                移動実行
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
