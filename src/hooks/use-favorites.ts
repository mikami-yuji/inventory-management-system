"use client";

/**
 * お気に入り（ピン留め）管理フック
 * LocalStorageに保存し、ページリロード後も維持される
 */

import { useState, useCallback, useEffect } from "react";

const FAVORITES_KEY = "inventory-favorites";

export function useFavorites(): {
    favorites: Set<string>;
    toggleFavorite: (productId: string) => void;
    isFavorite: (productId: string) => boolean;
} {
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [isHydrated, setIsHydrated] = useState(false);

    // LocalStorageから復元
    useEffect(() => {
        try {
            const stored = localStorage.getItem(FAVORITES_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as string[];
                setFavorites(new Set(parsed));
            }
        } catch {
            // 無効なデータの場合は無視
        }
        setIsHydrated(true);
    }, []);

    // LocalStorageに保存
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
        }
    }, [favorites, isHydrated]);

    // お気に入りトグル
    const toggleFavorite = useCallback((productId: string): void => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    }, []);

    // お気に入り判定
    const isFavorite = useCallback(
        (productId: string): boolean => favorites.has(productId),
        [favorites]
    );

    return { favorites, toggleFavorite, isFavorite };
}
