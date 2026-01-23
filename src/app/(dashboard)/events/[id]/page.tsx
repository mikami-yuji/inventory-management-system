"use client";

import React, { useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ArrowLeft,
    FileText,
    Printer,
    Package,
    PackageCheck,
    CalendarDays,
    CalendarRange,
    Store,
    Loader2,
    Save,
    CheckCircle,
    AlertTriangle,
    Copy
} from "lucide-react";
import { useSaleEvents, useUpdateSaleEvent } from "@/hooks/use-sale-events";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

export default function EventDetailPage(): React.ReactElement {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;
    const printRef = useRef<HTMLDivElement>(null);

    // データ取得
    const { events, loading, refetch } = useSaleEvents();
    const { updateStatus, updateActual, allocateStock, deleteEvent, loading: updating } = useUpdateSaleEvent();

    // 現在のイベントを取得
    const event = useMemo(() => {
        return events.find(e => e.id === eventId);
    }, [events, eventId]);

    // 実績入力用のステート
    const [actualInputs, setActualInputs] = useState<Record<string, number>>({});
    const [editMode, setEditMode] = useState(false);

    // ステータス変更
    const handleStatusChange = async (newStatus: string): Promise<void> => {
        const success = await updateStatus(eventId, newStatus);
        if (success) {
            refetch();
        } else {
            alert('ステータスの更新に失敗しました');
        }
    };

    // 在庫引当
    const handleAllocate = async (): Promise<void> => {
        if (!confirm('在庫から引当を行います。よろしいですか？')) return;

        const success = await allocateStock(eventId);
        if (success) {
            refetch();
            alert('在庫引当が完了しました');
        } else {
            alert('在庫引当に失敗しました');
        }
    };

    // 実績保存
    const handleSaveActual = async (): Promise<void> => {
        if (!event) return;

        const items = event.items.map(item => ({
            itemId: item.id,
            actualQuantity: actualInputs[item.id] ?? item.actualQuantity ?? 0
        }));

        const success = await updateActual(eventId, items);
        if (success) {
            setEditMode(false);
            refetch();
            alert('実績を保存しました');
        } else {
            alert('実績の保存に失敗しました');
        }
    };

    // イベント削除
    const handleDelete = async (): Promise<void> => {
        if (!confirm('このイベントを削除しますか？この操作は取り消せません。')) return;

        const success = await deleteEvent(eventId);
        if (success) {
            router.push('/events');
        } else {
            alert('削除に失敗しました');
        }
    };

    // イベントコピー
    const handleCopy = (): void => {
        if (!event) return;
        // URLパラメータでコピー元を渡す
        router.push(`/events/new?copy=${eventId}`);
    };

    // 印刷
    const handlePrint = (): void => {
        window.print();
    };

    // PDF出力（印刷ダイアログでPDF保存）
    const handleExportPDF = (): void => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">イベントが見つかりません</p>
                <Button asChild className="mt-4">
                    <Link href="/events">一覧に戻る</Link>
                </Button>
            </div>
        );
    }

    // 統計
    const totalPlanned = event.items.reduce((sum, i) => sum + i.plannedQuantity, 0);
    const totalAllocated = event.items.reduce((sum, i) => sum + i.allocatedQuantity, 0);
    const totalActual = event.items.reduce((sum, i) => sum + (i.actualQuantity ?? 0), 0);
    const allAllocated = event.items.every(i => i.allocatedQuantity >= i.plannedQuantity);

    const statusConfig = {
        upcoming: { label: "予定", variant: "outline" as const },
        active: { label: "進行中", variant: "default" as const },
        completed: { label: "完了", variant: "secondary" as const },
        cancelled: { label: "キャンセル", variant: "destructive" as const }
    };

    return (
        <div className="space-y-6">
            {/* ヘッダー（印刷時非表示） */}
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/events">
                            <Button variant="ghost" size="sm" className="gap-1">
                                <ArrowLeft className="h-4 w-4" />
                                イベント一覧
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Store className="h-6 w-6 text-muted-foreground" />
                        <h2 className="text-3xl font-bold tracking-tight">{event.clientName}</h2>
                        <Badge variant={statusConfig[event.status].variant}>
                            {statusConfig[event.status].label}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleCopy} className="gap-1">
                        <Copy className="h-4 w-4" />
                        コピー
                    </Button>
                    <Button variant="outline" onClick={handlePrint} className="gap-1">
                        <Printer className="h-4 w-4" />
                        印刷
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF} className="gap-1">
                        <FileText className="h-4 w-4" />
                        PDF
                    </Button>
                </div>
            </div>

            {/* 印刷用コンテンツ */}
            <div ref={printRef} className="print:p-4">
                {/* イベント情報 */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">{event.clientName}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    {event.scheduleType === "single" ? (
                                        <CalendarDays className="h-4 w-4" />
                                    ) : (
                                        <CalendarRange className="h-4 w-4" />
                                    )}
                                    {event.scheduleType === "single"
                                        ? format(new Date(event.dates[0]), "yyyy年M月d日 (E)", { locale: ja })
                                        : `${event.dates.length}日間`
                                    }
                                    {event.scheduleType === "monthly" && (
                                        <span className="text-xs">
                                            ({event.dates.map(d => format(new Date(d), "M/d", { locale: ja })).join(", ")})
                                        </span>
                                    )}
                                </CardDescription>
                            </div>
                            <div className="print:hidden">
                                <Select value={event.status} onValueChange={handleStatusChange} disabled={updating}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="upcoming">予定</SelectItem>
                                        <SelectItem value="active">進行中</SelectItem>
                                        <SelectItem value="completed">完了</SelectItem>
                                        <SelectItem value="cancelled">キャンセル</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {event.description && (
                            <p className="text-sm text-muted-foreground mt-2 bg-gray-50 rounded px-3 py-2">
                                {event.description}
                            </p>
                        )}
                    </CardHeader>
                </Card>

                {/* サマリーカード */}
                <div className="grid gap-4 md:grid-cols-4 mb-6 print:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                商品数
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{event.items.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">計画数量</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalPlanned.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <PackageCheck className="h-4 w-4" />
                                引当済
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={cn(
                                "text-2xl font-bold",
                                allAllocated ? "text-green-600" : "text-amber-600"
                            )}>
                                {totalAllocated.toLocaleString()}
                            </div>
                            {!allAllocated && (
                                <p className="text-xs text-amber-600">未引当あり</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">実績数量</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {totalActual > 0 ? totalActual.toLocaleString() : '-'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* アクションボタン（印刷時非表示） */}
                <div className="flex items-center gap-2 mb-4 print:hidden">
                    {!allAllocated && (
                        <Button onClick={handleAllocate} disabled={updating} className="gap-1">
                            <PackageCheck className="h-4 w-4" />
                            在庫引当
                        </Button>
                    )}
                    {!editMode ? (
                        <Button variant="outline" onClick={() => setEditMode(true)}>
                            実績入力
                        </Button>
                    ) : (
                        <>
                            <Button onClick={handleSaveActual} disabled={updating} className="gap-1">
                                <Save className="h-4 w-4" />
                                実績保存
                            </Button>
                            <Button variant="ghost" onClick={() => setEditMode(false)}>
                                キャンセル
                            </Button>
                        </>
                    )}
                    <div className="flex-1" />
                    <Button variant="ghost" className="text-red-500" onClick={handleDelete}>
                        削除
                    </Button>
                </div>

                {/* 商品一覧 */}
                <Card>
                    <CardHeader>
                        <CardTitle>商品明細</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>商品名</TableHead>
                                    <TableHead className="text-right">現在庫</TableHead>
                                    <TableHead className="text-right">計画数</TableHead>
                                    <TableHead className="text-right">引当数</TableHead>
                                    <TableHead className="text-right">実績数</TableHead>
                                    <TableHead className="text-center">状態</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {event.items.map(item => {
                                    const isAllocated = item.allocatedQuantity >= item.plannedQuantity;
                                    const stockShort = item.currentStock < item.plannedQuantity;

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.productName}</div>
                                                <div className="text-xs text-muted-foreground">{item.productSku}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(stockShort && "text-red-600 font-medium")}>
                                                    {item.currentStock.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {item.plannedQuantity.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(
                                                    "font-medium",
                                                    isAllocated ? "text-green-600" : "text-amber-600"
                                                )}>
                                                    {item.allocatedQuantity.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {editMode ? (
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={actualInputs[item.id] ?? item.actualQuantity ?? ''}
                                                        onChange={(e) => setActualInputs(prev => ({
                                                            ...prev,
                                                            [item.id]: parseInt(e.target.value) || 0
                                                        }))}
                                                        className="w-24 text-right"
                                                    />
                                                ) : (
                                                    <span className="font-medium">
                                                        {item.actualQuantity != null ? item.actualQuantity.toLocaleString() : '-'}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {isAllocated ? (
                                                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                                ) : stockShort ? (
                                                    <AlertTriangle className="h-5 w-5 text-red-500 mx-auto" />
                                                ) : (
                                                    <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* 印刷用フッター */}
                <div className="hidden print:block mt-6 text-center text-sm text-gray-500">
                    <p>在庫管理システム - 特売イベント明細</p>
                    <p>出力日時: {format(new Date(), "yyyy年M月d日 HH:mm", { locale: ja })}</p>
                </div>
            </div>
        </div>
    );
}
