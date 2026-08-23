"use client";

import React, { useMemo } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { Product, WorkInProgress, IncomingStock, SupplierStockLot } from "@/types";
import { calculateStockStatus, calculateStockPrediction, getPitch } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { SaleEvent } from "@/hooks/use-sale-events";

type InventoryPrintViewProps = {
    products: Product[];
    inventoryMap: Map<string, { quantity: number; oldPriceQuantity?: number; updatedAt?: string }>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    detailedSaleAllocationMap?: Map<string, Array<{ eventId: string; clientName: string; quantity: number; dates: string[] }>>;
    wipMap: Map<string, WorkInProgress[]>;
    supplierStockMap: Map<string, number>;
    supplierStockLotsMap: Map<string, SupplierStockLot[]>;
    incomingMap: Map<string, { total: number; items: IncomingStock[] }>;
    // 在庫予測に必要な特売イベント情報
    saleEvents?: SaleEvent[];
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
    saleEvents = [],
    settings
}: InventoryPrintViewProps): React.ReactElement {
    const totals = useMemo((): { meters: number; bags: number; price: number } => {
        let meters = 0;
        let bags = 0;
        let price = 0;
        
        products.forEach((p: Product) => {
            const inv = inventoryMap.get(p.id);
            const currentStock = inv ? inv.quantity : 0;
            const status = calculateStockStatus(p, currentStock, { bags: 0, meters: 0 }, settings);
            
            if (status.isRoll) {
                meters += currentStock;
            } else {
                bags += currentStock;
            }
            
            const oldQty: number = inv?.oldPriceQuantity || 0;
            const newQty: number = Math.max(0, currentStock - oldQty);

            // 旧価格在庫の計算
            if (oldQty > 0) {
                const oldUnit: number = Number(p.oldUnitPrice ?? p.unitPrice) || 0;
                const oldPrint: number = Number(p.oldPrintingCost ?? p.printingCost) || 0;
                price += oldQty * (oldUnit + oldPrint);
            }

            // 新価格在庫の計算
            if (newQty > 0) {
                const newUnit: number = Number(p.unitPrice) || 0;
                const newPrint: number = Number(p.printingCost) || 0;
                price += newQty * (newUnit + newPrint);
            }
        });
        return { meters, bags, price };
    }, [products, inventoryMap, settings]);

    // 各商品の在庫予測を事前計算
    const predictionMap = useMemo(() => {
        const map = new Map<string, ReturnType<typeof calculateStockPrediction>>();
        products.forEach(product => {
            const currentStock = inventoryMap.get(product.id)?.quantity || 0;
            const wipList = wipMap.get(product.id) || [];
            const incoming = incomingMap.get(product.id);

            // ロットがある場合はロットの合計を優先
            const supplierStockLots = supplierStockLotsMap?.get(product.id) || [];
            const supplierStock = supplierStockLots.length > 0
                ? supplierStockLots.reduce((sum, lot) => sum + lot.quantity, 0)
                : (supplierStockMap.get(product.id) || 0);

            // 対象の特売引当データを抽出
            const relevantSaleItems = saleEvents
                .filter(event => (event.status === 'active' || event.status === 'upcoming'))
                .flatMap(event => {
                    const item = event.items.find(i => i.productId === product.id);
                    return item && !item.isProduced ? [{ dates: event.dates, quantity: item.allocatedQuantity, eventName: event.clientName }] : [];
                });

            map.set(product.id, calculateStockPrediction(
                currentStock,
                product.dailyShipmentRate || 0,
                product.productionLeadDays || 0,
                product,
                relevantSaleItems,
                wipList.filter(item => item.status === 'in_progress').map(item => ({
                    quantity: item.quantity,
                    expectedDate: item.expectedCompletion ? new Date(item.expectedCompletion) : null,
                    termType: item.termType
                })),
                incoming?.items.map(item => ({ 
                    quantity: item.quantity, 
                    expectedDate: item.expectedDate ? new Date(item.expectedDate) : null 
                })) || [],
                supplierStock
            ));
        });
        return map;
    }, [products, inventoryMap, wipMap, incomingMap, supplierStockLotsMap, supplierStockMap, saleEvents]);

    const summaryCounts = useMemo(() => {
        let outOfStock = 0;
        let lowStock = 0;
        let wipAlert = 0;

        products.forEach((product) => {
            const inventoryItem = inventoryMap.get(product.id) || { quantity: 0 };
            const currentStock = inventoryItem.quantity;
            const allocation = saleAllocationMap.get(product.id) || { bags: 0, meters: 0 };
            const { isOutOfStock, isLowStock } = calculateStockStatus(product, currentStock, allocation, settings);
            const prediction = predictionMap.get(product.id);

            if (isOutOfStock) {
                outOfStock++;
            } else if (isLowStock) {
                lowStock++;
            }

            if (prediction?.wipStartAlert) {
                wipAlert++;
            }
        });

        return { outOfStock, lowStock, wipAlert };
    }, [products, inventoryMap, saleAllocationMap, settings, predictionMap]);

    // 産地・カテゴリごとの件数マップ
    const regionCounts = useMemo(() => {
        const counts = new Map<string, number>();
        products.forEach(p => {
            const region = extractRegion(p.name);
            counts.set(region, (counts.get(region) || 0) + 1);
        });
        return counts;
    }, [products]);

    const today = format(new Date(), "yyyy年MM月dd日 HH:mm", { locale: ja });

    let lastRegion = "";

    return (
        <div className="hidden print:block p-4 sm:p-8 bg-white text-black min-h-screen font-sans">
            {/* 印刷用CSS定義 */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    thead { display: table-header-group !important; }
                    tr { break-inside: avoid !important; }
                    @page { margin: 8mm 6mm; }
                }
            ` }} />

            {/* 印刷用ヘッダー */}
            <div className="flex justify-between items-end mb-2 border-b-2 border-slate-900 pb-2">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">米袋 在庫状況一覧</h1>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">Inventory Status Report</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-medium text-slate-700">作成日時: {today}</p>
                    <p className="text-[10px] text-slate-500">対象件数: {products.length}点</p>
                </div>
            </div>

            {/* サマリーバー（要対応アラート一覧） */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-300 rounded px-3 py-1.5 mb-3 text-[9px]">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-700">【要対応ステータス】</span>
                    <span className={cn(
                        "px-2 py-0.5 rounded font-bold transition-colors",
                        summaryCounts.outOfStock > 0 ? "bg-red-600 text-white" : "bg-slate-200 text-slate-500"
                    )}>
                        欠品: {summaryCounts.outOfStock}件
                    </span>
                    <span className={cn(
                        "px-2 py-0.5 rounded font-bold transition-colors",
                        summaryCounts.lowStock > 0 ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-200 text-slate-500"
                    )}>
                        低在庫: {summaryCounts.lowStock}件
                    </span>
                    <span className={cn(
                        "px-2 py-0.5 rounded font-bold transition-colors",
                        summaryCounts.wipAlert > 0 ? "bg-orange-100 text-orange-800 border border-orange-300" : "bg-slate-200 text-slate-500"
                    )}>
                        仕掛手配推奨: {summaryCounts.wipAlert}件
                    </span>
                </div>
                <div className="text-slate-500 text-[8px]">
                    ※ 赤・黄ハイライトの行を優先して確認・発注手配してください
                </div>
            </div>

            {/* テーブル */}
            <table className="w-full border-collapse table-fixed text-[9px]">
                <thead>
                    <tr className="bg-slate-100 border-y-2 border-slate-900">
                        <th className="py-1 px-1 text-left font-bold" style={{ width: '25%' }}>商品情報</th>
                        <th className="py-1 px-1 text-center font-bold" style={{ width: '7%' }}>量目</th>
                        <th className="py-1 px-1 text-right font-bold" style={{ width: '10%' }}>在庫(現/有)</th>
                        <th className="py-1 px-1 text-right font-bold" style={{ width: '12%' }}>引当</th>
                        <th className="py-1 px-1 text-right font-bold" style={{ width: '10%' }}>入荷予定</th>
                        <th className="py-1 px-1 text-right font-bold" style={{ width: '8%' }}>メーカー</th>
                        <th className="py-1 px-1 text-right font-bold" style={{ width: '14%' }}>仕掛</th>
                        {/* 在庫予測列 */}
                        <th className="py-1 px-1 text-center font-bold bg-blue-50 border-x border-blue-200" style={{ width: '8%' }}>予測(残/枯渇)</th>
                        <th className="py-1 px-1 text-center font-bold" style={{ width: '6%' }}>状況</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                    {products.map((product, idx) => {
                        const inventoryItem = inventoryMap.get(product.id) || { quantity: 0 };
                        const currentStock = inventoryItem.quantity;
                        const oldPriceQty = inventoryItem.oldPriceQuantity || 0;
                        const allocation = saleAllocationMap.get(product.id) || { bags: 0, meters: 0 };
                        const incoming = incomingMap.get(product.id);
                        
                        const supplierStockLots = supplierStockLotsMap?.get(product.id) || [];
                        const supplierStock = supplierStockLots.length > 0
                            ? supplierStockLots.reduce((sum, lot) => sum + lot.quantity, 0)
                            : (supplierStockMap.get(product.id) || 0);

                        const {
                            availableStock,
                            isOutOfStock,
                            isLowStock,
                            isRoll,
                        } = calculateStockStatus(product, currentStock, allocation, settings);

                        const wips = wipMap.get(product.id) || [];

                        // 在庫予測データ
                        const prediction = predictionMap.get(product.id);
                        const isWipAlert = prediction?.wipStartAlert;

                        // 行の背景色クラス（異常値ハイライト ＆ ゼブラストライプ）
                        const rowBgClass = isOutOfStock
                            ? "bg-red-50/90 font-medium"
                            : isLowStock || isWipAlert
                            ? "bg-amber-50/70"
                            : idx % 2 === 1
                            ? "bg-slate-50/50"
                            : "bg-white";

                        // 産地セクションの切り替え判定
                        const currentRegion = extractRegion(product.name);
                        const showSectionHeader = currentRegion !== lastRegion;
                        if (showSectionHeader) {
                            lastRegion = currentRegion;
                        }

                        return (
                            <React.Fragment key={product.id}>
                                {showSectionHeader && (
                                    <tr className="bg-slate-200/90 border-y border-slate-400 font-bold text-[8.5px] text-slate-800 break-inside-avoid">
                                        <td colSpan={9} className="py-1 px-2">
                                            <div className="flex items-center justify-between">
                                                <span className="tracking-wide">── {currentRegion} ({regionCounts.get(currentRegion) || 0}点) ──</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                <tr className={cn("break-inside-avoid transition-colors", rowBgClass)}>
                                    {/* 商品情報 */}
                                    <td className="py-1.5 px-1 align-top">
                                        <div className="flex items-start gap-1">
                                            {/* チェックボックス枠（印刷後の棚卸・チェック用） */}
                                            <span className="inline-block w-2.5 h-2.5 border border-slate-400 rounded-sm mt-0.5 shrink-0" />
                                            <div>
                                                <div className="font-bold text-[10px] leading-snug">
                                                    {product.name}
                                                </div>
                                                <div className="text-slate-500 font-mono mt-px text-[7px] flex gap-2 items-center">
                                                    <span>№:{product.sku || '-'}</span>
                                                    {product.janCode && <span>JAN:{product.janCode}</span>}
                                                    {oldPriceQty > 0 && (
                                                        <span className="text-amber-800 bg-amber-100 px-1 rounded font-sans font-bold text-[6.5px]">
                                                            旧価残: {oldPriceQty.toLocaleString()}{isRoll ? 'm' : '枚'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-1.5 px-1 text-center align-top leading-tight">
                                        <div className="font-medium text-slate-700 whitespace-nowrap">{product.weight}kg</div>
                                        <div className="text-[7px] text-slate-500 whitespace-nowrap">{getPitch(product.weight || 0)}mm / {product.shape || '-'}</div>
                                    </td>
                                    <td className="py-1.5 px-1 text-right align-top tabular-nums">
                                        <div className="text-[11px] text-slate-900 border-b border-slate-200 pb-[1px] mb-0.5">
                                            <span className="text-[7px] font-normal mr-0.5 opacity-70">現:</span>
                                            <span className="font-bold">{currentStock.toLocaleString()}{isRoll ? 'm' : '枚'}</span>
                                        </div>
                                        <div className={cn("text-[8px] leading-tight", availableStock < 0 ? "text-red-700 font-bold bg-red-100/80 px-0.5 rounded" : "text-slate-500")}>
                                            <span className="opacity-70">有:</span>
                                            <span>{availableStock.toLocaleString()}{isRoll ? 'm' : '枚'}</span>
                                        </div>
                                    </td>
                                    <td className="py-1.5 px-1 text-right align-top tabular-nums text-slate-500 text-[9px]">
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
                                                     .map((alloc, i) => {
                                                         const isNear = isWithinDays(alloc.dates[0]);
                                                         return (
                                                             <div key={i} className={cn(
                                                                 "text-[7px] leading-tight flex flex-col items-end",
                                                                 isNear ? "bg-blue-50/80 p-0.5 rounded border border-blue-200" : "opacity-90"
                                                             )}>
                                                                 <div className="flex justify-between w-full gap-1">
                                                                     <span className={cn(isNear ? "font-bold text-blue-900" : "")}>
                                                                         {alloc.dates[0] ? format(new Date(alloc.dates[0]), "MM/dd") : '未定'}
                                                                     </span>
                                                                     <span className="font-medium text-blue-700">{alloc.quantity.toLocaleString()}枚</span>
                                                                 </div>
                                                                 <span className="text-[6px] truncate max-w-[80px] text-slate-400">{alloc.clientName}</span>
                                                             </div>
                                                         );
                                                     })}
                                            </div>
                                         ) : '-'}
                                    </td>
                                    <td className="py-1.5 px-1 text-right align-top tabular-nums text-emerald-800">
                                        {incoming && incoming.total > 0 ? (
                                            <>
                                                <div className="font-bold">{incoming.total.toLocaleString()}{isRoll ? 'm' : '枚'}</div>
                                                {[...incoming.items]
                                                    .sort((a, b) => {
                                                        const dateA = a.expectedDate || "9999-12-31";
                                                        const dateB = b.expectedDate || "9999-12-31";
                                                        return dateA.localeCompare(dateB);
                                                    })
                                                    .map((item, i) => {
                                                        const isNear = isWithinDays(item.expectedDate);
                                                        return (
                                                            <div key={i} className={cn(
                                                                "flex flex-col items-end text-[7px] leading-tight gap-0",
                                                                isNear ? "bg-emerald-50 p-0.5 rounded border border-emerald-200 font-bold" : "opacity-90"
                                                            )}>
                                                                <div className="flex justify-between w-full gap-1">
                                                                     <span>{item.expectedDate ? format(new Date(item.expectedDate), "M/d") : '未定'}</span>
                                                                     <span className="font-medium">{item.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}</span>
                                                                </div>
                                                                {item.note && <span className="text-[6px] text-slate-500 truncate max-w-[80px] break-all">{item.note}</span>}
                                                            </div>
                                                        );
                                                    })}
                                             </>
                                         ) : '-'}
                                    </td>
                                    <td className="py-1.5 px-1 text-right align-top tabular-nums text-orange-700">
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
                                    <td className="py-1.5 px-1 text-right align-top tabular-nums text-blue-800">
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
                                                    let isNear = false;
                                                    if (w.expectedCompletion) {
                                                        const d = new Date(w.expectedCompletion);
                                                        isNear = isWithinDays(d);
                                                        if (w.termType === 'specific') {
                                                            dateStr = format(d, "M/d");
                                                        } else {
                                                            const termMap: Record<string, string> = { early: '上', mid: '中', late: '下' };
                                                            dateStr = `${format(d, "M")}月${termMap[w.termType] || ''}`;
                                                        }
                                                    }
                                                    return (
                                                        <div key={w.id} className={cn(
                                                            "flex justify-between text-[7px] leading-tight gap-1",
                                                            isNear ? "bg-blue-50/80 p-0.5 rounded border border-blue-200 font-bold" : "opacity-90"
                                                        )}>
                                                            <span>{dateStr}</span>
                                                            <span className="font-medium">{w.quantity.toLocaleString()}{isRoll ? 'm' : '枚'}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : '-'}
                                    </td>

                                    {/* 在庫予測列 */}
                                    <td className="py-1.5 px-1 text-center align-middle bg-blue-50/30 border-x border-blue-100">
                                        {prediction && prediction.estimatedDate ? (
                                            <div className="flex flex-col items-center gap-0.5">
                                                {/* 残り日数（危険度に応じたカラーリング） */}
                                                <div className={cn(
                                                    "font-bold text-[9px] px-1 rounded leading-tight",
                                                    prediction.remainingDays <= 14 || prediction.wipStartAlert
                                                        ? "text-red-700 bg-red-100 font-extrabold"
                                                        : prediction.remainingDays <= 30
                                                        ? "text-amber-800 bg-amber-100 font-bold"
                                                        : "text-slate-800 font-semibold"
                                                )}>
                                                    {prediction.remainingDays}日
                                                </div>
                                                <div className="text-[7px] text-slate-500 whitespace-nowrap">
                                                    {format(prediction.estimatedDate, "M/d")}
                                                </div>
                                                {prediction.wipStartAlert && (
                                                    <div className="text-[6px] font-bold text-white bg-red-600 rounded px-1 py-[1px] leading-tight whitespace-nowrap shadow-sm">
                                                        仕掛開始!
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[8px] text-slate-300">-</span>
                                        )}
                                    </td>

                                    <td className="py-1.5 px-1 text-center align-middle">
                                        <div className="flex flex-col gap-0.5 items-center justify-center">
                                            {isOutOfStock ? (
                                                <span className="text-white font-bold bg-red-600 px-1.5 py-0.5 rounded-[2px] text-[8px] leading-none shadow-sm">
                                                    欠品
                                                </span>
                                            ) : isLowStock ? (
                                                <span className="text-amber-800 font-bold border border-amber-500 bg-amber-100 px-1.5 py-0.5 rounded-[2px] text-[8px] leading-none">
                                                    低在庫
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 font-normal border border-slate-200 px-1 py-[1px] rounded-[2px] text-[8px] bg-slate-50 leading-none">
                                                    正常
                                                </span>
                                            )}
                                            
                                            {/* 全体状況（スポット、廃盤など） */}
                                            {product.status !== 'active' && (
                                                <div className="text-[7px] text-slate-500 mt-0.5 scale-90 whitespace-nowrap font-medium">
                                                    {getStatusLabel(product.status)}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            {/* 合計欄 */}
            <div className="flex justify-end mt-2 pt-1 border-t-2 border-slate-700 gap-6 text-[10px] text-slate-800 font-bold mb-4 mr-2">
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

            {/* 凡例 */}
            <div className="flex flex-wrap gap-4 text-[8px] text-slate-600 mb-4 ml-1">
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded-sm"></span>
                    赤色行: 欠品中（有効在庫マイナス）
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-amber-100 border border-amber-300 rounded-sm"></span>
                    黄色行: 低在庫 / 仕掛開始アラート対象
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-blue-50 border border-blue-200 rounded-sm"></span>
                    予測列: 残日数14日以下は赤強調、30日以下は黄強調
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 border border-slate-400 rounded-sm"></span>
                    先頭枠: 実地棚卸・確認用チェック欄
                </span>
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


        </div>
    );
}

function hasAllocation(allocation: { bags: number; meters: number }): boolean {
    return allocation.bags > 0 || allocation.meters > 0;
}

function extractRegion(productName: string): string {
    const cleaned = productName.replace(/^【[^】]+】\s*/, '').trim();
    const prefectures = [
        "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
        "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
        "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
        "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
        "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
        "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
        "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
    ];
    for (const pref of prefectures) {
        if (cleaned.startsWith(pref) || productName.includes(pref)) {
            return pref;
        }
    }
    const keywords = ["国内産", "国産", "ブレンド", "業務用", "無洗米", "金賞健康米", "ＪＡ"];
    for (const kw of keywords) {
        if (cleaned.startsWith(kw) || productName.includes(kw)) {
            return kw;
        }
    }
    const firstToken = cleaned.split(/[\s　]+/)[0];
    return firstToken && firstToken.length <= 6 ? firstToken : "共通・その他";
}

function isWithinDays(dateStrOrObj: string | Date | null | undefined, days: number = 7): boolean {
    if (!dateStrOrObj) return false;
    const target = new Date(dateStrOrObj).getTime();
    if (isNaN(target)) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = (target - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= days;
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
