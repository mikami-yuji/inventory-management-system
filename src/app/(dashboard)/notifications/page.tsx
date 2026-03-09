"use client";

/**
 * 通知ページ
 * 在庫アラート等の通知一覧を表示する
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Bell,
    AlertTriangle,
    Package,
    CheckCircle2,
    Loader2,
    RefreshCw,
    Info,
} from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { useInventory } from "@/hooks/use-inventory";
import Link from "next/link";

// 通知アイテムの型
type NotificationItem = {
    id: string;
    type: "out_of_stock" | "low_stock" | "info";
    title: string;
    message: string;
    productId?: string;
    productName?: string;
    severity: "critical" | "warning" | "info";
    createdAt: Date;
};

// 低在庫の閾値（設定から取得する場合は変更可能）
const LOW_STOCK_THRESHOLD = 50;

export default function NotificationsPage(): React.ReactElement {
    const { products, loading: productsLoading } = useProducts();
    const { inventory, loading: inventoryLoading } = useInventory();
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    const loading = productsLoading || inventoryLoading;

    // 商品名マップ
    const productNameMap = useMemo(() => {
        const map = new Map<string, string>();
        products.forEach(p => map.set(p.id, p.name));
        return map;
    }, [products]);

    // 在庫アラートを計算
    const notifications = useMemo((): NotificationItem[] => {
        const alerts: NotificationItem[] = [];

        inventory.forEach(item => {
            const productName = productNameMap.get(item.productId) || "不明な商品";

            if (item.quantity === 0) {
                alerts.push({
                    id: `out-${item.productId}`,
                    type: "out_of_stock",
                    title: "欠品アラート",
                    message: `${productName} の在庫が 0 です。至急発注してください。`,
                    productId: item.productId,
                    productName,
                    severity: "critical",
                    createdAt: new Date(),
                });
            } else if (item.quantity < LOW_STOCK_THRESHOLD) {
                alerts.push({
                    id: `low-${item.productId}`,
                    type: "low_stock",
                    title: "低在庫アラート",
                    message: `${productName} の在庫が ${item.quantity} 個です（閾値: ${LOW_STOCK_THRESHOLD}個）`,
                    productId: item.productId,
                    productName,
                    severity: "warning",
                    createdAt: new Date(),
                });
            }
        });

        // 重要度順にソート（critical → warning → info）
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return alerts;
    }, [inventory, productNameMap]);

    // 未読通知
    const activeNotifications = notifications.filter(n => !dismissedIds.has(n.id));
    const criticalCount = activeNotifications.filter(n => n.severity === "critical").length;
    const warningCount = activeNotifications.filter(n => n.severity === "warning").length;

    // 通知を消去
    const handleDismiss = (id: string): void => {
        setDismissedIds(prev => new Set([...prev, id]));
    };

    // 全通知を既読
    const handleDismissAll = (): void => {
        setDismissedIds(new Set(notifications.map(n => n.id)));
    };

    // 消去リセット
    const handleResetDismissed = (): void => {
        setDismissedIds(new Set());
    };

    const getSeverityConfig = (severity: string): { color: string; bgColor: string; icon: React.ReactElement } => {
        switch (severity) {
            case "critical":
                return {
                    color: "text-red-700",
                    bgColor: "bg-red-50 border-red-200",
                    icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
                };
            case "warning":
                return {
                    color: "text-amber-700",
                    bgColor: "bg-amber-50 border-amber-200",
                    icon: <Package className="h-5 w-5 text-amber-500" />,
                };
            default:
                return {
                    color: "text-blue-700",
                    bgColor: "bg-blue-50 border-blue-200",
                    icon: <Info className="h-5 w-5 text-blue-500" />,
                };
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">通知</h2>
                    <p className="text-sm text-muted-foreground">在庫アラートと重要な通知を確認できます</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleResetDismissed} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        リセット
                    </Button>
                    {activeNotifications.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleDismissAll} className="gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            すべて既読
                        </Button>
                    )}
                </div>
            </div>

            {/* サマリーカード */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className={criticalCount > 0 ? "border-red-200 bg-red-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">欠品アラート</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${criticalCount > 0 ? "text-red-600" : ""}`}>
                            {criticalCount} 件
                        </div>
                    </CardContent>
                </Card>
                <Card className={warningCount > 0 ? "border-amber-200 bg-amber-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">低在庫アラート</CardTitle>
                        <Package className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${warningCount > 0 ? "text-amber-600" : ""}`}>
                            {warningCount} 件
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">合計通知</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeNotifications.length} 件</div>
                    </CardContent>
                </Card>
            </div>

            {/* 通知一覧 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        通知一覧
                    </CardTitle>
                    <CardDescription>
                        在庫状況に基づく自動アラート
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">読み込み中...</span>
                        </div>
                    ) : activeNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                            <p className="font-medium">通知はありません</p>
                            <p className="text-xs mt-1">在庫状況に問題はありません</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeNotifications.map(notification => {
                                const config = getSeverityConfig(notification.severity);
                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 rounded-lg border ${config.bgColor} flex items-start gap-3`}
                                    >
                                        {config.icon}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className={`font-medium ${config.color}`}>
                                                    {notification.title}
                                                </h4>
                                                <Badge
                                                    variant={notification.severity === "critical" ? "destructive" : "secondary"}
                                                >
                                                    {notification.severity === "critical" ? "緊急" : "注意"}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {notification.message}
                                            </p>
                                            {notification.productId && (
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="p-0 h-auto mt-1 text-sm"
                                                    asChild
                                                >
                                                    <Link href={`/inventory/bags?highlight=${notification.productId}`}>
                                                        在庫を確認 →
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDismiss(notification.id)}
                                            className="shrink-0"
                                        >
                                            既読
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
