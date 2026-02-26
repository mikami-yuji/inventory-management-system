"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { IncomingStock } from '@/types';

/**
 * 入荷予定データを取得・操作するフック
 */
export function useIncomingStock(productId?: string): {
    incomingStocks: IncomingStock[];
    loading: boolean;
    error: string | null;
    addIncomingStock: (incomingStock: Omit<IncomingStock, 'id'>) => Promise<boolean>;
    updateIncomingStock: (id: string, incomingStock: Partial<IncomingStock>) => Promise<boolean>;
    deleteIncomingStock: (id: string) => Promise<boolean>;
    receiveIncomingStock: (id: string) => Promise<boolean>;
    refetch: () => void;
} {
    const [incomingStocks, setIncomingStocks] = useState<IncomingStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadedRef = useRef(false);

    const fetchIncomingStock = useCallback(async (): Promise<void> => {
        if (!loadedRef.current) setLoading(true);
        setError(null);

        try {
            const url = productId
                ? `/api/incoming-stock?productId=${productId}`
                : '/api/incoming-stock';

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setIncomingStocks(data);
            loadedRef.current = true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '入荷予定の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchIncomingStock();
    }, [fetchIncomingStock]);

    // 入荷予定を追加
    const addIncomingStock = async (incomingStock: Omit<IncomingStock, 'id'>): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/incoming-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(incomingStock),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '作成に失敗しました');
            }

            await fetchIncomingStock();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '作成に失敗しました');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 入荷予定を更新
    const updateIncomingStock = async (id: string, incomingStock: Partial<IncomingStock>): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/incoming-stock', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...incomingStock }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '更新に失敗しました');
            }

            await fetchIncomingStock();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '更新に失敗しました');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 入荷予定を削除
    const deleteIncomingStock = async (id: string): Promise<boolean> => {
        if (!confirm('本当に削除しますか？')) return false;

        setLoading(true);
        try {
            const response = await fetch(`/api/incoming-stock?id=${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '削除に失敗しました');
            }

            await fetchIncomingStock();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '削除に失敗しました');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 入荷処理（本在庫へ反映）
    const receiveIncomingStock = async (id: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch(`/api/incoming-stock`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'receive' }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '入荷処理に失敗しました');
            }

            await fetchIncomingStock();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '入荷処理に失敗しました');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        incomingStocks,
        loading,
        error,
        addIncomingStock,
        updateIncomingStock,
        deleteIncomingStock,
        receiveIncomingStock,
        refetch: fetchIncomingStock
    };
}
