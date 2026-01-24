"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Plus,
    Search,
    Calendar,
    Package,
    Loader2,
    Store,
    CalendarDays,
    CalendarRange,
    PackageCheck,
    RefreshCw
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useSaleEvents } from "@/hooks/use-sale-events";
import { SaleEventCalendar } from "@/components/events/sale-event-calendar";
import type { SaleEvent } from "@/hooks/use-sale-events";

export default function EventsPage(): React.ReactElement {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentTab, setCurrentTab] = useState("all");
    const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

    // APIからイベントを取得
    const { events, loading, error, refetch } = useSaleEvents();

    // フィルタされたイベント
    const filteredEvents = useMemo(() => {
        let result = events;

        // ステータスフィルター (リスト表示時のみ適用、またはカレンダーでも適用？カレンダーでは全件見たいことが多いが、フィルタできた方が便利)
        if (currentTab !== "all" && viewMode === "list") {
            result = result.filter(e => e.status === currentTab);
        }

        // 検索フィルター
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(e =>
                e.clientName.toLowerCase().includes(query) ||
                e.items.some(item => item.productName.toLowerCase().includes(query))
            );
        }

        return result;
    }, [events, currentTab, searchQuery, viewMode]);

    // ステータスごとの件数
    const statusCounts = useMemo(() => ({
        all: events.length,
        upcoming: events.filter(e => e.status === "upcoming").length,
        active: events.filter(e => e.status === "active").length,
        completed: events.filter(e => e.status === "completed").length
    }), [events]);

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">特売イベント管理</h2>
                    <p className="text-muted-foreground">特売先ごとの在庫管理と出荷予定を確認</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-md border bg-muted p-1 mr-2">
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("list")}
                            className="gap-2"
                        >
                            <Store className="h-4 w-4" />
                            リスト
                        </Button>
                        <Button
                            variant={viewMode === "calendar" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("calendar")}
                            className="gap-2"
                        >
                            <Calendar className="h-4 w-4" />
                            カレンダー
                        </Button>
                    </div>
                    <Button variant="outline" onClick={refetch} disabled={loading} className="gap-1">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        更新
                    </Button>
                    <Button asChild>
                        <Link href="/events/new">
                            <Plus className="mr-2 h-4 w-4" />
                            新規イベント作成
                        </Link>
                    </Button>
                </div>
            </div>

            {/* エラー表示 */}
            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <p className="text-red-600">エラー: {error}</p>
                        <Button onClick={refetch} variant="outline" className="mt-2">
                            再読み込み
                        </Button>
                    </CardContent>
                </Card>
            )}

            {viewMode === "calendar" ? (
                <div className="space-y-4">
                    {/* カレンダー表示 */}
                    <SaleEventCalendar events={events} />
                </div>
            ) : (
                <>
                    {/* 検索 */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="特売先名・商品名で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>

                    {/* タブ */}
                    <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
                        <TabsList>
                            <TabsTrigger value="all">
                                すべて ({statusCounts.all})
                            </TabsTrigger>
                            <TabsTrigger value="upcoming">
                                予定 ({statusCounts.upcoming})
                            </TabsTrigger>
                            <TabsTrigger value="active">
                                進行中 ({statusCounts.active})
                            </TabsTrigger>
                            <TabsTrigger value="completed">
                                完了 ({statusCounts.completed})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={currentTab} className="mt-4">
                            {loading && events.length === 0 ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredEvents.length === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">
                                            {events.length === 0
                                                ? "イベントがありません"
                                                : "該当するイベントがありません"
                                            }
                                        </p>
                                        <Button asChild className="mt-4">
                                            <Link href="/events/new">
                                                <Plus className="mr-2 h-4 w-4" />
                                                新規作成
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredEvents.map((event) => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}

// ... (EventCard component remains the same)


// イベントカードコンポーネント
function EventCard({ event }: { event: SaleEvent }): React.ReactElement {
    const statusConfig = {
        upcoming: { label: "予定", variant: "outline" as const, color: "text-blue-600" },
        active: { label: "進行中", variant: "default" as const, color: "text-green-600" },
        completed: { label: "完了", variant: "secondary" as const, color: "text-gray-500" },
        cancelled: { label: "キャンセル", variant: "destructive" as const, color: "text-red-500" }
    };

    const status = statusConfig[event.status];

    // 日付表示
    const dateDisplay = event.scheduleType === "single"
        ? format(new Date(event.dates[0]), "yyyy年M月d日 (E)", { locale: ja })
        : `${event.dates.length}日間 (${format(new Date(event.dates[0]), "M/d", { locale: ja })} 〜)`;

    // 合計数量
    const totalPlanned = event.items.reduce((sum, item) => sum + item.plannedQuantity, 0);
    const totalAllocated = event.items.reduce((sum, item) => sum + item.allocatedQuantity, 0);
    const allAllocated = event.items.every(i => i.allocatedQuantity >= i.plannedQuantity);

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-lg font-bold">{event.clientName}</CardTitle>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* 日程 */}
                <div className="flex items-center gap-2 text-sm">
                    {event.scheduleType === "single" ? (
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <CalendarRange className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={status.color}>{dateDisplay}</span>
                    {event.scheduleType === "monthly" && (
                        <Badge variant="outline" className="text-xs">月間</Badge>
                    )}
                </div>

                {/* 商品・引当状況 */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>{event.items.length}商品</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <PackageCheck className={`h-4 w-4 ${allAllocated ? 'text-green-500' : 'text-amber-500'}`} />
                        <span className={allAllocated ? 'text-green-600' : 'text-amber-600'}>
                            {totalAllocated}/{totalPlanned} 引当
                        </span>
                    </div>
                </div>

                {/* 商品リスト（最大3件） */}
                <div className="text-xs text-muted-foreground space-y-1">
                    {event.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="truncate">
                            • {item.productName} ({item.plannedQuantity}個)
                        </div>
                    ))}
                    {event.items.length > 3 && (
                        <div className="text-blue-600">他 {event.items.length - 3}商品...</div>
                    )}
                </div>

                {/* 備考 */}
                {event.description && (
                    <p className="text-xs text-muted-foreground bg-gray-50 rounded px-2 py-1">
                        {event.description}
                    </p>
                )}

                {/* 詳細ボタン */}
                <Button variant="outline" className="w-full mt-2" asChild>
                    <Link href={`/events/${event.id}`}>詳細・在庫管理</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
