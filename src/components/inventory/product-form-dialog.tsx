"use client";

/**
 * 商品フォームダイアログ
 * 商品の追加・編集用モーダル
 */

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalculableInput } from "@/components/ui/calculable-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { useSuppliers } from "@/hooks/use-masters";
import type { Product, ProductStatus } from "@/types";

// フォームデータの型
type ProductFormData = {
    name: string;
    sku: string;
    productCode: string; // 新規追加
    janCode: string;
    weight: string;
    shape: string;
    material: string;
    unitPrice: string;
    printingCost: string;
    category: string;
    description: string;
    minStockAlert: string;
    imageUrl: string;
    // 商品名構造化フィールド
    prefix: string;
    origin: string;
    variety: string;
    suffix: string;
    // 色数フィールド
    frontColorCount: string;
    backColorCount: string;
    totalColorCount: string;
    statusOverride: 'normal' | 'low_stock' | 'out_of_stock';
    status: ProductStatus;
    supplierId: string;
    discontinuedDate: string;
    metersPerRoll: string; // 1巻あたりメートル数 (300 or 400)
};

type ProductFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: Product | null; // 編集時は既存の商品データ
    onSuccess: () => void; // 保存成功時のコールバック
    onDelete?: (product: Product) => void;
};

const initialFormData: ProductFormData = {
    name: "",
    sku: "",
    productCode: "",
    janCode: "",
    weight: "",
    shape: "",
    material: "",
    unitPrice: "",
    printingCost: "",
    category: "bag",
    description: "",
    minStockAlert: "",
    imageUrl: "",
    prefix: "",
    origin: "",
    variety: "",
    suffix: "",
    frontColorCount: "",
    backColorCount: "",
    totalColorCount: "",
    statusOverride: 'normal',
    status: 'active',
    supplierId: "",
    discontinuedDate: "",
    metersPerRoll: "400",
};

