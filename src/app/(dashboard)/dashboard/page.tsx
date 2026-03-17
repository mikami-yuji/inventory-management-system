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
import { useProducts } from "@/hooks/use-products";
import { useInventory } from "@/hooks/use-inventory";
import { useSupplierStockLots } from "@/hooks/use-supplier-stock-lots";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppSettings } from "@/hooks/use-masters";
import {
    isRollBag,
    calculateStockStatus,
    bagsToMeters
} from "@/lib/services";

import { format } from "date-fns";
import { ja } from "date-fns/locale";

// APIから取得する発注データの型
type DashboardOrder = {
    id: string;
    status: string;
    type: string;
    createdAt: string;
};

// APIから取得するイベントデータの型
type DashboardEvent = {
    id: string;
    clientName: string;
    status: string;
    dates: string[];
    items?: Array<{
        productId: string;
        productName: string;
        productWeight: number | null;
        plannedQuantity: number;
        allocatedQuantity?: number;
        productShape?: string | null;
    }>;
};

export default function DashboardPage(): React.ReactElement {
    // Supabase APIから商品と在庫データを取得
    const { products, loading: productsLoading } = useProducts();
    const { inventory, loading: inventoryLoading } = useInventory();
    const { lots, loading: lotsLoading } = useSupplierStockLots();
    const { settings } = useAppSettings();

    // Hydrationエラー回避: 日時表示はクライアントサイドのみ
    const [currentTime, setCurrentTime] = useState<string>("");
    useEffect(() => {
        setCurrentTime(new Date().toLocaleString('ja-JP'));
    }, []);

    // 発注データをAPIから取得
    const [orders, setOrders] = useState<DashboardOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);

    const fetchOrders = useCallback(async (): Promise<void> => {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const data = await res.json();
                const safeData = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
                setOrders(safeData.slice(0, 5));
            }
        } catch (err) {
            console.error('発注データ取得エラー:', err);
        } finally {
            setOrdersLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // 入荷予定データをAPIから取得
    type IncomingStockItem = {
        id: string;
        productId: string;
        productName: string;
        productWeight: number | null;
        expectedDate: string;
        quantity: number;
        note: string | null;
        productShape?: string | null;
    };
    const [incomingStock, setIncomingStock] = useState<IncomingStockItem[]>([]);

    const fetchIncomingStock = useCallback(async (): Promise<void> => {
        try {
            const res = await fetch('/api/incoming-stock');
            if (res.ok) {
                const result = await res.json();
                const rawData = result.data || result;
                const safeData = Array.isArray(rawData) ? rawData : (Array.isArray(rawData.data) ? rawData.data : []);
                setIncomingStock(safeData.slice(0, 5).map((item: {
                    id: string;
                    product_id?: string;
                    productId?: string;
                    products?: { name: string, weight?: number };
                    productName?: string;
                    productWeight?: number | null;
                    expected_date?: string;
                    expectedDate?: string;
                    quantity: number;
                    note: string | null;
                }) => ({
                    id: item.id,
                    productId: item.product_id || item.productId || '',
                    productName: item.products?.name || item.productName || '不明',
                    productWeight: item.products?.weight !== undefined ? item.products?.weight : (item.productWeight || null),
                    expectedDate: item.expected_date || item.expectedDate || '',
                    quantity: item.quantity,
                    note: item.note,
                })));
            }
        } catch (err) {
            console.error('入荷予定取得エラー:', err);
        }
    }, []);

    useEffect(() => {
        fetchIncomingStock();
    }, [fetchIncomingStock]);

    // 特売イベントデータをAPIから取得
    const [activeEvents, setActiveEvents] = useState<DashboardEvent[]>([]);

    const fetchEvents = useCallback(async (): Promise<void> => {
        try {
            const res = await fetch('/api/sale-events');
            if (res.ok) {
                const result = await res.json();
                const rawData = result.data || result;
                const data = Array.isArray(rawData) ? rawData : (Array.isArray(rawData.data) ? rawData.data : []);
                const activeOrUpcoming = data.filter((e: { status: string }) => e.status === 'active' || e.status === 'upcoming');

                // 直近の日付順（開始日の昇順）にソートして最大3件
                const sortedData = activeOrUpcoming.sort((a: DashboardEvent, b: DashboardEvent) => {
                    const dateA = a.dates?.[0] || '9999-12-31';
                    const dateB = b.dates?.[0] || '9999-12-31';
                    return dateA.localeCompare(dateB);
                }).slice(0, 3);
                setActiveEvents(sortedData.map((event: DashboardEvent) => ({
                    ...event,
                    items: event.items?.map((item: { productId: string; productName?: string; productWeight?: number | null; plannedQuantity?: number; allocatedQuantity?: number; productShape?: string | null }) => ({
                        productId: item.productId,
                        productName: item.productName || '不明',
                        productWeight: item.productWeight || null,
                        plannedQuantity: item.plannedQuantity || 0,
                        allocatedQuantity: item.allocatedQuantity || 0,
                        productShape: item.productShape || null,
                    }))
                })));
            }
        } catch (err) {
            console.error('イベント取得エラー:', err);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const loading = productsLoading || inventoryLoading || ordersLoading || lotsLoading;

    // 特売イベントから引当マップを作成
    const allocationMap = useMemo(() => {
        const map = new Map<string, { bags: number; meters: number }>();
        activeEvents.forEach(event => {
            event.items?.forEach(item => {
                const current = map.get(item.productId) || { bags: 0, meters: 0 };

                const bags = item.allocatedQuantity || item.plannedQuantity || 0;
                const isRoll = isRollBag(item.productShape || "");
                const productWeight = item.productWeight || 5;
                const meters = isRoll ? bagsToMeters(bags, productWeight) : 0;

                map.set(item.productId, {
                    bags: current.bags + bags,
                    meters: current.meters + meters
                });
            });
        });
        return map;
    }, [activeEvents]);

    // 在庫アラート用に計算
    const urgentItems = useMemo(() => {
        return inventory.map(item => {
            const product = products.find(p => p.id === (item.product?.id || item.productId));
            if (!product) return null;

            const currentStock = item.quantity;
            const allocation = allocationMap.get(product.id) || { bags: 0, meters: 0 };

            // 共有サービスを使用して計算
            const status = calculateStockStatus(product, currentStock, allocation, settings);

            if (status.isOutOfStock || status.isLowStock) {
                return {
                    ...item,
                    product,
                    isOutOfStock: status.isOutOfStock,
                    isLowStock: status.isLowStock,
                    isNegativeStock: status.availableStock < 0,
                    availableStock: status.availableStock,
                    unit: status.isRoll ? 'm' : '枚',
                    currentStock
                };
            }
            return null;
        }).filter((i): i is NonNullable<typeof i> => i !== null);
    }, [inventory, products, allocationMap, settings]);

    const negativeStockItems = urgentItems.filter((i) => i.isNegativeStock);
    const outOfStockItems = urgentItems.filter((i) => i.isOutOfStock && !i.isNegativeStock);
    const lowStockItems = urgentItems.filter((i) => i.isLowStock);
    const totalProducts = products.length;

    // 商品IDから単価を取得するマップを作成
    const productPriceMap = new Map(products.map(p => [p.id, p.unitPrice]));

    const totalStockValue = inventory.reduce((sum, item) => {
        const productId = item.product?.id || item.productId;
        const unitPrice = productPriceMap.get(productId) || 0;
        return sum + (item.quantity * unitPrice);
    }, 0);

    // 長期在庫（入荷月から6ヶ月目以降）の抽出
    const longTermLots = lots.filter(lot => {
        if (lot.quantity <= 0) return false;
        const arrival = new Date(lot.stockDate);
        const now = new Date();
        const monthsElapsed = (now.getFullYear() - arrival.getFullYear()) * 12 + now.getMonth() - arrival.getMonth();
        return monthsElapsed >= 5;
    })
        .sort((a, b) => new Date(a.stockDate).getTime() - new Date(b.stockDate).getTime())
        .map(lot => {
            const product = products.find(p => p.id === lot.productId);
            return {
                ...lot,
                productName: product?.name || '不明な商品',
                sku: product?.sku || ''
            };
        })
        .slice(0, 5); // 最大5件表示



    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">ダッシュボード</h2>
                <div className="flex items-center gap-4">
                    {loading && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            読み込み中...
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                        {currentTime && `最終更新: ${currentTime}`}
                    </p>
                </div>
            </div>

            {/* 仕掛確認 */}
            {(() => {
                const wipCheckItems = products.filter(p => p.status === 'wip_check');
                if (wipCheckItems.length === 0) return null;

                return (
                    <Card className="bg-indigo-50 border-indigo-200 shadow-none sm:shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
                            <div>
                                <CardTitle className="text-indigo-700 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    仕掛確認が必要な商品
                                </CardTitle>
                                <CardDescription className="text-indigo-600/70">
                                    ステータスが「仕掛確認」に設定されている商品
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800">
                                <Link href="/inventory">在庫管理へ</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                            <div className="space-y-3">
                                {wipCheckItems.map((product) => (
                                    <div key={product.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded border border-indigo-100 shadow-sm gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate" title={`${product.name} (${product.weight}kg)`}>
                                                {product.name} ({product.weight}kg)
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex gap-2 mt-0.5">
                                                <span>SKU: {product.sku}</span>
                                                <span>/ 形状: {product.shape}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">仕掛確認</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                );
            })()}

            {/* 在庫アラート */}
            {(urgentItems.length > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 md:p-4">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <h3 className="font-bold text-red-700 text-lg">至急発注が必要な商品</h3>
                        </div>
                        <Button variant="outline" size="sm" asChild className="shrink-0 bg-white">
                            <Link href="/inventory/bags">
                                在庫管理へ <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {negativeStockItems.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-purple-800 border-b border-purple-200 pb-1 mb-2 flex items-center gap-1">
                                    【過剰引当】有効在庫がマイナス（直ちに手配が必要）
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {negativeStockItems.map((item) => (
                                        <div key={item.product.id} className="bg-white border border-purple-200 rounded p-2 flex justify-between items-center shadow-sm">
                                            <div className="truncate text-sm font-medium mr-2" title={`${item.product.name} (${item.product.weight}kg)`}>
                                                {item.product.name} ({item.product.weight}kg)
                                            </div>
                                            <div className="text-right">
                                                <div className="text-purple-600 font-bold text-sm whitespace-nowrap">
                                                    有効: {item.availableStock.toLocaleString()}{item.unit}
                                                </div>
                                                <div className="text-muted-foreground text-xs whitespace-nowrap">
                                                    (庫内: {item.currentStock.toLocaleString()}{item.unit})
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {outOfStockItems.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-red-800 border-b border-red-200 pb-1 mb-2">【欠品】直ちに手配が必要</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {outOfStockItems.map(item => (
                                        <div key={item.product.id} className="bg-white border border-red-200 rounded p-2 flex justify-between items-center shadow-sm">
                                            <div className="truncate text-sm font-medium mr-2" title={`${item.product.name} (${item.product.weight}kg)`}>
                                                {item.product.name} ({item.product.weight}kg)
                                            </div>
                                            <div className="text-red-600 font-bold text-sm whitespace-nowrap">
                                                {item.currentStock.toLocaleString()}{item.unit}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {lowStockItems.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-amber-800 border-b border-amber-200 pb-1 mb-2">【低在庫】発注を検討</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {lowStockItems.map(item => (
                                        <div key={item.product.id} className="bg-white border border-amber-200 rounded p-2 flex justify-between items-center shadow-sm">
                                            <div className="truncate text-sm font-medium mr-2" title={`${item.product.name} (${item.product.weight}kg)`}>
                                                {item.product.name} ({item.product.weight}kg)
                                            </div>
                                            <div className="text-amber-600 font-bold text-sm whitespace-nowrap">
                                                {item.currentStock.toLocaleString()}{item.unit}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 概要カード */}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-2 lg:grid-cols-4 md:gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">総商品数</CardTitle>
                        <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">{totalProducts.toLocaleString()}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                            登録済み商品
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">在庫総額</CardTitle>
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">¥{totalStockValue.toLocaleString()}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                            概算価値
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">進行中イベント</CardTitle>
                        <TicketPercent className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">{activeEvents.length} 件</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                            開催中の特売
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">入荷予定</CardTitle>
                        <CalendarDays className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">{incomingStock.length} 件</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                            予定されている入荷
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* メインコンテンツ */}
            <div className="grid gap-4 lg:grid-cols-2">

                {/* 最近の発注 */}
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6">
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
                    <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                        {/* Desktop Table */}
                        <div className="hidden md:block">
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
                        </div>

                        {/* Mobile List */}
                        <div className="md:hidden space-y-3">
                            {orders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-1">
                                        <div className="font-mono text-sm font-bold">{order.id.slice(0, 8)}...</div>
                                        <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('ja-JP')}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant={order.type === 'special_event' ? 'secondary' : 'outline'} className="text-[10px]">
                                            {order.type === 'special_event' ? '特売' : '通常'}
                                        </Badge>
                                        <Badge variant={order.status === 'shipped' ? 'default' : 'outline'} className="text-[10px]">
                                            {order.status === 'shipped' ? '出荷済' : order.status === 'requested' ? '受付中' : '取消'}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {orders.length === 0 && (
                                <div className="text-center text-muted-foreground py-4">
                                    発注履歴はありません
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 入荷予定 */}
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5" />
                                入荷予定
                            </CardTitle>
                            <CardDescription>直近の入荷スケジュール</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                        <div className="space-y-4">
                            {incomingStock.map((stock) => (
                                <div key={stock.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium">
                                            {stock.productName.slice(0, 30)}{stock.productName.length > 30 ? '...' : ''} {stock.productWeight ? `${stock.productWeight}kg` : ''}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {stock.expectedDate} / {stock.quantity.toLocaleString()}{isRollBag(stock.productShape) ? 'm' : '枚'}
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
                <Card className="bg-gradient-to-br from-pink-50 to-white border-pink-100 shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6">
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
                    <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                        <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeEvents.map(event => (
                                <div key={event.id} className="p-3 md:p-4 bg-white rounded-lg shadow-sm border border-pink-100">
                                    <h4 className="font-semibold text-pink-900">{event.clientName}</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {event.dates?.[0]} {event.dates?.length > 1 ? `〜 ${event.dates[event.dates.length - 1]}` : ''}
                                    </p>
                                    {event.items && event.items.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-pink-50 space-y-1">
                                            {event.items.slice(0, 3).map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs text-gray-600">
                                                    <span className="truncate mr-2" title={item.productName}>
                                                        {item.productName} {item.productWeight ? `${item.productWeight}kg` : ''}
                                                    </span>
                                                    <span className="font-medium whitespace-nowrap text-pink-700">
                                                        {item.plannedQuantity.toLocaleString()} 個
                                                    </span>
                                                </div>
                                            ))}
                                            {event.items.length > 3 && (
                                                <div className="text-[10px] text-gray-400 text-right mt-1">他 {event.items.length - 3} 件...</div>
                                            )}
                                        </div>
                                    )}
                                    <Button variant="link" className="p-0 h-auto mt-2 text-pink-600" asChild>
                                        <Link href={`/events/${event.id}`}>詳細を見る</Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 長期在庫 */}
            {longTermLots.length > 0 && (
                <Card className="bg-red-50 border-red-200 shadow-none sm:shadow-sm">
                    {/* ... (existing card content) ... */}
                    <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6 pb-2 md:pb-2">
                        <div>
                            <CardTitle className="text-red-700 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                長期在庫 (メーカー在庫)
                            </CardTitle>
                            <CardDescription className="text-red-600/70">
                                入荷月から6ヶ月目以降のロット
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-red-700 hover:bg-red-100 hover:text-red-800">
                            <Link href="/inventory">在庫管理へ</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                        <div className="space-y-3">
                            {longTermLots.map((lot) => (
                                <div key={lot.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded border border-red-100 shadow-sm gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate" title={lot.productName}>
                                            {lot.productName}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground flex gap-2 mt-0.5">
                                            <span>SKU: {lot.sku}</span>
                                            {lot.note && <span>/ メモ: {lot.note}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <div className="text-xs text-red-600 font-medium">
                                                {new Date(lot.stockDate).toLocaleDateString('ja-JP')}
                                            </div>
                                            <div className="font-bold text-sm">
                                                {lot.quantity.toLocaleString()} 個
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}


            {/* 落版予定 */}
            {(() => {
                const scheduledItems = products
                    .filter(p => p.status === 'plate_removal_scheduled')
                    .sort((a, b) => {
                        const dateA = a.discontinuedDate ? new Date(a.discontinuedDate).getTime() : Infinity;
                        const dateB = b.discontinuedDate ? new Date(b.discontinuedDate).getTime() : Infinity;
                        return dateA - dateB;
                    })
                    .slice(0, 5);
                if (scheduledItems.length === 0) return null;

                return (
                    <Card className="bg-slate-50 border-slate-200 shadow-none sm:shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6 pb-2 md:pb-2">
                            <div>
                                <CardTitle className="text-slate-700 flex items-center gap-2">
                                    <CalendarDays className="h-5 w-5" />
                                    落版予定の商品
                                </CardTitle>
                                <CardDescription className="text-slate-600/70">
                                    落版が予定されている商品一覧
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="text-slate-700 hover:bg-slate-100 hover:text-slate-800">
                                <Link href="/inventory">在庫管理へ</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                            <div className="space-y-3">
                                {scheduledItems.map((product) => (
                                    <div key={product.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded border border-slate-100 shadow-sm gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate" title={`${product.name} (${product.weight}kg)`}>
                                                {product.name} ({product.weight}kg)
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex gap-2 mt-0.5">
                                                <span>SKU: {product.sku}</span>
                                                <span>/ 形状: {product.shape}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 shrink-0 mt-2 sm:mt-0">
                                            <div className="flex items-center gap-2">
                                                {product.discontinuedDate && (
                                                    <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <CalendarDays className="h-3 w-3" />
                                                        {format(new Date(product.discontinuedDate), "yyyy年M月d日", { locale: ja })}
                                                    </div>
                                                )}
                                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">落版予定</Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                );
            })()}
        </div>
    );
}
