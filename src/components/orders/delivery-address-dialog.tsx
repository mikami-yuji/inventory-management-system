
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeliveryAddresses } from "@/hooks/use-delivery-addresses";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { DeliveryAddress } from "@/types";

type DeliveryAddressDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    initialData?: DeliveryAddress;
};

export function DeliveryAddressDialog({
    open,
    onOpenChange,
    onSuccess,
    initialData
}: DeliveryAddressDialogProps) {
    const { addAddress, updateAddress } = useDeliveryAddresses();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        postalCode: initialData?.postalCode || "",
        address: initialData?.address || "",
        phone: initialData?.phone || "",
        isDefault: initialData?.isDefault || false,
        preferredShape: initialData?.preferredShape || "" as "RA" | "RZ" | "単袋" | ""
    });

    // フォームをリセットまたは初期化
    React.useEffect(() => {
        if (open) {
            setFormData({
                name: initialData?.name || "",
                postalCode: initialData?.postalCode || "",
                address: initialData?.address || "",
                phone: initialData?.phone || "",
                isDefault: initialData?.isDefault || false,
                preferredShape: initialData?.preferredShape || ""
            });
        }
    }, [open, initialData]);

    const handleChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let success = false;

            if (initialData?.id) {
                // 更新
                success = await updateAddress({
                    ...initialData,
                    ...formData,
                    preferredShape: formData.preferredShape || undefined
                });
            } else {
                // 新規作成
                success = await addAddress({
                    name: formData.name,
                    postalCode: formData.postalCode,
                    address: formData.address,
                    phone: formData.phone,
                    isDefault: formData.isDefault,
                    preferredShape: formData.preferredShape || undefined
                });
            }

            if (success) {
                if (!initialData) {
                    setFormData({
                        name: "",
                        postalCode: "",
                        address: "",
                        phone: "",
                        isDefault: false,
                        preferredShape: ""
                    });
                }
                onSuccess();
                onOpenChange(false);
            } else {
                alert(initialData ? "更新に失敗しました" : "登録に失敗しました");
            }
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "納品先の編集" : "納品先住所の追加"}</DialogTitle>
                    <DialogDescription className="sr-only">
                        納品先の名称、住所、電話番号などの情報を入力します。
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="address-name">名称 (例: ○○倉庫、本社)</Label>
                        <Input
                            id="address-name"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            placeholder="納品先名"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="address-postal">郵便番号</Label>
                            <Input
                                id="address-postal"
                                value={formData.postalCode}
                                onChange={(e) => handleChange("postalCode", e.target.value)}
                                placeholder="123-4567"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address-phone">電話番号</Label>
                            <Input
                                id="address-phone"
                                value={formData.phone}
                                onChange={(e) => handleChange("phone", e.target.value)}
                                placeholder="03-1234-5678"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address-detail">住所</Label>
                        <Input
                            id="address-detail"
                            value={formData.address}
                            onChange={(e) => handleChange("address", e.target.value)}
                            placeholder="東京都..."
                            required
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>好みの形状（任意）</Label>
                        <RadioGroup
                            value={formData.preferredShape}
                            onValueChange={(value) => handleChange("preferredShape", value)}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="RA" id="shape-ra" />
                                <Label htmlFor="shape-ra" className="cursor-pointer">RA</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="RZ" id="shape-rz" />
                                <Label htmlFor="shape-rz" className="cursor-pointer">RZ</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="単袋" id="shape-single" />
                                <Label htmlFor="shape-single" className="cursor-pointer">単袋</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="" id="shape-none" />
                                <Label htmlFor="shape-none" className="cursor-pointer text-muted-foreground">未指定</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="address-default"
                            checked={formData.isDefault}
                            onCheckedChange={(checked) => handleChange("isDefault", checked === true)}
                        />
                        <Label htmlFor="address-default" className="cursor-pointer">
                            この住所をデフォルトにする
                        </Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? "更新する" : "登録する"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
