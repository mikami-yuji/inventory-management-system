
import useSWR from 'swr';
import { StockHistory, ApiResponse } from '@/types';
import { stockHistoryService } from '@/lib/services/stock-history-service';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '履歴の取得に失敗しました');
    }
    const json: ApiResponse<StockHistory[]> = await res.json();
    return json.data || [];
};

export function useStockHistory(productId: string) {
    const { data: history, error, isLoading, mutate } = useSWR<StockHistory[]>(
        productId ? `/api/inventory/history?productId=${productId}` : null,
        fetcher
    );

    return {
        history: history || [],
        loading: isLoading,
        error: error,
        refetch: mutate,
    };
}

export function useStockAnalysis(productId: string, currentStock: number) {
    const { history, loading, error } = useStockHistory(productId);

    const analysis = history && history.length > 0
        ? stockHistoryService.getUsageAnalysis(history, currentStock)
        : null;

    return {
        history,
        analysis,
        loading,
        error
    };
}
