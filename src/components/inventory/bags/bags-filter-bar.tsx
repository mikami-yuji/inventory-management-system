import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Search,
    Plus,
    LayoutGrid,
    List,
    X,
    Printer,
    Download,
    ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BagsFilterBarProps = {
    viewMode: "table" | "grid";
    setViewMode: (mode: "table" | "grid") => void;
    handleExportExcel: () => Promise<void>;
    handlePrint: () => void;
    handleAddProduct: () => void;
    handleAddAllLowStockToCart: () => void;
    needOrderCount: number;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    weightFilter: string;
    setWeightFilter: (w: string) => void;
    availableWeights: number[];
    originFilter: string;
    setOriginFilter: (o: string) => void;
    availableOrigins: string[];
    varietyFilter: string;
    setVarietyFilter: (v: string) => void;
    availableVarieties: string[];
    statusFilter: string;
    setStatusFilter: (s: string) => void;
    statusLabels: Record<string, string>;
    stockFilter: string;
    setStockFilter: (s: string) => void;
    showRemovedZeroStock: boolean;
    setShowRemovedZeroStock: (show: boolean | ((prev: boolean) => boolean)) => void;
    hasActiveFilters: boolean;
    clearFilters: () => void;
};

export function BagsFilterBar({
    viewMode,
    setViewMode,
    handleExportExcel,
    handlePrint,
    handleAddProduct,
    handleAddAllLowStockToCart,
    needOrderCount,
    searchInputRef,
    searchQuery,
    setSearchQuery,
    weightFilter,
    setWeightFilter,
    availableWeights,
    originFilter,
    setOriginFilter,
    availableOrigins,
    varietyFilter,
    setVarietyFilter,
    availableVarieties,
    statusFilter,
    setStatusFilter,
    statusLabels,
    stockFilter,
    setStockFilter,
    showRemovedZeroStock,
    setShowRemovedZeroStock,
    hasActiveFilters,
    clearFilters,
}: BagsFilterBarProps): React.ReactElement {
    return (
        <div className="space-y-2 print:hidden">
            {/* 上部アクションバー */}
            <div className="flex items-center justify-between gap-2">
                {needOrderCount > 0 && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddAllLowStockToCart}
                        className="h-6.5 px-2 text-[11px] border-orange-300 text-orange-700 hover:bg-orange-50 gap-1 rounded-full shrink-0"
                        title="要発注商品を推奨数量で一括カート追加"
                    >
                        <ShoppingCart className="h-3 w-3" />
                        一括カート
                    </Button>
                )}

                {/* 右側: アクションボタン群 */}
                <div className="flex items-center gap-1.5 ml-auto">
                    <div className="bg-slate-100 p-0.5 rounded-md border flex items-center shrink-0">
                        <Button
                            variant={viewMode === "table" ? "secondary" : "ghost"}
                            size="sm"
                            className={cn("px-2 h-7 text-xs", viewMode === "table" && "bg-white shadow-2xs text-slate-900 font-medium")}
                            onClick={(): void => setViewMode("table")}
                        >
                            <List className="h-3.5 w-3.5 mr-1" />
                            リスト
                        </Button>
                        <Button
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="sm"
                            className={cn("px-2 h-7 text-xs", viewMode === "grid" && "bg-white shadow-2xs text-slate-900 font-medium")}
                            onClick={(): void => setViewMode("grid")}
                        >
                            <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                            カード
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        className="gap-1 h-7 px-2.5 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                        <Download className="h-3.5 w-3.5 text-emerald-600" />
                        Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="gap-1 h-7 px-2.5 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                        <Printer className="h-3.5 w-3.5 text-slate-600" />
                        PDF
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleAddProduct}
                        className="gap-1 h-7 px-3 text-xs bg-slate-900 text-white hover:bg-slate-800"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        商品追加
                    </Button>
                </div>
            </div>

            {/* 統合検索＆フィルターバー */}
            <div className="bg-white px-2.5 py-2 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                    {/* 検索入力 */}
                    <div className="relative flex-1 min-w-[180px] max-w-xs sm:max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            ref={searchInputRef}
                            placeholder="商品名、JAN、商品ID... (「/」でフォーカス)"
                            value={searchQuery}
                            onChange={(e): void => setSearchQuery(e.target.value)}
                            className="pl-8 pr-7 h-7.5 text-xs bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                onClick={(): void => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        ) : (
                            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-4.5 select-none items-center rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[9px] text-slate-500">
                                /
                            </kbd>
                        )}
                    </div>

                    {/* ドロップダウンフィルター群 */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 重量 */}
                        <Select value={weightFilter} onValueChange={setWeightFilter}>
                            <SelectTrigger className={cn("h-7.5 text-xs w-[88px] bg-slate-50/50 border-slate-200", weightFilter !== "all" && "bg-blue-50/80 border-blue-300 text-blue-900 font-medium")}>
                                <SelectValue placeholder="重量" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">重量: 全て</SelectItem>
                                {availableWeights.map(w => (
                                    <SelectItem key={w} value={w.toString()}>{w}kg</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* 産地 */}
                        <Select value={originFilter} onValueChange={setOriginFilter}>
                            <SelectTrigger className={cn("h-7.5 text-xs w-[94px] bg-slate-50/50 border-slate-200", originFilter !== "all" && "bg-blue-50/80 border-blue-300 text-blue-900 font-medium")}>
                                <SelectValue placeholder="産地" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">産地: 全て</SelectItem>
                                {availableOrigins.map(o => (
                                    <SelectItem key={o} value={o}>{o}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* 品種 */}
                        <Select value={varietyFilter} onValueChange={setVarietyFilter}>
                            <SelectTrigger className={cn("h-7.5 text-xs w-[96px] bg-slate-50/50 border-slate-200", varietyFilter !== "all" && "bg-blue-50/80 border-blue-300 text-blue-900 font-medium")}>
                                <SelectValue placeholder="品種" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">品種: 全て</SelectItem>
                                {availableVarieties.map(v => (
                                    <SelectItem key={v} value={v}>{v}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* 状態 */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className={cn("h-7.5 text-xs w-[100px] bg-slate-50/50 border-slate-200", statusFilter !== "all" && "bg-blue-50/80 border-blue-300 text-blue-900 font-medium")}>
                                <SelectValue placeholder="状態" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">状態: 全て</SelectItem>
                                {Object.entries(statusLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* 全体状況 (在庫状況) */}
                        <Select value={stockFilter} onValueChange={setStockFilter}>
                            <SelectTrigger className={cn("h-7.5 text-xs w-[105px] bg-slate-50/50 border-slate-200", stockFilter !== "all" && "bg-blue-50/80 border-blue-300 text-blue-900 font-medium")}>
                                <SelectValue placeholder="全体状況" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全体状況: 全て</SelectItem>
                                <SelectItem value="need_order">要発注 (警告+欠品)</SelectItem>
                                <SelectItem value="in_stock">適正在庫</SelectItem>
                                <SelectItem value="low_stock">発注点以下</SelectItem>
                                <SelectItem value="out_of_stock">在庫切れ (0)</SelectItem>
                                <SelectItem value="reserved">特売引当あり</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 右側：落版(在庫0)切り替え ＆ クリアボタン */}
                    <div className="flex items-center gap-2 ml-auto pl-2 border-l border-slate-200">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                落版(在庫0):
                            </span>
                            <div className="inline-flex items-center p-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px]">
                                <button
                                    type="button"
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer",
                                        !showRemovedZeroStock ? "bg-white text-slate-800 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-700"
                                    )}
                                    onClick={(): void => setShowRemovedZeroStock(false)}
                                >
                                    OFF
                                </button>
                                <button
                                    type="button"
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer",
                                        showRemovedZeroStock ? "bg-slate-800 text-white shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-700"
                                    )}
                                    onClick={(): void => setShowRemovedZeroStock(true)}
                                >
                                    ON
                                </button>
                            </div>
                        </div>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            >
                                <X className="h-3.5 w-3.5 mr-1" />
                                リセット
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
