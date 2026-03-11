import { useState, useCallback, useEffect } from 'react';
import type { SupplierStockLot } from '@/types';

export function useSupplierStockLots() {
    const [lots, setLots] = useState<SupplierStockLot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLots = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/supplier-stock');
            if (!response.ok) {
                throw new Error('Failed to fetch supplier stock lots');
            }
            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            const rawData = result.data || result;
            const safeData = Array.isArray(rawData) ? rawData : (Array.isArray((rawData as any).data) ? (rawData as any).data : []);
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
