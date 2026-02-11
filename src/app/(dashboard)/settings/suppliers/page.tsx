
"use client";

import { useState } from "react";
import useSWR from "swr";
import { Supplier } from "@/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { SupplierDialog } from "@/components/settings/supplier-dialog";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((res) => res.json()).then((d) => d.data);

export default function SuppliersPage() {
    const { data: suppliers, error, isLoading, mutate } = useSWR<Supplier[]>("/api/suppliers", fetcher);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    const handleAdd = () => {
        setEditingSupplier(null);
        setDialogOpen(true);
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("本当に削除しますか？\n(商品は削除されませんが、紐付けが解除される可能性があります)")) return;

        try {
            const res = await fetch(`/api/suppliers?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Deletion failed");
            mutate();
        } catch (err) {
            console.error(err);
            alert("削除に失敗しました");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">仕入先管理</h2>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" /> 新規登録
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>仕入先一覧</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="text-red-500 py-4">エラーが発生しました</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>会社名</TableHead>
                                    <TableHead>担当者</TableHead>
                                    <TableHead>連絡先</TableHead>
                                    <TableHead>状態</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(suppliers || []).map((supplier) => (
                                    <TableRow key={supplier.id}>
                                        <TableCell className="font-medium">{supplier.name}</TableCell>
                                        <TableCell>{supplier.contactPerson || "-"}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {supplier.email && <div>{supplier.email}</div>}
                                                {supplier.phone && <div>{supplier.phone}</div>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {supplier.active ? (
                                                <Badge variant="secondary">有効</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">無効</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(supplier)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => handleDelete(supplier.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {suppliers?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            登録された仕入先はありません
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <SupplierDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                supplier={editingSupplier}
                onSuccess={() => mutate()}
            />
        </div>
    );
}
