"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Printer,
    FileText,
    Calendar,
    Package,
    TrendingDown,
    AlertTriangle,
    ArrowLeft,
    Loader2,
    Download
} from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { useInventory } from "@/hooks/use-inventory";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { calculateStockStatus } from "@/lib/services";
import { cn } from "@/lib/utils";

// 在庫履歴のAPI応答型
type StockHistoryEntry = {
    id: string;
    productId: string;
    date: string;
    quantity: number;
    type: string;
    changeAmount: number;
};

// 商品ごとの使用分析を在庫履歴から計算する純粋関数
function computeUsageAnalysis(
    history: StockHistoryEntry[],
    currentStock: number
): {
    weekly: number;
    monthly: number;
    daysUntilStockout: number | null;
    suggestedOrder: number;
    trend: 'increasing' | 'decreasing' | 'stable';
} {
    if (history.length < 2) {
        return { weekly: 0, monthly: 0, daysUntilStockout: null, suggestedOrder: 0, trend: 'stable' };
    }

    // 日付でソート
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 期間別使用量を計算
    const now = new Date();
    const calcUsage = (days: number): number => {
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const periodEntries = sorted.filter(h => new Date(h.date) >= startDate);
        if (periodEntries.length < 2) return 0;
        const first = periodEntries[0].quantity;
        const last = periodEntries[periodEntries.length - 1].quantity;
        const incoming = periodEntries
            .filter(h => h.type === 'incoming')
            .reduce((sum, h) => sum + (h.changeAmount || 0), 0);
        return Math.max(0, first - last + incoming);
    };

    const weekly = calcUsage(7);
    const monthly = calcUsage(30);
    const dailyAvg = monthly > 0 ? monthly / 30 : 0;
    const daysUntilStockout = dailyAvg > 0 ? Math.floor(currentStock / dailyAvg) : null;
    const suggestedOrder = Math.ceil(monthly * 1.2);

    // トレンド計算（今週 vs 先週）
    const prevWeekUsage = calcUsage(14) - weekly;
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (weekly > 0 && (weekly - prevWeekUsage) > weekly * 0.1) trend = 'increasing';
    else if (weekly > 0 && (prevWeekUsage - weekly) > weekly * 0.1) trend = 'decreasing';

    return { weekly, monthly, daysUntilStockout, suggestedOrder, trend };
}

