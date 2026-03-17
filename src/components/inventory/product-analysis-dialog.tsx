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
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    Layers
} from "lucide-react";
import { useStockHistoryAnalysis } from "@/hooks/use-stock-history-analysis";
import { isRollBag } from "@/lib/services";
import { cn } from "@/lib/utils";

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

        // Calculate Stock Level over time (Backwards Replay)
        // Strategy: Start from current stock and subtract/add changes backwards
        let runningStock = currentStock;
        const dataPoints = [];

        // Sort by date DESC for backward replay
        const sortedDesc = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        for (const h of sortedDesc) {
            dataPoints.push({
                date: h.date,
                stock: runningStock
            });

            // Reverse the changes
            if (h.type === 'adjustment') {
                // Adjustment means we set it to something. Backwards, we don't know the delta unless stored.
                // Assuming h.changeAmount is the delta (qty_after - qty_before)
                runningStock -= (h.changeAmount || 0);
            } else if (h.type === 'incoming') {
                runningStock -= (h.changeAmount || h.quantity);
            } else if (h.type === 'outgoing' || h.type === 'order') {
                runningStock += (h.changeAmount || h.quantity);
            }
        }

        // Reverse back to chronological for chart
        const chronoData = dataPoints.reverse();
        const recent = chronoData.slice(-30);

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
    }, [history, currentStock]);

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

    const isRoll = isRollBag(product.shape || "", product.category);
    const unit = isRoll ? "m" : "枚";
    const subUnit = isRoll ? "巻" : null;

    // ロール袋の巻数計算
    const getSubUnitValue = (val: number) => {
        if (!isRoll) return null;
        const rollMeters = product.metersPerRoll || 400;
        return Math.floor(val / rollMeters);
    };

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
                                <div className="text-2xl font-bold">{analysis.weekly.toLocaleString()}</div>
                                {subUnit && (
                                    <div className="text-[10px] text-muted-foreground">
                                        約 {getSubUnitValue(analysis.weekly)} {subUnit}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground">月間使用数</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                                <div className="text-2xl font-bold">{analysis.monthly.toLocaleString()}</div>
                                {subUnit && (
                                    <div className="text-[10px] text-muted-foreground">
                                        約 {getSubUnitValue(analysis.monthly)} {subUnit}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground">3ヶ月使用数</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                                <div className="text-2xl font-bold">{analysis.quarterly.toLocaleString()}</div>
                                {subUnit && (
                                    <div className="text-[10px] text-muted-foreground">
                                        約 {getSubUnitValue(analysis.quarterly)} {subUnit}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground">1日平均</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                                <div className="text-2xl font-bold">{analysis.dailyAverage.toLocaleString()}</div>
                                {subUnit && (
                                    <div className="text-[10px] text-muted-foreground">
                                        約 {((analysis.dailyAverage / (product.metersPerRoll || 400)).toFixed(2))} {subUnit}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* 在庫予測＆推奨 */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className={cn(
                            analysis.daysUntilStockout !== null && analysis.daysUntilStockout < 7 ? "border-red-400 bg-red-50" :
                                analysis.daysUntilStockout !== null && analysis.daysUntilStockout < 14 ? "border-amber-400 bg-amber-50" : ""
                        )}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    在庫切れ予測
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {analysis.daysUntilStockout !== null ? (
                                    <div className="space-y-1">
                                        <div className="flex items-end gap-2">
                                            <span className={cn(
                                                "text-3xl font-bold",
                                                analysis.daysUntilStockout < 7 ? "text-red-700" :
                                                    analysis.daysUntilStockout < 14 ? "text-amber-700" : ""
                                            )}>
                                                あと {analysis.daysUntilStockout} 日
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            現在のペース（1日 {analysis.dailyAverage}{unit}）で消費した場合
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground py-2">データ不足のため算出できません</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    分析とリコメンド
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground">トレンド:</span>
                                    {analysis.trend === 'increasing' ? (
                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1 pl-1 pr-2 text-[10px]">
                                            <TrendingUp className="h-3 w-3" />
                                            消費増加
                                        </Badge>
                                    ) : analysis.trend === 'decreasing' ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1 pl-1 pr-2 text-[10px]">
                                            <TrendingDown className="h-3 w-3" />
                                            消費減少
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="gap-1 pl-1 pr-2 text-[10px]">
                                            <Minus className="h-3 w-3" />
                                            安定
                                        </Badge>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                                        <Layers className="h-3.5 w-3.5" />
                                        推奨発注数
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-primary">{analysis.suggestedOrderQuantity.toLocaleString()}</span>
                                        <span className="text-[10px] text-muted-foreground">{unit}</span>
                                        {subUnit && (
                                            <span className="text-xs text-slate-500 ml-2">
                                                (約 {getSubUnitValue(analysis.suggestedOrderQuantity)} {subUnit})
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        ※月間使用数の1.2倍を基準に算出
                                    </p>
                                </div>
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
