"use client";

/**
 * 操作ログ（アクティビティログ）ページ
 * システム内の操作履歴を一覧表示する
 */

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    History,
    Loader2,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Package,
    ShoppingCart,
    ClipboardEdit,
    CalendarDays,
    UserCog,
    AlertCircle,
} from "lucide-react";

// 操作ログの型
type ActivityLog = {
    id: string;
    userId: string | null;
    userEmail: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    targetName: string | null;
    details: string | null;
    createdAt: string;
};

// 操作種別の日本語マッピング
const ACTION_LABELS: Record<string, string> = {
    create: "作成",
    update: "更新",
    delete: "削除",
    import: "インポート",
    export: "エクスポート",
    login: "ログイン",
    logout: "ログアウト",
    stock_update: "在庫更新",
    order_create: "出荷依頼",
    event_create: "イベント作成",
};

// 対象種別の日本語マッピングとアイコン
const TARGET_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    product: { label: "商品", icon: Package, color: "text-violet-500" },
    inventory: { label: "在庫", icon: ClipboardEdit, color: "text-cyan-500" },
    order: { label: "発注", icon: ShoppingCart, color: "text-orange-500" },
    event: { label: "イベント", icon: CalendarDays, color: "text-pink-500" },
    user: { label: "ユーザー", icon: UserCog, color: "text-blue-500" },
};

const PAGE_SIZE = 20;

export default function ActivityLogPage(): React.ReactElement {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [targetFilter, setTargetFilter] = useState<string>("all");
    const [daysFilter, setDaysFilter] = useState<string>("30");

    // ログ取得
    const fetchLogs = useCallback(async (): Promise<void> => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(page * PAGE_SIZE),
                days: daysFilter,
            });
            if (actionFilter !== "all") params.set("action", actionFilter);
            if (targetFilter !== "all") params.set("targetType", targetFilter);

            const res = await fetch(`/api/activity-log?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                const rawData = result.data || result;
                const safeData = Array.isArray(rawData) ? rawData : (Array.isArray(rawData.data) ? rawData.data : []);
                setLogs(safeData);
                setTotal(result.total || (Array.isArray(rawData) ? rawData.length : 0));
            }
        } catch (err) {
            console.error("操作ログ取得エラー:", err);
        } finally {
            setLoading(false);
        }
    }, [page, actionFilter, targetFilter, daysFilter]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // ページ変更時にリセット
    const handleFilterChange = (): void => {
        setPage(0);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    // 日時フォーマット
    const formatDate = (dateStr: string): string => {
        try {
            return new Date(dateStr).toLocaleString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">操作ログ</h2>
                    <p className="text-sm text-muted-foreground">システム操作の履歴を確認できます</p>
                </div>
                <Button variant="outline" onClick={fetchLogs} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    更新
                </Button>
            </div>

            {/* フィルター */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4">
                        <Select
                            value={actionFilter}
                            onValueChange={(v) => { setActionFilter(v); handleFilterChange(); }}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="操作種別" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全操作</SelectItem>
                                <SelectItem value="create">作成</SelectItem>
                                <SelectItem value="update">更新</SelectItem>
                                <SelectItem value="delete">削除</SelectItem>
                                <SelectItem value="stock_update">在庫更新</SelectItem>
                                <SelectItem value="order_create">出荷依頼</SelectItem>
                                <SelectItem value="import">インポート</SelectItem>
                                <SelectItem value="export">エクスポート</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={targetFilter}
                            onValueChange={(v) => { setTargetFilter(v); handleFilterChange(); }}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="対象種別" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全対象</SelectItem>
                                <SelectItem value="product">商品</SelectItem>
                                <SelectItem value="inventory">在庫</SelectItem>
                                <SelectItem value="order">発注</SelectItem>
                                <SelectItem value="event">イベント</SelectItem>
                                <SelectItem value="user">ユーザー</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={daysFilter}
                            onValueChange={(v) => { setDaysFilter(v); handleFilterChange(); }}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="期間" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">過去7日間</SelectItem>
                                <SelectItem value="30">過去30日間</SelectItem>
                                <SelectItem value="90">過去90日間</SelectItem>
                                <SelectItem value="365">過去1年間</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center text-sm text-muted-foreground ml-auto">
                            全 {total} 件
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ログテーブル */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        操作履歴
                    </CardTitle>
                    <CardDescription>
                        システム内で行われた操作の記録
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">読み込み中...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <p>操作ログがありません</p>
                            <p className="text-xs mt-1">
                                activity_logテーブルをSupabaseに作成してください
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">日時</TableHead>
                                    <TableHead>ユーザー</TableHead>
                                    <TableHead>操作</TableHead>
                                    <TableHead>対象</TableHead>
                                    <TableHead>詳細</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map(log => {
                                    const targetConfig = TARGET_TYPE_CONFIG[log.targetType];
                                    const TargetIcon = targetConfig?.icon;

                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-sm font-mono text-muted-foreground">
                                                {formatDate(log.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {log.userEmail || "システム"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {ACTION_LABELS[log.action] || log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {TargetIcon && (
                                                        <TargetIcon className={`h-4 w-4 ${targetConfig.color}`} />
                                                    )}
                                                    <span className="text-sm">
                                                        {targetConfig?.label || log.targetType}
                                                    </span>
                                                    {log.targetName && (
                                                        <span className="text-xs text-muted-foreground">
                                                            ({log.targetName})
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                                                {log.details || "—"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}

                    {/* ページネーション */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                {page * PAGE_SIZE + 1}〜{Math.min((page + 1) * PAGE_SIZE, total)} / {total}件
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    前へ
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                >
                                    次へ
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
