"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    CalendarDays,
    Package,
    TicketPercent,
    ShoppingCart,
    AlertTriangle,
    TrendingUp,
    ArrowRight,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { useProducts, useInventory } from "@/hooks/use-supabase-data";
import { orderService, eventService, inventoryService } from "@/lib/services";

export default function DashboardPage(): React.ReactElement {
    // Supabase APIから商品と在庫データを取得
    const { products, loading: productsLoading } = useProducts();
    const { inventory, loading: inventoryLoading } = useInventory();

    const loading = productsLoading || inventoryLoading;

    // モックサービスからイベントと発注を取得（将来的にAPIに移行）
    const activeEvents = eventService.getEventsByStatus('active');
    const incomingStock = inventoryService.getIncomingStock().slice(0, 5);
    const orders = orderService.getOrders().slice(0, 5);

    // 在庫統計を計算
    const lowStockItems = inventory.filter(i => i.quantity < 50);
    const outOfStockItems = inventory.filter(i => i.quantity === 0);
    const totalProducts = products.length;

    // 商品IDから単価を取得するマップを作成
    const productPriceMap = new Map(products.map(p => [p.id, p.unitPrice]));

    const totalStockValue = inventory.reduce((sum, item) => {
        const productId = item.product?.id || item.productId;
        const unitPrice = productPriceMap.get(productId) || 0;
        return sum + (item.quantity * unitPrice);
    }, 0);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
                <div className="flex items-center gap-4">
                    {loading && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            読み込み中...
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                        最終更新: {new Date().toLocaleString('ja-JP')}
                    </p>
                </div>
            </div>

            {/* 在庫アラート */}
            {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-4">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-amber-900">在庫アラート</h3>
                        <p className="text-sm text-amber-700 mt-1">
                            {outOfStockItems.length > 0 && (
                                <span className="font-medium text-red-600">欠品: {outOfStockItems.length}件</span>
                            )}
                            {outOfStockItems.length > 0 && lowStockItems.length > 0 && ' / '}
                            {lowStockItems.length > 0 && (
                                <span>低在庫: {lowStockItems.length}件</span>
                            )}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/inventory">
                            確認する <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            )}

            {/* 概要カード */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">総商品数</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProducts.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            登録済み商品
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">在庫総額</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">¥{totalStockValue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            概算価値
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">進行中イベント</CardTitle>
                        <TicketPercent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeEvents.length} 件</div>
                        <p className="text-xs text-muted-foreground">
                            開催中の特売
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">入荷予定</CardTitle>
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{incomingStock.length} 件</div>
                        <p className="text-xs text-muted-foreground">
                            予定されている入荷
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* メインコンテンツ */}
            <div className="grid gap-4 lg:grid-cols-2">

                {/* 最近の発注 */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                最近の発注
                            </CardTitle>
                            <CardDescription>直近の出荷依頼</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/orders">すべて見る</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>発注ID</TableHead>
                                    <TableHead>タイプ</TableHead>
                                    <TableHead>ステータス</TableHead>
                                    <TableHead className="text-right">日時</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
                                        <TableCell>
                                            <Badge variant={order.type === 'special_event' ? 'secondary' : 'outline'}>
                                                {order.type === 'special_event' ? '特売' : '通常'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={order.status === 'shipped' ? 'default' : 'outline'}>
                                                {order.status === 'shipped' ? '出荷済' : order.status === 'requested' ? '受付中' : '取消'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">
                                            {new Date(order.createdAt).toLocaleDateString('ja-JP')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {orders.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            発注履歴はありません
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* 入荷予定 */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5" />
                                入荷予定
                            </CardTitle>
                            <CardDescription>直近の入荷スケジュール</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {incomingStock.map((stock) => (
                                <div key={stock.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium">
                                            {inventoryService.getProductName(stock.productId).slice(0, 30)}...
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {stock.expectedDate} / {stock.quantity.toLocaleString()}個
                                        </p>
                                    </div>
                                    {stock.note && (
                                        <Badge variant="outline" className="text-xs">
                                            {stock.note}
                                        </Badge>
                                    )}
                                </div>
                            ))}
                            {incomingStock.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    入荷予定はありません
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 開催中イベント */}
            {activeEvents.length > 0 && (
                <Card className="bg-gradient-to-br from-pink-50 to-white border-pink-100">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-pink-700 flex items-center gap-2">
                                <TicketPercent className="h-5 w-5" />
                                開催中の特売イベント
                            </CardTitle>
                            <CardDescription>現在進行中のイベント</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/events">すべて見る</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeEvents.map(event => (
                                <div key={event.id} className="p-4 bg-white rounded-lg shadow-sm border border-pink-100">
                                    <h4 className="font-semibold text-pink-900">{event.name}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{event.startDate} 〜 {event.endDate}</p>
                                    <p className="text-sm mt-2 line-clamp-2">{event.description}</p>
                                    <Button variant="link" className="p-0 h-auto mt-2 text-pink-600" asChild>
                                        <Link href={`/events/${event.id}`}>詳細を見る</Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
