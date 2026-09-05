import { renderHook, waitFor } from '@testing-library/react';
import { useWorkInProgress, calculateWIPByProduct } from '../use-work-in-progress';
import type { WorkInProgress } from '@/types';

// fetchのグローバルモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('use-work-in-progress', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateWIPByProduct', () => {
        it('in_progressステータスのアイテムのみを商品IDごとにグループ化し、予定日順にソートすること', () => {
            const items: WorkInProgress[] = [
                {
                    id: 'wip-1',
                    productId: 'prod-A',
                    quantity: 100,
                    status: 'in_progress',
                    expectedCompletion: '2026-09-15',
                } as WorkInProgress,
                {
                    id: 'wip-2',
                    productId: 'prod-A',
                    quantity: 200,
                    status: 'in_progress',
                    expectedCompletion: '2026-09-10', // より早い日付
                } as WorkInProgress,
                {
                    id: 'wip-3',
                    productId: 'prod-A',
                    quantity: 300,
                    status: 'completed', // 完了済みなため除外されるべき
                } as WorkInProgress,
                {
                    id: 'wip-4',
                    productId: 'prod-B',
                    quantity: 50,
                    status: 'in_progress',
                    expectedCompletion: null, // 日付未定
                } as WorkInProgress,
            ];

            const result = calculateWIPByProduct(items);

            expect(result.size).toBe(2);
            expect(result.has('prod-A')).toBe(true);
            expect(result.has('prod-B')).toBe(true);

            const prodAList = result.get('prod-A')!;
            expect(prodAList.length).toBe(2);
            expect(prodAList[0].id).toBe('wip-2'); // 9/10が先頭
            expect(prodAList[1].id).toBe('wip-1'); // 9/15が2番目

            const prodBList = result.get('prod-B')!;
            expect(prodBList.length).toBe(1);
            expect(prodBList[0].id).toBe('wip-4');
        });

        it('空配列が渡された場合は空のMapを返すこと', () => {
            const result = calculateWIPByProduct([]);
            expect(result.size).toBe(0);
        });
    });

    describe('useWorkInProgress フック', () => {
        it('仕掛中アイテムを正常に取得できること', async () => {
            const mockData = [
                { id: 'w1', productId: 'p1', quantity: 100, status: 'in_progress' },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockData }),
            });

            const { result } = renderHook(() => useWorkInProgress('in_progress'));

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.items).toEqual(mockData);
            expect(result.current.error).toBeNull();
        });

        it('HTTPエラー時にエラーメッセージをセットすること', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            const { result } = renderHook(() => useWorkInProgress());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBe('HTTPエラー! ステータス: 500');
            expect(result.current.items).toEqual([]);
        });
    });
});
