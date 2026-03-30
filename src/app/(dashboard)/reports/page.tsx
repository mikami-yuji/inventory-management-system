"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Package,
    TrendingDown,
    AlertTriangle,
    RefreshCw,
    FileText,
    Truck,
    CalendarDays,
    Star,
    ClipboardList,
    ChevronRight,
    Swords,
    TrendingUp,
} from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { useInventory } from "@/hooks/use-inventory";
import { useSaleEvents } from "@/hooks/use-sale-events";
import { useIncomingStock } from "@/hooks/use-incoming-stock";
import { useWorkInProgress } from "@/hooks/use-work-in-progress";
import { calculateStockStatus, bagsToMeters, metersToBags, isRollBag } from "@/lib/services";
import { format, differenceInDays, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function ReportsPage(): React.ReactElement {
    // APIからデータを取得
    const { products } = useProducts();
    const { inventory } = useInventory();
    const { events } = useSaleEvents({ status: "all" });
    const { incomingStocks } = useIncomingStock();
    const { items: wipItems } = useWorkInProgress({ status: "in_progress" });

    const today = startOfDay(new Date());

    // 在庫マップ生成
    const inventoryMap = useMemo(() => {
        const map = new Map<string, number>();
        inventory.forEach(item => map.set(item.productId, item.quantity));
        return map;
    }, [inventory]);

    // 商品マップ生成
    const productMap = useMemo(() => {
        const map = new Map(products.map(p => [p.id, p]));
        return map;
    }, [products]);

    // サマリー計算
    const summary = useMemo(() => {
        // 欠品商品
        const outOfStock = inventory.filter(i => {
            const product = productMap.get(i.productId);
            if (!product) return false;
            return i.quantity === 0 &&
                product.status !== 'discontinued' &&
                product.status !== 'on_sale_break' &&
                product.status !== 'direct_delivery';
        }).length;

        // 2週間以内に在庫切れ予測
        const lowStockCount = products.filter(p => {
            if (p.status === 'discontinued' || p.status === 'on_sale_break' || p.status === 'direct_delivery') return false;
            const stock = inventoryMap.get(p.id) || 0;
            if (stock === 0 || !p.dailyShipmentRate || p.dailyShipmentRate === 0) return false;
            const daysLeft = Math.floor(stock / p.dailyShipmentRate);
            return daysLeft > 0 && daysLeft < 14;
        }).length;

        // 今後の特売引当総数（upcoming/active のもの）
        const activeEvents = events.filter(e => e.status === 'upcoming' || e.status === 'active');
        const totalAllocation = activeEvents.reduce((sum, e) =>
            sum + e.items.reduce((s, item) => s + item.allocatedQuantity, 0), 0);

        // WIP未確認件数
        const unconfirmedWip = wipItems.filter(w => w.confirmationStatus === 'unconfirmed').length;

        // 在庫状況分布
        const distribution = products.reduce((acc, p) => {
            if (p.status === 'discontinued' || p.status === 'on_sale_break' || p.status === 'direct_delivery') return acc;
            const stock = inventoryMap.get(p.id) || 0;
            if (stock === 0) acc.outOfStock++;
            else if (p.dailyShipmentRate && p.dailyShipmentRate > 0) {
                const days = stock / p.dailyShipmentRate;
                if (days < 14) acc.lowStock++;
                else acc.healthy++;
            } else {
                acc.healthy++;
            }
            return acc;
        }, { healthy: 0, lowStock: 0, outOfStock: 0 });

        return { outOfStock, lowStockCount, totalAllocation, unconfirmedWip, distribution };
    }, [inventory, inventoryMap, products, productMap, events, wipItems]);

    // WIPマップ (productId -> hasInProgressWIP)
    const activeWipByProduct = useMemo(() => {
        const set = new Set<string>();
        wipItems.forEach(item => {
            if (item.status === 'in_progress') {
                set.add(item.productId);
            }
        });
        return set;
    }, [wipItems]);

    // 特売スケジュール（active/upcoming のみ、日付昇順）
    const upcomingEvents = useMemo(() => {
        return events
            .filter(e => e.status === 'upcoming' || e.status === 'active')
            .sort((a, b) => {
                const dateA = a.dates[0] ? new Date(a.dates[0]).getTime() : Infinity;
                const dateB = b.dates[0] ? new Date(b.dates[0]).getTime() : Infinity;
                return dateA - dateB;
            });
    }, [events]);

    // ① 商品ごとの全イベント引当合計（競合検出用）
    // productId -> { totalAllocated: number, eventNames: string[] }
    const allocationByProduct = useMemo(() => {
        const map = new Map<string, { totalAllocated: number; eventNames: string[] }>();
        upcomingEvents.forEach(event => {
            event.items.forEach(item => {
                const existing = map.get(item.productId) || { totalAllocated: 0, eventNames: [] };
                existing.totalAllocated += item.allocatedQuantity;
                if (!existing.eventNames.includes(event.clientName)) {
                    existing.eventNames.push(event.clientName);
                }
                map.set(item.productId, existing);
            });
        });
        return map;
    }, [upcomingEvents]);

    // ② 商品×イベントごとの在庫充足予測
    // 予測在庫 = 現在庫 - dailyShipmentRate × 残日数 (最低0)
    const forecastStockForEvent = useMemo(() => {
        const cache = new Map<string, number>(); // `${productId}_${eventId}` -> forecastedStock
        upcomingEvents.forEach(event => {
            const firstDate = event.dates[0] ? parseISO(event.dates[0]) : null;
            const daysUntil = firstDate ? Math.max(0, differenceInDays(firstDate, today)) : 0;
            event.items.forEach(item => {
                const product = productMap.get(item.productId);
                const currentStock = inventoryMap.get(item.productId) || 0;
                const dailyRate = product?.dailyShipmentRate || 0;
                
                // ロール商品の場合、出荷レート(枚)をメートルに変換して減算
                const isRoll = product && isRollBag(product.shape, product.category, product.metersPerRoll);
                const dailyConsumption = isRoll ? bagsToMeters(dailyRate, product.weight || 5) : dailyRate;
                
                const forecasted = Math.max(0, currentStock - dailyConsumption * daysUntil);
                cache.set(`${item.productId}_${event.id}`, forecasted);
            });
        });
        return cache;
    }, [upcomingEvents, productMap, inventoryMap, today]);

    // 入荷予定（今日以降、日付昇順）
    const upcomingIncomingItems = useMemo(() => {
        return incomingStocks
            .filter(item => {
                const expectedDate = parseISO(item.expectedDate);
                return !isBefore(expectedDate, today);
            })
            .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
    }, [incomingStocks, today]);

    // 入荷予定を日付ごとにグループ化
    const incomingByDate = useMemo(() => {
        const groups = new Map<string, typeof upcomingIncomingItems>();
        upcomingIncomingItems.forEach(item => {
            const dateKey = item.expectedDate;
            const existing = groups.get(dateKey) || [];
            existing.push(item);
            groups.set(dateKey, existing);
        });
        return groups;
    }, [upcomingIncomingItems]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">レポート</h2>
                <p className="text-sm text-muted-foreground">在庫・特売・入荷予定の状況サマリー</p>
            </div>

            {/* サマリーカード */}
            <div className="grid gap-2 grid-cols-2 md:grid-cols-4 md:gap-4">
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-red-600">欠品商品</CardTitle>
                        <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold text-red-600">{summary.outOfStock}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">在庫ゼロ点数</p>
                    </CardContent>
                </Card>
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-amber-600">在庫切れ予測</CardTitle>
                        <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold text-amber-600">{summary.lowStockCount}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">2週間以内に切れる商品</p>
                    </CardContent>
                </Card>
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-blue-600">特売引当</CardTitle>
                        <Star className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold text-blue-600">{summary.totalAllocation.toLocaleString()}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">引当済み枚数 (予定含む)</p>
                    </CardContent>
                </Card>
                <Card className="shadow-none sm:shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium text-slate-600">仕掛未確認</CardTitle>
                        <ClipboardList className="h-3 w-3 md:h-4 md:w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <div className="text-xl md:text-2xl font-bold text-slate-700">{summary.unconfirmedWip}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">納期未確定の仕掛件数</p>
                    </CardContent>
                </Card>
            </div>

            {/* 在庫状況分布チャート (CSSベース) */}
            <Card className="shadow-none sm:shadow-sm">
                <CardHeader className="p-3 md:p-6 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        在庫状況の概況
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                    <div className="space-y-4">
                        <div className="h-4 w-full flex rounded-full overflow-hidden bg-slate-100">
                            <div
                                style={{ width: `${(summary.distribution.healthy / (summary.distribution.healthy + summary.distribution.lowStock + summary.distribution.outOfStock || 1)) * 100}%` }}
                                className="bg-emerald-500 h-full"
                                title={`正常: ${summary.distribution.healthy}点`}
                            />
                            <div
                                style={{ width: `${(summary.distribution.lowStock / (summary.distribution.healthy + summary.distribution.lowStock + summary.distribution.outOfStock || 1)) * 100}%` }}
                                className="bg-amber-400 h-full"
                                title={`要注意: ${summary.distribution.lowStock}点`}
                            />
                            <div
                                style={{ width: `${(summary.distribution.outOfStock / (summary.distribution.healthy + summary.distribution.lowStock + summary.distribution.outOfStock || 1)) * 100}%` }}
                                className="bg-red-500 h-full"
                                title={`欠品: ${summary.distribution.outOfStock}点`}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-muted-foreground">正常: <strong className="text-slate-700">{summary.distribution.healthy}</strong> 点</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <span className="text-muted-foreground">要注意: <strong className="text-slate-700">{summary.distribution.lowStock}</strong> 点</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-muted-foreground">欠品: <strong className="text-slate-700">{summary.distribution.outOfStock}</strong> 点</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* タブ */}
            <Tabs defaultValue="sale-schedule" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="sale-schedule" className="gap-1.5">
                        <Star className="h-3.5 w-3.5" />
                        特売スケジュール
                    </TabsTrigger>
                    <TabsTrigger value="incoming-timeline" className="gap-1.5">
                        <Truck className="h-3.5 w-3.5" />
                        入荷予定
                    </TabsTrigger>
                    <TabsTrigger value="sub-reports" className="gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        詳細レポート
                    </TabsTrigger>
                </TabsList>

                {/* ───────── 特売スケジュール ───────── */}
                <TabsContent value="sale-schedule" className="space-y-4">
                    {upcomingEvents.length === 0 ? (
                        <Card className="shadow-none sm:shadow-sm">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                予定中の特売イベントはありません
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {upcomingEvents.map(event => {
                                const firstDate = event.dates[0] ? parseISO(event.dates[0]) : null;
                                const daysUntil = firstDate ? differenceInDays(firstDate, today) : null;
                                const totalPlanned = event.items.reduce((s, i) => s + i.plannedQuantity, 0);
                                const totalAllocated = event.items.reduce((s, i) => s + i.allocatedQuantity, 0);
                                const allocationRate = totalPlanned > 0 ? Math.round(totalAllocated / totalPlanned * 100) : 0;
                                const isActive = event.status === 'active';

                                return (
                                    <Card key={event.id} className={cn("shadow-none sm:shadow-sm", isActive && "border-blue-300 bg-blue-50/30")}>
                                        <CardHeader className="p-3 md:p-4 pb-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Badge variant={isActive ? "default" : "secondary"} className="shrink-0 text-[10px]">
                                                        {isActive ? "開催中" : "予定"}
                                                    </Badge>
                                                    <CardTitle className="text-sm md:text-base truncate">{event.clientName}</CardTitle>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {daysUntil !== null && daysUntil >= 0 && (
                                                        <span className={cn("text-xs font-medium", daysUntil <= 7 ? "text-red-600" : daysUntil <= 14 ? "text-amber-600" : "text-slate-500")}>
                                                            {daysUntil === 0 ? "今日" : `${daysUntil}日後`}
                                                        </span>
                                                    )}
                                                    <Link href={`/events/${event.id}`}>
                                                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                                                            詳細 <ChevronRight className="h-3 w-3" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-3 md:p-4 pt-0">
                                            {/* 日付 */}
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {event.dates.slice(0, 6).map((d, i) => (
                                                    <Badge key={i} variant="outline" className="text-[10px] font-normal">
                                                        <CalendarDays className="h-2.5 w-2.5 mr-1" />
                                                        {format(parseISO(d), "M/d (E)", { locale: ja })}
                                                    </Badge>
                                                ))}
                                                {event.dates.length > 6 && (
                                                    <Badge variant="outline" className="text-[10px] font-normal">+{event.dates.length - 6}日</Badge>
                                                )}
                                            </div>

                                            {/* 引当進捗バー */}
                                            <div className="mb-3">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[11px] text-muted-foreground">引当進捗</span>
                                                    <span className="text-[11px] font-medium">
                                                        {totalAllocated.toLocaleString()} / {totalPlanned.toLocaleString()} 枚 ({allocationRate}%)
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all", allocationRate >= 100 ? "bg-emerald-500" : allocationRate >= 70 ? "bg-blue-500" : "bg-amber-500")}
                                                        style={{ width: `${Math.min(100, allocationRate)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* ① 商品別の在庫充足予測 + ② 競合検出 */}
                                            <div className="space-y-2">
                                                {event.items.map(item => {
                                                    const product = productMap.get(item.productId);
                                                    const isRoll = product && isRollBag(product.shape, product.category, product.metersPerRoll);
                                                    
                                                    const currentStock = inventoryMap.get(item.productId) || 0;
                                                    // イベント当日の予測在庫 (ロールならm, 一般なら枚)
                                                    const forecastedStock = forecastStockForEvent.get(`${item.productId}_${event.id}`) ?? currentStock;
                                                    
                                                    // 充足判定（予測在庫を「枚」に換算して比較）
                                                    const forecastedBags = isRoll && product ? metersToBags(forecastedStock, product.weight || 5) : forecastedStock;
                                                    const isSufficient = forecastedBags >= item.allocatedQuantity;
                                                    const shortage = item.allocatedQuantity - forecastedBags;
                                                    
                                                    // 競合検出
                                                    const alloc = allocationByProduct.get(item.productId);
                                                    const hasConflict = alloc && alloc.eventNames.length > 1;
                                                    const totalAllocatedAcrossEvents = alloc?.totalAllocated ?? item.allocatedQuantity;
                                                    
                                                    // 現在庫(m/枚)を枚数換算して比較
                                                    const currentStockBags = isRoll && product ? metersToBags(currentStock, product.weight || 5) : currentStock;
                                                    const exceedsStockAcrossEvents = totalAllocatedAcrossEvents > currentStockBags;

                                                    // WIP紐付け
                                                    const hasActiveWip = activeWipByProduct.has(item.productId);

                                                    return (
                                                        <div key={item.id} className={cn(
                                                            "rounded-md px-2 py-1.5 border text-xs",
                                                            !isSufficient ? "border-red-200 bg-red-50" :
                                                                hasConflict && exceedsStockAcrossEvents ? "border-amber-200 bg-amber-50" :
                                                                    "border-slate-100 bg-slate-50"
                                                        )}>
                                                            {/* 商品名行 */}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-medium truncate max-w-[50%]">{item.productName}</span>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {/* WIPバッジ */}
                                                                    {hasActiveWip && (
                                                                        <Badge variant="outline" className="text-[9px] border-slate-300 text-slate-600 bg-white gap-0.5 px-1 py-0">
                                                                            <RefreshCw className="h-2 w-2 animate-spin-slow" />
                                                                            仕掛中
                                                                        </Badge>
                                                                    )}
                                                                    {/* 競合バッジ */}
                                                                    {hasConflict && exceedsStockAcrossEvents && (
                                                                        <Badge variant="outline" className="text-[9px] border-amber-400 text-amber-700 bg-amber-50 gap-0.5 px-1 py-0">
                                                                            <Swords className="h-2.5 w-2.5" />
                                                                            競合
                                                                        </Badge>
                                                                    )}
                                                                    {/* 充足ステータス */}
                                                                    {isSufficient ? (
                                                                        <Badge variant="outline" className="text-[9px] border-emerald-400 text-emerald-700 bg-emerald-50 px-1 py-0">
                                                                            充足
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-[9px] border-red-400 text-red-700 bg-red-50 px-1 py-0">
                                                                            不足
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* 数値詳細行 */}
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                                                                {(() => {
                                                                    const unit = isRoll ? 'm' : '枚';
                                                                    return (
                                                                        <>
                                                                            <span>現在庫 <strong className="text-slate-700">{currentStock.toLocaleString()}</strong>{unit}</span>
                                                                            <span>→ 当日予測 <strong className={isSufficient ? "text-emerald-700" : "text-red-700"}>{forecastedStock.toLocaleString()}</strong>{unit}</span>
                                                                            <span>引当 <strong className="text-blue-700">{item.allocatedQuantity.toLocaleString()}</strong>枚</span>
                                                                            {!isSufficient && (
                                                                                <span className="text-red-600 font-medium">⚠ {shortage.toLocaleString()}枚不足</span>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>

                                                            {/* 競合詳細 */}
                                                            {hasConflict && exceedsStockAcrossEvents && (
                                                                <div className="mt-1 text-[9px] text-amber-700">
                                                                    複数イベント合計 {totalAllocatedAcrossEvents.toLocaleString()}枚 引当 → 在庫{currentStock.toLocaleString()}
                                                                    {isRoll ? 'm' : '枚'}
                                                                    を超過
                                                                    （{alloc!.eventNames.join(" / ")}）
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ───────── 入荷予定タイムライン ───────── */}
                <TabsContent value="incoming-timeline" className="space-y-4">
                    {incomingByDate.size === 0 ? (
                        <Card className="shadow-none sm:shadow-sm">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                登録されている入荷予定はありません
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-1">
                            {Array.from(incomingByDate.entries()).map(([dateKey, items]) => {
                                const date = parseISO(dateKey);
                                const daysUntil = differenceInDays(date, today);
                                const isToday = daysUntil === 0;
                                const isTomorrow = daysUntil === 1;
                                const totalQty = items.reduce((s, i) => s + i.quantity, 0);

                                // 日付ラベル
                                let dateLabel = format(date, "M月d日 (E)", { locale: ja });
                                if (isToday) dateLabel = `今日  ${dateLabel}`;
                                else if (isTomorrow) dateLabel = `明日  ${dateLabel}`;

                                return (
                                    <div key={dateKey} className="flex gap-3">
                                        {/* タイムライン縦線と丸 */}
                                        <div className="flex flex-col items-center">
                                            <div className={cn(
                                                "w-3 h-3 rounded-full mt-4 shrink-0 border-2",
                                                isToday ? "bg-emerald-500 border-emerald-500" :
                                                    daysUntil <= 3 ? "bg-amber-400 border-amber-400" :
                                                        "bg-slate-200 border-slate-300"
                                            )} />
                                            <div className="w-0.5 bg-slate-200 flex-1 mt-1" />
                                        </div>

                                        <Card className={cn("shadow-none sm:shadow-sm flex-1 mb-2", isToday && "border-emerald-300 bg-emerald-50/30")}>
                                            <CardHeader className="p-3 pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-sm font-semibold">
                                                        {dateLabel}
                                                    </CardTitle>
                                                    <div className="flex items-center gap-2">
                                                        {daysUntil >= 0 && (
                                                            <span className={cn("text-xs font-medium", daysUntil === 0 ? "text-emerald-600" : daysUntil <= 3 ? "text-amber-600" : "text-slate-400")}>
                                                                {isToday ? "本日入荷" : `${daysUntil}日後`}
                                                            </span>
                                                        )}
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            計 {totalQty.toLocaleString()}点
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-3 pt-0 space-y-1">
                                                {items.map((item, idx) => {
                                                    const product = productMap.get(item.productId);
                                                    const isRoll = product ? calculateStockStatus(product, 0, { bags: 0, meters: 0 }).isRoll : false;
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between text-xs">
                                                            <div className="min-w-0 flex-1">
                                                                <span className="font-medium truncate block">{product?.name || item.productId}</span>
                                                                {item.note && <span className="text-[10px] text-muted-foreground">{item.note}</span>}
                                                            </div>
                                                            <span className="font-bold tabular-nums shrink-0 ml-2 text-emerald-700">
                                                                +{item.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ───────── 詳細レポートリンク ───────── */}
                <TabsContent value="sub-reports" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="shadow-none sm:shadow-sm">
                            <CardHeader className="p-4 md:p-6">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FileText className="h-5 w-5" />
                                    在庫報告書
                                </CardTitle>
                                <CardDescription>商品ごとの現在庫・月間使用量・在庫日数を一覧表示。Excel出力対応。</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6 pt-0">
                                <Link href="/reports/stock-report">
                                    <Button variant="outline" size="sm" className="gap-2 w-full">
                                        レポートを開く <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                        <Card className="shadow-none sm:shadow-sm">
                            <CardHeader className="p-4 md:p-6">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <RefreshCw className="h-5 w-5" />
                                    在庫回転率レポート
                                </CardTitle>
                                <CardDescription>A〜Dランクで商品の動きを評価。死に筋や高回転商品を把握。Excel出力対応。</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6 pt-0">
                                <Link href="/reports/turnover-report">
                                    <Button variant="outline" size="sm" className="gap-2 w-full">
                                        レポートを開く <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                        <Card className="shadow-none sm:shadow-sm">
                            <CardHeader className="p-4 md:p-6">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Package className="h-5 w-5" />
                                    米袋 在庫状況一覧 (印刷用PDF)
                                </CardTitle>
                                <CardDescription>在庫・入荷予定・仕掛・メーカー在庫を含む印刷用PDFを在庫管理画面から出力できます。</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6 pt-0">
                                <Link href="/inventory/bags">
                                    <Button variant="outline" size="sm" className="gap-2 w-full">
                                        在庫管理画面へ <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
