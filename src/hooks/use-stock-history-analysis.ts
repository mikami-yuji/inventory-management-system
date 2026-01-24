"use client";

/**
 * 在庫履歴フック
 * Stock History APIからデータを取得し、使用量分析を行う
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { StockHistory } from '@/types';

// APIレスポンス型
type ApiResponse<T> = {
    data: T | null;
    error: string | null;
};

// 使用量分析結果型
export type UsageAnalysis = {
    weekly: number;
    monthly: number;
    quarterly: number;
    dailyAverage: number;
    daysUntilStockout: number | null;
    trend: 'increasing' | 'decreasing' | 'stable';
    suggestedOrderQuantity: number;
};

/**
 * 期間内の使用数を計算
 */
const calculateUsageFromHistory = (history: StockHistory[], days: number): number => {
    if (history.length < 2) return 0;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 期間内の履歴をフィルタ
    const periodHistory = history.filter(h => new Date(h.date) >= startDate);
    if (periodHistory.length < 2) return 0;

    // 日付順にソート
    const sorted = [...periodHistory].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const firstQty = sorted[0].quantity;
    const lastQty = sorted[sorted.length - 1].quantity;

    // 入荷分を考慮
    const incomingTotal = periodHistory
        .filter(h => h.type === 'incoming')
        .reduce((sum, h) => sum + (h.changeAmount || 0), 0);

    return Math.max(0, firstQty - lastQty + incomingTotal);
};

/**
 * 在庫履歴と使用量分析を提供するフック
 */
export function useStockHistoryAnalysis(productId?: string, currentStock?: number): {
    history: StockHistory[];
    analysis: UsageAnalysis | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
} {
    const [history, setHistory] = useState<StockHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async (): Promise<void> => {
        if (!productId) {
            setHistory([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                productId,
                days: '90', // 3ヶ月分取得
            });

            const response = await fetch(`/api/stock-history?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<StockHistory[]> = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            setHistory(result.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : '在庫履歴の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // 使用量分析を計算
    const analysis = useMemo((): UsageAnalysis | null => {
        if (!productId || history.length < 2) return null;

        const weekly = calculateUsageFromHistory(history, 7);
        const monthly = calculateUsageFromHistory(history, 30);
        const quarterly = calculateUsageFromHistory(history, 90);
        const dailyAverage = Math.round(monthly / 30 * 10) / 10;

        // 在庫切れ予測日数
        let daysUntilStockout: number | null = null;
        if (dailyAverage > 0 && currentStock !== undefined) {
            daysUntilStockout = Math.floor(currentStock / dailyAverage);
        }

        // トレンド計算
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const prevWeekHistory = history.filter(h => {
            const date = new Date(h.date);
            return date >= twoWeeksAgo && date < oneWeekAgo;
        });

        if (prevWeekHistory.length >= 2) {
            const sorted = [...prevWeekHistory].sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const prevWeekUsage = sorted[0].quantity - sorted[sorted.length - 1].quantity;
            const diff = weekly - prevWeekUsage;
            if (diff > weekly * 0.1) trend = 'increasing';
            else if (diff < -weekly * 0.1) trend = 'decreasing';
        }

        // 推奨発注数
        const suggestedOrderQuantity = Math.ceil(monthly * 1.2);

        return {
            weekly,
            monthly,
            quarterly,
            dailyAverage,
            daysUntilStockout,
            trend,
            suggestedOrderQuantity,
        };
    }, [history, productId, currentStock]);

    return { history, analysis, loading, error, refetch: fetchHistory };
}
