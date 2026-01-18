"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { eventService } from "@/lib/services";
import { useState } from "react";
import { Plus } from "lucide-react";

export default function EventDetailPage(): React.ReactElement {
    const { id } = useParams();
    const eventId = typeof id === 'string' ? id : id?.[0] || '';

    // サービスからイベントデータを取得
    const event = eventService.getEventById(eventId);
    const [eventStocks, _setEventStocks] = useState(
        eventService.getEventStocks(eventId)
    );

    if (!event) {
        return <div>イベントが見つかりません</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold tracking-tight">{event.name}</h2>
                    <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                        {event.status}
                    </Badge>
                </div>
                <p className="text-muted-foreground mt-2">{event.startDate} 〜 {event.endDate}</p>
                <p className="text-gray-600 mt-1">{event.description}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* 確保済み在庫リスト */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>確保済み在庫 (Event Stock)</CardTitle>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" /> 在庫を追加確保
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>商品</TableHead>
                                    <TableHead className="text-right">当初確保数</TableHead>
                                    <TableHead className="text-right">現在残数</TableHead>
                                    <TableHead className="text-right">通常在庫(参考)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {eventStocks.map((stock) => (
                                    <TableRow key={stock.productId}>
                                        <TableCell className="font-medium">
                                            {eventService.getProductName(stock.productId)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {stock.allocatedQuantity}
                                        </TableCell>
                                        <TableCell className="text-right font-bold font-mono">
                                            {stock.currentQuantity}
                                        </TableCell>
                                        <TableCell className="text-right text-gray-400 font-mono">
                                            {eventService.getStandardInventory(stock.productId)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {eventStocks.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            確保されている在庫はありません。
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
