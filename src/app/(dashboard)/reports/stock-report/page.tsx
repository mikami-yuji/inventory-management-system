"use client";

import React, { useMemo, useRef, useState } from "react";
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
    Loader2
} from "lucide-react";
import { useProducts } from "@/hooks/use-supabase-data";
import { stockHistoryService, inventoryService } from "@/lib/services";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function StockReportPage(): React.ReactElement {
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get("category");

    const [categoryFilter, setCategoryFilter] = useState<string>(categoryParam || "all");
    const reportRef = useRef<HTMLDivElement>(null);

    // Supabase APIから商品を取得
    const { products, loading, error, refetch } = useProducts();

    // フィルターされた商品
    const filteredProducts = useMemo(() => {
        if (categoryFilter === "all") return products;
        return products.filter(p => p.category === categoryFilter);
    }, [products, categoryFilter]);

    // レポートデータを生成
    const reportData = useMemo(() => {
        return filteredProducts.map(product => {
            const currentStock = inventoryService.getInventoryCount(product.id);
            const analysis = stockHistoryService.getUsageAnalysis(product.id, currentStock);

            return {
                product,
                currentStock,
                weeklyUsage: analysis.weekly,
                monthlyUsage: analysis.monthly,
                daysUntilStockout: analysis.daysUntilStockout,
                suggestedOrder: analysis.suggestedOrderQuantity,
                trend: analysis.trend,
            };
        }).filter(item => item.currentStock > 0 || item.monthlyUsage > 0); // 在庫があるか使用履歴があるもののみ
    }, [filteredProducts]);

    // サマリー統計
    const summary = useMemo(() => {
        const totalProducts = reportData.length;
        const lowStockItems = reportData.filter(r => r.daysUntilStockout !== null && r.daysUntilStockout < 14).length;
        const outOfStockItems = reportData.filter(r => r.currentStock === 0).length;
        const totalMonthlyUsage = reportData.reduce((sum, r) => sum + r.monthlyUsage, 0);

        return { totalProducts, lowStockItems, outOfStockItems, totalMonthlyUsage };
    }, [reportData]);

    // 印刷処理
    const handlePrint = (): void => {
        window.print();
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
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/reports">
                            <Button variant="ghost" size="sm" className="gap-1">
                                <ArrowLeft className="h-4 w-4" />
                                レポート一覧
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight">在庫報告書</h2>
                        {loading && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        )}
                    </div>
                    <p className="text-muted-foreground">お客様向け在庫状況レポート</p>
                </div>
                <div className="flex items-center gap-4">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="カテゴリ選択" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">すべて</SelectItem>
                            <SelectItem value="bag">米袋</SelectItem>
                            <SelectItem value="sticker">シール</SelectItem>
                            <SelectItem value="other">その他</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" />
                        印刷
                    </Button>
                </div>
            </div>

            {/* レポート本体 */}
            <div ref={reportRef} className="print:p-0">
                {/* レポートヘッダー */}
                <Card className="mb-6 print:border-0 print:shadow-none">
                    <CardHeader className="print:pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <FileText className="h-6 w-6" />
                                    在庫状況報告書
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-2">
                                    <Calendar className="h-4 w-4" />
                                    報告日: {reportDate}
                                </CardDescription>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">幸南食糧株式会社</div>
                                <div className="text-xs text-muted-foreground">在庫管理システム</div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* サマリーカード */}
                <div className="grid gap-4 md:grid-cols-4 mb-6 print:grid-cols-4">
                    <Card className="print:border print:shadow-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                管理商品数
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.totalProducts}</div>
                        </CardContent>
                    </Card>
                    <Card className="print:border print:shadow-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                要注意商品
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{summary.lowStockItems}</div>
                            <p className="text-xs text-muted-foreground">2週間以内に在庫切れ予測</p>
                        </CardContent>
                    </Card>
                    <Card className="print:border print:shadow-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                                <TrendingDown className="h-4 w-4" />
                                欠品商品
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{summary.outOfStockItems}</div>
                        </CardContent>
                    </Card>
                    <Card className="print:border print:shadow-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">月間使用数合計</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.totalMonthlyUsage.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* 在庫一覧テーブル */}
                <Card className="print:border-0 print:shadow-none">
                    <CardHeader>
                        <CardTitle>在庫明細</CardTitle>
                        <CardDescription>
                            {categoryFilter === "all" ? "全カテゴリ" :
                                categoryFilter === "bag" ? "米袋" :
                                    categoryFilter === "sticker" ? "シール" : "その他"} の在庫状況
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                    const isLowStock = item.daysUntilStockout !== null && item.daysUntilStockout < 14;
                                    const isOutOfStock = item.currentStock === 0;

                                    return (
                                        <TableRow
                                            key={item.product.id}
                                            className={isOutOfStock ? "bg-red-50" : isLowStock ? "bg-amber-50" : ""}
                                        >
                                            <TableCell>
                                                <div className="font-medium">{item.product.name}</div>
                                                <div className="text-xs text-muted-foreground">{item.product.id}</div>
                                            </TableCell>
                                            <TableCell>
                                                {item.product.weight && <span>{item.product.weight}kg</span>}
                                                {item.product.shape && <span> / {item.product.shape}</span>}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {item.currentStock.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.weeklyUsage}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.monthlyUsage}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.daysUntilStockout !== null ? (
                                                    <Badge variant={isLowStock ? "destructive" : "secondary"}>
                                                        {item.daysUntilStockout}日
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-blue-600 font-medium">
                                                {item.suggestedOrder > 0 ? item.suggestedOrder.toLocaleString() : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* フッター */}
                <div className="mt-6 text-center text-sm text-muted-foreground print:mt-4">
                    <p>本報告書は在庫管理システムから自動生成されました。</p>
                    <p>ご不明な点がございましたら担当者までお問い合わせください。</p>
                </div>
            </div>
        </div>
    );
}
