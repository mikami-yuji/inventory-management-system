import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MOCK_ORDERS, MOCK_PRODUCTS } from "@/lib/mock-data";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function OrdersPage() {
    const orders = MOCK_ORDERS;

    const getProductName = (productId: string) => {
        return MOCK_PRODUCTS.find(p => p.id === productId)?.name || productId;
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
                        あなた（または全クライアント）の出荷依頼履歴を表示しています。
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono">{order.id}</TableCell>
                                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
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
                                            {order.items.map((item, idx) => (
                                                <li key={idx}>
                                                    {getProductName(item.productId)} x {item.quantity}
                                                </li>
                                            ))}
                                        </ul>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        注文履歴はありません。
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
