"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { SaleEvent } from "@/hooks/use-sale-events";
import type { Product } from "@/types";

type StockAllocationDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    saleEvents: SaleEvent[];
};

export function StockAllocationDialog({
    isOpen,
    onClose,
    product,
    saleEvents,
}: StockAllocationDialogProps): React.ReactElement {
    if (!product) return <></>;

    // この商品を引き当てているイベントを抽出
    const allocations = saleEvents.flatMap(event => {
        const item = event.items.find(i => i.productId === product.id);
        if (item && item.allocatedQuantity > 0 && (event.status === 'upcoming' || event.status === 'active')) {
            return [{
                eventName: event.clientName, // クライアント名をイベント名として使用
                dates: event.dates,
                quantity: item.allocatedQuantity,
                status: event.status,
            }];
        }
        return [];
    });

    const totalAllocated = allocations.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>特売引当詳細</DialogTitle>
                    <DialogDescription>
                        {product.name} の引当状況
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-muted p-2 rounded">
                        <span className="font-medium">引当合計</span>
                        <span className="text-lg font-bold text-blue-600">
                            {totalAllocated.toLocaleString()} {product.category === 'bag' || product.category === 'new_rice' ? '枚' : '個'}
                        </span>
                    </div>

                    {allocations.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4">
                            引当中のイベントはありません
                        </div>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>イベント / 納品先</TableHead>
                                        <TableHead>日程</TableHead>
                                        <TableHead className="text-right">数量</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allocations.map((alloc, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div className="font-medium">{alloc.eventName}</div>
                                                <Badge variant="outline" className="mt-1 text-xs">
                                                    {alloc.status === 'active' ? '開催中' : '予定'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {alloc.dates.length > 0 ? (
                                                    <div className="flex flex-col">
                                                        <span>{format(new Date(alloc.dates[0]), "MM/dd", { locale: ja })}</span>
                                                        {alloc.dates.length > 1 && (
                                                            <span className="text-muted-foreground text-xs">他{alloc.dates.length - 1}日</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {alloc.quantity.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
