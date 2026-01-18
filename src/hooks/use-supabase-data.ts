/**
 * Supabase API データ取得フック
 * クライアントコンポーネントからSupabase APIを呼び出すためのカスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type { Product, Inventory } from '@/types';

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

    const fetchProducts = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProducts(data);
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

    const fetchInventory = useCallback(async (): Promise<void> => {
        setLoading(true);
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

            setInventory(result.data || []);
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
