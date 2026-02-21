"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import type { StockHistory, ApiResponse } from '@/types';

/**
 * 在庫履歴データを取得するフック
 */
export function useStockHistory(options?: {
    productId?: string;
    days?: number;
    limit?: number;
}): {
    history: StockHistory[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
} {
    const [history, setHistory] = useState<StockHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadedRef = useRef(false);

    const fetchHistory = useCallback(async (): Promise<void> => {
        if (!loadedRef.current) setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (options?.productId) {
                params.append('productId', options.productId);
            }
            if (options?.days) {
                params.append('days', options.days.toString());
            }
            if (options?.limit) {
                params.append('limit', options.limit.toString());
            }

            const url = `/api/stock-history${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<StockHistory[]> = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            setHistory(result.data || []);
            loadedRef.current = true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '在庫履歴の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [options?.productId, options?.days, options?.limit]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return { history, loading, error, refetch: fetchHistory };
}
