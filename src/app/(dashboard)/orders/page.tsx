"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RotateCcw, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/cart-context";
import { useRouter } from "next/navigation";

// APIから取得する発注データの型
type OrderFromAPI = {
    id: string;
    clientId: string;
    status: string;
    type: string;
    eventId: string | null;
    shipmentSource: string | null;
    createdAt: string;
    items: {
        productId: string;
        quantity: number;
        productName: string;
        sku: string;
        weight: number | null;
        shape: string;
    }[];
};

export default function OrdersPage(): React.ReactElement {
    const { addToCart, clearCart } = useCart();
    const router = useRouter();
    const [orders, setOrders] = useState<OrderFromAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // APIから発注データを取得
    const fetchOrders = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/orders');

            if (!response.ok) {
                throw new Error('発注データの取得に失敗しました');
            }

            const result = await response.json();
            const rawData = result.data || result;
            const safeData = Array.isArray(rawData) ? rawData : (Array.isArray(rawData.data) ? rawData.data : []);
            setOrders(safeData);
        } catch (err) {
            console.error('発注データ取得エラー:', err);
            setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // 再発注処理
    const handleReorder = async (order: OrderFromAPI): Promise<void> => {
        clearCart();
        // 商品データをAPIから取得してカートに追加
        try {
            const productsRes = await fetch('/api/products');
            if (productsRes.ok) {
                const result = await productsRes.json();
                const products = Array.isArray(result) ? result : (Array.isArray(result.data) ? result.data : []);
                
                if (Array.isArray(products)) {
                    order.items.forEach(item => {
                        const product = products.find((p: { id: string }) => p.id === item.productId);
                        if (product) {
                            addToCart(product, item.quantity);
                        }
                    });
                }
            }
        } catch (err) {
            console.error('再発注エラー:', err);
        }
        router.push('/orders/new');
    };

    // PDF出力（印刷）
    const handlePrintOrder = (order: OrderFromAPI): void => {
        const printContent = `
            <html>
            <head>
                <title>発注書 - ${order.id.slice(0, 8)}</title>
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
                    <p><strong>発注番号:</strong> ${order.id.slice(0, 8)}</p>
                    <p><strong>依頼日:</strong> ${new Date(order.createdAt).toLocaleDateString('ja-JP')}</p>
                    <p><strong>タイプ:</strong> ${order.type === 'special_event' ? '特売発注' : '通常発注'}</p>
                    <p><strong>ステータス:</strong> ${order.status === 'shipped' ? '出荷済み' : '受付中'}</p>
                    ${order.shipmentSource ? `<p><strong>出荷元:</strong> ${order.shipmentSource === 'supplier' ? 'メーカー直送' : '自社在庫'}</p>` : ''}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>受注No</th>
                            <th>商品名</th>
                            <th>量目</th>
                            <th>数量</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.sku}</td>
                                <td>${item.productName}</td>
                                <td>${item.weight ? `${item.weight}kg` : ''} ${item.shape || ''}</td>
                                <td>${item.quantity} ${item.shape?.includes('巻') || item.shape?.includes('ロール') ? 'm' : '枚'}</td>
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

    // ステータス表示ラベル
    const getStatusLabel = (status: string): string => {
        switch (status) {
            case 'shipped': return '出荷済み';
            case 'cancelled': return 'キャンセル';
            default: return '受付中';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">発注履歴</h2>
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
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <span className="text-muted-foreground">読み込み中...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-red-500 mb-4">{error}</p>
                            <Button variant="outline" onClick={fetchOrders}>再試行</Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>注文ID</TableHead>
                                    <TableHead>依頼日</TableHead>
                                    <TableHead>タイプ</TableHead>
                                    <TableHead>出荷元</TableHead>
                                    <TableHead>ステータス</TableHead>
                                    <TableHead>商品</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
                                        <TableCell>{new Date(order.createdAt).toLocaleDateString('ja-JP')}</TableCell>
                                        <TableCell>
                                            {order.type === 'special_event' ? (
                                                <Badge variant="secondary">特売発注</Badge>
                                            ) : (
                                                <Badge variant="outline">通常発注</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {order.shipmentSource === 'supplier' ? (
                                                <Badge variant="secondary">メーカー直送</Badge>
                                            ) : (
                                                <Badge variant="outline">自社在庫</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={order.status === 'shipped' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'outline'}>
                                                {getStatusLabel(order.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-2">
                                                {order.items.slice(0, 2).map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-start text-sm border-b pb-1 last:border-0 last:pb-0">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                                                                <span className="font-medium truncate">{item.productName}</span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                {item.weight ? `${item.weight}kg / ` : ''}{item.shape || '-'}
                                                            </div>
                                                        </div>
                                                        <div className="font-medium whitespace-nowrap pl-2 text-right">
                                                            × {item.quantity.toLocaleString()} {item.shape?.includes('巻') || item.shape?.includes('ロール') ? 'm' : '枚'}
                                                        </div>
                                                    </div>
                                                ))}
                                                {order.items.length > 2 && (
                                                    <div className="text-muted-foreground text-xs text-right w-full">他 {order.items.length - 2}件</div>
                                                )}
                                            </div>
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
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            注文履歴はありません
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
