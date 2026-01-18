"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orderService, inventoryService } from "@/lib/services";
import { Plus, RotateCcw, FileText } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/cart-context";
import { useRouter } from "next/navigation";
import type { Order } from "@/types";

export default function OrdersPage(): React.ReactElement {
    const { addToCart, clearCart } = useCart();
    const router = useRouter();

    // サービスから発注データを取得
    const orders = orderService.getOrders();

    // 再発注処理
    const handleReorder = (order: Order): void => {
        clearCart();
        // 発注内容をカートに追加
        order.items.forEach(item => {
            const product = inventoryService.getProductById(item.productId);
            if (product) {
                addToCart(product, item.quantity);
            }
        });
        router.push('/orders/new');
    };

    // PDF出力（印刷）
    const handlePrintOrder = (order: Order): void => {
        const productDetails = order.items.map(item => {
            const name = orderService.getProductName(item.productId);
            return `${name} × ${item.quantity}`;
        }).join('\n');

        const printContent = `
            <html>
            <head>
                <title>発注書 - ${order.id}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; }
                    h1 { font-size: 24px; margin-bottom: 20px; }
                    .info { margin-bottom: 20px; }
                    .info p { margin: 5px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #333; padding: 10px; text-align: left; }
                    th { background: #f0f0f0; }
                    .footer { margin-top: 40px; text-align: right; }
                </style>
            </head>
            <body>
                <h1>出荷依頼書</h1>
                <div class="info">
                    <p><strong>発注番号:</strong> ${order.id}</p>
                    <p><strong>依頼日:</strong> ${new Date(order.createdAt).toLocaleDateString('ja-JP')}</p>
                    <p><strong>タイプ:</strong> ${order.type === 'special_event' ? '特売発注' : '通常発注'}</p>
                    <p><strong>ステータス:</strong> ${order.status === 'shipped' ? '出荷済み' : '受付中'}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>商品名</th>
                            <th>数量</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${orderService.getProductName(item.productId)}</td>
                                <td>${item.quantity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <p>印刷日時: ${new Date().toLocaleString('ja-JP')}</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">発注履歴</h2>
                <Button asChild>
                    <Link href="/orders/new">
                        <Plus className="mr-2 h-4 w-4" /> 新規出荷依頼
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>過去の注文一覧</CardTitle>
                    <CardDescription>
                        出荷依頼履歴を表示しています
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>注文ID</TableHead>
                                <TableHead>依頼日</TableHead>
                                <TableHead>タイプ</TableHead>
                                <TableHead>ステータス</TableHead>
                                <TableHead>商品</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-sm">{order.id.slice(0, 10)}...</TableCell>
                                    <TableCell>{new Date(order.createdAt).toLocaleDateString('ja-JP')}</TableCell>
                                    <TableCell>
                                        {order.type === 'special_event' ? (
                                            <Badge variant="secondary">特売発注</Badge>
                                        ) : (
                                            <Badge variant="outline">通常発注</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={order.status === 'shipped' ? 'default' : 'outline'}>
                                            {order.status === 'shipped' ? '出荷済み' : '受付中'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <ul className="list-disc list-inside text-sm">
                                            {order.items.slice(0, 2).map((item, idx) => (
                                                <li key={idx} className="truncate max-w-[200px]">
                                                    {orderService.getProductName(item.productId).slice(0, 30)}... × {item.quantity}
                                                </li>
                                            ))}
                                            {order.items.length > 2 && (
                                                <li className="text-muted-foreground">他 {order.items.length - 2}件</li>
                                            )}
                                        </ul>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReorder(order)}
                                                className="gap-1"
                                            >
                                                <RotateCcw className="h-3 w-3" />
                                                再発注
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePrintOrder(order)}
                                                className="gap-1"
                                            >
                                                <FileText className="h-3 w-3" />
                                                PDF
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        注文履歴はありません
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
