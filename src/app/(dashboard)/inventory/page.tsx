"use client";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MOCK_INVENTORY, MOCK_PRODUCTS, MOCK_INCOMING_STOCK } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

// ロール袋のピッチ計算 (mm)
const getPitch = (weight: number): number => {
    if (weight >= 10) return 570;
    if (weight >= 5) return 470;
    if (weight >= 3) return 400;
    if (weight >= 2) return 350;
    return 250; // 1kg以下
};

// ロール袋かどうか判定
const isRollBag = (shape: string): boolean => {
    return shape?.includes('RZ') || shape?.includes('RA') || shape?.includes('RＺ') || shape?.includes('RＡ');
};

// 1ロールあたりの概算枚数 (デフォルト: 300m/ロール)
const ROLL_LENGTH_MM = 300 * 1000; // 300m = 300,000mm
const getApproxBagCount = (weight: number): number => {
    const pitch = getPitch(weight);
    return Math.floor(ROLL_LENGTH_MM / pitch);
};

export default function InventoryPage() {
    const [currentTab, setCurrentTab] = useState("all");
    const products = MOCK_PRODUCTS;

    const filteredProducts = products.filter(p => {
        if (currentTab === "all") return true;
        return p.category === currentTab;
    });

    const getInventoryCount = (productId: string) => {
        const inv = MOCK_INVENTORY.find(i => i.productId === productId);
        return inv ? inv.quantity : 0;
    };

    const getIncomingInfo = (productId: string) => {
        const incoming = MOCK_INCOMING_STOCK.filter(i => i.productId === productId);
        if (incoming.length === 0) return null;
        // 直近の入荷を表示
        const next = incoming[0];
        return `次回: ${next.expectedDate}に${next.quantity}個`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">在庫一覧</h2>
            </div>

            <Tabs defaultValue="all" onValueChange={setCurrentTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="all">すべて</TabsTrigger>
                    <TabsTrigger value="new_rice">新米</TabsTrigger>
                    <TabsTrigger value="bag">米袋</TabsTrigger>
                    <TabsTrigger value="sticker">シール</TabsTrigger>
                    <TabsTrigger value="other">その他</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <InventoryTable products={filteredProducts} getInventoryCount={getInventoryCount} getIncomingInfo={getIncomingInfo} />
                </TabsContent>
                <TabsContent value="bag" className="mt-4">
                    <InventoryTable products={filteredProducts} getInventoryCount={getInventoryCount} getIncomingInfo={getIncomingInfo} />
                </TabsContent>
                <TabsContent value="sticker" className="mt-4">
                    <InventoryTable products={filteredProducts} getInventoryCount={getInventoryCount} getIncomingInfo={getIncomingInfo} />
                </TabsContent>
                <TabsContent value="other" className="mt-4">
                    <InventoryTable products={filteredProducts} getInventoryCount={getInventoryCount} getIncomingInfo={getIncomingInfo} />
                </TabsContent>
                <TabsContent value="new_rice" className="mt-4">
                    <InventoryTable products={filteredProducts} getInventoryCount={getInventoryCount} getIncomingInfo={getIncomingInfo} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function InventoryTable({ products, getInventoryCount, getIncomingInfo }: {
    products: any[],
    getInventoryCount: (id: string) => number,
    getIncomingInfo: (id: string) => string | null
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>商品在庫状況 ({products.length}件)</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">画像</TableHead>
                            <TableHead>商品情報</TableHead>
                            <TableHead>スペック</TableHead>
                            <TableHead className="text-right">単価 (円)</TableHead>
                            <TableHead className="text-right">現在庫</TableHead>
                            <TableHead>入荷予定</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => {
                            const quantity = getInventoryCount(product.id);
                            const incomingInfo = getIncomingInfo(product.id);
                            const isLowStock = quantity < 50;

                            return (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-400">
                                            {product.imageUrl ? "Img" : "No Img"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-gray-500">JAN: {product.janCode || '-'}</div>
                                        <div className="text-xs text-gray-400">{product.id}</div>
                                        {product.category !== 'bag' && <Badge variant="outline" className="mt-1 text-xs">{product.category}</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {(product.category === 'bag' || product.category === 'new_rice') ? (
                                                <>
                                                    <span className="font-medium">{product.weight}kg</span> / {product.shape}
                                                    {isRollBag(product.shape) && (
                                                        <div className="text-xs text-blue-600 mt-1">
                                                            ロール袋 (ピッチ: {getPitch(product.weight)}mm)
                                                            <br />
                                                            約{getApproxBagCount(product.weight).toLocaleString()}枚/ロール
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                            {product.material}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-medium">@{product.unitPrice}</div>
                                        {product.printingCost > 0 && (
                                            <div className="text-xs text-gray-500">+印 {product.printingCost}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn("font-bold text-lg", isLowStock && "text-red-600")}>
                                            {quantity.toLocaleString()}
                                        </span>
                                        {isLowStock && <span className="text-xs text-red-500 block">残りわずか</span>}
                                    </TableCell>
                                    <TableCell>
                                        {incomingInfo ? (
                                            <span className="text-sm text-emerald-600 font-medium">
                                                {incomingInfo}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
