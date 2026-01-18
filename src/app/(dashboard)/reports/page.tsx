"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Package,
    ShoppingCart,
    Calendar,
    DollarSign
} from "lucide-react";
import { inventoryService, orderService } from "@/lib/services";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Chart.jsのコンポーネント登録
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

export default function ReportsPage(): React.ReactElement {
    // 在庫データを取得
    const inventory = inventoryService.getInventory();
    const products = inventoryService.getProducts();
    const orders = orderService.getOrders();

    // 月別の発注サマリー（モックデータ）
    const monthlyData = useMemo(() => {
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        // モックの月別発注数
        const orderCounts = [45, 52, 48, 61, 55, 67, 72, 68, 75, 82, 78, 85];
        // モックの月別発注金額（万円）
        const orderAmounts = [120, 145, 135, 178, 162, 195, 210, 198, 225, 248, 235, 260];

        return { months, orderCounts, orderAmounts };
    }, []);

    // カテゴリ別在庫分布
    const categoryDistribution = useMemo(() => {
        const categories: Record<string, number> = {};
        products.forEach(p => {
            const cat = p.category || 'その他';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        return categories;
    }, [products]);

    // 在庫状態サマリー
    const stockStats = useMemo(() => {
        const total = inventory.length;
        const outOfStock = inventory.filter(i => i.quantity === 0).length;
        const lowStock = inventory.filter(i => i.quantity > 0 && i.quantity < 50).length;
        const normalStock = total - outOfStock - lowStock;

        return { total, outOfStock, lowStock, normalStock };
    }, [inventory]);

    // 発注数グラフデータ
    const orderCountChartData = {
        labels: monthlyData.months,
        datasets: [
            {
                label: '発注件数',
                data: monthlyData.orderCounts,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
            },
        ],
    };

    // 発注金額グラフデータ
    const orderAmountChartData = {
        labels: monthlyData.months,
        datasets: [
            {
                label: '発注金額（万円）',
                data: monthlyData.orderAmounts,
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    // カテゴリ分布グラフデータ
    const categoryChartData = {
        labels: Object.keys(categoryDistribution).map(k =>
            k === 'bag' ? '米袋' :
                k === 'sticker' ? 'シール' :
                    k === 'new_rice' ? '新米' :
                        k === 'other' ? 'その他' : k
        ),
        datasets: [
            {
                data: Object.values(categoryDistribution),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(107, 114, 128, 0.8)',
                ],
                borderWidth: 0,
            },
        ],
    };

    // 在庫状態グラフデータ
    const stockStatusChartData = {
        labels: ['正常在庫', '低在庫', '欠品'],
        datasets: [
            {
                data: [stockStats.normalStock, stockStats.lowStock, stockStats.outOfStock],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                ],
                borderWidth: 0,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
        },
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">レポート</h2>
                <p className="text-muted-foreground">在庫・発注データの分析レポートを表示します</p>
            </div>

            {/* サマリーカード */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">総商品数</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{products.length}</div>
                        <p className="text-xs text-muted-foreground">登録商品数</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">総発注件数</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{orders.length}</div>
                        <p className="text-xs text-muted-foreground">累計発注数</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">欠品商品</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stockStats.outOfStock}</div>
                        <p className="text-xs text-muted-foreground">要発注</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">月平均発注金額</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">¥193万</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            前年比+12%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* グラフタブ */}
            <Tabs defaultValue="orders" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="orders">発注推移</TabsTrigger>
                    <TabsTrigger value="inventory">在庫分析</TabsTrigger>
                    <TabsTrigger value="monthly">月別サマリー</TabsTrigger>
                </TabsList>

                {/* 発注推移タブ */}
                <TabsContent value="orders" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    月別発注件数
                                </CardTitle>
                                <CardDescription>過去12ヶ月の発注件数推移</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <Bar data={orderCountChartData} options={chartOptions} />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    月別発注金額
                                </CardTitle>
                                <CardDescription>過去12ヶ月の発注金額推移</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <Line data={orderAmountChartData} options={chartOptions} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* 在庫分析タブ */}
                <TabsContent value="inventory" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>カテゴリ別商品数</CardTitle>
                                <CardDescription>商品カテゴリの分布</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] flex items-center justify-center">
                                    <Doughnut data={categoryChartData} options={{
                                        ...chartOptions,
                                        cutout: '60%',
                                    }} />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>在庫状態</CardTitle>
                                <CardDescription>現在の在庫状況の内訳</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] flex items-center justify-center">
                                    <Doughnut data={stockStatusChartData} options={{
                                        ...chartOptions,
                                        cutout: '60%',
                                    }} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* 月別サマリータブ */}
                <TabsContent value="monthly" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                月別発注サマリー
                            </CardTitle>
                            <CardDescription>過去12ヶ月の発注データ一覧</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>月</TableHead>
                                        <TableHead className="text-right">発注件数</TableHead>
                                        <TableHead className="text-right">発注金額</TableHead>
                                        <TableHead className="text-right">平均単価</TableHead>
                                        <TableHead>前月比</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {monthlyData.months.map((month, idx) => {
                                        const count = monthlyData.orderCounts[idx];
                                        const amount = monthlyData.orderAmounts[idx];
                                        const prevAmount = idx > 0 ? monthlyData.orderAmounts[idx - 1] : amount;
                                        const change = ((amount - prevAmount) / prevAmount * 100).toFixed(1);
                                        const isPositive = parseFloat(change) >= 0;

                                        return (
                                            <TableRow key={month}>
                                                <TableCell className="font-medium">{month}</TableCell>
                                                <TableCell className="text-right">{count}件</TableCell>
                                                <TableCell className="text-right">¥{amount}万</TableCell>
                                                <TableCell className="text-right">
                                                    ¥{Math.round(amount * 10000 / count).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={isPositive ? "default" : "destructive"}
                                                        className="gap-1"
                                                    >
                                                        {isPositive ? (
                                                            <TrendingUp className="h-3 w-3" />
                                                        ) : (
                                                            <TrendingDown className="h-3 w-3" />
                                                        )}
                                                        {isPositive ? '+' : ''}{change}%
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
