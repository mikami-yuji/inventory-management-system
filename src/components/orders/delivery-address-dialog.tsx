
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeliveryAddresses } from "@/hooks/use-delivery-addresses";
import { Loader2 } from "lucide-react";

type DeliveryAddressDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};

export function DeliveryAddressDialog({
    open,
    onOpenChange,
    onSuccess
}: DeliveryAddressDialogProps) {
    const { addAddress } = useDeliveryAddresses();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        postalCode: "",
        address: "",
        phone: "",
        isDefault: false
    });

    const handleChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const success = await addAddress({
                name: formData.name,
                postalCode: formData.postalCode,
                address: formData.address,
                phone: formData.phone,
                isDefault: formData.isDefault
            });

            if (success) {
                setFormData({
                    name: "",
                    postalCode: "",
                    address: "",
                    phone: "",
                    isDefault: false
                });
                onSuccess();
                onOpenChange(false);
            } else {
                alert("登録に失敗しました");
            }
        } catch (error) {
            console.error(error);
            alert("登録に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>納品先住所の追加</DialogTitle>
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
                            登録する
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
