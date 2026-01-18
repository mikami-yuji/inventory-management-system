"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Product } from "@/types";

// カートアイテムの型
export type CartItem = {
    product: Product;
    quantity: number;
};

// カートContextの型
type CartContextType = {
    items: CartItem[];
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "inventory-cart";

export function CartProvider({ children }: { children: ReactNode }): React.ReactElement {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);

    // LocalStorageから復元
    useEffect(() => {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
            try {
                setItems(JSON.parse(stored));
            } catch {
                // 無効なデータの場合は無視
            }
        }
        setIsHydrated(true);
    }, []);

    // LocalStorageに保存
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        }
    }, [items, isHydrated]);

    // カートに追加
    const addToCart = useCallback((product: Product, quantity: number = 1): void => {
        setItems((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { product, quantity }];
        });
    }, []);

    // カートから削除
    const removeFromCart = useCallback((productId: string): void => {
        setItems((prev) => prev.filter((item) => item.product.id !== productId));
    }, []);

    // 数量更新
    const updateQuantity = useCallback((productId: string, quantity: number): void => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setItems((prev) =>
            prev.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
            )
        );
    }, [removeFromCart]);

    // カートをクリア
    const clearCart = useCallback((): void => {
        setItems([]);
    }, []);

    // 合計アイテム数
    const getTotalItems = useCallback((): number => {
        return items.reduce((sum, item) => sum + item.quantity, 0);
    }, [items]);

    // 合計金額
    const getTotalPrice = useCallback((): number => {
        return items.reduce(
            (sum, item) => sum + (item.product.unitPrice + item.product.printingCost) * item.quantity,
            0
        );
    }, [items]);

    return (
        <CartContext.Provider
            value={{
                items,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                getTotalItems,
                getTotalPrice,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextType {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
