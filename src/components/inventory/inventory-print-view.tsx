"use client";

import React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { Product, WorkInProgress, IncomingStock, SupplierStockLot } from "@/types";
import { calculateStockStatus, getPitch } from "@/lib/services";
import { cn } from "@/lib/utils";

type InventoryPrintViewProps = {
    products: Product[];
    inventoryMap: Map<string, { quantity: number; updatedAt?: string }>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    wipMap: Map<string, WorkInProgress[]>;
    supplierStockMap: Map<string, number>;
    supplierStockLotsMap: Map<string, SupplierStockLot[]>;
    incomingMap: Map<string, { total: number; items: IncomingStock[] }>;
    settings?: Record<string, unknown>;
};

export function InventoryPrintView({
    products,
    inventoryMap,
    saleAllocationMap,
    wipMap,
    supplierStockMap,
    supplierStockLotsMap,
    incomingMap,
    settings
}: InventoryPrintViewProps) {
    const today = format(new Date(), "yyyy年MM月dd日 HH:mm", { locale: ja });

    return (
        <div className="hidden print:block p-4 sm:p-8 bg-white text-black min-h-screen font-sans">
            {/* 印刷用ヘッダー */}
            <div className="flex justify-between items-end mb-6 border-b-2 border-slate-900 pb-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">米袋 在庫状況一覧</h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Inventory Status Report</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-medium text-slate-700">作成日時: {today}</p>
                    <p className="text-xs text-slate-500">対象件数: {products.length}点</p>
                </div>
            </div>

            {/* テーブル */}
            <table className="w-full border-collapse text-[10px]">
                <thead>
                    <tr className="bg-slate-100 border-y border-slate-900">
                        <th className="py-2 px-1 text-left w-12 font-bold">画像</th>
                        <th className="py-2 px-2 text-left font-bold">商品名 / 受注№</th>
                        <th className="py-2 px-1 text-center w-16 font-bold">スペック</th>
                        <th className="py-2 px-1 text-right w-20 font-bold">現在庫</th>
                        <th className="py-2 px-1 text-right w-16 font-bold">引当</th>
                        <th className="py-2 px-1 text-right w-20 font-bold">有効在庫</th>
                        <th className="py-2 px-1 text-right w-20 font-bold">入荷予定</th>
                        <th className="py-2 px-1 text-right w-16 font-bold">メーカー</th>
                        <th className="py-2 px-1 text-center w-20 font-bold">状況</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                    {products.map((product) => {
                        const inventoryItem = inventoryMap.get(product.id) || { quantity: 0 };
                        const currentStock = inventoryItem.quantity;
                        const allocation = saleAllocationMap.get(product.id) || { bags: 0, meters: 0 };
                        const incoming = incomingMap.get(product.id);
                        
                        const supplierStockLots = supplierStockLotsMap?.get(product.id) || [];
                        const supplierStock = supplierStockLots.length > 0
                            ? supplierStockLots.reduce((sum, lot) => sum + lot.quantity, 0)
                            : (supplierStockMap.get(product.id) || 0);

                        const {
                            currentBags,
                            availableBags,
                            isOutOfStock,
                            isLowStock,
                            isRoll,
                        } = calculateStockStatus(product, currentStock, allocation, settings);

                        return (
                            <tr key={product.id} className="break-inside-avoid">
                                <td className="py-2 px-1 align-top">
                                    {product.imageUrl ? (
                                        <div className="w-10 h-10 relative border border-slate-200 rounded overflow-hidden bg-slate-50">
                                            <img
                                                src={product.imageUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded flex items-center justify-center text-slate-300 text-[8px]">
                                            No Image
                                        </div>
                                    )}
                                </td>
                                <td className="py-2 px-2 align-top">
                                    <div className="font-bold text-[11px] leading-snug">{product.name}</div>
                                    <div className="text-slate-500 font-mono mt-0.5">№: {product.sku || '-'}</div>
                                    {product.janCode && <div className="text-[8px] text-slate-400 mt-0.5">JAN: {product.janCode}</div>}
                                </td>
                                <td className="py-2 px-1 text-center align-top leading-tight">
                                    <div className="font-medium text-slate-700">{product.weight}kg</div>
                                    <div className="text-[9px] text-slate-500">{getPitch(product.weight || 0)}mm</div>
                                    <div className="text-[8px] text-slate-400 mt-0.5 uppercase">{product.shape || '-'}</div>
                                </td>
                                <td className="py-2 px-1 text-right align-top tabular-nums">
                                    <div className="font-bold text-[11px]">{currentStock.toLocaleString()}{isRoll ? 'm' : ''}</div>
                                    {isRoll && <div className="text-[8px] text-slate-500">約{currentBags.toLocaleString()}枚</div>}
                                </td>
                                <td className="py-2 px-1 text-right align-top tabular-nums text-slate-500">
                                    {hasAllocation(allocation) ? allocation.bags.toLocaleString() : '-'}
                                </td>
                                <td className="py-2 px-1 text-right align-top tabular-nums">
                                    <div className={cn("font-bold text-[11px]", availableBags < 0 ? "text-red-700 font-black" : "text-emerald-800")}>
                                        {availableBags.toLocaleString()}{isRoll ? 'm' : ''}
                                    </div>
                                </td>
                                <td className="py-2 px-1 text-right align-top tabular-nums text-emerald-800">
                                    {incoming && incoming.total > 0 ? (
                                        <>
                                            <div className="font-bold">{incoming.total.toLocaleString()}{isRoll ? 'm' : '枚'}</div>
                                            {incoming.items.slice(0, 1).map((item, i) => (
                                                <div key={i} className="text-[8px] opacity-80 decoration-slate-300 underline underline-offset-2">
                                                    {format(new Date(item.expectedDate), "M/d")}入荷予定
                                                </div>
                                            ))}
                                        </>
                                    ) : '-'}
                                </td>
                                <td className="py-2 px-1 text-right align-top tabular-nums text-orange-700">
                                    {supplierStock > 0 ? (
                                        <div className="font-medium">{supplierStock.toLocaleString()}</div>
                                    ) : '-'}
                                </td>
                                <td className="py-2 px-1 text-center align-top">
                                    <div className="flex flex-col gap-1 items-center">
                                        {isOutOfStock ? (
                                            <span className="text-red-700 font-bold border-2 border-red-700 px-1.5 py-0.5 rounded-sm text-[9px] bg-red-50">欠品</span>
                                        ) : isLowStock ? (
                                            <span className="text-amber-700 font-bold border-2 border-amber-500 px-1.5 py-0.5 rounded-sm text-[9px] bg-amber-50">低在庫</span>
                                        ) : (
                                            <span className="text-emerald-700 font-medium border border-emerald-500 px-1.5 py-0.5 rounded-sm text-[9px] bg-emerald-50">正常</span>
                                        )}
                                        
                                        {/* 全体状況（スポット、廃盤など） */}
                                        {product.status !== 'active' && (
                                            <div className="text-[8px] text-slate-500 mt-1 scale-90 whitespace-nowrap">
                                                {getStatusLabel(product.status)}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* フッター */}
            <div className="mt-12 text-center text-[9px] text-slate-400 border-t border-slate-200 pt-6">
                <p className="mb-1 font-medium text-slate-500 tracking-wider font-mono">※ 本資料の在庫状況は作成日現在のシステムデータに基づいた概算値です。</p>
                <p className="mb-4">実在庫と微差が生じる場合がありますので、詳細な納期・数量については別途お問い合わせください。</p>
                <div className="flex justify-center items-center gap-8 mt-4 pt-4 border-t border-slate-100 max-w-lg mx-auto">
                    <div className="text-left">
                        <p className="font-bold text-slate-700 text-sm">朝日パピルス株式会社</p>
                        <p>〒558-0001 大阪府大阪市住吉区大領</p>
                    </div>
                    <div className="text-right border-l pl-8 border-slate-200">
                        <p>TEL: 06-6673-7771</p>
                        <p>URL: https://www.asahi-papyrus.co.jp/</p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 10mm 15mm;
                        size: A4 portrait;
                    }
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

function hasAllocation(allocation: { bags: number; meters: number }): boolean {
    return allocation.bags > 0 || allocation.meters > 0;
}

function getStatusLabel(status: string | undefined): string {
    const labels: Record<string, string> = {
        'wip_check': '仕掛確認',
        'spot': 'スポット',
        'plate_removal_scheduled': '落版予定',
        'plate_removed': '落版',
        'direct_delivery': '直送在庫',
        'on_sale_break': '販売中断',
        'discontinued': '廃盤'
    };
    return status ? labels[status] || '-' : '-';
}
