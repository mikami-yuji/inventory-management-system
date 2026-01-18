"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, AlertTriangle } from "lucide-react";
import type { Product } from "@/types";

type EditingItem = {
    productId: string;
    originalQuantity: number;
    newQuantity: number;
};

type StockCheckConfirmationProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: EditingItem[];
    getProduct: (id: string) => Product | undefined;
    onConfirm: () => void;
    isSubmitting?: boolean;
};

export function StockCheckConfirmation({
    open,
    onOpenChange,
    items,
    getProduct,
    onConfirm,
    isSubmitting
}: StockCheckConfirmationProps): React.ReactElement {
    const totalUsage = items.reduce((sum, item) => sum + (item.originalQuantity - item.newQuantity), 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>在庫報告の確認</DialogTitle>
                    <DialogDescription>
                        入力された実在庫数を反映し、使用数を確定します。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden my-4 border rounded-md">
                    <div className="h-full max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>商品</TableHead>
                                    <TableHead className="text-right">前回在庫</TableHead>
                                    <TableHead></TableHead>
                                    <TableHead className="text-right">今回実在庫</TableHead>
                                    <TableHead className="text-right font-bold text-blue-600">使用数</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => {
                                    const product = getProduct(item.productId);
                                    const usage = item.originalQuantity - item.newQuantity;
                                    const isIncrease = usage < 0; // 実在庫の方が多い（入荷、または数え間違い修正）

                                    return (
                                        <TableRow key={item.productId}>
                                            <TableCell className="font-medium">
                                                <div className="text-sm">{product?.name || item.productId}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {product?.weight}kg / {product?.shape}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{item.originalQuantity}</TableCell>
                                            <TableCell className="text-center px-1 text-muted-foreground"><ArrowRight className="h-4 w-4 mx-auto" /></TableCell>
                                            <TableCell className="text-right font-bold">
                                                {item.newQuantity}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={isIncrease ? "text-red-600" : "text-blue-600 font-bold"}>
                                                    {isIncrease ? `+${Math.abs(usage)}` : usage}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        対象商品: {items.length}件
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium">合計使用数</div>
                        <div className="text-2xl font-bold text-blue-600">{totalUsage} 個</div>
                    </div>
                </div>

                {totalUsage < 0 && (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm mt-2 flex gap-2">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        <div>
                            合計で使用数がマイナス（在庫増）になっています。入荷入力ではなく、実在庫修正でよろしいですか？
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        戻る
                    </Button>
                    <Button onClick={onConfirm} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 min-w-[120px]">
                        {isSubmitting ? "保存中..." : "確定して報告"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
