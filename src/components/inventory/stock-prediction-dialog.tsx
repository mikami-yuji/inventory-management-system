"use client";

import React, { useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Calendar,
    TrendingDown,
    Info,
    ArrowUpCircle,
    ArrowDownCircle
} from "lucide-react";
import { isRollBag, bagsToMeters } from "@/lib/services";
import { Product } from "@/types";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from "date-fns";
import { ja } from "date-fns/locale";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler
);

type StockPredictionDialogProps = {
    product: Product;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prediction: any; // Result of calculateStockPrediction
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function StockPredictionDialog({
    product,
    prediction,
    open,
    onOpenChange,
}: StockPredictionDialogProps): React.ReactElement {
    const isRoll = isRollBag(product.shape || "", product.category, product.metersPerRoll);
    const unit = isRoll ? "m" : "枚";

    // 一日の平均消費を m に変換 (ロールの場合)
    const dailyRateMeters = isRoll ? bagsToMeters(product.dailyShipmentRate || 0, product.weight || 5) : 0;

    const chartData = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!prediction?.simulation || prediction.simulation.length === 0) return null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const labels = prediction.simulation.map((s: any) => format(s.date, "M/d"));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = prediction.simulation.map((s: any) => s.stock);

        return {
            labels,
            datasets: [
                {
                    label: '予測在庫数',
                    data,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.2,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                }
            ]
        };
    }, [prediction]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: (context: any) => `在庫: ${context.parsed.y.toLocaleString()}${unit}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ticks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    callback: (value: any) => value.toLocaleString() + unit
                }
            }
        }
    };

    // 主要なイベントの抽出
    const events = useMemo(() => {
        if (!prediction?.simulation) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return prediction.simulation.filter((s: any) => s.arrivals > 0 || (s.out > (product.dailyShipmentRate || 0) + 1));
    }, [prediction, product.dailyShipmentRate]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        在庫予測の詳細: {product.name}
                    </DialogTitle>
                    <DialogDescription>
                        現在の在庫と予定（入荷・仕掛・特売）に基づいたシミュレーション結果です。
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* 予測サマリー */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-slate-50 border-none shadow-none">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">予測在庫切れ日</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                                <div className="text-2xl font-bold text-blue-600">
                                    {prediction.estimatedDate ? format(prediction.estimatedDate, "yyyy/MM/dd") : "充足"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {prediction.estimatedDate ? `あと ${prediction.remainingDays} 日` : "1年以上の在庫があります"}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50 border-none shadow-none">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">1日の平均消費</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                                <div className="text-2xl font-bold">
                                    {product.dailyShipmentRate?.toLocaleString() || 0}
                                    <span className="text-sm ml-1 font-normal">枚</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    通常出荷ベース
                                    {isRoll && (
                                        <span className="ml-1 opacity-70">
                                            ({dailyRateMeters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m相当)
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                         <Card className="bg-slate-50 border-none shadow-none">
                            <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">リードタイム</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-1">
                                <div className="text-2xl font-bold">{product.productionLeadDays || 0}<span className="text-sm ml-1 font-normal">日</span></div>
                                <div className="text-xs text-muted-foreground">仕掛開始の目安</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 予測グラフ */}
                    <Card className="border-slate-100">
                        <CardHeader className="p-4 pb-0">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                                <TrendingDown className="h-4 w-4" />
                                在庫推移シミュレーション
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="h-[250px] w-full">
                                {chartData && <Line data={chartData} options={chartOptions} />}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 主要な変動イベント */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700">
                            <Info className="h-4 w-4" />
                            在庫変動イベント（予定）
                        </h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">日付</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">内容</th>
                                        <th className="px-4 py-2 text-right font-medium text-slate-500">数量</th>
                                        <th className="px-4 py-2 text-right font-medium text-slate-500">在庫(予測)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y relative">
                                    {events.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground uppercase tracking-widest text-xs">
                                                予定されているイベントはありません
                                            </td>
                                        </tr>
                                    ) : (
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        events.map((ev: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                                                    {format(ev.date, "M/d (E)", { locale: ja })}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {ev.arrivals > 0 && (
                                                        <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                                                            <ArrowUpCircle className="h-3.5 w-3.5" />
                                                            <span>入荷・仕掛完了</span>
                                                        </div>
                                                    )}
                                                    {ev.out > (product.dailyShipmentRate || 0) + 1 && (
                                                        <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs">
                                                            <ArrowDownCircle className="h-3.5 w-3.5" />
                                                            <span>大量出荷 (特売等)</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-medium text-xs">
                                                    {ev.arrivals > 0 && <span className="text-emerald-700">+{ev.arrivals.toLocaleString()}</span>}
                                                    {ev.arrivals > 0 && ev.out > (product.dailyShipmentRate || 0) + 1 && <br />}
                                                    {ev.out > (product.dailyShipmentRate || 0) + 1 && <span className="text-blue-700">-{ev.out.toLocaleString()}</span>}
                                                    <span className="text-muted-foreground ml-0.5">{unit}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-sm">
                                                    {ev.stock.toLocaleString()}{unit}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
