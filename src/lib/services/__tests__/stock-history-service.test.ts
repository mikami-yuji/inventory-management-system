import { stockHistoryService } from '../stock-history-service';
import type { StockHistory } from '@/types';

describe('stockHistoryService', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-30T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const createHistory = (date: string, quantity: number, type: 'incoming' | 'outgoing' | 'adjustment' = 'outgoing'): StockHistory => ({
        id: Math.random().toString(),
        productId: 'prod-1',
        date,
        quantity,
        type,
        note: ''
    });

    describe('getWeeklyUsage', () => {
        test('期間内のoutgoingの合計を返す', () => {
            const history: StockHistory[] = [
                createHistory('2024-01-28T10:00:00Z', 10, 'outgoing'),
                createHistory('2024-01-25T10:00:00Z', 20, 'outgoing'),
                createHistory('2024-01-20T10:00:00Z', 30, 'outgoing'), 
                createHistory('2024-01-26T10:00:00Z', 50, 'incoming'),
            ];
            expect(stockHistoryService.getWeeklyUsage(history)).toBe(30);
        });

        test('履歴が2件未満の場合は0を返す', () => {
            const history: StockHistory[] = [
                createHistory('2024-01-28T10:00:00Z', 10, 'outgoing')
            ];
            expect(stockHistoryService.getWeeklyUsage(history)).toBe(0);
        });
    });

    describe('getMonthlyUsage', () => {
        test('過去30日間のoutgoingの合計を返す', () => {
            const history: StockHistory[] = [
                createHistory('2024-01-28T10:00:00Z', 10, 'outgoing'),
                createHistory('2024-01-15T10:00:00Z', 20, 'outgoing'),
                createHistory('2023-12-25T10:00:00Z', 30, 'outgoing'),
                createHistory('2024-01-14T10:00:00Z', 50, 'incoming'),
            ];
            expect(stockHistoryService.getMonthlyUsage(history)).toBe(30);
        });
    });

    describe('getQuarterlyUsage', () => {
        test('過去90日間のoutgoingの合計を返す', () => {
            const history: StockHistory[] = [
                createHistory('2024-01-28T10:00:00Z', 10, 'outgoing'),
                createHistory('2023-12-15T10:00:00Z', 20, 'outgoing'),
                createHistory('2023-10-25T10:00:00Z', 30, 'outgoing'),
            ];
            expect(stockHistoryService.getQuarterlyUsage(history)).toBe(30);
        });
    });

    describe('getDailyAverageUsage', () => {
        test('月間使用数を30で割った値を返す（小数第1位まで）', () => {
            const history: StockHistory[] = [
                createHistory('2024-01-28T10:00:00Z', 40, 'outgoing'),
                createHistory('2024-01-15T10:00:00Z', 5, 'outgoing'),
            ];
            expect(stockHistoryService.getDailyAverageUsage(history)).toBe(1.5);
        });
    });

    describe('getEstimatedDaysUntilStockout', () => {
        test('1日あたりの平均使用数と現在庫から推定在庫切れ日数を計算する', () => {
            expect(stockHistoryService.getEstimatedDaysUntilStockout(2, 10)).toBe(5);
            expect(stockHistoryService.getEstimatedDaysUntilStockout(1.5, 10)).toBe(6);
        });

        test('平均使用数が0の場合はnullを返す', () => {
            expect(stockHistoryService.getEstimatedDaysUntilStockout(0, 10)).toBeNull();
        });
    });

    describe('getUsageTrend', () => {
        test('使用数が10%以上増加している場合はincreasingを返す', () => {
            const history: StockHistory[] = [
                createHistory('2024-01-28T10:00:00Z', 60, 'outgoing'),
                createHistory('2024-01-26T10:00:00Z', 60, 'outgoing'), 
                createHistory('2024-01-20T10:00:00Z', 50, 'outgoing'),
                createHistory('2024-01-18T10:00:00Z', 50, 'outgoing'), 
            ];
            expect(stockHistoryService.getUsageTrend(history)).toBe('increasing');
        });

        test('使用数が10%以上減少している場合はdecreasingを返す', () => {
            const history: StockHistory[] = [
                createHistory('2024-01-28T10:00:00Z', 40, 'outgoing'),
                createHistory('2024-01-26T10:00:00Z', 40, 'outgoing'),
                createHistory('2024-01-20T10:00:00Z', 50, 'outgoing'),
                createHistory('2024-01-18T10:00:00Z', 50, 'outgoing'),
            ];
            expect(stockHistoryService.getUsageTrend(history)).toBe('decreasing');
        });

        test('変動が10%以内の場合はstableを返す', () => {
            const history: StockHistory[] = [
                createHistory('2024-01-28T10:00:00Z', 50, 'outgoing'),
                createHistory('2024-01-26T10:00:00Z', 50, 'outgoing'),
                createHistory('2024-01-20T10:00:00Z', 50, 'outgoing'),
                createHistory('2024-01-18T10:00:00Z', 50, 'outgoing'),
            ];
            expect(stockHistoryService.getUsageTrend(history)).toBe('stable');
        });
    });

    describe('getUsageAnalysis', () => {
        test('全ての分析結果を含むオブジェクトを返す', () => {
            const history: StockHistory[] = [
                createHistory('2024-01-28T10:00:00Z', 15, 'outgoing'),
                createHistory('2024-01-26T10:00:00Z', 15, 'outgoing'),
                createHistory('2024-01-20T10:00:00Z', 15, 'outgoing'),
                createHistory('2024-01-18T10:00:00Z', 15, 'outgoing'),
                createHistory('2024-01-10T10:00:00Z', 30, 'outgoing'),
            ];
            const currentStock = 100;
            const analysis = stockHistoryService.getUsageAnalysis(history, currentStock);

            expect(analysis).toEqual({
                weekly: 30,
                monthly: 90,
                quarterly: 90,
                dailyAverage: 3,
                daysUntilStockout: 33,
                trend: 'stable',
                suggestedOrderQuantity: 108
            });
        });

        test('メーカー在庫を合算した実質在庫で在庫切れ日数が正しく伸びること', () => {
            const history: StockHistory[] = [
                createHistory('2024-01-28T10:00:00Z', 15, 'outgoing'),
                createHistory('2024-01-26T10:00:00Z', 15, 'outgoing'),
                createHistory('2024-01-20T10:00:00Z', 15, 'outgoing'),
                createHistory('2024-01-18T10:00:00Z', 15, 'outgoing'),
                createHistory('2024-01-10T10:00:00Z', 30, 'outgoing'),
            ];
            const physicalStock = 100;
            const supplierStock = 200; // メーカー在庫200
            const totalStock = physicalStock + supplierStock; // 300
            const analysis = stockHistoryService.getUsageAnalysis(history, totalStock);

            // dailyAverage = 3, totalStock = 300 -> daysUntilStockout = 100日
            expect(analysis.daysUntilStockout).toBe(100);
        });
    });
});
