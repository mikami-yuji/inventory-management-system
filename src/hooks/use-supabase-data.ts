"use client";

/**
 * Supabase API データ取得フック
 * クライアントコンポーネントからSupabase APIを呼び出すためのカスタムフック
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Product, Inventory, StockHistory } from '@/types';

// 商品情報付き在庫データの型
export type InventoryWithProduct = {
    productId: string;
    quantity: number;
    updatedAt: string;
    product: Product;
};

// APIレスポンス型
type ApiResponse<T> = {
    data: T | null;
    error: string | null;
};

/**
 * 商品データを取得するフック
 */
export function useProducts(): {
    products: Product[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
} {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadedRef = useRef(false);

    const fetchProducts = useCallback(async (): Promise<void> => {
        if (!loadedRef.current) setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProducts(data);
            loadedRef.current = true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return { products, loading, error, refetch: fetchProducts };
}

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
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<InventoryWithProduct[]> = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            // APIレスポンスのスネークケースをキャメルケースに変換
            const mappedData = (result.data || [])
                .filter((item: { product_id?: string; productId?: string; quantity: number; product?: Product }) => item.product !== undefined)
                .map((item: { product_id?: string; productId?: string; quantity: number; updated_at?: string; updatedAt?: string; product: Product }) => ({
                    productId: item.product_id || item.productId || '',
                    quantity: item.quantity,
                    updatedAt: item.updated_at || item.updatedAt || '',
                    product: item.product
                }));
            setInventory(mappedData);
            loadedRef.current = true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [options?.category, options?.search, options?.lowStock]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    return { inventory, loading, error, refetch: fetchInventory };
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

    useEffect(() => {
        const fetchStats = async (): Promise<void> => {
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
                const lowStockCount = inventory.filter(i =>
                    i.quantity > 0 && i.quantity < (i.product?.minStockAlert || 100)
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
    }, []);

    return { stats, loading, error };
}

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
