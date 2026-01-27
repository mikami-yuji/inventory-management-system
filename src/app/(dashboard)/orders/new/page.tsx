"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft, Send } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";


export default function NewOrderPage(): React.ReactElement {
    const router = useRouter();
    const { items, updateQuantity, removeFromCart, clearCart, getTotalPrice } = useCart();
    const [loading, setLoading] = useState(false);
    const [shipmentSource, setShipmentSource] = useState<'inventory' | 'supplier'>('inventory');

    const onSubmit = async (): Promise<void> => {
        if (items.length === 0) {
            alert("カートに商品がありません");
            return;
        }
        setLoading(true);

        try {
            // クライアントIDはモック。認証実装後は auth.user.id 等を使用
            // 今回はダミーUUIDを使用するか、既存のユーザーIDを使用
            const clientId = "00000000-0000-0000-0000-000000000000"; // 仮

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
                    clientId,
                    type: 'standard', // デフォルト
                    shipmentSource
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert(`エラーが発生しました: ${error.error}`);
                return;
            }

            clearCart();
            alert("出荷依頼を完了しました");
            router.push('/orders');
        } catch (error) {
            console.error(error);
            alert("通信エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">新規出荷依頼</h2>
                    <p className="text-muted-foreground">カート内の商品を確認して発注してください</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/inventory">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        商品を追加
                    </Link>
                </Button>
            </div>

            {items.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">カートは空です</h3>
                        <p className="text-muted-foreground mb-4">在庫一覧から商品を追加してください</p>
                        <Button asChild>
                            <Link href="/inventory">商品を探す</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* カート内容 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                カート内容
                                <Badge variant="secondary">{items.length}種類</Badge>
                            </CardTitle>
                            <CardDescription>
                                数量を確認・編集してください
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>商品名</TableHead>
                                        <TableHead className="text-right">単価</TableHead>
                                        <TableHead className="w-[180px] text-center">数量</TableHead>
                                        <TableHead className="text-right">小計</TableHead>
                                        <TableHead className="w-[60px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => {
                                        const unitTotal = item.product.unitPrice + item.product.printingCost;
                                        const subtotal = unitTotal * item.quantity;

                                        return (
                                            <TableRow key={item.product.id}>
                                                <TableCell>
                                                    <div className="font-medium">{item.product.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.product.weight}kg / {item.product.shape || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div>¥{unitTotal.toLocaleString()}</div>
                                                    {item.product.printingCost > 0 && (
                                                        <div className="text-xs text-muted-foreground">
                                                            (印刷代込)
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                                                            className="w-20 text-center"
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    ¥{subtotal.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => removeFromCart(item.product.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* 出荷オプションと合計 */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>出荷オプション</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="mb-2 block">出荷元</Label>
                                        <RadioGroup
                                            value={shipmentSource}
                                            onValueChange={(v) => setShipmentSource(v as 'inventory' | 'supplier')}
                                            className="flex flex-col space-y-2"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="inventory" id="source-inventory" />
                                                <Label htmlFor="source-inventory">自社在庫から出荷</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="supplier" id="source-supplier" />
                                                <Label htmlFor="source-supplier">メーカー在庫から直送</Label>
                                            </div>
                                        </RadioGroup>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            ※メーカー直送を選択すると、メーカー在庫のみが減少し、自社在庫は変動しません。
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>注文概要</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">小計（税別）</span>
                                        <span>¥{getTotalPrice().toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t">
                                        <span className="font-bold">合計</span>
                                        <span className="text-2xl font-bold">¥{getTotalPrice().toLocaleString()}</span>
                                    </div>

                                    <Button onClick={onSubmit} disabled={loading} className="w-full gap-2 mt-4" size="lg">
                                        <Send className="h-4 w-4" />
                                        {loading ? '送信中...' : '出荷依頼を確定'}
                                    </Button>

                                    <Button variant="outline" onClick={clearCart} className="w-full" disabled={loading}>
                                        カートを空にする
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
