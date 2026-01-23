"use client";

import { useState, useEffect, useCallback } from 'react';

// 仕掛中アイテムの型
export type WorkInProgress = {
    id: string;
    productId: string;
    productName?: string;
    productSku?: string;
    quantity: number;
    startedAt: string;
    expectedCompletion: string | null;
    completedAt: string | null;
    note: string | null;
    status: 'in_progress' | 'completed' | 'cancelled';
    createdAt: string;
};

// 仕掛中登録用の入力型
export type WIPInput = {
    productId: string;
    quantity: number;
    startedAt: string;
    expectedCompletion?: string;
    note?: string;
};

/**
 * 仕掛中一覧を取得するフック
 */
export function useWorkInProgress(options?: { status?: string; productId?: string }): {
    items: WorkInProgress[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
} {
    const [items, setItems] = useState<WorkInProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (options?.status) {
                params.append('status', options.status);
            }
            if (options?.productId) {
                params.append('productId', options.productId);
            }

            const url = `/api/work-in-progress${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            setItems(result.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [options?.status, options?.productId]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    return { items, loading, error, refetch: fetchItems };
}

/**
 * 仕掛中を操作するフック
 */
export function useWIPActions(): {
    createWIP: (input: WIPInput) => Promise<{ success: boolean; error?: string }>;
    completeWIP: (id: string) => Promise<boolean>;
    cancelWIP: (id: string) => Promise<boolean>;
    deleteWIP: (id: string) => Promise<boolean>;
    updateSupplierStock: (productId: string, stock: number) => Promise<boolean>;
    loading: boolean;
} {
    const [loading, setLoading] = useState(false);

    const createWIP = async (input: WIPInput): Promise<{ success: boolean; error?: string }> => {
        setLoading(true);
        try {
            const response = await fetch('/api/work-in-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input)
            });

            const result = await response.json();
            if (result.error) {
                return { success: false, error: result.error };
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : '登録に失敗しました' };
        } finally {
            setLoading(false);
        }
    };

    const completeWIP = async (id: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/work-in-progress', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'complete' })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const cancelWIP = async (id: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/work-in-progress', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'cancel' })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteWIP = async (id: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch(`/api/work-in-progress?id=${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateSupplierStock = async (productId: string, stock: number): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/supplier-stock', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, supplierStock: stock })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { createWIP, completeWIP, cancelWIP, deleteWIP, updateSupplierStock, loading };
}

/**
 * 商品ごとの仕掛中合計を計算するユーティリティ
 */
export function calculateWIPByProduct(items: WorkInProgress[]): Map<string, number> {
    const map = new Map<string, number>();

    items
        .filter(item => item.status === 'in_progress')
        .forEach(item => {
            const current = map.get(item.productId) || 0;
            map.set(item.productId, current + item.quantity);
        });

    return map;
}
