"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react";
import { DeliveryAddressDialog } from "@/components/orders/delivery-address-dialog";
import { useDeliveryAddresses } from "@/hooks/use-delivery-addresses";
import { Badge } from "@/components/ui/badge";
import { DeliveryAddress } from "@/types";

export default function DeliveryAddressesPage() {
    const { addresses, loading, deleteAddress, refetch } = useDeliveryAddresses();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<DeliveryAddress | undefined>(undefined);

    const handleAdd = () => {
        setEditingAddress(undefined);
        setDialogOpen(true);
    };

    const handleEdit = (address: DeliveryAddress) => {
        setEditingAddress(address);
        setDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">納品先管理</h2>
                    <p className="text-muted-foreground">出荷依頼時に選択する配送先情報を管理します</p>
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" /> 新規登録
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        納品先一覧
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading && addresses.length === 0 ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>名称 / 郵便番号</TableHead>
                                    <TableHead>住所 / TEL</TableHead>
                                    <TableHead>推奨形状</TableHead>
                                    <TableHead>デフォルト</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {addresses.map((address) => (
                                    <TableRow key={address.id}>
                                        <TableCell>
                                            <div className="font-medium">{address.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                〒{address.postalCode || "---"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{address.address}</div>
                                            <div className="text-sm text-muted-foreground">{address.phone}</div>
                                        </TableCell>
                                        <TableCell>
                                            {address.preferredShape ? (
                                                <Badge variant="secondary">{address.preferredShape}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">未指定</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {address.isDefault && (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">デフォルト</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(address)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => deleteAddress(address.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {addresses.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            登録された納品先はありません
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <DeliveryAddressDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={() => refetch()}
                initialData={editingAddress}
            />
        </div>
    );
}
