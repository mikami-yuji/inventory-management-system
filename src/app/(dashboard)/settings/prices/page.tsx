"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PriceRevisionImportDialog } from "@/components/products/price-revision-import-dialog";
import { 
  Settings, 
  Info, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Search, 
  Filter, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Percent
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventory } from "@/hooks/use-inventory";
import { useProducts } from "@/hooks/use-products";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  calculateInventorySummary, 
  groupPriceRevisions 
} from "@/lib/utils/price-calculator";
import type { ProductCategory } from "@/types";

// Chart.jsのインポートと登録
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TooltipItem,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// カテゴリ日本語表示用マッピング
const CATEGORY_MAP: Record<ProductCategory, string> = {
  bag: "袋",
  sticker: "シール",
  new_rice: "新米",
  other: "その他",
};

/**
 * 価格管理設定のメイン画面コンポーネント
 */
export default function PriceSettingsPage(): React.ReactElement {
  const { inventory, loading: inventoryLoading, error: inventoryError } = useInventory();
  const { products, loading: productsLoading, error: productsError } = useProducts();

  // 詳細テーブルの検索・フィルタ用状態管理
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>("all");

  // 価格推移の展開状態管理（改定日ごとのキーで真偽値を保持）
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // 金額フォーマットのユーティリティ関数
  const formatCurrency = (amount: number): string => {
    return `¥${amount.toLocaleString()}`;
  };

  // 数量フォーマットのユーティリティ関数
  const formatQuantity = (quantity: number): string => {
    return `${quantity.toLocaleString()} 個`;
  };

  // 在庫集計データの計算
  const summary = useMemo(() => calculateInventorySummary(inventory), [inventory]);

  // 価格改定履歴・スケジュールの計算
  const revisionGroups = useMemo(() => groupPriceRevisions(products), [products]);

  // 詳細比較テーブルのフィルタリングロジック
  const filteredItems = useMemo(() => {
    return inventory
      .filter((item) => {
        const product = item.product;
        if (!product) return false;

        // 検索キーワードフィルタ（商品名または受注№）
        const matchSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));

        // カテゴリフィルタ
        const matchCategory =
          selectedCategory === "all" || product.category === selectedCategory;

        // 在庫状態フィルタ
        const quantity = item.quantity;
        const oldQty = item.oldPriceQuantity;
        const newQty = Math.max(0, quantity - oldQty);

        let matchStock = true;
        if (selectedStockFilter === "only-old") {
          matchStock = oldQty > 0 && newQty === 0;
        } else if (selectedStockFilter === "only-new") {
          matchStock = newQty > 0 && oldQty === 0;
        } else if (selectedStockFilter === "both") {
          matchStock = oldQty > 0 && newQty > 0;
        } else if (selectedStockFilter === "has-stock") {
          matchStock = quantity > 0;
        }

        return matchSearch && matchCategory && matchStock;
      })
      .map((item) => {
        const product = item.product;
        const quantity = item.quantity;
        const oldQty = item.oldPriceQuantity;
        const newQty = Math.max(0, quantity - oldQty);

        const oldUnit = product.oldUnitPrice ?? product.unitPrice;
        const oldPrint = product.oldPrintingCost ?? product.printingCost ?? 0;
        const oldPrice = oldUnit + oldPrint;
        const oldAmount = oldQty * oldPrice;

        const newUnit = product.unitPrice;
        const newPrint = product.printingCost ?? 0;
        const newPrice = newUnit + newPrint;
        const newAmount = newQty * newPrice;

        return {
          id: product.id,
          name: product.name,
          sku: product.sku || "-",
          category: product.category,
          oldPrice: product.oldUnitPrice !== undefined ? oldPrice : null,
          newPrice: newPrice,
          oldQty: oldQty,
          oldAmount: oldAmount,
          newQty: newQty,
          newAmount: newAmount,
          totalQty: quantity,
          totalAmount: oldAmount + newAmount,
        };
      });
  }, [inventory, searchQuery, selectedCategory, selectedStockFilter]);

  // アコーディオン開閉トグルの処理
  const toggleDate = (date: string): void => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  // ドーナツチャート用データ：在庫金額の構成比率
  const amountChartData = useMemo(() => {
    return {
      labels: ['旧価格在庫金額', '新価格在庫金額'],
      datasets: [
        {
          data: [summary.oldPrice.amount, summary.newPrice.amount],
          backgroundColor: ['rgba(245, 158, 11, 0.85)', 'rgba(16, 185, 129, 0.85)'],
          borderColor: ['#f59e0b', '#10b981'],
          borderWidth: 1.5,
          hoverOffset: 10,
        },
      ],
    };
  }, [summary]);

  // ドーナツチャート用データ：在庫数の構成比率
  const stockChartData = useMemo(() => {
    return {
      labels: ['旧価格在庫数', '新価格在庫数'],
      datasets: [
        {
          data: [summary.oldPrice.stockCount, summary.newPrice.stockCount],
          backgroundColor: ['rgba(251, 191, 36, 0.85)', 'rgba(52, 211, 153, 0.85)'],
          borderColor: ['#fbbf24', '#34d399'],
          borderWidth: 1.5,
          hoverOffset: 10,
        },
      ],
    };
  }, [summary]);

  // チャートオプション
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#374151',
          padding: 15,
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 12,
            weight: "bold" as const,
          },
        },
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (context: TooltipItem<'doughnut'>): string => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const dataset = context.dataset.data;
            const total = dataset.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            
            if (label.includes('金額')) {
              return ` ${label}: ¥${value.toLocaleString()} (${percentage}%)`;
            }
            return ` ${label}: ${value.toLocaleString()} 個 (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%',
  };

  const isDataLoading = inventoryLoading || productsLoading;
  const isError = inventoryError || productsError;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ページタイトルヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-8 w-8 text-indigo-600" />
            価格管理
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm md:text-base">
            在庫の新旧価格比率の集計、価格改定スケジュール予約および履歴を統合管理します。
          </p>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>エラーが発生しました</AlertTitle>
          <AlertDescription>
            {inventoryError || productsError || "データの取得中に問題が発生しました。"}
          </AlertDescription>
        </Alert>
      )}

      {isDataLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-muted-foreground text-sm font-medium">データを読み込み中...</p>
        </div>
      ) : (
        <Tabs defaultValue="summary" className="w-full space-y-6">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto grid grid-cols-3 gap-1">
            <TabsTrigger value="summary" className="rounded-lg py-2.5">
              在庫金額集計（新旧）
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg py-2.5">
              価格の推移・予定
            </TabsTrigger>
            <TabsTrigger value="import" className="rounded-lg py-2.5">
              価格改定一括予約
            </TabsTrigger>
          </TabsList>

          {/* ==================== 1. 在庫金額集計（新旧） ==================== */}
          <TabsContent value="summary" className="space-y-6 outline-none">
            {/* サマリーカードセクション */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 旧価格在庫カード */}
              <Card className="overflow-hidden border-amber-200 bg-amber-50/20 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                <div className="h-1.5 bg-amber-500 w-full" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center justify-between">
                    <span>旧価格在庫（旧単価）</span>
                    <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-100/50">
                      旧単価適用
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-6">
                  <div>
                    <span className="text-3xl font-extrabold text-amber-700 dark:text-amber-500">
                      {formatCurrency(summary.oldPrice.amount)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      在庫総金額 (印刷代込み)
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-100/50">
                    <div>
                      <p className="text-xs text-muted-foreground">対象商品数</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {summary.oldPrice.productsCount} 商品
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">総在庫数</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatQuantity(summary.oldPrice.stockCount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 新価格在庫カード */}
              <Card className="overflow-hidden border-emerald-200 bg-emerald-50/20 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                <div className="h-1.5 bg-emerald-500 w-full" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 flex items-center justify-between">
                    <span>新価格在庫（新単価）</span>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-100/50">
                      新単価適用
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-6">
                  <div>
                    <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-500">
                      {formatCurrency(summary.newPrice.amount)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      在庫総金額 (印刷代込み)
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100/50">
                    <div>
                      <p className="text-xs text-muted-foreground">対象商品数</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {summary.newPrice.productsCount} 商品
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">総在庫数</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatQuantity(summary.newPrice.stockCount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 在庫総合計カード */}
              <Card className="overflow-hidden border-slate-200 bg-slate-50/30 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                <div className="h-1.5 bg-indigo-600 w-full" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-400 flex items-center justify-between">
                    <span>在庫総合計</span>
                    <Badge variant="outline" className="border-slate-300 text-slate-700 bg-slate-100/50">
                      総合計
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-6">
                  <div>
                    <span className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-500">
                      {formatCurrency(summary.total.amount)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      現在庫総価値 (印刷代込み)
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-muted-foreground">総取扱商品数</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {summary.total.productsCount} 商品
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">総在庫数量</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatQuantity(summary.total.stockCount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 視覚化グラフ表示セクション */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-indigo-500" />
                    在庫金額の新旧比率
                  </CardTitle>
                  <CardDescription>
                    保管在庫の総金額ベースでの新旧単価比率です。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-64 pb-6">
                  {summary.total.amount > 0 ? (
                    <div className="h-full w-full max-w-[240px]">
                      <Doughnut data={amountChartData} options={chartOptions} />
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">表示するデータがありません</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-500" />
                    在庫数量の新旧比率
                  </CardTitle>
                  <CardDescription>
                    保管在庫の総数量（枚数・m）ベースでの新旧構成比率です。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-64 pb-6">
                  {summary.total.stockCount > 0 ? (
                    <div className="h-full w-full max-w-[240px]">
                      <Doughnut data={stockChartData} options={chartOptions} />
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">表示するデータがありません</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 在庫比較詳細テーブル */}
            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                  商品別の新旧在庫・金額内訳
                </CardTitle>
                <CardDescription>
                  各商品の新旧それぞれの単価、在庫数、在庫金額を個別に確認・検索できます。
                </CardDescription>
              </CardHeader>

              {/* 検索・フィルタリングバー */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* 検索入力 */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="商品名、受注№で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                {/* フィルタセレクト群 */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <Filter className="h-4 w-4" />
                    <span>フィルタ:</span>
                  </div>

                  {/* カテゴリ選択 */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">カテゴリ: すべて</option>
                    <option value="bag">袋</option>
                    <option value="sticker">シール</option>
                    <option value="new_rice">新米</option>
                    <option value="other">その他</option>
                  </select>

                  {/* 在庫状態選択 */}
                  <select
                    value={selectedStockFilter}
                    onChange={(e) => setSelectedStockFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">価格状態: すべて</option>
                    <option value="has-stock">在庫有り（全体）</option>
                    <option value="only-old">旧価格在庫のみ有り</option>
                    <option value="only-new">新価格在庫のみ有り</option>
                    <option value="both">新旧両方の在庫有り</option>
                  </select>
                </div>
              </div>

              {/* テーブル部 */}
              <CardContent className="p-0">
                <Table wrapperClassName="max-h-[500px] overflow-y-auto">
                  <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                    <TableRow>
                      <TableHead className="font-bold">商品情報</TableHead>
                      <TableHead className="font-bold text-center">カテゴリ</TableHead>
                      <TableHead className="font-bold text-right border-l border-amber-100 dark:border-amber-950 bg-amber-50/10">旧単価適用分</TableHead>
                      <TableHead className="font-bold text-right border-l border-emerald-100 dark:border-emerald-950 bg-emerald-50/10">新単価適用分</TableHead>
                      <TableHead className="font-bold text-right border-l">現在庫合計</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                          {/* 商品情報 */}
                          <TableCell className="max-w-[280px]">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.name}>
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              受注№: <span className="font-mono text-slate-600 dark:text-slate-400">{item.sku}</span>
                            </p>
                          </TableCell>

                          {/* カテゴリ */}
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-normal">
                              {CATEGORY_MAP[item.category as ProductCategory] || item.category}
                            </Badge>
                          </TableCell>

                          {/* 旧単価適用分 */}
                          <TableCell className="border-l border-amber-100 dark:border-amber-950 bg-amber-50/5 text-right">
                            {item.oldPrice !== null ? (
                              <div className="space-y-1">
                                <p className="font-bold text-amber-700 dark:text-amber-500">
                                  {formatCurrency(item.oldAmount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.oldQty.toLocaleString()} 個 × {formatCurrency(item.oldPrice)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">適用なし</span>
                            )}
                          </TableCell>

                          {/* 新単価適用分 */}
                          <TableCell className="border-l border-emerald-100 dark:border-emerald-950 bg-emerald-50/5 text-right">
                            <div className="space-y-1">
                              <p className="font-bold text-emerald-700 dark:text-emerald-500">
                                {formatCurrency(item.newAmount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.newQty.toLocaleString()} 個 × {formatCurrency(item.newPrice)}
                              </p>
                            </div>
                          </TableCell>

                          {/* 現在庫合計 */}
                          <TableCell className="border-l text-right font-semibold">
                            <div className="space-y-1">
                              <p className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                                {formatCurrency(item.totalAmount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                合計 {item.totalQty.toLocaleString()} 個
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          条件に一致する商品が見つかりません。
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* テーブルフッター件数表示 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t text-xs text-muted-foreground flex justify-between items-center font-medium">
                <span>検索結果: {filteredItems.length} 件</span>
                <span>※ 在庫金額は「単価 + 印刷代」に数量を掛けて計算しています。</span>
              </div>
            </Card>
          </TabsContent>

          {/* ==================== 2. 価格の推移・予定 ==================== */}
          <TabsContent value="history" className="space-y-6 outline-none">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  価格改定予約・履歴のタイムライン
                </CardTitle>
                <CardDescription>
                  Excelインポート等で登録された価格改定の適用スケジュールおよび過去の改定履歴です。改定日ごとにまとめて確認できます。
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {revisionGroups.length > 0 ? (
                  <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-8 pb-4">
                    {revisionGroups.map((group) => {
                      const isExpanded = !!expandedDates[group.effectiveDate];
                      const today = new Date().toISOString().split('T')[0];
                      const isFuture = group.effectiveDate > today;

                      return (
                        <div key={group.effectiveDate} className="relative pl-6">
                          {/* タイムラインのポイントアイコン */}
                          <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 bg-white dark:bg-slate-950 ${
                            isFuture 
                              ? 'border-indigo-600 animate-pulse' 
                              : 'border-slate-400'
                          }`} />

                          {/* グループカード */}
                          <div className="border rounded-xl shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
                            {/* ヘッダークリックでアコーディオン展開 */}
                            <div 
                              onClick={() => toggleDate(group.effectiveDate)}
                              className="p-4 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                            >
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-extrabold text-base tracking-tight text-slate-800 dark:text-slate-200">
                                  {group.effectiveDate}
                                </span>
                                {isFuture ? (
                                  <Badge className="bg-indigo-600 hover:bg-indigo-700">
                                    適用予定
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-slate-600 dark:text-slate-400 bg-slate-100">
                                    適用済み
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground font-medium">
                                  対象商品: {group.revisions.length} 件
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-slate-500">
                                <span className="text-xs font-semibold">
                                  {isExpanded ? "詳細を閉じる" : "詳細を表示"}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>

                            {/* 展開時の改定商品一覧 */}
                            {isExpanded && (
                              <div className="border-t">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                      <TableHead className="font-semibold text-xs">商品情報</TableHead>
                                      <TableHead className="font-semibold text-xs text-center">カテゴリ</TableHead>
                                      <TableHead className="font-semibold text-xs text-right">改定前（旧価格）</TableHead>
                                      <TableHead className="font-semibold text-xs text-right">改定後（新価格）</TableHead>
                                      <TableHead className="font-semibold text-xs text-right">差額</TableHead>
                                      <TableHead className="font-semibold text-xs text-right">変動率</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.revisions.map((rev) => (
                                      <TableRow key={rev.id} className="hover:bg-slate-50/30">
                                        <TableCell className="py-2.5 max-w-[240px]">
                                          <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                                            {rev.productName}
                                          </p>
                                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                            SKU: {rev.sku}
                                          </p>
                                        </TableCell>
                                        <TableCell className="text-center py-2.5">
                                          <Badge variant="outline" className="font-normal text-xs py-0">
                                            {CATEGORY_MAP[rev.category as ProductCategory] || rev.category}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right py-2.5 font-medium text-slate-600">
                                          {formatCurrency(rev.oldPrice)}
                                        </TableCell>
                                        <TableCell className="text-right py-2.5 font-bold text-slate-900 dark:text-white">
                                          {formatCurrency(rev.newPrice)}
                                        </TableCell>
                                        <TableCell className="text-right py-2.5 font-bold text-rose-600 dark:text-rose-400">
                                          +{formatCurrency(rev.diff)}
                                        </TableCell>
                                        <TableCell className="text-right py-2.5 font-bold text-rose-600 dark:text-rose-400">
                                          <span className="inline-flex items-center gap-0.5">
                                            {rev.ratio.toFixed(1)}%
                                            <Percent className="h-3 w-3" />
                                          </span>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed">
                    <p className="font-medium">価格改定の予約や履歴はまだ登録されていません。</p>
                    <p className="text-xs mt-1">「価格改定一括予約」タブからExcelファイルをアップロードして予約できます。</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== 3. 価格改定一括予約（既存の移行分） ==================== */}
          <TabsContent value="import" className="space-y-6 outline-none">
            <Alert className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-400 font-bold">価格改定の予約スケジュールについて</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                指定した「改定日」になると、システム全体の単価および印刷代が自動的に更新されます。
                また、過去の発注データにはその時点の単価が保存されているため、改定後も過去の金額は維持されます。
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-amber-500" />
                  価格改定の一括予約（Excelインポート）
                </CardTitle>
                <CardDescription>
                  Excelファイルをアップロードして、未来の日付を指定した価格改定を一括で行います。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">一括アップロードを実行する</p>
                    <p className="text-xs text-muted-foreground mt-1">「受注№」と「単価」の列が必要です（「印刷代」や「改定日」も指定可能です）</p>
                  </div>
                  <PriceRevisionImportDialog />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">使い方のヒント</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3">
                <p className="flex items-start gap-1.5">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>1つの商品に対して複数の未来の価格改定予定を予約できます。</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>すでに同じ改定日で同一商品の予約がある場合は、後からアップロードした内容で自動的に上書きされます。</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>改定日当日になると、在庫一覧や新規発注時の単価に自動で反映されます。</span>
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
