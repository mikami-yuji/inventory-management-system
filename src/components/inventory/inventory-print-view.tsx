"use client";

import React, { useMemo } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { Product, WorkInProgress, IncomingStock, SupplierStockLot } from "@/types";
import { calculateStockStatus, getPitch } from "@/lib/services";
import { cn } from "@/lib/utils";

type InventoryPrintViewProps = {
    products: Product[];
    inventoryMap: Map<string, { quantity: number; updatedAt?: string }>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    detailedSaleAllocationMap?: Map<string, Array<{ eventId: string; clientName: string; quantity: number; dates: string[] }>>;
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
    detailedSaleAllocationMap,
    wipMap,
    supplierStockMap,
    supplierStockLotsMap,
    incomingMap,
    settings
}: InventoryPrintViewProps) {
    const totals = useMemo(() => {
        let meters = 0;
        let bags = 0;
        let price = 0;
        
        products.forEach(p => {
            const inv = inventoryMap.get(p.id);
            const currentStock = inv ? inv.quantity : 0;
            const status = calculateStockStatus(p, currentStock, { bags: 0, meters: 0 }, settings);
            
            if (status.isRoll) {
                meters += currentStock;
            } else {
                bags += currentStock;
            }
            
            price += currentStock * (p.unitPrice || 0);
        });
        
        return { meters, bags, price };
    }, [products, inventoryMap, settings]);

    const today = format(new Date(), "yyyy年MM月dd日 HH:mm", { locale: ja });

    return (
        <div className="hidden print:block p-4 sm:p-8 bg-white text-black min-h-screen font-sans">
            {/* 印刷用ヘッダー */}
            <div className="flex justify-between items-end mb-3 border-b border-slate-900 pb-2">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">米袋 在庫状況一覧</h1>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">Inventory Status Report</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-medium text-slate-700">作成日時: {today}</p>
                    <p className="text-[10px] text-slate-500">対象件数: {products.length}点</p>
                </div>
            </div>

            {/* テーブル */}
            <table className="w-full border-collapse table-fixed text-[9px]">
                <thead>
                    <tr className="bg-slate-100 border-y border-slate-900">
                        <th className="py-1 px-1 text-left font-bold" style={{ width: '4%' }}>画像</th>
                        <th className="py-1 px-1 text-left font-bold" style={{ width: '22%' }}>商品情報</th>
                        <th className="py-1 px-1 text-center font-bold" style={{ width: '10%' }}>量目</th>
                        <th className="py-1 px-1 text-right font-bold" style={{ width: '10%' }}>在庫(現在/有効)</th>
                        <th className="py-1 px-1 text-right font-bold" style={{ width: '14%' }}>引当</th>
                        <th className="py-1 px-1 text-right font-bold" style={{ width: '10%' }}>入荷予定</th>
                        <th className="py-1 px-1 text-right font-bold" style={{ width: '7%' }}>メーカー</th>
                        <th className="py-1 px-1 text-right font-bold" style={{ width: '15%' }}>仕掛</th>
                        <th className="py-1 px-1 text-center font-bold" style={{ width: '8%' }}>状況</th>
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
                            availableStock,
                            isOutOfStock,
                            isLowStock,
                            isRoll,
                        } = calculateStockStatus(product, currentStock, allocation, settings);

                        const wips = wipMap.get(product.id) || [];

                        return (
                            <tr key={product.id} className="break-inside-avoid">
                                <td className="py-1 px-1 align-top">
                                    {product.imageUrl ? (
                                        <div className="w-6 h-6 relative border border-slate-200 rounded overflow-hidden bg-slate-50">
                                            <img
                                                src={product.imageUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 bg-slate-50 border border-slate-100 rounded flex items-center justify-center text-slate-300 text-[6px]">
                                            No Image
                                        </div>
                                    )}
                                </td>
                                <td className="py-1 px-1 align-top">
                                    <div className="font-bold text-[10px] leading-snug truncate max-w-[160px]">
                                        {product.name}
                                    </div>
                                    <div className="text-slate-500 font-mono mt-px text-[7px] flex gap-2">
                                        <span>№:{product.sku || '-'}</span>
                                        {product.janCode && <span>JAN:{product.janCode}</span>}
                                    </div>
                                </td>
                                <td className="py-1 px-1 text-center align-top leading-tight">
                                    <div className="font-medium text-slate-700 whitespace-nowrap">{product.weight}kg</div>
                                    <div className="text-[7px] text-slate-500 whitespace-nowrap">{getPitch(product.weight || 0)}mm / {product.shape || '-'}</div>
                                </td>
                                <td className="py-1 px-1 text-right align-top tabular-nums">
                                    <div className="text-[9px] text-slate-600 border-b border-slate-200 pb-[1px] mb-[1px]">
                                        現: <span className="font-bold text-slate-800">{currentStock.toLocaleString()}{isRoll ? 'm' : ''}</span>
                                    </div>
                                    <div className={cn("text-[9px]", availableStock < 0 ? "text-red-700 font-bold" : "text-emerald-800")}>
                                        有: <span className="font-bold">{availableStock.toLocaleString()}{isRoll ? 'm' : ''}</span>
                                    </div>
                                </td>
                                <td className="py-1 px-1 text-right align-top tabular-nums text-slate-500 text-[9px] pt-1">
                                    {hasAllocation(allocation) ? (
                                        <div className="flex flex-col gap-0.5 ml-auto">
                                            <div className="font-bold border-b border-slate-200 pb-[1px] mb-[1px]">
                                                {allocation.bags.toLocaleString()}枚
                                            </div>
                                            {(detailedSaleAllocationMap?.get(product.id) || [])
                                                .sort((a, b) => {
                                                    const dateA = a.dates[0] ? new Date(a.dates[0]).getTime() : Infinity;
                                                    const dateB = b.dates[0] ? new Date(b.dates[0]).getTime() : Infinity;
                                                    return dateA - dateB;
                                                })
                                                .map((alloc, idx) => (
                                                <div key={idx} className="text-[7px] leading-tight opacity-90 flex flex-col items-end">
                                                    <div className="flex justify-between w-full gap-1">
                                                        <span>{alloc.dates[0] ? format(new Date(alloc.dates[0]), "MM/dd") : '未定'}</span>
                                                        <span className="font-medium text-blue-700">{alloc.quantity.toLocaleString()}枚</span>
                                                    </div>
                                                    <span className="text-[6px] truncate max-w-[80px] text-slate-400">{alloc.clientName}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="py-1 px-1 text-right align-top tabular-nums text-emerald-800 pt-1">
                                    {incoming && incoming.total > 0 ? (
                                        <>
                                            <div className="font-bold">{incoming.total.toLocaleString()}{isRoll ? 'm' : '枚'}</div>
                                            {[...incoming.items]
                                                .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime())
                                                .map((item, i) => (
                                                <div key={i} className="flex justify-between text-[7px] leading-tight opacity-90 gap-1">
                                                    <span>{format(new Date(item.expectedDate), "M/d")}</span>
                                                    <span className="font-medium">{item.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}</span>
                                                </div>
                                            ))}
                                        </>
                                    ) : '-'}
                                </td>
                                <td className="py-1 px-1 text-right align-top tabular-nums text-orange-700 pt-1">
                                    {supplierStock > 0 ? (
                                        <div className="flex flex-col gap-0.5 max-w-[80px] ml-auto">
                                            <div className="font-bold border-b border-orange-200 pb-[1px] mb-[1px]">
                                                {supplierStock.toLocaleString()}{isRoll ? 'm' : '枚'}
                                            </div>
                                            {[...supplierStockLots]
                                                .sort((a, b) => {
                                                    const dateA = a.stockDate ? new Date(a.stockDate).getTime() : Infinity;
                                                    const dateB = b.stockDate ? new Date(b.stockDate).getTime() : Infinity;
                                                    return dateA - dateB;
                                                })
                                                .map(lot => (
                                                <div key={lot.id} className="flex justify-between text-[7px] leading-tight opacity-90 gap-1">
                                                    <span>{lot.stockDate ? format(new Date(lot.stockDate), "M/d") : '未定'}</span>
                                                    <span className="font-medium">{lot.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="py-1 px-1 text-right align-top tabular-nums text-blue-800 pt-1">
                                    {wips.length > 0 ? (
                                        <div className="flex flex-col gap-0.5 max-w-[80px] ml-auto">
                                            <div className="font-bold border-b border-blue-200 pb-[1px] mb-[1px]">
                                                {wips.reduce((sum, w) => sum + w.quantity, 0).toLocaleString()}{isRoll ? 'm' : '枚'}
                                            </div>
                                            {[...wips]
                                                .sort((a, b) => {
                                                    const dateA = a.expectedCompletion ? new Date(a.expectedCompletion).getTime() : Infinity;
                                                    const dateB = b.expectedCompletion ? new Date(b.expectedCompletion).getTime() : Infinity;
                                                    return dateA - dateB;
                                                })
                                                .map(w => {
                                                let dateStr = "未定";
                                                if (w.expectedCompletion) {
                                                    const d = new Date(w.expectedCompletion);
                                                    if (w.termType === 'specific') {
                                                        dateStr = format(d, "M/d");
                                                    } else {
                                                        const termMap: Record<string, string> = { early: '上', mid: '中', late: '下' };
                                                        dateStr = `${format(d, "M")}月${termMap[w.termType] || ''}`;
                                                    }
                                                }
                                                return (
                                                    <div key={w.id} className="flex justify-between text-[7px] leading-tight opacity-90 gap-1">
                                                        <span>{dateStr}</span>
                                                        <span className="font-medium">{w.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="py-1 px-1 text-center align-middle">
                                    <div className="flex flex-col gap-0.5 items-center">
                                        {isOutOfStock ? (
                                            <span className="text-red-700 font-bold border-2 border-red-700 px-1 py-[1px] rounded-[2px] text-[8px] bg-red-50 leading-none">欠品</span>
                                        ) : isLowStock ? (
                                            <span className="text-amber-700 font-bold border-2 border-amber-500 px-1 py-[1px] rounded-[2px] text-[8px] bg-amber-50 leading-none">低在庫</span>
                                        ) : (
                                            <span className="text-emerald-700 font-medium border border-emerald-500 px-1 py-[1px] rounded-[2px] text-[8px] bg-emerald-50 leading-none">正常</span>
                                        )}
                                        
                                        {/* 全体状況（スポット、廃盤など） */}
                                        {product.status !== 'active' && (
                                            <div className="text-[7px] text-slate-500 mt-0.5 scale-90 whitespace-nowrap">
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

            {/* 合計欄 */}
            <div className="flex justify-end mt-1 pt-1 border-t-2 border-slate-700 gap-6 text-[10px] text-slate-800 font-bold mb-4 mr-2">
                <div className="flex items-center gap-2 text-blue-900 px-2 py-1">
                    <span>現在庫合計(ロール):</span>
                    <span className="text-[11px] tabular-nums">{totals.meters.toLocaleString()} <span className="text-[8px] font-normal">m</span></span>
                </div>
                <div className="flex items-center gap-2 text-emerald-900 px-2 py-1">
                    <span>現在庫合計(単袋):</span>
                    <span className="text-[11px] tabular-nums">{totals.bags.toLocaleString()} <span className="text-[8px] font-normal">枚</span></span>
                </div>
                <div className="flex items-center gap-2 text-slate-900 bg-slate-100 rounded px-3 py-1 ml-4 border border-slate-300">
                    <span>在庫金額合計:</span>
                    <span className="text-[11px] tabular-nums">¥{Math.round(totals.price).toLocaleString()}</span>
                </div>
            </div>

            {/* フッター */}
            <div className="mt-8 text-center text-[8px] text-slate-400 border-t border-slate-200 pt-4">
                <p className="mb-1 font-medium text-slate-500 tracking-wider font-mono">※ 本資料の在庫状況は作成日現在のシステムデータに基づいた概算値です。</p>
                <p className="mb-3">実在庫と微差が生じる場合がありますので、詳細な納期・数量については別途お問い合わせください。</p>
                <div className="flex justify-center items-center gap-6 mt-3 pt-3 border-t border-slate-100 max-w-lg mx-auto">
                    <div className="text-left">
                        <p className="font-bold text-slate-700 text-[10px]">株式会社アサヒパック</p>
                        <p>〒558-0046 大阪府大阪市住吉区上住吉1-4-2</p>
                    </div>
                    <div className="text-right border-l pl-6 border-slate-200">
                        <p>TEL: 06-6673-7771</p>
                        <p>URL: https://www.asahipac.co.jp/</p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 5mm 10mm;
                        size: A4 landscape;
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
