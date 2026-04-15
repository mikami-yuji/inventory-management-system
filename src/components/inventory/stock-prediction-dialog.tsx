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
import { format, isAfter, addDays } from "date-fns";
import { ja } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type SimulationPoint = {
    date: Date;
    stock: number;
    in: number;
    out: number;
    arrivals: number;
    outNames: string[];
};

type PredictionData = {
    simulation: SimulationPoint[];
    estimatedDate: Date | null;
    remainingDays: number | null;
    analysis: {
        alerts: Array<{ date: Date; quantity: number }>;
        pendingIncomingTotal: number;
    };
    hasUnconfirmedWIP: boolean;
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
    
    // 表示期間 (日数)
    const [displayPeriod, setDisplayPeriod] = React.useState<number>(60);

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

    // 表示期間によるデータのフィルタリング
    const filteredSimulation = useMemo(() => {
        if (!prediction?.simulation) return [];
        const cutoffDate = addDays(new Date().setHours(0,0,0,0), displayPeriod);
        return prediction.simulation.filter((s: SimulationPoint) => !isAfter(s.date, cutoffDate));
    }, [prediction, displayPeriod]);

    const chartData = useMemo(() => {
        if (filteredSimulation.length === 0) return null;

        const labels = filteredSimulation.map((s: SimulationPoint) => format(s.date, "M/d"));
        const data = filteredSimulation.map((s: SimulationPoint) => s.stock);

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
    }, [filteredSimulation]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: { parsed: { y: number } }) => `在庫: ${context.parsed.y.toLocaleString()}${unit}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value: string | number) => value.toLocaleString() + unit
                }
            }
        }
    };

    // 主要なイベントの抽出 (フィルタリング後のデータから)
    const events = useMemo(() => {
        return filteredSimulation.filter((s: SimulationPoint) => s.arrivals > 0 || (s.out > (product.dailyShipmentRate || 0) + 1));
    }, [filteredSimulation, product.dailyShipmentRate]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 border-slate-100 shadow-sm">
                            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                                    <TrendingDown className="h-4 w-4" />
                                    在庫推移シミュレーション
                                </CardTitle>
                                
                                <Tabs 
                                    value={String(displayPeriod)} 
                                    onValueChange={(val) => setDisplayPeriod(Number(val))}
                                    className="scale-90 origin-right"
                                >
                                    <TabsList className="h-8 bg-slate-100/80">
                                        <TabsTrigger value="60" className="text-[11px] px-3">2ヶ月</TabsTrigger>
                                        <TabsTrigger value="90" className="text-[11px] px-3">3ヶ月</TabsTrigger>
                                        <TabsTrigger value="180" className="text-[11px] px-3">半年</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="h-[250px] w-full">
                                    {chartData && <Line data={chartData} options={chartOptions} />}
                                </div>
                            </CardContent>
                        </Card>

                        {/* もしもシミュレーション */}
                        <Card className="border-blue-100 bg-blue-50/30 shadow-none">
                            <CardHeader className="p-5 pb-3">
                                <CardTitle className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4" />
                                    「もしも」の入荷テスト
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-5 pb-5 pt-0 space-y-5">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-blue-700 ml-0.5">入荷数量 ({unit})</Label>
                                        <Input 
                                            type="number" 
                                            className="h-10 text-sm bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-100" 
                                            value={newSimQty}
                                            onChange={e => setNewSimQty(e.target.value)}
                                            placeholder="例: 5000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-blue-700 ml-0.5">入荷予定日</Label>
                                        <Input 
                                            type="date" 
                                            className="h-10 text-sm bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-100" 
                                            value={newSimDate}
                                            onChange={e => setNewSimDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button 
                                    className="w-full h-10 text-sm font-bold gap-2 bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-[0.98]"
                                    onClick={() => {
                                        if (!newSimQty || isNaN(Number(newSimQty))) {
                                            toast.error("数量を入力してください");
                                            return;
                                        }
                                        setSimArrivals([...simArrivals, { 
                                            quantity: Number(newSimQty), 
                                            expectedDate: new Date(newSimDate) 
                                        }].sort((a,b) => a.expectedDate.getTime() - b.expectedDate.getTime()));
                                        setNewSimQty("");
                                    }}
                                >
                                    <Plus className="h-4 w-4" /> 予定を追加
                                </Button>

                                {simArrivals.length > 0 && (
                                    <div className="mt-6 pt-5 border-t border-blue-200">
                                        <div className="text-xs font-bold text-blue-800 mb-4 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                検証中の入荷予定
                                                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                                    {simArrivals.length}
                                                </span>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                className="h-auto p-0 text-[10px] text-slate-400 hover:text-red-600 hover:bg-transparent"
                                                onClick={() => setSimArrivals([])}
                                            >
                                                リセット
                                            </Button>
                                        </div>
                                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                            {simArrivals.map((sim, i) => (
                                                <div key={i} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-blue-100 shadow-sm text-xs group transition-all hover:border-blue-300">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex flex-col items-center justify-center text-blue-700">
                                                            <span className="text-[10px] leading-tight font-medium uppercase">{format(sim.expectedDate, "MMM")}</span>
                                                            <span className="text-base leading-tight font-bold">{format(sim.expectedDate, "d")}</span>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900">+{sim.quantity.toLocaleString()}{unit}</div>
                                                            <div className="text-[10px] text-slate-400">{format(sim.expectedDate, "yyyy/MM/dd")}</div>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => setSimArrivals(simArrivals.filter((_, idx) => idx !== i))}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
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
