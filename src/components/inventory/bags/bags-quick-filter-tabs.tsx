import React from "react";
import { cn } from "@/lib/utils";
import type { QuickFilterType } from "@/hooks/use-bags-inventory-filter";

export type BagsQuickFilterTabsProps = {
    quickFilter: QuickFilterType;
    setQuickFilter: (filter: QuickFilterType) => void;
    setStockFilter: (filter: string) => void;
    totalCount: number;
    summary: {
        total: number;
        needOrder: number;
        urgentPrediction: number;
        reserved: number;
        inSupply: number;
        wipCheck: number;
    };
};

export function BagsQuickFilterTabs({
    quickFilter,
    setQuickFilter,
    setStockFilter,
    totalCount,
    summary,
}: BagsQuickFilterTabsProps): React.ReactElement {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 mr-1">
                <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                    在庫状況
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {totalCount}
                </span>
            </div>

            {/* クイックステータスタブ */}
            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar py-0.5">
                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                        quickFilter === 'all'
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    )}
                    onClick={(): void => {
                        setQuickFilter('all');
                        setStockFilter('all');
                    }}
                >
                    <span>すべて</span>
                    <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold",
                        quickFilter === 'all' ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                        {summary.total}
                    </span>
                </button>

                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                        quickFilter === 'need_order'
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-red-50/80 text-red-700 border-red-200/80 hover:bg-red-100/70"
                    )}
                    onClick={(): void => {
                        setQuickFilter(quickFilter === 'need_order' ? 'all' : 'need_order');
                        setStockFilter('all');
                    }}
                >
                    <span>🚨 要発注</span>
                    <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                        quickFilter === 'need_order' ? "bg-red-700 text-white" : "bg-red-100 text-red-800"
                    )}>
                        {summary.needOrder}
                    </span>
                </button>

                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                        quickFilter === 'urgent_prediction'
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-amber-50/80 text-amber-800 border-amber-200/80 hover:bg-amber-100/70"
                    )}
                    onClick={(): void => {
                        setQuickFilter(quickFilter === 'urgent_prediction' ? 'all' : 'urgent_prediction');
                        setStockFilter('all');
                    }}
                >
                    <span>⏳ 予測切迫</span>
                    <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                        quickFilter === 'urgent_prediction' ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-900"
                    )}>
                        {summary.urgentPrediction}
                    </span>
                </button>

                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                        quickFilter === 'reserved'
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-blue-50/80 text-blue-700 border-blue-200/80 hover:bg-blue-100/70"
                    )}
                    onClick={(): void => {
                        setQuickFilter(quickFilter === 'reserved' ? 'all' : 'reserved');
                        setStockFilter('all');
                    }}
                >
                    <span>📅 特売引当</span>
                    <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                        quickFilter === 'reserved' ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-800"
                    )}>
                        {summary.reserved}
                    </span>
                </button>

                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                        quickFilter === 'supply'
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-emerald-50/80 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70"
                    )}
                    onClick={(): void => {
                        setQuickFilter(quickFilter === 'supply' ? 'all' : 'supply');
                        setStockFilter('all');
                    }}
                >
                    <span>🏭 供給中</span>
                    <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                        quickFilter === 'supply' ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"
                    )}>
                        {summary.inSupply}
                    </span>
                </button>

                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                        quickFilter === 'wip_check'
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-indigo-50/80 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100/70"
                    )}
                    onClick={(): void => {
                        setQuickFilter(quickFilter === 'wip_check' ? 'all' : 'wip_check');
                        setStockFilter('all');
                    }}
                >
                    <span>🔍 仕掛確認</span>
                    <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                        quickFilter === 'wip_check' ? "bg-indigo-700 text-white" : "bg-indigo-100 text-indigo-800"
                    )}>
                        {summary.wipCheck}
                    </span>
                </button>
            </div>
        </div>
    );
}
