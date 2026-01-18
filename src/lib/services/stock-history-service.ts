import type { StockHistory } from "@/types";
import { dataSource } from "./data-source";

// 在庫履歴サービス
// 週2回の在庫確認データから使用数を算出

// 在庫履歴を取得
function getStockHistory(productId: string): StockHistory[] {
    return dataSource.getStockHistory().filter(h => h.productId === productId);
}

// 期間内の使用数を計算
function calculateUsage(productId: string, days: number): number {
    const history = getStockHistory(productId);
    if (history.length < 2) return 0;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 期間内の履歴をフィルタ
    const periodHistory = history.filter(h => new Date(h.date) >= startDate);
    if (periodHistory.length < 2) return 0;

    // 使用数 = 期間開始時の在庫 + 入荷 - 期間終了時の在庫
    // 簡略化: 最初と最後の差分 + 入荷分
    const sorted = periodHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstQty = sorted[0].quantity;
    const lastQty = sorted[sorted.length - 1].quantity;

    // 入荷分を考慮（入荷があった場合は使用数にプラス）
    const incomingTotal = periodHistory
        .filter(h => h.type === 'incoming')
        .reduce((sum, h) => sum + (h.changeAmount || 0), 0);

    return Math.max(0, firstQty - lastQty + incomingTotal);
}

// 週間使用数
function getWeeklyUsage(productId: string): number {
    return calculateUsage(productId, 7);
}

// 月間使用数
function getMonthlyUsage(productId: string): number {
    return calculateUsage(productId, 30);
}

// 3ヶ月使用数
function getQuarterlyUsage(productId: string): number {
    return calculateUsage(productId, 90);
}

// 1日あたり平均使用数
function getDailyAverageUsage(productId: string): number {
    const monthlyUsage = getMonthlyUsage(productId);
    return Math.round(monthlyUsage / 30 * 10) / 10;
}

// 推定在庫切れ日数
function getEstimatedDaysUntilStockout(productId: string, currentStock: number): number | null {
    const dailyAvg = getDailyAverageUsage(productId);
    if (dailyAvg === 0) return null;
    return Math.floor(currentStock / dailyAvg);
}

// 使用傾向（増加/減少/安定）
function getUsageTrend(productId: string): 'increasing' | 'decreasing' | 'stable' {
    const lastWeek = getWeeklyUsage(productId);
    const history = getStockHistory(productId);

    // 2週間前のデータを取得
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const prevWeekHistory = history.filter(h => {
        const date = new Date(h.date);
        return date >= twoWeeksAgo && date < oneWeekAgo;
    });

    if (prevWeekHistory.length < 2) return 'stable';

    const sorted = prevWeekHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const prevWeekUsage = sorted[0].quantity - sorted[sorted.length - 1].quantity;

    const diff = lastWeek - prevWeekUsage;
    if (diff > lastWeek * 0.1) return 'increasing';
    if (diff < -lastWeek * 0.1) return 'decreasing';
    return 'stable';
}

// 商品の使用分析サマリーを取得
function getUsageAnalysis(productId: string, currentStock: number): {
    weekly: number;
    monthly: number;
    quarterly: number;
    dailyAverage: number;
    daysUntilStockout: number | null;
    trend: 'increasing' | 'decreasing' | 'stable';
    suggestedOrderQuantity: number;
} {
    const weekly = getWeeklyUsage(productId);
    const monthly = getMonthlyUsage(productId);
    const quarterly = getQuarterlyUsage(productId);
    const dailyAverage = getDailyAverageUsage(productId);
    const daysUntilStockout = getEstimatedDaysUntilStockout(productId, currentStock);
    const trend = getUsageTrend(productId);

    // 推奨発注数 = 月間使用数 × 1.2（余裕分）
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
}

export const stockHistoryService = {
    getStockHistory,
    getWeeklyUsage,
    getMonthlyUsage,
    getQuarterlyUsage,
    getDailyAverageUsage,
    getEstimatedDaysUntilStockout,
    getUsageTrend,
    getUsageAnalysis,
    addStockHistory,
};

// 履歴を追加
function addStockHistory(entry: Omit<StockHistory, 'id'>): void {
    const newEntry: StockHistory = {
        ...entry,
        id: Math.random().toString(36).substr(2, 9),
    };
    dataSource.getStockHistory().push(newEntry);
}
