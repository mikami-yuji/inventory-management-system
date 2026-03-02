"use client";

import { useState, useEffect } from "react";
import { Product, SupplierStockLot } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CalculableInput } from "@/components/ui/calculable-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWIPActions } from "@/hooks/use-work-in-progress";
import { Package, ArrowRight, Loader2, Plus, Trash2, Save, X, Edit2 } from "lucide-react";
import toast from "react-hot-toast";

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
    currentStock, // この値も参考にしますが、最新のロット合算値を使用します
    onSuccess,
}: SupplierStockDialogProps) {
    const [lots, setLots] = useState<SupplierStockLot[]>([]);
    const [isLoadingLots, setIsLoadingLots] = useState(false);

    // 新規ロット追加フォーム
    const [newLotQuantity, setNewLotQuantity] = useState<number>(0);
    const [newLotDate, setNewLotDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [newLotNote, setNewLotNote] = useState<string>('');
    const [isAddingLot, setIsAddingLot] = useState(false);

    // 編集用ステート
    const [editingLotId, setEditingLotId] = useState<string | null>(null);
    const [editLotQuantity, setEditLotQuantity] = useState<number>(0);
    const [editLotDate, setEditLotDate] = useState<string>('');
    const [editLotNote, setEditLotNote] = useState<string>('');

    // 入荷予定への移動
    const [moveQuantity, setMoveQuantity] = useState<number>(0);
    const [expectedDate, setExpectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    const {
        getSupplierStockLots,
        addSupplierStockLot,
        updateSupplierStockLot,
        deleteSupplierStockLot,
        moveSupplierStockToIncoming,
        loading
    } = useWIPActions();

    const fetchLots = async () => {
        if (!product) return;
        setIsLoadingLots(true);
        const data = await getSupplierStockLots(product.id);
        setLots(data);
        setIsLoadingLots(false);
    };

    // ダイアログが開くたびに初期値をセット
    useEffect(() => {
        if (open && product) {
            setMoveQuantity(0);
            setExpectedDate(new Date().toISOString().split('T')[0]);

            // フォームのリセット
            setNewLotQuantity(0);
            setNewLotDate(new Date().toISOString().split('T')[0]);
            setNewLotNote('');
            setIsAddingLot(false);
            setEditingLotId(null);

            fetchLots();
        }
    }, [open, product]);

    const totalStock = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    const displayStock = lots.length > 0 ? totalStock : currentStock;

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

    const handleMove = async () => {
        if (!product || moveQuantity <= 0 || !expectedDate) return;
        if (moveQuantity > displayStock) {
            toast.error("メーカー在庫以上の数量は移動できません");
            return;
        }

        const success = await moveSupplierStockToIncoming(product.id, moveQuantity, expectedDate, 'メーカー在庫から出荷指示');
        if (success) {
            toast.success("入荷予定へ移動しました");
            onSuccess();
            onOpenChange(false);
        } else {
            toast.error("移動に失敗しました");
        }
    };

    if (!product) return null;

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
                                <p className="text-3xl font-bold">{displayStock.toLocaleString()}</p>
                            </div>
                        </div>
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
                                        <Label className="text-xs">数量</Label>
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
                                                        <span className="font-semibold text-lg">{lot.quantity.toLocaleString()}</span>
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
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="moveQuantity" className="text-right text-sm">
                                移動数量
                            </Label>
                            <CalculableInput
                                id="moveQuantity"
                                value={moveQuantity === 0 ? "" : moveQuantity}
                                onChange={(value) => setMoveQuantity(Number(value) || 0)}
                                placeholder="数量を入力"
                                className="col-span-3 bg-white"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label htmlFor="expectedDate" className="text-right text-sm">
                                入荷予定日
                            </Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input
                                    id="expectedDate"
                                    type="date"
                                    value={expectedDate}
                                    onChange={(e) => setExpectedDate(e.target.value)}
                                    className="bg-white"
                                />
                                <Button
                                    variant="default"
                                    onClick={handleMove}
                                    disabled={loading || moveQuantity <= 0 || moveQuantity > displayStock || !expectedDate}
                                    className="whitespace-nowrap bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                                >
                                    移動実行
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