function StockReportContent(): React.ReactElement {
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get("category");

    const [categoryFilter, setCategoryFilter] = useState<string>(categoryParam || "all");
    const reportRef = useRef<HTMLDivElement>(null);

    // Supabase APIから商品と在庫を取得
    const { products, loading: productsLoading, error } = useProducts();
    const { inventory: inventoryData, loading: inventoryLoading } = useInventory();

    // 在庫履歴をAPIから取得
    const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const fetchHistory = useCallback(async (): Promise<void> => {
        try {
            const res = await fetch('/api/stock-history?days=90&limit=1000');
            if (res.ok) {
                const result = await res.json();
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

    // 在庫マップを作成 (productId -> quantity)
    const inventoryMap = useMemo(() => {
        const map = new Map<string, number>();
        inventoryData?.forEach(item => {
            map.set(item.productId, item.quantity);
        });
        return map;
    }, [inventoryData]);

    // フィルターされた商品
    const filteredProducts = useMemo(() => {
        if (categoryFilter === "all") return products;
        return products.filter(p => p.category === categoryFilter);
    }, [products, categoryFilter]);

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

    // レポートデータを生成
    const reportData = useMemo(() => {
        return filteredProducts.map(product => {
            const currentStock = inventoryMap.get(product.id) || 0;
            const productHistory = historyByProduct.get(product.id) || [];
            const analysis = computeUsageAnalysis(productHistory, currentStock);

            return {
                product,
                currentStock,
                weeklyUsage: analysis.weekly,
                monthlyUsage: analysis.monthly,
                daysUntilStockout: analysis.daysUntilStockout,
                suggestedOrder: analysis.suggestedOrder,
                trend: analysis.trend,
            };
        }).filter(item => item.currentStock > 0 || item.monthlyUsage > 0);
    }, [filteredProducts, inventoryMap, historyByProduct]);

    const summary = useMemo(() => {
        const totalProducts = reportData.length;
        const lowStockItems = reportData.filter(r =>
            r.daysUntilStockout !== null &&
            r.daysUntilStockout < 14 &&
            r.product.status !== 'direct_delivery' &&
            r.product.status !== 'discontinued' &&
            r.product.status !== 'on_sale_break'
        ).length;
        const outOfStockItems = reportData.filter(r =>
            r.currentStock === 0 &&
            r.product.status !== 'direct_delivery' &&
            r.product.status !== 'discontinued' &&
            r.product.status !== 'on_sale_break'
        ).length;
        const totalMonthlyUsage = reportData.reduce((sum, r) => sum + r.monthlyUsage, 0);

        return { totalProducts, lowStockItems, outOfStockItems, totalMonthlyUsage };
    }, [reportData]);

    // 印刷処理
    const handlePrint = useCallback((): void => {
        const originalTitle = document.title;
        document.title = `アサヒパック_在庫報告書_${format(new Date(), "yyyyMMdd_HHmm")}`;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 100);
    }, []);

    // Excel出力処理
    const handleExportExcel = (): void => {
        try {
            if (reportData.length === 0) return;

            // エクセル用データに変換
            const excelData = reportData.map(item => {
                const isLowStock = item.daysUntilStockout !== null &&
                    item.daysUntilStockout < 14 &&
                    item.product.status !== 'direct_delivery' &&
                    item.product.status !== 'discontinued' &&
                    item.product.status !== 'on_sale_break';
                const isOutOfStock = item.currentStock === 0 &&
                    item.product.status !== 'direct_delivery' &&
                    item.product.status !== 'discontinued' &&
                    item.product.status !== 'on_sale_break';

                let statusStr = "";
                if (isOutOfStock) statusStr = "欠品";
                else if (isLowStock) statusStr = "要注意";

                return {
                    "商品名": item.product.name,
                    "SKU/受注No": item.product.sku || item.product.id,
                    "量目(kg)": item.product.weight || "",
                    "形状": item.product.shape || "",
                    "現在庫": item.currentStock,
                    "週間使用": item.weeklyUsage,
                    "月間使用": item.monthlyUsage,
                    "在庫日数": item.daysUntilStockout !== null ? `${item.daysUntilStockout}日` : "-",
                    "推奨発注数": item.suggestedOrder > 0 ? item.suggestedOrder : "-",
                    "ステータス": statusStr
                };
            });

            // ワークブックの作成
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            
            // 列幅の調整
            const colWidths = [
                { wch: 30 }, // 商品名
                { wch: 15 }, // SKU
                { wch: 10 }, // 量目
                { wch: 15 }, // 形状
                { wch: 10 }, // 現在庫
                { wch: 10 }, // 週間使用
                { wch: 10 }, // 月間使用
                { wch: 10 }, // 在庫日数
                { wch: 12 }, // 推奨発注数
                { wch: 10 }, // ステータス
            ];
            worksheet["!cols"] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "在庫一覧");

            // ファイル名の生成
            const now = new Date();
            const dateStr = now.getFullYear() + 
                String(now.getMonth() + 1).padStart(2, '0') + 
                String(now.getDate()).padStart(2, '0') + "_" + 
                String(now.getHours()).padStart(2, '0') + 
                String(now.getMinutes()).padStart(2, '0');
            const fileName = `アサヒパック_在庫一覧_${dateStr}.xlsx`;

            // ダウンロード
            XLSX.writeFile(workbook, fileName);
        } catch (error) {
            console.error("Excel出力エラー:", error);
            alert("Excel出力中にエラーが発生しました。");
        }
    };

    // 現在日時
    const reportDate = new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    return (
        <div className="space-y-6">
            {/* ヘッダー（印刷時は非表示） */}
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
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">在庫報告書</h2>
                        {loading && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">お客様向け在庫状況レポート</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-4">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="カテゴリ選択" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">すべて</SelectItem>
                            <SelectItem value="bag">米袋</SelectItem>
                            <SelectItem value="new_rice">新米</SelectItem>
                            <SelectItem value="sticker">シール</SelectItem>
                            <SelectItem value="other">その他</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleExportExcel} variant="outline" className="gap-2 shrink-0 border-green-600 text-green-600 hover:bg-green-50">
                        <Download className="h-4 w-4" />
                        Excel出力
                    </Button>
                    <Button onClick={handlePrint} className="gap-2 shrink-0">
                        <Printer className="h-4 w-4" />
                        印刷
                    </Button>
                </div>
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <p className="text-red-600">エラー: {error}</p>
                    </CardContent>
                </Card>
            )}

            {/* レポート本体 */}
            <div ref={reportRef} className="print:p-0">
                {/* レポートヘッダー */}
                <Card className="mb-6 shadow-none sm:shadow-sm print:border-0 print:shadow-none">
                    <CardHeader className="p-3 md:p-6 print:pb-2">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                                    <FileText className="h-5 w-5 md:h-6 md:w-6" />
                                    在庫状況報告書
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-2 text-xs md:text-sm">
                                    <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                                    報告日: {reportDate}
                                </CardDescription>
                            </div>
                            <div className="sm:text-right w-full sm:w-auto">
                                <div className="text-sm font-bold text-slate-700">株式会社アサヒパック</div>
                                <div className="text-xs text-muted-foreground">在庫管理システム</div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* サマリーカード */}
                <div className="grid gap-2 grid-cols-2 md:grid-cols-4 mb-6 md:gap-4 print:grid-cols-4">
                    <Card className="shadow-none sm:shadow-sm print:border print:shadow-none">
                        <CardHeader className="p-3 pb-1 md:p-4 md:pb-2">
                            <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-2">
                                <Package className="h-3 w-3 md:h-4 md:w-4" />
                                管理商品数
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
                            <div className="text-xl md:text-2xl font-bold">{summary.totalProducts}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none sm:shadow-sm print:border print:shadow-none">
                        <CardHeader className="p-3 pb-1 md:p-4 md:pb-2">
                            <CardTitle className="text-xs md:text-sm font-medium text-amber-600 flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                                要注意商品
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
                            <div className="text-xl md:text-2xl font-bold text-amber-600">{summary.lowStockItems}</div>
                            <p className="text-[10px] md:text-xs text-muted-foreground">2週間以内に在庫切れ予測</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none sm:shadow-sm print:border print:shadow-none">
                        <CardHeader className="p-3 pb-1 md:p-4 md:pb-2">
                            <CardTitle className="text-xs md:text-sm font-medium text-red-600 flex items-center gap-2">
                                <TrendingDown className="h-3 w-3 md:h-4 md:w-4" />
                                欠品商品
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
                            <div className="text-xl md:text-2xl font-bold text-red-600">{summary.outOfStockItems}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none sm:shadow-sm print:border print:shadow-none">
                        <CardHeader className="p-3 pb-1 md:p-4 md:pb-2">
                            <CardTitle className="text-xs md:text-sm font-medium">月間使用数合計</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
                            <div className="text-xl md:text-2xl font-bold">{summary.totalMonthlyUsage.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* 在庫一覧テーブル */}
                <Card className="shadow-none sm:shadow-sm print:border-0 print:shadow-none">
                    <CardHeader className="p-3 md:p-6">
                        <CardTitle className="text-base md:text-lg">在庫明細</CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            {categoryFilter === "all" ? "全カテゴリ" :
                                categoryFilter === "bag" ? "米袋" :
                                    categoryFilter === "new_rice" ? "新米" :
                                        categoryFilter === "sticker" ? "シール" : "その他"} の在庫状況
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                        {reportData.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                該当するデータがありません
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>商品名</TableHead>
                                        <TableHead>スペック</TableHead>
                                        <TableHead className="text-right">現在庫</TableHead>
                                        <TableHead className="text-right">週間使用</TableHead>
                                        <TableHead className="text-right">月間使用</TableHead>
                                        <TableHead className="text-right">在庫日数</TableHead>
                                        <TableHead className="text-right">推奨発注数</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.map(item => {
                                        const isLowStock = item.daysUntilStockout !== null &&
                                            item.daysUntilStockout < 14 &&
                                            item.product.status !== 'direct_delivery' &&
                                            item.product.status !== 'discontinued' &&
                                            item.product.status !== 'on_sale_break';
                                        const isOutOfStock = item.currentStock === 0 &&
                                            item.product.status !== 'direct_delivery' &&
                                            item.product.status !== 'discontinued' &&
                                            item.product.status !== 'on_sale_break';

                                        return (
                                            <TableRow
                                                key={item.product.id}
                                                className={isOutOfStock ? "bg-red-50" : isLowStock ? "bg-amber-50" : ""}
                                            >
                                                <TableCell>
                                                    <div className="font-medium">{item.product.name}</div>
                                                    <div className="text-xs text-muted-foreground">{item.product.sku || item.product.id}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {item.product.weight && <span>{item.product.weight}kg</span>}
                                                    {item.product.shape && <span> / {item.product.shape}</span>}
                                                </TableCell>
                                                <TableCell className="text-right font-bold tabular-nums">
                                                    {item.currentStock.toLocaleString()}
                                                    <span className="text-[10px] font-normal ml-0.5">
                                                        {calculateStockStatus(item.product, item.currentStock, { bags: 0, meters: 0 }).isRoll ? 'm' : '枚'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {item.weeklyUsage.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {item.monthlyUsage.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.daysUntilStockout !== null ? (
                                                        <Badge variant={isLowStock ? "destructive" : "secondary"} className="font-mono">
                                                            {item.daysUntilStockout}日
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-blue-700 font-bold tabular-nums">
                                                    {item.suggestedOrder > 0 ? item.suggestedOrder.toLocaleString() : '-'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        )}
                    </CardContent>
                </Card>

                {/* フッター */}
                <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-4 print:mt-4">
                    <p className="mb-1 font-medium text-slate-500 tracking-wider">※ 本資料の在庫状況は作成日現在のシステムデータに基づいた概算値です。</p>
                    <p className="mb-4">実在庫と微差が生じる場合がありますので、詳細な納期・数量については別途お問い合わせください。</p>
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
        </div>
    );
}

export default function StockReportPage(): React.ReactElement {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <StockReportContent />
        </Suspense>
    );
}
