
import type { StockHistory } from "@/types";

// 在庫履歴サービス (Pure Functions)
// 履歴データを受け取って分析結果を返す

// 期間内の使用数を計算
function calculateUsage(history: StockHistory[], days: number): number {
    if (history.length < 2) return 0;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 期間内の履歴をフィルタ
    const periodHistory = history.filter(h => new Date(h.date) >= startDate);
    if (periodHistory.length < 2) return 0;

    // ソート (昇順: 古い順)
    const sorted = periodHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 使用数の計算ロジック
    // 入庫(incoming)はプラス、出庫(outgoing)はマイナス
    // 単純に「出庫数の合計」を使用数とするのが最も正確か？
    // 前回のロジック: (最初 - 最後 + 入荷)
    // 今回は「出庫(outgoing)の合計」を使用数として定義する
    // ただし、adjustmentで減った分も考慮すべきか？
    // adjustmentは「実地棚卸」なので、減った分は不明損耗＝使用とみなす
    // しかしadjustmentは絶対値で記録されるため、差分がわからないと計算できない
    // APIの仕様上、adjustmentの際は changeAmount を計算していない場合がある
    // よって、今回は「outgoingの合計」を使用数とする

    // 修正: outgoing および order (発注出庫) の total
    let totalOutgoing = 0;
    for (const record of sorted) {
        if (record.type === 'outgoing' || record.type === 'order') {
            totalOutgoing += record.quantity;
        }
    }

    return totalOutgoing;
}

// 週間使用数
function getWeeklyUsage(history: StockHistory[]): number {
    return calculateUsage(history, 7);
}

// 月間使用数
function getMonthlyUsage(history: StockHistory[]): number {
    return calculateUsage(history, 30);
}

// 3ヶ月使用数
function getQuarterlyUsage(history: StockHistory[]): number {
    return calculateUsage(history, 90);
}

// 1日あたり平均使用数
function getDailyAverageUsage(history: StockHistory[]): number {
    const monthlyUsage = getMonthlyUsage(history);
    return Math.round(monthlyUsage / 30 * 10) / 10;
}

// 推定在庫切れ日数
function getEstimatedDaysUntilStockout(dailyAvg: number, currentStock: number): number | null {
    if (dailyAvg === 0) return null;
    return Math.floor(currentStock / dailyAvg);
}

// 使用傾向（増加/減少/安定）
function getUsageTrend(history: StockHistory[]): 'increasing' | 'decreasing' | 'stable' {
    const lastWeekUsage = calculateUsage(history, 7);

    // 2週間前の使用数 (14日前〜7日前)
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const prevWeekHistory = history.filter(h => {
        const d = new Date(h.date);
        return d >= twoWeeksAgo && d < oneWeekAgo;
    });

    let prevWeekUsage = 0;
    for (const record of prevWeekHistory) {
        if (record.type === 'outgoing' || record.type === 'order') {
            prevWeekUsage += record.quantity;
        }
    }

    const diff = lastWeekUsage - prevWeekUsage;

    // 10%以上の変動
    if (diff > (lastWeekUsage + prevWeekUsage) / 2 * 0.1) return 'increasing';
    if (diff < -(lastWeekUsage + prevWeekUsage) / 2 * 0.1) return 'decreasing';
    return 'stable';
}

// 商品の使用分析サマリーを取得
function getUsageAnalysis(history: StockHistory[], currentStock: number): {
    weekly: number;
    monthly: number;
    quarterly: number;
    dailyAverage: number;
    daysUntilStockout: number | null;
    trend: 'increasing' | 'decreasing' | 'stable';
    suggestedOrderQuantity: number;
} {
    const weekly = getWeeklyUsage(history);
    const monthly = getMonthlyUsage(history);
    const quarterly = getQuarterlyUsage(history);
    const dailyAverage = getDailyAverageUsage(history);
    const daysUntilStockout = getEstimatedDaysUntilStockout(dailyAverage, currentStock);
    const trend = getUsageTrend(history);

    // 推奨発注数 = 月間使用数 × 1.2（余裕分） - 現在庫
    // 単純に月間使用数 × 1.2 とする（発注点方式）
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
    getWeeklyUsage,
    getMonthlyUsage,
    getQuarterlyUsage,
    getDailyAverageUsage,
    getEstimatedDaysUntilStockout,
    getUsageTrend,
    getUsageAnalysis,
};
