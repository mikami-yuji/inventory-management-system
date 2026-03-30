"use client";

/**
 * 在庫回転率レポートページ
 * 商品ごとの在庫回転率を計算し、仕入れ量の最適化に活用する
 */

import React, { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ArrowLeft,
    Loader2,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    PackageX,
    BarChart3,
    ArrowUpDown,
    Printer,
    Download,
} from "lucide-react";
import { format } from "date-fns";
import { calculateStockStatus } from "@/lib/services";
import { useProducts } from "@/hooks/use-products";
import { useInventory } from "@/hooks/use-inventory";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Chart.js登録
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// 在庫履歴のAPI応答型
type StockHistoryEntry = {
    id: string;
    productId: string;
    date: string;
    quantity: number;
    type: string;
    changeAmount: number;
};

// 回転率ランクの型
type TurnoverRank = 'A' | 'B' | 'C' | 'D';

// 回転率データの型
type TurnoverData = {
    productId: string;
    productName: string;
    productCode: string;
    category: string;
    currentStock: number;
    monthlyOutgoing: number;
    monthlyIncoming: number;
    averageStock: number;
    turnoverRate: number;
    rank: TurnoverRank;
    suggestedAction: string;
    daysOfStock: number | null;
};

/**
 * 回転率ランクを判定する
 * A: 高回転（>2.0） - よく動く商品
 * B: 中回転（0.5〜2.0） - 適正
 * C: 低回転（0.1〜0.5） - 滞留気味
 * D: 死に筋（<0.1） - ほぼ動かない
 */
function getTurnoverRank(rate: number): TurnoverRank {
    if (rate >= 2.0) return 'A';
    if (rate >= 0.5) return 'B';
    if (rate >= 0.1) return 'C';
    return 'D';
}

/**
 * ランクに応じた仕入れアクション提案を返す
 */
function getSuggestedAction(rank: TurnoverRank, currentStock: number, monthlyOutgoing: number): string {
    switch (rank) {
        case 'A':
            if (currentStock < monthlyOutgoing * 0.5) {
                return '⚠️ 在庫切れ注意！早急に仕入れ検討';
            }
            return '適宜補充。在庫切れに注意';
        case 'B':
            return '現状維持。定期的に確認';
        case 'C':
            return '仕入れ量を減らすことを検討';
        case 'D':
            if (currentStock > 0) {
                return '落版・処分を検討';
            }
            return '仕入れ不要';
    }
}

/**
 * ランクに応じたバッジの色を返す
 */
function getRankBadgeVariant(rank: TurnoverRank): "default" | "secondary" | "destructive" | "outline" {
    switch (rank) {
        case 'A': return 'default';
        case 'B': return 'secondary';
        case 'C': return 'outline';
        case 'D': return 'destructive';
    }
}

// ソートキーの型
type SortKey = 'turnoverRate' | 'currentStock' | 'monthlyOutgoing' | 'productName';
type SortDirection = 'asc' | 'desc';

