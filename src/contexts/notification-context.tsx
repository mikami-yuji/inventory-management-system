"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// 通知設定の型
export type NotificationSettings = {
    enabled: boolean;
    email: string;
    lowStockThreshold: number; // 低在庫の閾値
    outOfStockAlert: boolean; // 欠品アラート
    dailyReport: boolean; // 日次レポート
    weeklyReport: boolean; // 週次レポート
};

// デフォルト設定
const defaultSettings: NotificationSettings = {
    enabled: false,
    email: "",
    lowStockThreshold: 50,
    outOfStockAlert: true,
    dailyReport: false,
    weeklyReport: false,
};

// Context型
type NotificationContextType = {
    settings: NotificationSettings;
    updateSettings: (updates: Partial<NotificationSettings>) => void;
    resetSettings: () => void;
    getLowStockProducts: () => Array<{ productId: string; name: string; quantity: number }>;
    testNotification: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = "inventory-notification-settings";

export function NotificationProvider({ children }: { children: ReactNode }): React.ReactElement {
    const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
    const [isHydrated, setIsHydrated] = useState(false);

    // LocalStorageから復元
    useEffect(() => {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
            try {
                setSettings({ ...defaultSettings, ...JSON.parse(stored) });
            } catch {
                // 無効なデータの場合はデフォルト使用
            }
        }
        setIsHydrated(true);
    }, []);

    // LocalStorageに保存
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        }
    }, [settings, isHydrated]);

    // 設定更新
    const updateSettings = useCallback((updates: Partial<NotificationSettings>): void => {
        setSettings((prev) => ({ ...prev, ...updates }));
    }, []);

    // 設定リセット
    const resetSettings = useCallback((): void => {
        setSettings(defaultSettings);
    }, []);

    // 低在庫商品取得（モック - 実際はinventoryServiceから取得）
    const getLowStockProducts = useCallback((): Array<{ productId: string; name: string; quantity: number }> => {
        // この関数は実際にはinventoryServiceと連携する
        // ここではモック実装
        return [];
    }, []);

    // テスト通知（モック）
    const testNotification = useCallback((): void => {
        if (!settings.enabled || !settings.email) {
            alert("通知設定が無効か、メールアドレスが設定されていません");
            return;
        }
        // 実際にはバックエンドAPIを呼び出す
        alert(`テスト通知を送信しました（モック）\n送信先: ${settings.email}`);
    }, [settings]);

    return (
        <NotificationContext.Provider
            value={{
                settings,
                updateSettings,
                resetSettings,
                getLowStockProducts,
                testNotification,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification(): NotificationContextType {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
}
