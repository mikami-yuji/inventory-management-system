import { useState, useCallback, useEffect } from 'react';
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

    const fetchLots = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFetch<ApiResponse<SupplierStockLot[]> | SupplierStockLot[]>('/api/supplier-stock');
            
            const safeData = Array.isArray(result)
                ? result
                : (result.data && Array.isArray(result.data) ? result.data : []);
            setLots(safeData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            console.error('Supplier stock lots fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLots();
    }, [fetchLots]);

    // Calculate map: productId -> lots
    const lotsMap = new Map<string, SupplierStockLot[]>();
    lots.forEach(lot => {
        const current = lotsMap.get(lot.productId) || [];
        lotsMap.set(lot.productId, [...current, lot]);
    });

    return {
        lots,
        lotsMap,
        loading,
        error,
        refetch: fetchLots
    };
}
