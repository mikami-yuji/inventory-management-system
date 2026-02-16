"use client";

/**
 * 在庫レベルバー
 * 在庫状況を視覚的に示すカラープログレスバー
 * 緑: 十分 / 黄: 注意 / 赤: 危険
 */

import React from "react";
import { cn } from "@/lib/utils";

type StockLevelBarProps = {
    /** 現在の有効在庫 */
    currentStock: number;
    /** アラート閾値（デフォルト: 100） */
    threshold?: number;
    /** 欠品フラグ */
    isOutOfStock: boolean;
    /** 低在庫フラグ */
    isLowStock: boolean;
    /** コンパクト表示（テーブル行用） */
    compact?: boolean;
};

export function StockLevelBar({
    currentStock,
    threshold = 100,
    isOutOfStock,
    isLowStock,
    compact = false,
}: StockLevelBarProps): React.ReactElement {
    // バーの割合を計算（閾値の2倍を100%として表示）
    const maxDisplay = threshold * 2;
    const percentage = Math.min(100, Math.max(0, (currentStock / maxDisplay) * 100));

    // 色の決定
    const barColor = isOutOfStock
        ? "bg-red-500"
        : isLowStock
            ? "bg-amber-500"
            : "bg-emerald-500";

    // 背景色の決定
    const bgColor = isOutOfStock
        ? "bg-red-100 dark:bg-red-950/30"
        : isLowStock
            ? "bg-amber-100 dark:bg-amber-950/30"
            : "bg-emerald-100 dark:bg-emerald-950/30";

    return (
        <div
            className={cn(
                "w-full rounded-full overflow-hidden",
                bgColor,
                compact ? "h-1.5" : "h-2.5"
            )}
            role="progressbar"
            aria-valuenow={currentStock}
            aria-valuemin={0}
            aria-valuemax={maxDisplay}
            aria-label={`在庫レベル: ${isOutOfStock ? "欠品" : isLowStock ? "残りわずか" : "十分"}`}
        >
            <div
                className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    barColor,
                    // 欠品時でもごくわずかなバーを表示（視覚的に赤であることを示す）
                    isOutOfStock && percentage === 0 && "min-w-[4px]"
                )}
                style={{ width: `${isOutOfStock && percentage === 0 ? 0 : percentage}%` }}
            />
        </div>
    );
}
