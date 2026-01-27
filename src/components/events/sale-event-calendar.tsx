"use client";

import React, { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Store, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SaleEvent } from "@/hooks/use-sale-events";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SaleEventCalendarProps = {
    events: SaleEvent[];
};

export function SaleEventCalendar({ events }: SaleEventCalendarProps): React.ReactElement {
    const [currentDate, setCurrentDate] = useState(new Date());

    // カレンダーの日付生成
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { locale: ja });
        const endDate = endOfWeek(monthEnd, { locale: ja });

        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentDate]);

    // 日付ごとのイベント
    const getEventsForDay = (day: Date) => {
        return events.filter(event =>
            event.dates.some(dateStr => isSameDay(parseISO(dateStr), day))
        );
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    const statusColors = {
        upcoming: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
        active: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
        completed: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
        cancelled: "bg-red-50 text-red-500 border-red-100 hover:bg-red-100",
    };

    return (
        <Card>
            <CardContent className="p-4">
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {format(currentDate, "yyyy年 M月", { locale: ja })}
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goToToday}>今日</Button>
                        <div className="flex items-center rounded-md border">
                            <Button variant="ghost" size="icon" onClick={prevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={nextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 gap-1 mb-1 text-center text-sm text-muted-foreground font-medium">
                    {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
                        <div key={day} className={cn("py-2", i === 0 && "text-red-500", i === 6 && "text-blue-500")}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* カレンダーグリッド */}
                <div className="grid grid-cols-7 gap-1 auto-rows-fr">
                    {calendarDays.map((day, i) => {
                        const dayEvents = getEventsForDay(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isToday = isSameDay(day, new Date());
                        const dateStr = format(day, "yyyy-MM-dd");

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "min-h-[120px] p-2 border rounded-md text-sm transition-colors relative group",
                                    isCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground",
                                    isToday && "bg-blue-50 border-blue-300"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span
                                        className={cn(
                                            "font-medium rounded-full w-6 h-6 flex items-center justify-center",
                                            isToday && "bg-blue-600 text-white"
                                        )}
                                    >
                                        {format(day, "d")}
                                    </span>
                                    {/* クイック追加ボタン */}
                                    <Link
                                        href={`/events/new?date=${dateStr}`}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="この日にイベントを追加"
                                    >
                                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-blue-100 text-blue-600">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>

                                <div className="space-y-1">
                                    {dayEvents.map(event => {
                                        // 引当状況の確認
                                        const isFullyAllocated = event.items.every(item => item.allocatedQuantity >= item.plannedQuantity);
                                        const totalItems = event.items.length;
                                        const totalQuantity = event.items.reduce((sum, i) => sum + i.plannedQuantity, 0);

                                        return (
                                            <TooltipProvider key={event.id}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/events/${event.id}`} className="block">
                                                            <div
                                                                className={cn(
                                                                    "text-xs px-1.5 py-1 rounded border truncate transition-colors flex items-center justify-between",
                                                                    statusColors[event.status],
                                                                )}
                                                            >
                                                                <div className="truncate font-semibold flex-1">
                                                                    {event.clientName}
                                                                </div>
                                                                {/* 引当ステータスアイコン */}
                                                                <div className="ml-1 flex-shrink-0">
                                                                    {isFullyAllocated ? (
                                                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                                    ) : (
                                                                        <AlertCircle className="h-3 w-3 text-amber-600" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[250px] space-y-2">
                                                        <div>
                                                            <div className="font-bold text-sm mb-1">{event.clientName}</div>
                                                            <div className="text-xs text-muted-foreground mb-1">
                                                                {format(new Date(event.dates[0]), "M/d")} {event.scheduleType === 'monthly' ? '(月間)' : ''}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs">
                                                                {isFullyAllocated ? (
                                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-1 py-0 h-5">引当完了</Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-1 py-0 h-5">未引当あり</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="border-t pt-2">
                                                            <div className="text-xs font-medium mb-1">商品 ({totalItems}点 / 計{totalQuantity}個)</div>
                                                            <ul className="text-xs space-y-1 text-muted-foreground">
                                                                {event.items.slice(0, 3).map((item, idx) => (
                                                                    <li key={idx} className="flex justify-between">
                                                                        <span className="truncate max-w-[120px]">{item.productName}</span>
                                                                        <span>{item.plannedQuantity}個</span>
                                                                    </li>
                                                                ))}
                                                                {event.items.length > 3 && (
                                                                    <li className="text-center text-[10px] text-blue-500">他 {event.items.length - 3} 件...</li>
                                                                )}
                                                            </ul>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