function TurnoverReportContent(): React.ReactElement {
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [rankFilter, setRankFilter] = useState<string>("all");
    const [sortKey, setSortKey] = useState<SortKey>('turnoverRate');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // データ取得
    const { products, loading: productsLoading } = useProducts();
    const { inventory: inventoryData, loading: inventoryLoading } = useInventory();

    // 在庫履歴をAPIから取得
    const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const fetchHistory = useCallback(async (): Promise<void> => {
        setHistoryLoading(true);
        try {
            // 90日分の履歴を取得
            const response = await fetch('/api/stock-history?days=90&limit=5000');
            if (response.ok) {
                const result = await response.json();
                const rawData = result.data || result;
                const safeData = Array.isArray(rawData) ? rawData : (Array.isArray(rawData.data) ? rawData.data : []);
                setStockHistory(safeData);
            }
        } catch (err) {
            console.error('在庫履歴取得エラー:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const loading = productsLoading || inventoryLoading || historyLoading;

    // 在庫マップ (productId -> quantity)
    const inventoryMap = useMemo(() => {
        const map = new Map<string, number>();
        inventoryData?.forEach(item => {
            map.set(item.productId, item.quantity);
        });
        return map;
    }, [inventoryData]);

    // 商品ID別に在庫履歴をグループ化
    const historyByProduct = useMemo(() => {
        const map = new Map<string, StockHistoryEntry[]>();
        stockHistory.forEach(entry => {
            const list = map.get(entry.productId) || [];
            list.push(entry);
            map.set(entry.productId, list);
        });
        return map;
    }, [stockHistory]);

    // 回転率データを計算
    const turnoverData = useMemo((): TurnoverData[] => {
        return products.map(product => {
            const currentStock = inventoryMap.get(product.id) || 0;
            const productHistory = historyByProduct.get(product.id) || [];

            // 月間出庫数を計算（outgoingタイプの合計）
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const recentHistory = productHistory.filter(
                h => new Date(h.date) >= thirtyDaysAgo
            );

            const monthlyOutgoing = recentHistory
                .filter(h => h.type === 'outgoing')
                .reduce((sum, h) => sum + h.quantity, 0);

            const monthlyIncoming = recentHistory
                .filter(h => h.type === 'incoming')
                .reduce((sum, h) => sum + h.quantity, 0);

            // 平均在庫を推定
            // 簡易計算: (現在庫 + (現在庫 + 月間出庫 - 月間入庫)) / 2
            const estimatedStartStock = currentStock + monthlyOutgoing - monthlyIncoming;
            const averageStock = Math.max(1, (currentStock + Math.max(0, estimatedStartStock)) / 2);

            // 在庫回転率 = 月間出庫数 ÷ 平均在庫数
            const turnoverRate = averageStock > 0
                ? Math.round((monthlyOutgoing / averageStock) * 100) / 100
                : 0;

            const rank = getTurnoverRank(turnoverRate);

            // 在庫日数（あと何日持つか）
            const dailyOutgoing = monthlyOutgoing / 30;
            const daysOfStock = dailyOutgoing > 0 ? Math.floor(currentStock / dailyOutgoing) : null;

            return {
                productId: product.id,
                productName: product.name,
                productCode: product.sku || product.productCode || '',
                category: product.category || 'other',
                currentStock,
                monthlyOutgoing,
                monthlyIncoming,
                averageStock: Math.round(averageStock),
                turnoverRate,
                rank,
                suggestedAction: getSuggestedAction(rank, currentStock, monthlyOutgoing),
                daysOfStock,
            };
        });
    }, [products, inventoryMap, historyByProduct]);

    // フィルター適用
    const filteredData = useMemo(() => {
        let data = turnoverData;

        if (categoryFilter !== "all") {
            data = data.filter(d => d.category === categoryFilter);
        }

        if (rankFilter !== "all") {
            data = data.filter(d => d.rank === rankFilter);
        }

        // ソート
        data = [...data].sort((a, b) => {
            let comparison = 0;
            switch (sortKey) {
                case 'turnoverRate':
                    comparison = a.turnoverRate - b.turnoverRate;
                    break;
                case 'currentStock':
                    comparison = a.currentStock - b.currentStock;
                    break;
                case 'monthlyOutgoing':
                    comparison = a.monthlyOutgoing - b.monthlyOutgoing;
                    break;
                case 'productName':
                    comparison = a.productName.localeCompare(b.productName, 'ja');
                    break;
            }
            return sortDirection === 'desc' ? -comparison : comparison;
        });

        return data;
    }, [turnoverData, categoryFilter, rankFilter, sortKey, sortDirection]);

    // サマリー統計
    const summary = useMemo(() => {
        const total = turnoverData.length;
        const withMovement = turnoverData.filter(d => d.monthlyOutgoing > 0);
        const averageTurnover = withMovement.length > 0
            ? Math.round(withMovement.reduce((sum, d) => sum + d.turnoverRate, 0) / withMovement.length * 100) / 100
            : 0;
        const rankA = turnoverData.filter(d => d.rank === 'A').length;
        const rankB = turnoverData.filter(d => d.rank === 'B').length;
        const rankC = turnoverData.filter(d => d.rank === 'C').length;
        const rankD = turnoverData.filter(d => d.rank === 'D').length;
        const deadStock = turnoverData.filter(d => d.rank === 'D' && d.currentStock > 0).length;

        return { total, averageTurnover, rankA, rankB, rankC, rankD, deadStock };
    }, [turnoverData]);

    // グラフデータ - ランク別商品数分布
    const rankChartData = {
        labels: ['A (高回転)', 'B (中回転)', 'C (低回転)', 'D (死に筋)'],
        datasets: [
            {
                label: '商品数',
                data: [summary.rankA, summary.rankB, summary.rankC, summary.rankD],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(239, 68, 68, 0.7)',
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    // ソートハンドラー
    const handleSort = (key: SortKey): void => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };

    // ソートアイコン
    const SortIcon = ({ columnKey }: { columnKey: SortKey }): React.ReactElement | null => {
        if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
        return sortDirection === 'asc'
            ? <TrendingUp className="h-3 w-3 ml-1 text-primary" />
            : <TrendingDown className="h-3 w-3 ml-1 text-primary" />;
    };

    // 印刷
    const handlePrint = useCallback((): void => {
        const originalTitle = document.title;
        document.title = `アサヒパック_在庫回転率レポート_${format(new Date(), "yyyyMMdd_HHmm")}`;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 100);
    }, []);

    // Excel出力
    const handleExportExcel = (): void => {
        try {
            if (filteredData.length === 0) return;

            const excelData = filteredData.map(item => ({
                "商品名": item.productName,
                "商品コード": item.productCode,
                "カテゴリ": item.category,
                "現在庫": item.currentStock,
                "月間出庫": item.monthlyOutgoing,
                "月間入庫": item.monthlyIncoming,
                "平均在庫": item.averageStock,
                "回転率": item.turnoverRate,
                "ランク": item.rank,
                "在庫日数": item.daysOfStock !== null ? `${item.daysOfStock}日` : "-",
                "提案": item.suggestedAction
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const colWidths = [
                { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
                { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 40 }
            ];
            worksheet["!cols"] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "在庫回転率");

            const now = new Date();
            const dateStr = now.getFullYear() + 
                String(now.getMonth() + 1).padStart(2, '0') + 
                String(now.getDate()).padStart(2, '0');
            XLSX.writeFile(workbook, `アサヒパック_在庫回転率レポート_${dateStr}.xlsx`);
        } catch (error) {
            console.error("Excel出力エラー:", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-xs md:text-sm">
                        <Link href="/reports">
                            <Button variant="ghost" size="sm" className="gap-1 h-8">
                                <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
                                レポート一覧
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl md:text-3xl font-bold tracking-tight">在庫回転率レポート</h2>
                        {loading && <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin text-muted-foreground" />}
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        商品ごとの回転率を分析し、仕入れ量・販売戦略の最適化に活用します
                    </p>
                </div>
                <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-1">
                    <Button variant="outline" size="sm" onClick={fetchHistory} className="gap-2 shrink-0">
                        <RefreshCw className="h-4 w-4" />
                        更新
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2 shrink-0 border-green-600 text-green-600 hover:bg-green-50">
                        <Download className="h-4 w-4" />
                        Excel出力
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 shrink-0">
                        <Printer className="h-4 w-4" />
                        印刷
                    </Button>
                </div>
            </div>

            {/* サマリーカード */}
            <div className="grid gap-2 grid-cols-2 md:grid-cols-4 md:gap-4 print:grid-cols-4">
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">平均回転率</CardTitle>
                        <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold">{summary.averageTurnover}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">動きのある商品の平均</p>
                    </CardContent>
                </Card>
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-green-600">高回転商品</CardTitle>
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold text-green-600">{summary.rankA}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">回転率 2.0以上</p>
                    </CardContent>
                </Card>
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-amber-600">低回転商品</CardTitle>
                        <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold text-amber-600">{summary.rankC}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">回転率 0.1〜0.5</p>
                    </CardContent>
                </Card>
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-red-600">死に筋</CardTitle>
                        <PackageX className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold text-red-600">{summary.deadStock}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">在庫あり・動かない商品</p>
                    </CardContent>
                </Card>
            </div>

            {/* グラフ＋フィルター */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* 回転率分布グラフ */}
                <Card className="md:col-span-1 shadow-none sm:shadow-sm">
                    <CardHeader className="p-3 md:p-6">
                        <CardTitle className="text-sm md:text-base">ランク別分布</CardTitle>
                        <CardDescription className="text-xs">商品数の分布</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                        <div className="h-[150px] md:h-[200px]">
                            <Bar data={rankChartData} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } },
                                    x: { ticks: { font: { size: 10 } } }
                                },
                            }} />
                        </div>
                    </CardContent>
                </Card>

                {/* 回転率の見方 */}
                <Card className="md:col-span-2 shadow-none sm:shadow-sm">
                    <CardHeader className="p-3 md:p-6">
                        <CardTitle className="text-sm md:text-base">回転率ランクの見方</CardTitle>
                        <CardDescription className="text-xs">回転率 = 月間出庫数 ÷ 平均在庫数</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                            <div className="p-2 md:p-3 rounded-lg bg-green-50 border border-green-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="default" className="bg-green-600 text-[10px] md:text-xs">A</Badge>
                                    <span className="font-medium text-[11px] md:text-sm">高回転（2.0以上）</span>
                                </div>
                                <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">よく動く商品。在庫切れに注意して適宜補充</p>
                            </div>
                            <div className="p-2 md:p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-[10px] md:text-xs">B</Badge>
                                    <span className="font-medium text-[11px] md:text-sm">中回転（0.5〜2.0）</span>
                                </div>
                                <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">適正水準。現状の仕入れ量を維持</p>
                            </div>
                            <div className="p-2 md:p-3 rounded-lg bg-amber-50 border border-amber-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="border-amber-500 text-amber-700 text-[10px] md:text-xs">C</Badge>
                                    <span className="font-medium text-[11px] md:text-sm">低回転（0.1〜0.5）</span>
                                </div>
                                <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">滞留気味。仕入れ量を減らすことを検討</p>
                            </div>
                            <div className="p-2 md:p-3 rounded-lg bg-red-50 border border-red-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="destructive" className="text-[10px] md:text-xs">D</Badge>
                                    <span className="font-medium text-[11px] md:text-sm">死に筋（0.1未満）</span>
                                </div>
                                <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">ほぼ動かない。落版・処分を検討</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* フィルター */}
            <Card className="print:hidden">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4 items-center">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="カテゴリ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">すべて</SelectItem>
                                <SelectItem value="bag">米袋</SelectItem>
                                <SelectItem value="new_rice">新米</SelectItem>
                                <SelectItem value="sticker">シール</SelectItem>
                                <SelectItem value="other">その他</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={rankFilter} onValueChange={setRankFilter}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="ランク" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全ランク</SelectItem>
                                <SelectItem value="A">A（高回転）</SelectItem>
                                <SelectItem value="B">B（中回転）</SelectItem>
                                <SelectItem value="C">C（低回転）</SelectItem>
                                <SelectItem value="D">D（死に筋）</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="text-sm text-muted-foreground ml-auto">
                            {filteredData.length} / {turnoverData.length} 件
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 回転率テーブル */}
            <Card className="shadow-none sm:shadow-sm">
                <CardHeader className="p-3 md:p-6">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <BarChart3 className="h-5 w-5" />
                        回転率ランキング
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                        過去30日間の出庫データに基づく在庫回転率
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">計算中...</span>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            該当する商品がありません
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                            <button
                                                className="flex items-center hover:text-primary transition-colors"
                                                onClick={() => handleSort('productName')}
                                            >
                                                商品名
                                                <SortIcon columnKey="productName" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button
                                                className="flex items-center ml-auto hover:text-primary transition-colors"
                                                onClick={() => handleSort('currentStock')}
                                            >
                                                現在庫
                                                <SortIcon columnKey="currentStock" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button
                                                className="flex items-center ml-auto hover:text-primary transition-colors"
                                                onClick={() => handleSort('monthlyOutgoing')}
                                            >
                                                月間出庫
                                                <SortIcon columnKey="monthlyOutgoing" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">平均在庫</TableHead>
                                        <TableHead className="text-right">
                                            <button
                                                className="flex items-center ml-auto hover:text-primary transition-colors"
                                                onClick={() => handleSort('turnoverRate')}
                                            >
                                                回転率
                                                <SortIcon columnKey="turnoverRate" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center">ランク</TableHead>
                                        <TableHead className="text-right">在庫日数</TableHead>
                                        <TableHead className="hidden md:table-cell">提案</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.map((item) => (
                                        <TableRow
                                            key={item.productId}
                                            className={
                                                item.rank === 'D' && item.currentStock > 0
                                                    ? 'bg-red-50/50'
                                                    : item.rank === 'A' && item.daysOfStock !== null && item.daysOfStock < 7
                                                        ? 'bg-amber-50/50'
                                                        : ''
                                            }
                                        >
                                            <TableCell>
                                                <div className="font-medium text-sm">{item.productName}</div>
                                                <div className="text-xs text-muted-foreground">{item.productCode}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums">
                                                {item.currentStock.toLocaleString()}
                                                <span className="text-[10px] font-normal ml-0.5">
                                                    {calculateStockStatus(products.find(p => p.id === item.productId)!, item.currentStock, { bags: 0, meters: 0 }).isRoll ? 'm' : '枚'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums text-slate-600">
                                                {item.monthlyOutgoing.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums text-slate-400">
                                                {item.averageStock.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`font-bold ${item.rank === 'A' ? 'text-green-600' :
                                                        item.rank === 'B' ? 'text-blue-600' :
                                                            item.rank === 'C' ? 'text-amber-600' :
                                                                'text-red-600'
                                                    }`}>
                                                    {item.turnoverRate.toFixed(2)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={getRankBadgeVariant(item.rank)}>
                                                    {item.rank}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.daysOfStock !== null ? (
                                                    <span className={item.daysOfStock < 14 ? 'text-red-600 font-medium' : ''}>
                                                        {item.daysOfStock}日
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        <Minus className="h-4 w-4 inline" />
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px]">
                                                {item.suggestedAction}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* フッター */}
            <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-4 print:mt-4">
                <p className="mb-1 font-medium text-slate-500 tracking-wider">※ 本資料の回転率データは過去30日間のシステムデータに基づいた計算値です。</p>
                <p className="mb-4">実在庫の変化や季節要因により変動するため、仕入れ計画の参考値としてご活用ください。</p>
                <div className="flex justify-center items-center gap-8 mt-4 pt-4 border-t border-slate-100 max-w-lg mx-auto">
                    <div className="text-left">
                        <p className="font-bold text-slate-700 text-[11px]">株式会社アサヒパック</p>
                        <p>〒558-0046 大阪府大阪市住吉区上住吉1-4-2</p>
                    </div>
                    <div className="text-right border-l pl-8 border-slate-200">
                        <p>TEL: 06-6673-7771</p>
                        <p>URL: https://www.asahipac.co.jp/</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TurnoverReportPage(): React.ReactElement {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <TurnoverReportContent />
        </Suspense>
    );
}
