"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

import type { WorkInProgress, WIPInput } from '@/types';

/**
 * 仕掛中一覧を取得するフック
 */
export function useWorkInProgress(status?: string, productId?: string): {
    items: WorkInProgress[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
} {
    const [items, setItems] = useState<WorkInProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadedRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchItems = useCallback(async (): Promise<void> => {
        // 以前のリクエストがあればキャンセル
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // 初回のみローディング表示、2回目以降はバックグラウンドで更新
        if (!loadedRef.current) setLoading(true);
        setError(null);

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒でタイムアウト

        try {
            const params = new URLSearchParams();
            if (status && status !== 'all') {
                params.append('status', status);
            }
            if (productId) {
                params.append('productId', productId);
            }

            const url = `/api/work-in-progress${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await fetch(url, { signal: controller.signal });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('セッションが切れました。再ログインしてください。');
                }
                throw new Error(`HTTPエラー! ステータス: ${response.status}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            const rawData = result.data || result;
            const safeData = Array.isArray(rawData) ? rawData : (Array.isArray(rawData.data) ? rawData.data : []);
            setItems(safeData);
            loadedRef.current = true;
            setError(null);
        } catch (err) {
            // 自発的なキャンセル（AbortError）の場合はエラーとしてセットしない
            if (err instanceof Error && err.name === 'AbortError') {
                console.log('WIP取得リクエストがキャンセルされました');
                // 前のリクエストがキャンセルされただけなので、ローディング状態は新しいリクエストに引き継がれる
                return;
            }

            console.error('WIP取得エラー:', err);
            setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
        } finally {
            clearTimeout(timeoutId);
            if (abortControllerRef.current === controller) {
                setLoading(false);
                abortControllerRef.current = null;
            }
        }
    }, [status, productId]);

    useEffect(() => {
        fetchItems();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchItems]);

    return { items, loading, error, refetch: fetchItems };
}

/**
 * 仕掛中を操作するフック
 */
export function useWIPActions(): {
    createWIP: (input: WIPInput) => Promise<{ success: boolean; error?: string }>;
    transferToIncoming: (id: string, schedules: { expectedDate: string, quantity: number, note?: string }[]) => Promise<boolean>;
    transferToSupplier: (id: string, quantity: number) => Promise<boolean>;
    cancelWIP: (id: string) => Promise<boolean>;
    deleteWIP: (id: string) => Promise<boolean>;
    updateSupplierStock: (productId: string, stock: number) => Promise<boolean>;
    moveSupplierStockToIncoming: (productId: string, schedules: { expectedDate: string, quantity: number, note?: string }[]) => Promise<boolean>;

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

    const createWIP = useCallback(async (input: WIPInput): Promise<{ success: boolean; error?: string }> => {
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
    }, [setLoading]);

    const transferToIncoming = useCallback(async (id: string, schedules: { expectedDate: string, quantity: number, note?: string }[]): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/work-in-progress', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'to_incoming', schedules })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    }, [setLoading]);

    const transferToSupplier = useCallback(async (id: string, quantity: number): Promise<boolean> => {
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
    }, [setLoading]);

    const cancelWIP = useCallback(async (id: string): Promise<boolean> => {
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
    }, [setLoading]);

    const updateWIP = useCallback(async (id: string, updateData: Partial<WIPInput>): Promise<boolean> => {
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
    }, [setLoading]);

    const arrangeShipping = useCallback(async (id: string): Promise<boolean> => {
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
    }, [setLoading]);

    const deleteWIP = useCallback(async (id: string): Promise<boolean> => {
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
    }, [setLoading]);

    const updateSupplierStock = useCallback(async (productId: string, stock: number): Promise<boolean> => {
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
    }, [setLoading]);

    const moveSupplierStockToIncoming = useCallback(async (productId: string, schedules: { expectedDate: string, quantity: number, note?: string }[]): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await fetch('/api/supplier-stock', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    action: 'move_to_incoming',
                    schedules
                })
            });
            const result = await response.json();
            return !result.error;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // ---------- ロット管理メソッド ----------
    const getSupplierStockLots = useCallback(async (productId: string): Promise<import('@/types').SupplierStockLot[]> => {
        try {
            const response = await fetch(`/api/supplier-stock?productId=${productId}`);
            const result = await response.json();
            return !result.error && result.data ? result.data : [];
        } catch {
            return [];
        }
    }, []);

    const addSupplierStockLot = useCallback(async (productId: string, quantity: number, stockDate: string, note?: string): Promise<boolean> => {
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
    }, []);

    const updateSupplierStockLot = useCallback(async (lotId: string, quantity: number, stockDate: string, note?: string): Promise<boolean> => {
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
    }, [setLoading]);

    const deleteSupplierStockLot = useCallback(async (lotId: string): Promise<boolean> => {
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
    }, [setLoading]);

    const syncSupplierStock = useCallback(async (): Promise<boolean> => {
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
    }, []);


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
