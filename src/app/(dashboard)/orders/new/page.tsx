"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft, Send, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useDeliveryAddresses } from "@/hooks/use-delivery-addresses";
import { useWorkInProgress } from "@/hooks/use-work-in-progress";
import { useSupplierStockLots } from "@/hooks/use-supplier-stock-lots";
import { DeliveryAddressDialog } from "@/components/orders/delivery-address-dialog";
import { isRollBag, metersToBags } from "@/lib/services/inventory-service";
import type { WorkInProgress } from "@/types";
import { CopyNotificationDialog } from "@/components/notifications/copy-notification-dialog";
import { generateOrderNotificationText } from "@/lib/email-templates";
import { toast } from "react-hot-toast";


export default function NewOrderPage(): React.ReactElement {
    const router = useRouter();
    const { items, updateQuantity, removeFromCart, clearCart, getTotalPrice } = useCart();
    const { addresses, refetch: refetchAddresses, loading: loadingAddresses } = useDeliveryAddresses();
    const { items: wipItems } = useWorkInProgress();
    const { lotsMap } = useSupplierStockLots();
    const [loading, setLoading] = useState(false);
    const { user } = useAuthSession();

    // 出荷元 ('supplier' | 'wip' | 'wip-request')
    const [shipmentSource, setShipmentSource] = useState<'supplier' | 'wip' | 'wip-request'>('supplier');
    // 選択された住所ID ('' | addressId | 'manufacturer-storage')
    const [selectedAddressId, setSelectedAddressId] = useState<string>("");
    // 住所追加ダイアログの状態
    const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
    
    // コピータスク用ステート
    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [copyContent, setCopyContent] = useState("");
    const [orderId, setOrderId] = useState<string | null>(null);

    // 初期ロード時にデフォルト住所を選択
    React.useEffect(() => {
        if (!loadingAddresses && addresses.length > 0 && !selectedAddressId) {
            const defaultAddr = addresses.find(a => a.isDefault);
            if (defaultAddr) {
                setSelectedAddressId(defaultAddr.id);
            } else {
                setSelectedAddressId(addresses[0].id);
            }
        }
    }, [addresses, selectedAddressId, loadingAddresses]);

    const onSubmit = async (): Promise<void> => {
        const validItems = items.filter(i => i.quantity > 0);
        if (validItems.length === 0) {
            alert("出荷数量を入力してください");
            return;
        }

        if (!user?.id) {
            alert("ログイン情報が取得できません。再ログインしてください。");
            return;
        }

        const selectedAddress = addresses.find(a => a.id === selectedAddressId);
        if (!selectedAddress && selectedAddressId !== 'manufacturer-storage') {
            alert("納品場所を選択してください");
            return;
        }

        setLoading(true);

        try {
            // 認証済みユーザーのIDを使用
            const clientId = user.id;

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: validItems.map(i => ({ productId: i.product.id, quantity: i.quantity })),
                    clientId,
                    type: 'standard', // デフォルト
                    shipmentSource,
                    deliveryName: selectedAddressId === 'manufacturer-storage' ? 'メーカー預かり' : selectedAddress?.name,
                    deliveryPostalCode: selectedAddressId === 'manufacturer-storage' ? '' : selectedAddress?.postalCode,
                    deliveryAddress: selectedAddressId === 'manufacturer-storage' ? '-' : selectedAddress?.address,
                    deliveryPhone: selectedAddressId === 'manufacturer-storage' ? '-' : selectedAddress?.phone,
                    preferredShape: selectedAddressId === 'manufacturer-storage' ? null : selectedAddress?.preferredShape
                })
            });

            const result = await response.json();
            if (!response.ok) {
                alert(`エラーが発生しました: ${result.error}`);
                return;
            }

            const order = result.data;
            if (order) {
                setOrderId(order.id);
                const text = generateOrderNotificationText({
                    orderId: order.id,
                    clientName: user.name || "ユーザー",
                    items: validItems.map(i => ({
                        productName: i.product.name,
                        quantity: i.quantity,
                        unit: isRollBag(i.product.shape || "", i.product.category) ? "m" : "枚"
                    })),
                    shipmentSource,
                    deliveryName: selectedAddressId === 'manufacturer-storage' ? 'メーカー預かり' : selectedAddress?.name,
                    deliveryPostalCode: selectedAddressId === 'manufacturer-storage' ? '' : selectedAddress?.postalCode,
                    deliveryAddress: selectedAddressId === 'manufacturer-storage' ? '-' : selectedAddress?.address,
                    deliveryPhone: selectedAddressId === 'manufacturer-storage' ? '-' : selectedAddress?.phone,
                });
                setCopyContent(text);
                setCopyDialogOpen(true);
            }

            clearCart();
            toast.success("出荷依頼を完了しました");
            // router.push('/orders'); // ダイアログを閉じた後に遷移させるように変更
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
                    <Link href="/inventory/bags">
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
                            <Link href="/inventory/bags">商品を探す</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* 出荷元選択 */}
                    <Card className="mb-6">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">出荷元を選択</CardTitle>
                            <CardDescription>どこから出荷するか選択してください。利用可能数が切り替わります。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup
                                value={shipmentSource}
                                onValueChange={(val: 'supplier' | 'wip' | 'wip-request') => {
                                    setShipmentSource(val);
                                    // 仕掛依頼以外に切り替えた時にメーカー預かりが選択されていたらリセット
                                    if (val !== 'wip-request' && selectedAddressId === 'manufacturer-storage') {
                                        setSelectedAddressId("");
                                    }
                                }}
                                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                            >
                                <div>
                                    <RadioGroupItem value="supplier" id="source-supplier" className="peer sr-only" />
                                    <Label
                                        htmlFor="source-supplier"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                                    >
                                        <div className="font-bold">メーカー在庫</div>
                                        <div className="text-xs text-muted-foreground mt-1 text-center">メーカー分を直送指示</div>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="wip" id="source-wip" className="peer sr-only" />
                                    <Label
                                        htmlFor="source-wip"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                                    >
                                        <div className="font-bold">仕掛中</div>
                                        <div className="text-xs text-muted-foreground mt-1 text-center">現在の製造分（納期確定済）</div>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="wip-request" id="source-wip-request" className="peer sr-only" />
                                    <Label
                                        htmlFor="source-wip-request"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                                    >
                                        <div className="font-bold">仕掛依頼</div>
                                        <div className="text-xs text-muted-foreground mt-1 text-center">新規手配依頼（メーカーへ依頼）</div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

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
                                        <TableHead className="w-[120px] text-right">単価</TableHead>
                                        <TableHead className="w-[140px] text-right">利用可能数</TableHead>
                                        <TableHead className="w-[200px] text-center">数量</TableHead>
                                        <TableHead className="w-[120px] text-right">小計</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
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
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span>{item.product.weight}kg / {item.product.shape || '-'}</span>
                                                        {isRollBag(item.product.shape || "") && (
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal border-blue-200 text-blue-700 bg-blue-50">
                                                                1巻: {item.product.metersPerRoll || 400}m
                                                            </Badge>
                                                        )}
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
                                                <TableCell className="text-right">
                                                    {(() => {
                                                        const isRoll = isRollBag(item.product.shape || "");
                                                        const weight = item.product.weight || 5;

                                                        if (shipmentSource === 'supplier') {
                                                            const stock = item.product.supplierStock || 0;
                                                            const productLots = lotsMap.get(item.product.id) || [];

                                                            return (
                                                                <div className="text-right space-y-1">
                                                                    <div className="font-bold text-lg">
                                                                        {stock.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                                    </div>
                                                                    {isRoll && (
                                                                        <div className="text-[10px] text-muted-foreground">
                                                                            約{metersToBags(stock, weight).toLocaleString()}枚
                                                                            {item.product.metersPerRoll ? ` / 約${(stock / item.product.metersPerRoll).toFixed(1)}巻` : ''}
                                                                        </div>
                                                                    )}

                                                                    {productLots.length > 0 && (
                                                                        <div className="mt-2 pt-1 border-t border-dashed space-y-0.5">
                                                                            {productLots.map(lot => (
                                                                                <div key={lot.id} className="text-[10px] flex justify-between gap-2 text-muted-foreground">
                                                                                    <span>{lot.stockDate}</span>
                                                                                    <span className="font-medium">{lot.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }

                                                        if (shipmentSource === 'wip') {
                                                            const productWips = wipItems.filter((w: WorkInProgress) => w.productId === item.product.id);
                                                            const totalWIP = productWips.reduce((sum: number, w: WorkInProgress) => sum + w.quantity, 0);

                                                            return (
                                                                <div className="text-right space-y-1 text-purple-600">
                                                                    <div className="font-bold text-lg">
                                                                        {totalWIP.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                                    </div>
                                                                    {isRoll && (
                                                                        <div className="text-[10px] opacity-80">
                                                                            約{metersToBags(totalWIP, weight).toLocaleString()}枚
                                                                            {item.product.metersPerRoll ? ` / 約${(totalWIP / item.product.metersPerRoll).toFixed(1)}巻` : ''}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-[10px] bg-purple-50 px-1 py-0.5 rounded inline-block">全仕掛（確定・未確定含）</div>

                                                                    {productWips.length > 0 && (
                                                                        <div className="mt-2 pt-1 border-t border-dashed border-purple-200 space-y-0.5">
                                                                            {productWips.map((w: WorkInProgress) => (
                                                                                <div key={w.id} className="text-[10px] flex justify-between gap-2 opacity-80">
                                                                                    <span>
                                                                                        {w.expectedCompletion ? (() => {
                                                                                            const d = new Date(w.expectedCompletion);
                                                                                            const month = d.getMonth() + 1;
                                                                                            if (w.termType === 'early') return `${month}月上旬`;
                                                                                            if (w.termType === 'mid') return `${month}月中旬`;
                                                                                            if (w.termType === 'late') return `${month}月下旬`;
                                                                                            return w.expectedCompletion;
                                                                                        })() : '未定'}
                                                                                    </span>
                                                                                    <span className="font-medium">{w.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }

                                                        if (shipmentSource === 'wip-request') {
                                                            return (
                                                                <div className="text-right py-2">
                                                                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">新規手配依頼</Badge>
                                                                    <div className="text-[10px] text-muted-foreground mt-1">メーカーへ新規製造を依頼します</div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const isRoll = isRollBag(item.product.shape || "");
                                                        return (
                                                            <>
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => updateQuantity(item.product.id, Math.max(0, item.quantity - 100))}
                                                                    >
                                                                        <Minus className="h-3 w-3" />
                                                                    </Button>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        value={item.quantity === 0 ? '' : item.quantity}
                                                                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                                                                        placeholder="数量入力"
                                                                        className="w-24 text-center"
                                                                        inputMode="numeric"
                                                                    />
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => updateQuantity(item.product.id, item.quantity + 100)}
                                                                    >
                                                                        <Plus className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                                {isRoll && (
                                                                    <div className="text-[10px] text-muted-foreground text-center mt-1 flex flex-col items-center">
                                                                        <span>約{metersToBags(item.quantity, item.product.weight || 5).toLocaleString()}枚相当</span>
                                                                        <span className="text-blue-600 font-medium">
                                                                            約 {(item.quantity / (item.product.metersPerRoll || 400)).toFixed(1)} 巻
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
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
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle>納品場所</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => setIsAddressDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    新規追加
                                </Button>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-4">
                                    {loading || loadingAddresses ? (
                                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">納品場所を読み込み中...</span>
                                        </div>
                                    ) : addresses.length === 0 ? (
                                        <div className="text-center py-4 text-muted-foreground text-sm">
                                            納品場所が登録されていません。<br />
                                            「新規追加」から登録してください。
                                        </div>
                                    ) : (
                                        <RadioGroup
                                            value={selectedAddressId}
                                            onValueChange={setSelectedAddressId}
                                            className="space-y-3"
                                        >
                                            {shipmentSource === 'wip-request' && (
                                                <div className="flex items-start space-x-3 border p-3 rounded-md border-primary bg-primary/5 hover:bg-primary/10 cursor-pointer" onClick={() => setSelectedAddressId('manufacturer-storage')}>
                                                    <RadioGroupItem value="manufacturer-storage" id="manufacturer-storage" className="mt-1" />
                                                    <div className="flex-1 cursor-pointer">
                                                        <Label htmlFor="manufacturer-storage" className="font-bold cursor-pointer text-primary">
                                                            メーカー預かり
                                                        </Label>
                                                        <div className="text-sm text-primary/80 mt-1">
                                                            <div>仕掛完了後、そのままメーカー倉庫に保管（預かり）とします。</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {addresses.map((addr) => (
                                                <div key={addr.id} className="flex items-start space-x-3 border p-3 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedAddressId(addr.id)}>
                                                    <RadioGroupItem value={addr.id} id={`addr-${addr.id}`} className="mt-1" />
                                                    <div className="flex-1 cursor-pointer">
                                                        <Label htmlFor={`addr-${addr.id}`} className="font-medium cursor-pointer">
                                                            {addr.name}
                                                            {addr.isDefault && <Badge variant="outline" className="ml-2 text-xs">デフォルト</Badge>}
                                                        </Label>
                                                        <div className="text-sm text-muted-foreground mt-1">
                                                            <div>〒{addr.postalCode} {addr.address}</div>
                                                            <div>TEL: {addr.phone}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    )}

                                    <div className="bg-slate-50 p-3 rounded-md border text-xs text-muted-foreground mt-4">
                                        <p className="font-medium mb-1">出荷先と条件の確認</p>
                                        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
                                            {shipmentSource === 'supplier' ? (
                                                <p>メーカーの現在庫から即座に出荷します。自庫内の在庫は変動しません。</p>
                                            ) : shipmentSource === 'wip' ? (
                                                <p>現在製造中の仕掛品（回答待ち分含む）が完成次第、出荷します。内訳を確認してください。</p>
                                            ) : (
                                                <p>新規の手配依頼を出します。「メーカー預かり」を選択すると在庫として保管されます。</p>
                                            )}
                                        </div>
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

                                    <Button onClick={onSubmit} disabled={loading || !selectedAddressId} className="w-full gap-2 mt-4" size="lg">
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

            <DeliveryAddressDialog
                open={isAddressDialogOpen}
                onOpenChange={setIsAddressDialogOpen}
                onSuccess={() => refetchAddresses()}
            />

            <CopyNotificationDialog
                open={copyDialogOpen}
                onOpenChange={(open) => {
                    setCopyDialogOpen(open);
                    if (!open) {
                        setOrderId(null);
                        router.push('/orders');
                    }
                }}
                title="出荷依頼完了"
                description="以下の内容をコピーして、メール等で通知してください。"
                content={copyContent}
                orderId={orderId}
            />
        </div>
    );
}
