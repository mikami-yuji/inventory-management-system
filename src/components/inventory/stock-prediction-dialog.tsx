"use client";

import React, { useMemo, useState } from "react";
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
    TrendingUp,
    Minus,
    Layers,
    Info,
    ArrowUpCircle,
    ArrowDownCircle,
    Plus,
    Trash2,
    AlertTriangle,
    LineChart as LineChartIcon,
    History,
    Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isRollBag, bagsToMeters, calculateStockPrediction } from "@/lib/services";
import { useStockHistoryAnalysis } from "@/hooks/use-stock-history-analysis";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Product } from "@/types";
import { cn } from "@/lib/utils";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
    initialTab?: 'future' | 'history';
};

type SimulationPoint = {
    date: Date;
    stock: number;
    in: number;
    out: number;
    arrivals: number;
    outNames: string[];
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
    incomingItems,
    initialTab = 'future'
}: StockPredictionDialogProps): React.ReactElement {
    const [activeTab, setActiveTab] = useState<string>(initialTab);

    // 未来シミュレーション用のステート
    const [simArrivals, setSimArrivals] = useState<Array<{ quantity: number; expectedDate: Date }>>([]);
    const [newSimQty, setNewSimQty] = useState<string>("");
    const [newSimDate, setNewSimDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    
    // 表示期間 (日数)
    const [displayPeriod, setDisplayPeriod] = useState<number>(60);

    // 過去履歴分析フック (メーカー在庫は即時出荷可能なため、自社有効在庫と合算して実質利用可能在庫として分析)
    const totalImmediateStock = availableStock + supplierStock;
    const { history, analysis: historyAnalysis, loading: historyLoading } = useStockHistoryAnalysis(
        open ? product.id : undefined,
        totalImmediateStock
    );

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
    const subUnit = isRoll ? "巻" : null;

    // ロール袋の巻数計算
    const getSubUnitValue = (val: number) => {
        if (!isRoll) return null;
        const rollMeters = product.metersPerRoll || 400;
        return Math.floor(val / rollMeters);
    };

    // 一日の平均消費を m に変換 (ロールの場合)
    const dailyRateMeters = isRoll ? bagsToMeters(product.dailyShipmentRate || 0, product.weight || 5) : 0;

    // 表示期間によるデータのフィルタリング
    const filteredSimulation = useMemo(() => {
        if (!prediction?.simulation) return [];
        const cutoffDate = addDays(new Date().setHours(0,0,0,0), displayPeriod);
        return prediction.simulation.filter((s: SimulationPoint) => !isAfter(s.date, cutoffDate));
    }, [prediction, displayPeriod]);

    // 未来シミュレーショングラフデータ
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
                    label: (context: import('chart.js').TooltipItem<'line'>) => `在庫: ${context.parsed.y !== null ? context.parsed.y.toLocaleString() : 0}${unit}`
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

    // 過去在庫推移グラフデータ
    const stockLevelChartData = useMemo(() => {
        if (!history || history.length === 0) return null;

        let runningStock = totalImmediateStock;
        const dataPoints = [];
        const sortedDesc = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        for (const h of sortedDesc) {
            dataPoints.push({
                date: h.date,
                stock: runningStock
            });

            if (h.type === 'adjustment') {
                runningStock -= (h.changeAmount || 0);
            } else if (h.type === 'incoming') {
                runningStock -= (h.changeAmount || h.quantity);
            } else if (h.type === 'outgoing' || h.type === 'order') {
                runningStock += (h.changeAmount || h.quantity);
            }
        }

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
    }, [history, totalImmediateStock]);

    const historyChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value: string | number) => value.toLocaleString() + unit
                }
            },
        },
    };

    // 主要なイベントの抽出 (フィルタリング後のデータから)
    const events = useMemo(() => {
        return filteredSimulation.filter((s: SimulationPoint) => s.arrivals > 0 || (s.out > (product.dailyShipmentRate || 0) + 1));
    }, [filteredSimulation, product.dailyShipmentRate]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
                <DialogHeader className="pb-2 border-b">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{product.sku || '-'}</Badge>
                        <Badge variant={
                            product.category === 'bag' ? 'default' :
                                product.category === 'sticker' ? 'secondary' : 'outline'
                        }>
                            {product.category === 'bag' ? '米袋' :
                                product.category === 'sticker' ? 'シール' : 'その他'}
                        </Badge>
                        {product.weight && <span className="text-xs text-muted-foreground">{product.weight}kg / {product.shape || '-'}</span>}
                    </div>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <LineChartIcon className="h-5 w-5 text-blue-600" />
                        在庫予測・分析: {product.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        今後の入荷・仕掛・特売予定を加味した未来予測シミュレーションと、過去90日間の出庫実績に基づく分析です。
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
                    <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto bg-slate-100 p-1 rounded-xl">
                        <TabsTrigger value="future" className="gap-2 font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                            未来予測シミュレーション
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2 font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                            <History className="h-3.5 w-3.5 text-indigo-600" />
                            過去の実績分析
                        </TabsTrigger>
                    </TabsList>

                    {/* タブ1: 未来予測シミュレーション（従来機能を完全維持） */}
                    <TabsContent value="future" className="mt-4 space-y-6">
                        {/* 解析アラート */}
                        {((prediction?.analysis?.alerts?.length > 0) || (prediction?.analysis?.pendingIncomingTotal > 0 && prediction.estimatedDate)) && (
                            <div className="space-y-3">
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
                        )}

                        {/* 予測サマリー */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <Card className="bg-slate-50 border border-slate-100 shadow-sm overflow-hidden">
                                <CardHeader className="p-3 pb-1">
                                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between gap-1">
                                        <span className="truncate">即時利用可能在庫</span>
                                        {supplierStock > 0 && (
                                            <Badge variant="outline" className="text-[9px] font-normal px-1.5 py-0 border-purple-300 text-purple-700 bg-purple-50 shrink-0 whitespace-nowrap">
                                                メーカー含
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-1">
                                    <div className="text-xl sm:text-2xl font-bold text-slate-800 tabular-nums whitespace-nowrap">
                                        {totalImmediateStock.toLocaleString()}
                                        <span className="text-xs sm:text-sm ml-1 font-normal text-muted-foreground">{unit}</span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight">
                                        <span className="whitespace-nowrap">自社: {availableStock.toLocaleString()}{unit}</span>
                                        {supplierStock > 0 && (
                                            <span className="whitespace-nowrap text-purple-700 font-medium">
                                                + メーカー: {supplierStock.toLocaleString()}{unit}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-blue-50/50 border border-blue-100 shadow-sm overflow-hidden">
                                <CardHeader className="p-3 pb-1">
                                    <CardTitle className="text-xs font-medium text-blue-700 uppercase whitespace-nowrap">予測在庫切れ日</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-1">
                                    <div className="text-lg sm:text-xl font-bold text-blue-700 tabular-nums whitespace-nowrap tracking-tight">
                                        {prediction.estimatedDate ? format(prediction.estimatedDate, "yyyy/MM/dd") : "充足"}
                                    </div>
                                    <div className="text-xs text-muted-foreground whitespace-nowrap mt-1">
                                        {prediction.estimatedDate ? `あと ${prediction.remainingDays} 日` : "1年以上の在庫があります"}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-50 border border-slate-100 shadow-sm overflow-hidden">
                                <CardHeader className="p-3 pb-1">
                                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">1日の平均消費</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-1">
                                    <div className="text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap">
                                        {product.dailyShipmentRate?.toLocaleString() || 0}
                                        <span className="text-xs sm:text-sm ml-1 font-normal">枚</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                                        通常出荷ベース
                                        {isRoll && (
                                            <span className="ml-1 opacity-70">
                                                ({dailyRateMeters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m相当)
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-50 border border-slate-100 shadow-sm overflow-hidden">
                                <CardHeader className="p-3 pb-1">
                                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">リードタイム</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-1">
                                    <div className="text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap">
                                        {product.productionLeadDays || 0}
                                        <span className="text-xs sm:text-sm ml-1 font-normal">日</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">仕掛開始の目安</div>
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
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4" />
                                        「もしも」の入荷テスト
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4 pt-0 space-y-4">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-blue-700 ml-0.5">入荷数量 ({unit})</Label>
                                            <Input 
                                                type="number" 
                                                className="h-9 text-sm bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-100" 
                                                value={newSimQty}
                                                onChange={e => setNewSimQty(e.target.value)}
                                                placeholder="例: 5000"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-blue-700 ml-0.5">入荷予定日</Label>
                                            <Input 
                                                type="date" 
                                                className="h-9 text-sm bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-100" 
                                                value={newSimDate}
                                                onChange={e => setNewSimDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button 
                                        className="w-full h-9 text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm"
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
                                        <Plus className="h-3.5 w-3.5" /> 予定を追加
                                    </Button>

                                    {simArrivals.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-blue-200">
                                            <div className="text-xs font-bold text-blue-800 mb-2 flex items-center justify-between">
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
                                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                                {simArrivals.map((sim, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm text-xs group">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded bg-blue-50 flex flex-col items-center justify-center text-blue-700">
                                                                <span className="text-[9px] leading-none font-medium uppercase">{format(sim.expectedDate, "MMM")}</span>
                                                                <span className="text-xs leading-none font-bold mt-0.5">{format(sim.expectedDate, "d")}</span>
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900">+{sim.quantity.toLocaleString()}{unit}</div>
                                                                <div className="text-[9px] text-slate-400">{format(sim.expectedDate, "yyyy/MM/dd")}</div>
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => setSimArrivals(simArrivals.filter((_, idx) => idx !== i))}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
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
                    </TabsContent>

                    {/* タブ2: 過去の実績分析（ProductAnalysisDialogの機能を統合） */}
                    <TabsContent value="history" className="mt-4 space-y-6">
                        {historyLoading && !historyAnalysis ? (
                            <div className="flex justify-center p-12">
                                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                            </div>
                        ) : !historyAnalysis ? (
                            <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                                過去の在庫履歴データがありません
                            </div>
                        ) : (
                            <>
                                {/* サマリー統計 */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <Card className="bg-slate-50 border border-slate-100 shadow-sm overflow-hidden">
                                        <CardHeader className="p-3 pb-1">
                                            <CardTitle className="text-xs font-medium text-muted-foreground whitespace-nowrap">週間使用数</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-1">
                                            <div className="text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap">{historyAnalysis.weekly.toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span></div>
                                            {subUnit && (
                                                <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                                                    約 {getSubUnitValue(historyAnalysis.weekly)} {subUnit}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-slate-50 border border-slate-100 shadow-sm overflow-hidden">
                                        <CardHeader className="p-3 pb-1">
                                            <CardTitle className="text-xs font-medium text-muted-foreground whitespace-nowrap">月間使用数</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-1">
                                            <div className="text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap">{historyAnalysis.monthly.toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span></div>
                                            {subUnit && (
                                                <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                                                    約 {getSubUnitValue(historyAnalysis.monthly)} {subUnit}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-slate-50 border border-slate-100 shadow-sm overflow-hidden">
                                        <CardHeader className="p-3 pb-1">
                                            <CardTitle className="text-xs font-medium text-muted-foreground whitespace-nowrap">3ヶ月使用数</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-1">
                                            <div className="text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap">{historyAnalysis.quarterly.toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span></div>
                                            {subUnit && (
                                                <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                                                    約 {getSubUnitValue(historyAnalysis.quarterly)} {subUnit}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-slate-50 border border-slate-100 shadow-sm overflow-hidden">
                                        <CardHeader className="p-3 pb-1">
                                            <CardTitle className="text-xs font-medium text-muted-foreground whitespace-nowrap">実績1日平均</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-1">
                                            <div className="text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap">{historyAnalysis.dailyAverage.toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span></div>
                                            {subUnit && (
                                                <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                                                    約 {((historyAnalysis.dailyAverage / (product.metersPerRoll || 400)).toFixed(2))} {subUnit}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* 在庫予測＆推奨 */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Card className={cn(
                                        historyAnalysis.daysUntilStockout !== null && historyAnalysis.daysUntilStockout < 7 ? "border-red-400 bg-red-50/50" :
                                            historyAnalysis.daysUntilStockout !== null && historyAnalysis.daysUntilStockout < 14 ? "border-amber-400 bg-amber-50/50" : "bg-slate-50 border-slate-100 shadow-sm"
                                    )}>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    実績ペースでの在庫切れ予測
                                                </span>
                                                {supplierStock > 0 && (
                                                    <Badge variant="outline" className="text-[10px] font-normal border-purple-200 text-purple-700 bg-purple-50">
                                                        メーカー在庫含む
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {historyAnalysis.daysUntilStockout !== null ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-end gap-2">
                                                        <span className={cn(
                                                            "text-3xl font-bold",
                                                            historyAnalysis.daysUntilStockout < 7 ? "text-red-700" :
                                                                historyAnalysis.daysUntilStockout < 14 ? "text-amber-700" : "text-slate-800"
                                                        )}>
                                                            あと {historyAnalysis.daysUntilStockout} 日
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        直近30日の消費ペース（1日 {historyAnalysis.dailyAverage}{unit}）が続いた場合
                                                    </p>
                                                    {supplierStock > 0 && (
                                                        <p className="text-[10px] text-purple-700 font-medium pt-0.5">
                                                            ※自社在庫 ({availableStock.toLocaleString()}{unit}) + メーカー在庫 ({supplierStock.toLocaleString()}{unit}) 合計 {totalImmediateStock.toLocaleString()}{unit} を基準に算出
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground py-2">データ不足のため算出できません</p>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-slate-50 border-slate-100 shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4" />
                                                分析とリコメンド
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-muted-foreground">需要トレンド:</span>
                                                {historyAnalysis.trend === 'increasing' ? (
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1 pl-1.5 pr-2 text-xs">
                                                        <TrendingUp className="h-3 w-3" />
                                                        消費増加中
                                                    </Badge>
                                                ) : historyAnalysis.trend === 'decreasing' ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1 pl-1.5 pr-2 text-xs">
                                                        <TrendingDown className="h-3 w-3" />
                                                        消費減少中
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="gap-1 pl-1.5 pr-2 text-xs bg-white">
                                                        <Minus className="h-3 w-3" />
                                                        安定
                                                    </Badge>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                                                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                                                    推奨発注数
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-bold text-blue-600">{historyAnalysis.suggestedOrderQuantity.toLocaleString()}</span>
                                                    <span className="text-xs text-muted-foreground">{unit}</span>
                                                    {subUnit && (
                                                        <span className="text-xs text-slate-500 ml-2">
                                                            (約 {getSubUnitValue(historyAnalysis.suggestedOrderQuantity)} {subUnit})
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    ※月間使用数の1.2倍（安全在庫含む）を基準に算出
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* 過去在庫推移グラフ */}
                                <Card className="border-slate-100 shadow-sm">
                                    <CardHeader className="p-4 pb-0">
                                        <CardTitle className="text-sm font-semibold text-slate-700">過去の在庫推移（直近30回分）</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="h-[220px] w-full">
                                            {stockLevelChartData ? (
                                                <Line data={stockLevelChartData} options={historyChartOptions} />
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                                                    グラフデータを読み込み中...
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

