"use client";

import React, { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        const startDate = startOfWeek(monthStart, { locale: ja }); // 月曜始まり？日曜始まり？ ja localeは通常日曜始まり
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

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "min-h-[120px] p-2 border rounded-md text-sm transition-colors",
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
                                </div>

                                <div className="space-y-1">
                                    {dayEvents.map(event => (
                                        <Link href={`/events/${event.id}`} key={event.id} className="block">
                                            <div
                                                className={cn(
                                                    "text-xs px-1.5 py-1 rounded border truncate transition-colors",
                                                    statusColors[event.status],
                                                )}
                                                title={`${event.clientName} (${event.items.length}商品)`}
                                            >
                                                <div className="font-semibold truncate">{event.clientName}</div>
                                                <div className="text-[10px] opacity-80 truncate">
                                                    {event.items.length}商品
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
