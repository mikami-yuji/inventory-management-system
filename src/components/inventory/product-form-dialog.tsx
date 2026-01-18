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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Product } from "@/types";

// フォームデータの型
type ProductFormData = {
    name: string;
    sku: string;
    janCode: string;
    weight: string;
    shape: string;
    material: string;
    unitPrice: string;
    printingCost: string;
    category: string;
    description: string;
    minStockAlert: string;
};

type ProductFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: Product | null; // 編集時は既存の商品データ
    onSuccess: () => void; // 保存成功時のコールバック
};

const initialFormData: ProductFormData = {
    name: "",
    sku: "",
    janCode: "",
    weight: "",
    shape: "",
    material: "",
    unitPrice: "",
    printingCost: "",
    category: "bag",
    description: "",
    minStockAlert: "100",
};

export function ProductFormDialog({
    open,
    onOpenChange,
    product,
    onSuccess,
}: ProductFormDialogProps): React.ReactElement {
    const [formData, setFormData] = useState<ProductFormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEdit = !!product;

    // 編集モード時にフォームデータを初期化
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || "",
                sku: product.sku || "",
                janCode: product.janCode || "",
                weight: product.weight?.toString() || "",
                shape: product.shape || "",
                material: product.material || "",
                unitPrice: product.unitPrice?.toString() || "",
                printingCost: product.printingCost?.toString() || "",
                category: product.category || "bag",
                description: product.description || "",
                minStockAlert: product.minStockAlert?.toString() || "100",
            });
        } else {
            setFormData(initialFormData);
        }
        setError(null);
    }, [product, open]);

    const handleChange = (field: keyof ProductFormData, value: string): void => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                id: product?.id,
                name: formData.name,
                sku: formData.sku || undefined,
                janCode: formData.janCode || undefined,
                weight: formData.weight ? Number(formData.weight) : undefined,
                shape: formData.shape || undefined,
                material: formData.material || undefined,
                unitPrice: formData.unitPrice ? Number(formData.unitPrice) : 0,
                printingCost: formData.printingCost ? Number(formData.printingCost) : 0,
                category: formData.category,
                description: formData.description || undefined,
                minStockAlert: formData.minStockAlert ? Number(formData.minStockAlert) : 100,
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

                    {/* 商品名 */}
                    <div className="space-y-2">
                        <Label htmlFor="name">商品名 *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            placeholder="商品名を入力"
                            required
                        />
                    </div>

                    {/* カテゴリ */}
                    <div className="space-y-2">
                        <Label htmlFor="category">カテゴリ *</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(val) => handleChange("category", val)}
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

                    {/* 2カラムレイアウト */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sku">商品コード</Label>
                            <Input
                                id="sku"
                                value={formData.sku}
                                onChange={(e) => handleChange("sku", e.target.value)}
                                placeholder="SKU"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="janCode">JANコード</Label>
                            <Input
                                id="janCode"
                                value={formData.janCode}
                                onChange={(e) => handleChange("janCode", e.target.value)}
                                placeholder="JANコード"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="weight">重量 (kg)</Label>
                            <Input
                                id="weight"
                                type="number"
                                step="0.1"
                                value={formData.weight}
                                onChange={(e) => handleChange("weight", e.target.value)}
                                placeholder="5"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="shape">形状</Label>
                            <Input
                                id="shape"
                                value={formData.shape}
                                onChange={(e) => handleChange("shape", e.target.value)}
                                placeholder="RZ, H など"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="material">材質</Label>
                            <Input
                                id="material"
                                value={formData.material}
                                onChange={(e) => handleChange("material", e.target.value)}
                                placeholder="ポリ, 紙 など"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="unitPrice">単価 (円)</Label>
                            <Input
                                id="unitPrice"
                                type="number"
                                value={formData.unitPrice}
                                onChange={(e) => handleChange("unitPrice", e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="printingCost">印刷代 (円)</Label>
                            <Input
                                id="printingCost"
                                type="number"
                                value={formData.printingCost}
                                onChange={(e) => handleChange("printingCost", e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="minStockAlert">在庫アラート</Label>
                            <Input
                                id="minStockAlert"
                                type="number"
                                value={formData.minStockAlert}
                                onChange={(e) => handleChange("minStockAlert", e.target.value)}
                                placeholder="100"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">説明</Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder="商品の説明"
                        />
                    </div>

                    <DialogFooter className="pt-4">
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
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
