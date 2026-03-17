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
    CalendarDays,
    CalendarRange,
    Store,
    Loader2,
    Save,
    CheckCircle,
    AlertTriangle,
    Copy,
    Pencil
} from "lucide-react";
import {
    metersToBags,
    isRollBag
} from "@/lib/services";
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
    const { updateStatus, updateActual, deleteEvent, loading: updating } = useUpdateSaleEvent();

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
    const totalActual = event.items.reduce((sum, i) => sum + (i.actualQuantity ?? 0), 0);

    const statusConfig = {
        upcoming: { label: "予定", variant: "outline" as const },
        active: { label: "進行中", variant: "default" as const },
        completed: { label: "完了", variant: "secondary" as const },
        cancelled: { label: "キャンセル", variant: "destructive" as const }
    };

    return (
        <div className="space-y-6">
            {/* ヘッダー（印刷時非表示） */}
            <div className="flex flex-col gap-4 print:hidden">
                <div className="flex items-center gap-2">
                    <Link href="/events">
                        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-xs sm:text-sm">一覧へ</span>
                        </Button>
                    </Link>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                        <Store className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground shrink-0" />
                        <h2 className="text-xl sm:text-3xl font-bold tracking-tight truncate">{event.clientName}</h2>
                        <Badge variant={statusConfig[event.status].variant} className="shrink-0 text-[10px] sm:text-xs">
                            {statusConfig[event.status].label}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar shrink-0">
                        <Button variant="outline" size="sm" asChild className="h-8 sm:h-9 gap-1 px-2 sm:px-3 text-xs sm:text-sm shrink-0">
                            <Link href={`/events/${eventId}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="hidden xs:inline">編集</span>
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 sm:h-9 gap-1 px-2 sm:px-3 text-xs sm:text-sm shrink-0">
                            <Copy className="h-3.5 w-3.5" />
                            <span className="hidden xs:inline">コピー</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 sm:h-9 gap-1 px-2 sm:px-3 text-xs sm:text-sm shrink-0">
                            <Printer className="h-3.5 w-3.5" />
                            <span className="hidden xs:inline">印刷</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-8 sm:h-9 gap-1 px-2 sm:px-3 text-xs sm:text-sm shrink-0">
                            <FileText className="h-3.5 w-3.5" />
                            <span className="hidden xs:inline">PDF</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 印刷用コンテンツ */}
            <div ref={printRef} className="print:p-4">
                {/* イベント情報 */}
                <Card className="mb-4 shadow-none border-slate-200">
                    <CardHeader className="p-3 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                                <CardTitle className="text-base sm:text-xl truncate">{event.clientName}</CardTitle>
                                <CardDescription className="flex items-center gap-1.5 mt-1 text-[11px] sm:text-sm">
                                    {event.scheduleType === "single" ? (
                                        <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    ) : (
                                        <CalendarRange className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    )}
                                    <span className="truncate">
                                        {event.scheduleType === "single"
                                            ? format(new Date(event.dates[0]), "yyyy年M月d日 (E)", { locale: ja })
                                            : `${event.dates.length}日間`
                                        }
                                        {event.scheduleType === "monthly" && (
                                            <span className="text-[10px] sm:text-xs ml-1">
                                                ({event.dates.map(d => format(new Date(d), "M/d", { locale: ja })).join(", ")})
                                            </span>
                                        )}
                                    </span>
                                </CardDescription>
                            </div>
                            <div className="print:hidden shrink-0 mt-1 sm:mt-0">
                                <Select value={event.status} onValueChange={handleStatusChange} disabled={updating}>
                                    <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs sm:text-sm">
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
                            <p className="text-[11px] sm:text-sm text-muted-foreground mt-2 bg-slate-50 rounded px-2 py-1.5">
                                {event.description}
                            </p>
                        )}
                    </CardHeader>
                </Card>

                {/* サマリーカード */}
                <div className="grid gap-2 grid-cols-3 mb-6 print:grid-cols-3">
                    <Card className="shadow-none border-slate-200">
                        <CardHeader className="p-2 pb-0">
                            <CardTitle className="text-[10px] sm:text-sm font-medium flex items-center gap-1">
                                <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="truncate">商品数</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 pt-1">
                            <div className="text-sm sm:text-2xl font-bold">{event.items.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border-slate-200">
                        <CardHeader className="p-2 pb-0">
                            <CardTitle className="text-[10px] sm:text-sm font-medium truncate">計画数量</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 pt-1">
                            <div className="text-sm sm:text-2xl font-bold">{totalPlanned.toLocaleString()}</div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-none border-slate-200">
                        <CardHeader className="p-2 pb-0">
                            <CardTitle className="text-[10px] sm:text-sm font-medium truncate">実績数量</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 pt-1">
                            <div className="text-sm sm:text-2xl font-bold">
                                {totalActual > 0 ? totalActual.toLocaleString() : '-'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* アクションボタン（印刷時非表示） */}
                <div className="flex items-center gap-2 mb-4 print:hidden px-1 sm:px-0">

                    {!editMode ? (
                        <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => setEditMode(true)}>
                            実績入力
                        </Button>
                    ) : (
                        <>
                            <Button size="sm" className="h-9 gap-1 text-sm" onClick={handleSaveActual} disabled={updating}>
                                <Save className="h-4 w-4" />
                                実績保存
                            </Button>
                            <Button variant="ghost" size="sm" className="h-9 text-sm" onClick={() => setEditMode(false)}>
                                中止
                            </Button>
                        </>
                    )}
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" className="h-9 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 px-2" onClick={handleDelete}>
                        削除
                    </Button>
                </div>

                {/* 商品一覧 */}
                <Card>
                    <CardHeader>
                        <CardTitle>商品明細</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6 sm:pt-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead className="px-3 sm:px-4 text-xs sm:text-sm">商品名</TableHead>
                                        <TableHead className="px-3 sm:px-4 text-right text-xs sm:text-sm">現在庫</TableHead>
                                        <TableHead className="px-3 sm:px-4 text-right text-xs sm:text-sm">計画/実績</TableHead>
                                        <TableHead className="px-3 sm:px-4 text-center text-xs sm:text-sm whitespace-nowrap">状態</TableHead>
                                    </TableRow>
                                </TableHeader>
                            <TableBody>
                                {event.items.map(item => {
                                    const stockShort = item.currentStock < item.plannedQuantity;

                                    const isRoll = isRollBag(item.productShape || "");
                                    const unit = isRoll ? 'm' : '枚';
                                    const bagEquiv = isRoll ? metersToBags(item.currentStock, item.productWeight || 5) : item.currentStock;

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="px-3 sm:px-4 py-2 sm:py-3 min-w-[140px]">
                                                <div className="font-medium text-xs sm:text-sm line-clamp-2">
                                                    {item.productName} {item.productWeight ? `${item.productWeight}kg` : ''}
                                                </div>
                                                <div className="text-[10px] sm:text-xs text-muted-foreground">{item.productSku}</div>
                                            </TableCell>
                                            <TableCell className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                                                <div className={cn("text-xs sm:text-sm", stockShort && "text-red-600 font-medium")}>
                                                    {item.currentStock.toLocaleString()}<span className="ml-0.5 text-[10px] text-muted-foreground">{unit}</span>
                                                </div>
                                                {isRoll && (
                                                    <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                                                        (約{bagEquiv.toLocaleString()}枚)
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="text-xs sm:text-sm font-medium">
                                                        {item.plannedQuantity.toLocaleString()}<span className="ml-0.5 text-[10px] text-muted-foreground">枚(画)</span>
                                                    </div>
                                                    {editMode ? (
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            value={actualInputs[item.id] ?? item.actualQuantity ?? ''}
                                                            onChange={(e) => setActualInputs(prev => ({
                                                                ...prev,
                                                                [item.id]: parseInt(e.target.value) || 0
                                                            }))}
                                                            className="w-16 sm:w-20 h-7 text-right text-xs"
                                                        />
                                                    ) : (
                                                        <div className="text-xs sm:text-sm text-blue-600 font-bold">
                                                            {item.actualQuantity != null ? item.actualQuantity.toLocaleString() : '-'}<span className="ml-0.5 text-[10px] text-muted-foreground font-normal">枚(実)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                                                {stockShort ? (
                                                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 mx-auto" />
                                                ) : (
                                                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mx-auto" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        </div>
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
