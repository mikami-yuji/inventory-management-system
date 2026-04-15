"use client";

import React, { useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    ArrowDownCircle,
    Plus,
    Trash2,
    AlertTriangle
} from "lucide-react";
import { isRollBag, bagsToMeters, calculateStockPrediction } from "@/lib/services";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    prediction: any; // Result of calculateStockPrediction (base)
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // シミュレーション再計算用の元データ
    availableStock: number;
    supplierStock: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saleItems: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wipItems: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    incomingItems: any[];
};

export function StockPredictionDialog({
    product,
    prediction: basePrediction,
    open,
    onOpenChange,
    availableStock,
    supplierStock,
    saleItems,
    wipItems,
    incomingItems
}: StockPredictionDialogProps): React.ReactElement {
    // シミュレーション用のステート
    const [simArrivals, setSimArrivals] = React.useState<Array<{ quantity: number; expectedDate: Date }>>([]);
    const [newSimQty, setNewSimQty] = React.useState<string>("");
    const [newSimDate, setNewSimDate] = React.useState<string>(format(new Date(), "yyyy-MM-dd"));

    // シミュレーション実行
    const prediction = useMemo(() => {
        if (simArrivals.length === 0) return basePrediction;
        
        return calculateStockPrediction(
            availableStock,
            product.dailyShipmentRate || 0,
            product.productionLeadDays || 0,
            product,
            saleItems,
            wipItems,
            incomingItems,
            supplierStock,
            simArrivals
        );
    }, [basePrediction, simArrivals, availableStock, product, saleItems, wipItems, incomingItems, supplierStock]);

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

                {/* 解析アラート */}
                <div className="space-y-3 mt-4">
                    {prediction?.analysis?.alerts?.length > 0 && (
                        <Alert variant="destructive" className="bg-red-50 border-red-200">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertTitle className="text-red-800 font-bold">入荷タイミング警告</AlertTitle>
                            <AlertDescription className="text-red-700 text-xs">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {prediction.analysis.alerts.map((alert: any, i: number) => (
                                    <div key={i}>
                                        ・{format(alert.date, "M/d")} 到着予定の入荷 ({alert.quantity.toLocaleString()}{unit}) は、在庫切れ後の到着となります。
                                    </div>
                                ))}
                            </AlertDescription>
                        </Alert>
                    )}

                    {prediction?.analysis?.pendingIncomingTotal > 0 && prediction.estimatedDate && (
                        <Alert className="bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-800 font-bold">納期確認中のアイテム</AlertTitle>
                            <AlertDescription className="text-blue-700 text-xs">
                                納期未定分（合計 {prediction.analysis.pendingIncomingTotal.toLocaleString()}{unit}）は、
                                欠品を防ぐため <strong>{format(prediction.estimatedDate, "yyyy/MM/dd")}</strong> までに到着させる必要があります。
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

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

                    {/* 予測グラフ & シミュレーション入力 */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <Card className="lg:col-span-3 border-slate-100">
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

                        {/* もしもシミュレーション */}
                        <Card className="border-blue-100 bg-blue-50/30">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-bold text-blue-800 flex items-center gap-1">
                                    <TrendingDown className="h-3 w-3" />
                                    「もしも」の入荷テスト
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px]">入荷数量 ({unit})</Label>
                                    <Input 
                                        type="number" 
                                        size={1} 
                                        className="h-8 text-xs" 
                                        value={newSimQty}
                                        onChange={e => setNewSimQty(e.target.value)}
                                        placeholder="例: 5000"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px]">入荷日</Label>
                                    <Input 
                                        type="date" 
                                        className="h-8 text-xs" 
                                        value={newSimDate}
                                        onChange={e => setNewSimDate(e.target.value)}
                                    />
                                </div>
                                <Button 
                                    className="w-full h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                        if (!newSimQty || isNaN(Number(newSimQty))) {
                                            toast.error("数量を入力してください");
                                            return;
                                        }
                                        setSimArrivals([...simArrivals, { 
                                            quantity: Number(newSimQty), 
                                            expectedDate: new Date(newSimDate) 
                                        }]);
                                        setNewSimQty("");
                                    }}
                                >
                                    <Plus className="h-3 w-3" /> 行を追加
                                </Button>

                                {simArrivals.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-blue-200">
                                        <div className="text-[10px] font-bold text-blue-800 mb-2">検証中の予定:</div>
                                        <div className="space-y-2 max-h-[100px] overflow-y-auto pr-1">
                                            {simArrivals.map((sim, i) => (
                                                <div key={i} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100 text-[10px]">
                                                    <div>
                                                        <div className="font-bold">{format(sim.expectedDate, "M/d")}</div>
                                                        <div>+{sim.quantity.toLocaleString()}{unit}</div>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-5 w-5 text-red-500"
                                                        onClick={() => setSimArrivals(simArrivals.filter((_, idx) => idx !== i))}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button 
                                            variant="link" 
                                            className="h-auto p-0 text-[10px] text-blue-600 mt-2"
                                            onClick={() => setSimArrivals([])}
                                        >
                                            シミュレーションをリセット
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

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
                                                            <ArrowDownCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                                            <span>
                                                                {ev.outNames && ev.outNames.length > 0 
                                                                    ? ev.outNames.join(", ") 
                                                                    : "大量出荷 (特売等)"}
                                                            </span>
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
