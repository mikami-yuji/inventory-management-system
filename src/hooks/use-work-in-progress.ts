"use client";

import { useState, useEffect, useCallback } from 'react';

import type { WorkInProgress, WIPInput } from '@/types';

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
    transferToIncoming: (id: string, expectedDate: string, quantity: number) => Promise<boolean>;
    transferToSupplier: (id: string, quantity: number) => Promise<boolean>;
    cancelWIP: (id: string) => Promise<boolean>;
    deleteWIP: (id: string) => Promise<boolean>;
    updateSupplierStock: (productId: string, stock: number) => Promise<boolean>;
    moveSupplierStockToIncoming: (productId: string, quantity: number, expectedDate: string, note?: string) => Promise<boolean>;

    updateWIP: (id: string, updateData: Partial<WIPInput>) => Promise<boolean>;
    arrangeShipping: (id: string) => Promise<boolean>;

    // 新規ロット管理メソッド
    getSupplierStockLots: (productId: string) => Promise<import('@/types').SupplierStockLot[]>;
    addSupplierStockLot: (productId: string, quantity: number, stockDate: string, note?: string) => Promise<boolean>;
    updateSupplierStockLot: (lotId: string, quantity: number, stockDate: string, note?: string) => Promise<boolean>;
    deleteSupplierStockLot: (lotId: string) => Promise<boolean>;
    syncSupplierStock: () => Promise<boolean>;

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

    const transferToIncoming = async (id: string, expectedDate: string, quantity: number): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/work-in-progress', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'to_incoming', expectedDate, quantity })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const transferToSupplier = async (id: string, quantity: number): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/work-in-progress', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'to_supplier', quantity })
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

    const updateWIP = async (id: string, updateData: Partial<WIPInput>): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/work-in-progress', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'update', data: updateData })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const arrangeShipping = async (id: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/work-in-progress', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'arrange_shipping' })
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
                body: JSON.stringify({ productId, supplierStock: stock, action: 'update' })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const moveSupplierStockToIncoming = async (productId: string, quantity: number, expectedDate: string, note?: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/supplier-stock', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    action: 'move_to_incoming',
                    movementQuantity: quantity,
                    expectedDate,
                    note
                })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ---------- ロット管理メソッド ----------
    const getSupplierStockLots = async (productId: string): Promise<import('@/types').SupplierStockLot[]> => {
        try {
            const response = await fetch(`/api/supplier-stock?productId=${productId}`);
            const result = await response.json();
            return !result.error && result.data ? result.data : [];
        } catch {
            return [];
        }
    };

    const addSupplierStockLot = async (productId: string, quantity: number, stockDate: string, note?: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/supplier-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity, stockDate, note })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateSupplierStockLot = async (lotId: string, quantity: number, stockDate: string, note?: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/supplier-stock', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_lot', lotId, quantity, stockDate, note })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteSupplierStockLot = async (lotId: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch(`/api/supplier-stock?lotId=${lotId}`, {
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

    const syncSupplierStock = async (): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/supplier-stock', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync_all' })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        createWIP,
        transferToIncoming,
        transferToSupplier,
        cancelWIP,
        updateWIP,
        arrangeShipping,
        deleteWIP,
        updateSupplierStock,
        moveSupplierStockToIncoming,
        getSupplierStockLots,
        addSupplierStockLot,
        updateSupplierStockLot,
        deleteSupplierStockLot,
        syncSupplierStock,
        loading
    };
}

/**
 * 商品ごとの仕掛中アイテムをグループ化するユーティリティ
 */
export function calculateWIPByProduct(items: WorkInProgress[]): Map<string, WorkInProgress[]> {
    const map = new Map<string, WorkInProgress[]>();

    items
        .filter(item => item.status === 'in_progress')
        .forEach(item => {
            const current = map.get(item.productId) || [];
            current.push(item);
            map.set(item.productId, current);
        });

    // 完了予定日順にソート (nullは後ろ)
    map.forEach(list => {
        list.sort((a, b) => {
            if (!a.expectedCompletion) return 1;
            if (!b.expectedCompletion) return -1;
            return new Date(a.expectedCompletion).getTime() - new Date(b.expectedCompletion).getTime();
        });
    });

    return map;
}
