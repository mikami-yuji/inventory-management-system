"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Product, Inventory, ApiResponse } from '@/types';
import { useAppSettings } from './use-masters';
import { apiFetch } from '@/lib/api-client';

// 商品情報付き在庫データの型
export type InventoryWithProduct = {
    productId: string;
    quantity: number;
    updatedAt: string;
    product: Product;
};

/**
 * 在庫データを取得するフック
 */
export function useInventory(options?: {
    category?: string;
    search?: string;
    lowStock?: boolean;
}): {
    inventory: InventoryWithProduct[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
} {
    const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadedRef = useRef(false);
    const { settings } = useAppSettings();

    const fetchInventory = useCallback(async (): Promise<void> => {
        if (!loadedRef.current) setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (options?.category && options.category !== 'all') {
                params.append('category', options.category);
            }
            if (options?.search) {
                params.append('search', options.search);
            }
            if (options?.lowStock) {
                params.append('lowStock', 'true');
            }

            const url = `/api/inventory${params.toString() ? `?${params.toString()}` : ''}`;
            const result = await apiFetch<ApiResponse<InventoryWithProduct[]> | InventoryWithProduct[]>(url);

            const dataArray = Array.isArray(result) 
                ? result 
                : (result.data && Array.isArray(result.data) ? result.data : []);

            type RawInventoryItem = {
                product_id?: string;
                productId?: string;
                quantity: number;
                updated_at?: string;
                updatedAt?: string;
                product: Product;
            };

            // APIレスポンスのスネークケースをキャメルケースに変換
            const mappedData = dataArray
                .filter((item: unknown) => (item as RawInventoryItem).product !== undefined)
                .map((item: unknown) => {
                    const i = item as RawInventoryItem;
                    return {
                        productId: i.product_id || i.productId || '',
                        quantity: i.quantity,
                        updatedAt: i.updated_at || i.updatedAt || '',
                        product: i.product
                    };
                });
            setInventory(mappedData);
            loadedRef.current = true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [options?.category, options?.search, options?.lowStock]);

    useEffect(() => {
        if (settings) {
            fetchInventory();
        }
    }, [fetchInventory, settings]);

    return { inventory, loading, error, refetch: fetchInventory };
}

/**
 * ダッシュボード用統計データを取得するフック
 */
export function useDashboardStats(): {
    stats: {
        totalProducts: number;
        lowStockCount: number;
        outOfStockCount: number;
        totalInventoryValue: number;
    } | null;
    loading: boolean;
    error: string | null;
} {
    const [stats, setStats] = useState<{
        totalProducts: number;
        lowStockCount: number;
        outOfStockCount: number;
        totalInventoryValue: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { settings } = useAppSettings();

    useEffect(() => {
        const fetchStats = async (): Promise<void> => {
            if (!settings) return; // Wait for settings to load

            setLoading(true);
            try {
                // 商品と在庫を取得して統計を計算
                const [productsRes, inventoryRes] = await Promise.all([
                    fetch('/api/products'),
                    fetch('/api/inventory'),
                ]);

                if (!productsRes.ok || !inventoryRes.ok) {
                    throw new Error('データの取得に失敗しました');
                }

                const products: Product[] = await productsRes.json();
                const inventoryResult: ApiResponse<InventoryWithProduct[]> = await inventoryRes.json();
                const inventory = inventoryResult.data || [];

                // 統計を計算
                const totalProducts = products.length;
                const defaultThreshold = Number(settings?.default_min_stock_alert) || 100;

                const lowStockCount = inventory.filter(i =>
                    i.quantity > 0 && i.quantity < (i.product?.minStockAlert || defaultThreshold)
                ).length;
                const outOfStockCount = inventory.filter(i => i.quantity === 0).length;
                const totalInventoryValue = inventory.reduce((sum, i) =>
                    sum + (i.quantity * (i.product?.unitPrice || 0)), 0
                );

                setStats({ totalProducts, lowStockCount, outOfStockCount, totalInventoryValue });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'エラーが発生しました');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [settings]);

    return { stats, loading, error };
}

/**
 * 在庫を更新するフック
 */
export function useUpdateInventory(): {
    updateStock: (productId: string, quantity: number, type: string, note?: string) => Promise<boolean>;
    loading: boolean;
    error: string | null;
} {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateStock = useCallback(async (
        productId: string,
        quantity: number,
        type: string,
        note?: string
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/inventory', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity, type, note }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<Inventory> = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '更新に失敗しました');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { updateStock, loading, error };
}
