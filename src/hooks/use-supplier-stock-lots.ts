import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { SupplierStockLot } from '@/types';
import { apiFetch, type ApiResponse } from '@/lib/api-client';

export type SupplierStockHook = {
    lots: SupplierStockLot[];
    lotsMap: Map<string, SupplierStockLot[]>;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

export function useSupplierStockLots(): SupplierStockHook {
    const [lots, setLots] = useState<SupplierStockLot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadedRef = useRef(false);

    const fetchLots = useCallback(async (): Promise<void> => {
        // 初回のみローディング表示、2回目以降はバックグラウンドで更新
        if (!loadedRef.current) setLoading(true);
        setError(null);
        try {
            const result = await apiFetch<ApiResponse<SupplierStockLot[]> | SupplierStockLot[]>('/api/supplier-stock');
            
            const safeData = Array.isArray(result)
                ? result
                : (result.data && Array.isArray(result.data) ? result.data : []);
            setLots(safeData);
            loadedRef.current = true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLots();
    }, [fetchLots]);

    // useMemoでlotsMapをメモ化し、lotsが変わらない限り再計算しない
    const lotsMap = useMemo(() => {
        const map = new Map<string, SupplierStockLot[]>();
        lots.forEach(lot => {
            const current = map.get(lot.productId) || [];
            map.set(lot.productId, [...current, lot]);
        });
        return map;
    }, [lots]);

    return {
        lots,
        lotsMap,
        loading,
        error,
        refetch: fetchLots
    };
}