export function ProductFormDialog({
    open,
    onOpenChange,
    product,
    onSuccess,
    onDelete,
}: ProductFormDialogProps): React.ReactElement {
    const [formData, setFormData] = useState<ProductFormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { suppliers } = useSuppliers();

    const isEdit = !!product;

    // 編集モード時にフォームデータを初期化
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || "",
                sku: product.sku || "",
                productCode: product.productCode || "",
                janCode: product.janCode || "",
                weight: product.weight?.toString() || "",
                shape: product.shape || "",
                material: product.material || "",
                unitPrice: product.unitPrice?.toString() || "",
                printingCost: product.printingCost?.toString() || "",
                category: product.category || "bag",
                description: product.description || "",
                minStockAlert: product.minStockAlert !== null && product.minStockAlert !== undefined ? product.minStockAlert.toString() : "",
                imageUrl: product.imageUrl || "",
                prefix: product.prefix || "",
                origin: product.origin || "",
                variety: product.variety || "",
                suffix: product.suffix || "",
                frontColorCount: product.frontColorCount?.toString() || "",
                backColorCount: product.backColorCount?.toString() || "",
                totalColorCount: product.totalColorCount?.toString() || "",
                statusOverride: product.statusOverride || 'normal',
                status: product.status || 'active',
                supplierId: product.supplierId || "",
                discontinuedDate: product.discontinuedDate || "",
                metersPerRoll: product.metersPerRoll?.toString() || "400",
            });
        } else {
            setFormData(initialFormData);
        }
        setError(null);
    }, [product, open]);

    const handleChange = (field: keyof ProductFormData, value: string): void => {
        setFormData((prev: ProductFormData) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 商品名を構造化フィールドから自動生成
            const generatedName = [formData.prefix, formData.origin, formData.variety, formData.suffix]
                .filter(Boolean)
                .join(' ') || formData.name || '無題の商品';

            const payload = {
                id: product?.id,
                name: generatedName,
                sku: formData.sku || undefined,
                productCode: formData.productCode || undefined,
                janCode: formData.janCode || undefined,
                weight: formData.weight ? Number(formData.weight) : undefined,
                shape: formData.shape || undefined,
                material: formData.material || undefined,
                unitPrice: formData.unitPrice ? Number(formData.unitPrice) : 0,
                printingCost: formData.printingCost ? Number(formData.printingCost) : 0,
                category: formData.category,
                description: formData.description || undefined,
                minStockAlert: formData.minStockAlert ? Number(formData.minStockAlert) : null,
                imageUrl: formData.imageUrl || undefined,
                prefix: formData.prefix || undefined,
                origin: formData.origin || undefined,
                variety: formData.variety || undefined,
                suffix: formData.suffix || undefined,
                frontColorCount: formData.frontColorCount ? Number(formData.frontColorCount) : undefined,
                backColorCount: formData.backColorCount ? Number(formData.backColorCount) : undefined,
                totalColorCount: formData.totalColorCount ? Number(formData.totalColorCount) : undefined,
                statusOverride: formData.statusOverride,
                status: formData.status,
                supplierId: formData.supplierId || undefined,
                discontinuedDate: formData.discontinuedDate || undefined,
                metersPerRoll: formData.metersPerRoll ? Number(formData.metersPerRoll) : 400,
            };

            const response = await fetch("/api/products", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "商品を編集" : "新規商品を追加"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? "商品情報を編集します。変更後「保存」をクリックしてください。"
                            : "新しい商品を登録します。必須項目を入力してください。"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* 商品名 構造化フィールド（自動生成） */}
                    <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
                        <div className="text-sm font-medium">商品名の詳細</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="prefix">備考1（先頭注記）</Label>
                                <Input
                                    id="prefix"
                                    value={formData.prefix}
                                    onChange={(e) => handleChange("prefix", e.target.value)}
                                    placeholder="（ロゴ無）、【使用禁止】"
                                    inputMode="text"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="origin">産地</Label>
                                <Input
                                    id="origin"
                                    value={formData.origin}
                                    onChange={(e) => handleChange("origin", e.target.value)}
                                    placeholder="JA京都やましろ、魚沼"
                                    inputMode="text"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variety">品種</Label>
                                <Input
                                    id="variety"
                                    value={formData.variety}
                                    onChange={(e) => handleChange("variety", e.target.value)}
                                    placeholder="ひのひかり、コシヒカリ"
                                    inputMode="text"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="suffix">備考2（末尾補足）</Label>
                                <Input
                                    id="suffix"
                                    value={formData.suffix}
                                    onChange={(e) => handleChange("suffix", e.target.value)}
                                    placeholder="RASP雲竜柄無地"
                                    inputMode="text"
                                />
                            </div>
                        </div>
                        {/* 生成される商品名プレビュー */}
                        <div className="pt-2 border-t">
                            <div className="text-xs text-muted-foreground mb-1">生成される商品名:</div>
                            <div className="text-sm font-medium bg-white p-2 rounded border min-h-[32px]">
                                {[formData.prefix, formData.origin, formData.variety, formData.suffix].filter(Boolean).join(' ') || '（詳細を入力してください）'}
                            </div>
                        </div>
                    </div>



                    {/* 仕入先 */}
                    <div className="space-y-2">
                        <Label htmlFor="supplierId">仕入先</Label>
                        <Select
                            value={formData.supplierId}
                            onValueChange={(val: string) => handleChange("supplierId", val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="仕入先を選択" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">指定なし</SelectItem>
                                {suppliers.map((supplier) => (
                                    <SelectItem key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* カテゴリ */}
                    <div className="space-y-2">
                        <Label htmlFor="category">カテゴリ *</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(val: string) => handleChange("category", val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="カテゴリを選択" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bag">米袋</SelectItem>
                                <SelectItem value="sticker">シール</SelectItem>
                                <SelectItem value="new_rice">新米</SelectItem>
                                <SelectItem value="other">その他</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 3カラムレイアウト: 受注№, 商品コード, JANコード */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sku">受注№</Label>
                            <Input
                                id="sku"
                                value={formData.sku}
                                onChange={(e) => handleChange("sku", e.target.value)}
                                placeholder="受注№"
                                inputMode="text"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="productCode">商品コード</Label>
                            <Input
                                id="productCode"
                                value={formData.productCode}
                                onChange={(e) => handleChange("productCode", e.target.value)}
                                placeholder="商品コード"
                                inputMode="text"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="janCode">JANコード</Label>
                            <Input
                                id="janCode"
                                value={formData.janCode}
                                onChange={(e) => handleChange("janCode", e.target.value)}
                                placeholder="JANコード"
                                inputMode="numeric"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="weight">重量 (kg)</Label>
                            <CalculableInput
                                id="weight"
                                value={formData.weight === "0" || formData.weight === "0.0" ? "" : formData.weight}
                                onChange={(value) => handleChange("weight", value === null ? "" : String(value))}
                                placeholder="例: 5"
                                stringifyOnComplete
                                inputMode="decimal"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="shape">形状</Label>
                            <Input
                                id="shape"
                                value={formData.shape}
                                onChange={(e) => handleChange("shape", e.target.value)}
                                placeholder="RZ, H など"
                                inputMode="text"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="material">材質</Label>
                            <Input
                                id="material"
                                value={formData.material}
                                onChange={(e) => handleChange("material", e.target.value)}
                                placeholder="ポリ, 紙 など"
                                inputMode="text"
                            />
                        </div>

                    </div>

                    {/* 1巻あたりメートル数 */}
                    <div className="space-y-2">
                        <Label htmlFor="metersPerRoll">1巻あたりメートル数</Label>
                        <Select
                            value={formData.metersPerRoll}
                            onValueChange={(val: string) => handleChange("metersPerRoll", val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="400m" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="300">300m</SelectItem>
                                <SelectItem value="400">400m</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                            ※ロール袋の1巻あたりの長さ（デフォルト: 400m）
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="unitPrice">単価 (円)</Label>
                            <CalculableInput
                                id="unitPrice"
                                value={formData.unitPrice === "0" ? "" : formData.unitPrice}
                                onChange={(value) => handleChange("unitPrice", value === null ? "" : String(value))}
                                placeholder="単価を入力"
                                stringifyOnComplete
                                inputMode="numeric"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="printingCost">印刷代 (円)</Label>
                            <CalculableInput
                                id="printingCost"
                                value={formData.printingCost === "0" ? "" : formData.printingCost}
                                onChange={(value) => handleChange("printingCost", value === null ? "" : String(value))}
                                placeholder="印刷代を入力"
                                stringifyOnComplete
                                inputMode="numeric"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="minStockAlert">在庫アラート (個別設定)</Label>
                            <CalculableInput
                                id="minStockAlert"
                                value={formData.minStockAlert === "0" ? "" : formData.minStockAlert}
                                onChange={(value) => handleChange("minStockAlert", value === null ? "" : String(value))}
                                placeholder="推奨: 3000"
                                stringifyOnComplete
                                inputMode="numeric"
                            />
                            <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                空欄時のデフォルト: ロール 1500m / 単袋 3000枚
                            </p>
                        </div>
                    </div>

                    {/* ステータス手動上書き */}
                    <div className="space-y-2 border rounded-lg p-4 bg-amber-50">
                        <Label htmlFor="statusOverride">ステータス（手動設定）</Label>
                        <Select
                            value={formData.statusOverride}
                            onValueChange={(val: 'normal' | 'low_stock' | 'out_of_stock') => handleChange("statusOverride", val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="通常" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">自動判定（通常）</SelectItem>
                                <SelectItem value="low_stock">在庫減少（強制）</SelectItem>
                                <SelectItem value="out_of_stock">欠品（強制）</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            ※「在庫減少」「欠品」を選択すると、実際の在庫数に関わらずその状態として表示されます。
                        </p>
                    </div>

                    {/* 商品ステータス */}
                    <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                        <div className="space-y-2">
                            <Label htmlFor="status">商品状態（マスタ設定）</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val: ProductStatus) => handleChange("status", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="正常" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">正常</SelectItem>
                                    <SelectItem value="plate_removal_scheduled">落版予定</SelectItem>
                                    <SelectItem value="plate_removed">落版</SelectItem>
                                    <SelectItem value="direct_delivery">直送先在庫</SelectItem>
                                    <SelectItem value="on_sale_break">販売中断</SelectItem>
                                    <SelectItem value="discontinued">廃盤</SelectItem>
                                    <SelectItem value="inactive">非表示（削除扱い）</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(formData.status === 'plate_removal_scheduled' || formData.status === 'discontinued' || formData.status === 'plate_removed') && (
                            <div className="space-y-2">
                                <Label htmlFor="discontinuedDate">
                                    {formData.status === 'plate_removal_scheduled' ? '落版予定日' :
                                        formData.status === 'plate_removed' ? '落版日' : '廃盤日'}
                                </Label>
                                <Input
                                    id="discontinuedDate"
                                    type="date"
                                    value={formData.discontinuedDate}
                                    onChange={(e) => handleChange("discontinuedDate", e.target.value)}
                                />
                                {formData.status === 'plate_removal_scheduled' && (
                                    <p className="text-[10px] text-amber-600">
                                        ※設定した日付を過ぎると自動的に「落版」ステータスに切り替わります。
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 色数情報 */}
                    <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
                        <div className="text-sm font-medium">色数情報</div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="frontColorCount">表色数</Label>
                                <Input
                                    id="frontColorCount"
                                    type="number"
                                    value={formData.frontColorCount === "0" ? "" : formData.frontColorCount}
                                    onChange={(e) => handleChange("frontColorCount", e.target.value)}
                                    placeholder="色数"
                                    inputMode="numeric"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="backColorCount">裏色数</Label>
                                <Input
                                    id="backColorCount"
                                    type="number"
                                    value={formData.backColorCount === "0" ? "" : formData.backColorCount}
                                    onChange={(e) => handleChange("backColorCount", e.target.value)}
                                    placeholder="色数"
                                    inputMode="numeric"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="totalColorCount">総色数</Label>
                                <Input
                                    id="totalColorCount"
                                    type="number"
                                    value={formData.totalColorCount === "0" ? "" : formData.totalColorCount}
                                    onChange={(e) => handleChange("totalColorCount", e.target.value)}
                                    placeholder="色数"
                                    inputMode="numeric"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">説明</Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder="商品の説明"
                            inputMode="text"
                        />
                    </div>

                    {/* 商品画像 */}
                    <div className="space-y-2">
                        <Label>商品画像</Label>
                        <ImageUpload
                            value={formData.imageUrl || undefined}
                            onChange={(url) => handleChange("imageUrl", url || "")}
                            disabled={loading}
                        />
                    </div>

                    <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2">
                        {isEdit && onDelete && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 sm:mr-auto"
                                onClick={() => {
                                    if (product) {
                                        onDelete(product);
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                商品を削除
                            </Button>
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={loading}
                            >
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEdit ? "更新する" : "追加する"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
