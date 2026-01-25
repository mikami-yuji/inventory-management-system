"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Plus,
    Trash2,
    CalendarIcon,
    Search,
    Package,
    Loader2,
    ArrowLeft,
    PackageCheck,
    AlertTriangle,
    Copy
} from "lucide-react";
import { useProducts, useInventory } from "@/hooks/use-supabase-data";
import { useSaleEvents, useCreateSaleEvent } from "@/hooks/use-sale-events";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Product } from "@/types";
type SaleItem = {
    id: string;
    product: Product;
    quantity: number;
    currentStock: number;
};

function NewEventContent(): React.ReactElement {
    const router = useRouter();
    const searchParams = useSearchParams();
    const copyFromId = searchParams.get("copy");

    // フォーム状態
    const [clientName, setClientName] = useState("");
    const [scheduleType, setScheduleType] = useState<"single" | "monthly">("single");
    const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
    const [monthlyDates, setMonthlyDates] = useState<Date[]>([]);
    const [description, setDescription] = useState("");
    const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
    const [allocateStock, setAllocateStock] = useState(false);

    // 商品検索
    const [productSearch, setProductSearch] = useState("");
    const [showProductList, setShowProductList] = useState(false);

    // Supabaseからデータ取得
    const { products, loading: productsLoading } = useProducts();
    const { inventory: inventoryData } = useInventory();
    const { events: existingEvents, loading: eventsLoading } = useSaleEvents();
    const { createEvent, loading: creating } = useCreateSaleEvent();

    // 在庫マップ
    const inventoryMap = useMemo(() => {
        const map = new Map<string, number>();
        inventoryData?.forEach(item => {
            map.set(item.productId, item.quantity);
        });
        return map;
    }, [inventoryData]);

    // コピー元イベントからデータを読み込む
    useEffect(() => {
        if (copyFromId && existingEvents.length > 0 && products.length > 0) {
            const sourceEvent = existingEvents.find(e => e.id === copyFromId);
            if (sourceEvent) {
                setClientName(sourceEvent.clientName + " (コピー)");
                setScheduleType(sourceEvent.scheduleType);
                setDescription(sourceEvent.description || "");

                // 商品を復元
                const items: SaleItem[] = sourceEvent.items.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product) return null;
                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        product,
                        quantity: item.plannedQuantity,
                        currentStock: inventoryMap.get(item.productId) || 0
                    };
                }).filter((item): item is SaleItem => item !== null);

                setSaleItems(items);
            }
        }
    }, [copyFromId, existingEvents, products, inventoryMap]);

    // 商品検索結果
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return [];
        const query = productSearch.toLowerCase();
        return products
            .filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.sku?.toLowerCase().includes(query) ||
                p.id.includes(query)
            )
            .slice(0, 10);
    }, [products, productSearch]);

    // 商品を追加
    const addSaleItem = (product: Product): void => {
        if (saleItems.some(item => item.product.id === product.id)) {
            return;
        }

        const currentStock = inventoryMap.get(product.id) || 0;
        setSaleItems(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            product,
            quantity: 0,
            currentStock
        }]);
        setProductSearch("");
        setShowProductList(false);
    };

    // 商品を削除
    const removeSaleItem = (id: string): void => {
        setSaleItems(prev => prev.filter(item => item.id !== id));
    };

    // 数量を更新
    const updateQuantity = (id: string, quantity: number): void => {
        setSaleItems(prev => prev.map(item =>
            item.id === id ? { ...item, quantity } : item
        ));
    };

    // 月間日付を追加/削除
    const toggleMonthlyDate = (date: Date): void => {
        const dateStr = format(date, "yyyy-MM-dd");
        const exists = monthlyDates.some(d => format(d, "yyyy-MM-dd") === dateStr);

        if (exists) {
            setMonthlyDates(prev => prev.filter(d => format(d, "yyyy-MM-dd") !== dateStr));
        } else {
            setMonthlyDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
        }
    };

    // 送信処理
    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        // バリデーション
        if (!clientName.trim()) {
            alert("特売先名を入力してください");
            return;
        }
        if (scheduleType === "single" && !singleDate) {
            alert("日付を選択してください");
            return;
        }
        if (scheduleType === "monthly" && monthlyDates.length === 0) {
            alert("少なくとも1つの日付を選択してください");
            return;
        }
        if (saleItems.length === 0) {
            alert("商品を追加してください");
            return;
        }
        if (saleItems.some(item => item.quantity <= 0)) {
            alert("すべての商品に数量を入力してください");
            return;
        }

        // 在庫不足チェック
        if (allocateStock) {
            const shortItems = saleItems.filter(item => item.quantity > item.currentStock);
            if (shortItems.length > 0) {
                const names = shortItems.map(i => i.product.name).join(", ");
                if (!confirm(`以下の商品は在庫が不足しています。続行しますか？\n${names}`)) {
                    return;
                }
            }
        }

        const dates = scheduleType === "single"
            ? [format(singleDate!, "yyyy-MM-dd")]
            : monthlyDates.map(d => format(d, "yyyy-MM-dd"));

        const result = await createEvent({
            clientName,
            scheduleType,
            dates,
            description: description || undefined,
            items: saleItems.map(item => ({
                productId: item.product.id,
                quantity: item.quantity
            })),
            allocateStock
        });

        if (result.success) {
            alert("特売イベントを登録しました");
            router.push('/events');
        } else {
            alert(`登録に失敗しました: ${result.error}`);
        }
    };

    // 統計計算
    const totalQuantity = saleItems.reduce((sum, item) => sum + item.quantity, 0);
    const hasStockWarning = saleItems.some(item => item.quantity > item.currentStock);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* ヘッダー */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Link href="/events">
                        <Button variant="ghost" size="sm" className="gap-1">
                            <ArrowLeft className="h-4 w-4" />
                            戻る
                        </Button>
                    </Link>
                    {copyFromId && (
                        <Badge variant="secondary" className="gap-1">
                            <Copy className="h-3 w-3" />
                            コピーから作成
                        </Badge>
                    )}
                </div>
                <h2 className="text-3xl font-bold tracking-tight">新規特売イベント作成</h2>
                <p className="text-muted-foreground">特売先・日程・商品を登録して在庫を管理します</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 基本情報 */}
                <Card>
                    <CardHeader>
                        <CardTitle>基本情報</CardTitle>
                        <CardDescription>特売先と日程を設定してください</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* 特売先名 */}
                        <div className="grid gap-2">
                            <Label htmlFor="clientName">特売先名 *</Label>
                            <Input
                                id="clientName"
                                placeholder="例: ○○スーパー 本店"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                required
                            />
                        </div>

                        {/* 日程タイプ */}
                        <div className="grid gap-2">
                            <Label>日程タイプ *</Label>
                            <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as "single" | "monthly")}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="single">単発（1回のみ）</SelectItem>
                                    <SelectItem value="monthly">月間（複数日）</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 日付選択 */}
                        {scheduleType === "single" ? (
                            <div className="grid gap-2">
                                <Label>実施日 *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-[280px] justify-start text-left font-normal",
                                                !singleDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {singleDate ? format(singleDate, "yyyy年MM月dd日 (E)", { locale: ja }) : "日付を選択"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={singleDate}
                                            onSelect={setSingleDate}
                                            locale={ja}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label>実施日（複数選択可） *</Label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {monthlyDates.map((date, idx) => (
                                        <Badge key={idx} variant="secondary" className="gap-1">
                                            {format(date, "M/d (E)", { locale: ja })}
                                            <button
                                                type="button"
                                                onClick={() => toggleMonthlyDate(date)}
                                                className="ml-1 hover:text-red-500"
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                                    {monthlyDates.length === 0 && (
                                        <span className="text-muted-foreground text-sm">カレンダーから日付を選択してください</span>
                                    )}
                                </div>
                                <Calendar
                                    mode="multiple"
                                    selected={monthlyDates}
                                    onSelect={(dates) => setMonthlyDates(dates || [])}
                                    locale={ja}
                                    className="rounded-md border"
                                />
                            </div>
                        )}

                        {/* 備考 */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">備考</Label>
                            <Textarea
                                id="description"
                                placeholder="特記事項があれば入力..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 商品選択 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            商品登録
                        </CardTitle>
                        <CardDescription>特売対象の商品を追加してください</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* 商品検索 */}
                        <div className="relative">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="商品名・商品コードで検索..."
                                        value={productSearch}
                                        onChange={(e) => {
                                            setProductSearch(e.target.value);
                                            setShowProductList(true);
                                        }}
                                        onFocus={() => setShowProductList(true)}
                                        className="pl-10"
                                    />
                                </div>
                                {productsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>

                            {/* 検索結果ドロップダウン */}
                            {showProductList && filteredProducts.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                    {filteredProducts.map(product => {
                                        const stock = inventoryMap.get(product.id) || 0;
                                        const isAdded = saleItems.some(item => item.product.id === product.id);
                                        return (
                                            <button
                                                key={product.id}
                                                type="button"
                                                className={cn(
                                                    "w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between",
                                                    isAdded && "bg-green-50"
                                                )}
                                                onClick={() => addSaleItem(product)}
                                                disabled={isAdded}
                                            >
                                                <div>
                                                    <div className="font-medium">{product.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {product.sku} | {product.weight}kg | 在庫: {stock}
                                                    </div>
                                                </div>
                                                {isAdded && <Badge variant="outline">追加済</Badge>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 追加済み商品一覧 */}
                        {saleItems.length > 0 ? (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>商品名</TableHead>
                                            <TableHead className="text-right">現在庫</TableHead>
                                            <TableHead className="text-right w-[150px]">数量 *</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {saleItems.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="font-medium">{item.product.name}</div>
                                                    <div className="text-xs text-gray-500">{item.product.sku}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={cn(
                                                        "font-medium",
                                                        item.currentStock === 0 && "text-red-600",
                                                        item.currentStock < item.quantity && item.currentStock > 0 && "text-amber-600"
                                                    )}>
                                                        {item.currentStock.toLocaleString()}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={item.quantity || ""}
                                                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                                                        className="w-[120px] text-right"
                                                        placeholder="0"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeSaleItem(item.id)}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* サマリー */}
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <span className="text-sm text-muted-foreground">
                                        {saleItems.length}商品 / 合計 {totalQuantity.toLocaleString()}個
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>商品を検索して追加してください</p>
                            </div>
                        )}

                        {/* 在庫警告 */}
                        {hasStockWarning && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                在庫より多い数量が設定されている商品があります
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* オプション */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PackageCheck className="h-5 w-5" />
                            オプション
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="allocateStock"
                                checked={allocateStock}
                                onCheckedChange={(checked) => setAllocateStock(checked === true)}
                            />
                            <Label htmlFor="allocateStock" className="text-sm font-normal cursor-pointer">
                                登録時に在庫から引当を行う（在庫数を減らします）
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                {/* 送信ボタン */}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => router.back()}>
                        キャンセル
                    </Button>
                    <Button type="submit" disabled={creating || eventsLoading}>
                        {creating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                登録中...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                特売イベントを登録
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default function NewEventPage(): React.ReactElement {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <NewEventContent />
        </Suspense>
    );
}
