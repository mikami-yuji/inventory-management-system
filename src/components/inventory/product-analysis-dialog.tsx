"use client";

import React, { useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    LineChart,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    AlertTriangle,
    Info
} from "lucide-react";
import { useStockHistoryAnalysis } from "@/hooks/use-stock-history-analysis";

import { Product } from "@/types";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Chart.js登録
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,

    Tooltip,
    Legend
);

// プロップス定義
type ProductAnalysisDialogProps = {
    product: Product;
    currentStock: number;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

export function ProductAnalysisDialog({
    product,
    currentStock,
    trigger,
    open,
    onOpenChange
}: ProductAnalysisDialogProps): React.ReactElement {
    // データフェッチ (Hookを使用)
    const { history, analysis, loading } = useStockHistoryAnalysis(product.id, currentStock);

    // グラフデータ構築ロジック (Corrected for Stock Level)
    const stockLevelChartData = useMemo(() => {
        if (!history || history.length === 0) return null;

        // Sort by date ASC
        const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate Stock Level over time
        // Strategy: Forward Replay from 0 (or initial adjustment)
        let runningStock = 0;
        const dataPoints = sorted.map(h => {
            if (h.type === 'adjustment') {
                runningStock = h.quantity;
            } else if (h.type === 'incoming') {
                runningStock += h.quantity;
            } else if (h.type === 'outgoing') {
                runningStock -= h.quantity;
            } else if (h.type === 'order') {
                // order is also outgoing in terms of stock
                runningStock -= h.quantity;
            }

            return {
                date: h.date,
                stock: runningStock
            };
        });

        const recent = dataPoints.slice(-30);

        return {
            labels: recent.map(p => {
                const d = new Date(p.date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            }),
            datasets: [
                {
                    label: '在庫数推移',
                    data: recent.map(p => p.stock),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    tension: 0.3,
                }
            ]
        };
    }, [history]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    if (loading && !analysis) { // Use a better loading check
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>読み込み中...</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center p-8">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // If no analysis data (empty history)
    if (!analysis || !stockLevelChartData) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{product.name}</DialogTitle>
                    </DialogHeader>
                    <div className="text-center p-8 text-muted-foreground">
                        在庫履歴データがありません。
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{product.sku}</Badge>
                        <Badge variant={
                            product.category === 'bag' ? 'default' :
                                product.category === 'sticker' ? 'secondary' : 'outline'
                        }>
                            {product.category === 'bag' ? '米袋' :
                                product.category === 'sticker' ? 'シール' : 'その他'}
                        </Badge>
                    </div>
                    <DialogTitle className="text-xl">{product.name}</DialogTitle>
                    <DialogDescription>
                        {product.weight && `${product.weight}kg`} {product.shape && `/ ${product.shape}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* サマリー統計 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-slate-50">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground">週間使用数</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                                <div className="text-2xl font-bold">{analysis.weekly}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground">月間使用数</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                                <div className="text-2xl font-bold">{analysis.monthly}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground">3ヶ月使用数</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                                <div className="text-2xl font-bold">{analysis.quarterly}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground">1日平均</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                                <div className="text-2xl font-bold">{analysis.dailyAverage}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 在庫予測＆推奨 */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className={analysis.daysUntilStockout !== null && analysis.daysUntilStockout < 14 ? "border-amber-400 bg-amber-50" : ""}>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    在庫切れ予測
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {analysis.daysUntilStockout !== null ? (
                                    <div className="space-y-1">
                                        <div className="flex items-end gap-2">
                                            <span className="text-3xl font-bold">
                                                あと {analysis.daysUntilStockout} 日
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            現在のペース（1日 {analysis.dailyAverage}個）で消費した場合
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">データ不足のため算出できません</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    使用傾向
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3 mb-2">
                                    {analysis.trend === 'increasing' ? (
                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1 pl-1 pr-2">
                                            <TrendingUp className="h-4 w-4" />
                                            増加傾向
                                        </Badge>
                                    ) : analysis.trend === 'decreasing' ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1 pl-1 pr-2">
                                            <TrendingDown className="h-4 w-4" />
                                            減少傾向
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="gap-1 pl-1 pr-2">
                                            <Minus className="h-4 w-4" />
                                            安定
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    推奨発注数は <strong>{analysis.suggestedOrderQuantity}</strong> 個です
                                    （月間使用数の1.2倍）
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* グラフ */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">在庫推移（直近30回分）</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] w-full">
                                {stockLevelChartData && <Line data={stockLevelChartData} options={chartOptions} />}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
