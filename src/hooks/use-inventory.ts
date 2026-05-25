"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Product, Inventory, ApiResponse, ProductCategory, ProductStatus } from '@/types';
import { useAppSettings } from './use-masters';
import { apiFetch } from '@/lib/api-client';

// 商品情報付き在庫データの型
export type InventoryWithProduct = {
    productId: string;
    quantity: number;
    oldPriceQuantity: number;
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
                old_price_quantity?: number;
                oldPriceQuantity?: number;
                updated_at?: string;
                updatedAt?: string;
                product: Product;
            };

            // APIレスポンスのスネークケースをキャメルケースに変換
            const mappedData = dataArray
                .filter((item: unknown) => (item as RawInventoryItem).product !== undefined)
                .map((item: unknown) => {
                    const i = item as RawInventoryItem;
                    const rawProd = i.product as unknown as Record<string, unknown>;

                    const product: Product = {
                        id: String(rawProd.id || ''),
                        name: String(rawProd.name || ''),
                        sku: String(rawProd.sku || ''),
                        productCode: rawProd.product_code ? String(rawProd.product_code) : undefined,
                        janCode: rawProd.jan_code ? String(rawProd.jan_code) : undefined,
                        weight: rawProd.weight !== undefined && rawProd.weight !== null ? Number(rawProd.weight) : undefined,
                        shape: rawProd.shape ? String(rawProd.shape) : undefined,
                        material: rawProd.material ? String(rawProd.material) : undefined,
                        unitPrice: Number(rawProd.unit_price) || 0,
                        printingCost: Number(rawProd.printing_cost) || 0,
                        category: rawProd.category as ProductCategory,
                        imageUrl: rawProd.image_url ? String(rawProd.image_url) : undefined,
                        description: rawProd.description ? String(rawProd.description) : undefined,
                        status: rawProd.status as ProductStatus,
                        minStockAlert: rawProd.min_stock_alert !== undefined && rawProd.min_stock_alert !== null ? Number(rawProd.min_stock_alert) : undefined,
                        supplierStock: rawProd.supplier_stock !== undefined && rawProd.supplier_stock !== null ? Number(rawProd.supplier_stock) : undefined,
                        oldUnitPrice: rawProd.old_unit_price !== undefined && rawProd.old_unit_price !== null ? Number(rawProd.old_unit_price) : undefined,
                        oldPrintingCost: rawProd.old_printing_cost !== undefined && rawProd.old_printing_cost !== null ? Number(rawProd.old_printing_cost) : undefined,
                        priceIncreaseEffectiveDate: rawProd.price_increase_effective_date ? String(rawProd.price_increase_effective_date) : undefined,
                        metersPerRoll: rawProd.meters_per_roll !== undefined && rawProd.meters_per_roll !== null ? Number(rawProd.meters_per_roll) : undefined,
                    };

                    return {
                        productId: i.product_id || i.productId || '',
                        quantity: i.quantity,
                        oldPriceQuantity: i.old_price_quantity ?? i.oldPriceQuantity ?? 0,
                        updatedAt: i.updated_at || i.updatedAt || '',
                        product
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

    // settingsを待たずに即座にfetchを開始（settingsはUI側の計算でのみ使用）
    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

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
