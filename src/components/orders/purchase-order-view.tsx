"use client";

import React from "react";
import { format } from "date-fns";
import { Order } from "@/types";
import { isRollBag } from "@/lib/services/inventory-service";

type PurchaseOrderViewProps = {
    order: any; // 実際には API から取得する詳細データ
    senderInfo?: {
        name: string;
        postalCode?: string;
        address: string;
        phone: string;
    };
};

export function PurchaseOrderView({ order, senderInfo }: PurchaseOrderViewProps) {
    if (!order) return null;

    // デフォルトの送信元情報（朝日パピルス株式会社の基本情報）
    const defaultSender = {
        name: "朝日パピルス株式会社",
        postalCode: "558-0001",
        address: "大阪府大阪市住吉区大領",
        phone: "06-6673-7771"
    };

    const sender = senderInfo || defaultSender;

    return (
        <div className="bg-white p-8 max-w-[800px] mx-auto text-slate-900 font-sans print:p-0">
            {/* ヘッダー */}
            <div className="flex justify-between items-start mb-12">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">出荷依頼書</h1>
                    <p className="text-sm text-slate-500">Purchase Order</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg">{sender.name}</p>
                    {sender.postalCode && <p className="text-sm">〒{sender.postalCode}</p>}
                    <p className="text-sm">{sender.address}</p>
                    <p className="text-sm">TEL: {sender.phone}</p>
                </div>
            </div>

            {/* 注文情報 */}
            <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="border-b pb-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">依頼先</p>
                    <p className="font-bold text-xl mb-1">株式会社アサヒパック 御中</p>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-500">依頼番号</span>
                        <span className="font-mono">{order.id}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-500">依頼日</span>
                        <span>{format(new Date(order.createdAt), "yyyy年MM月dd日")}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-500">出荷元</span>
                        <span>
                            {order.shipmentSource === 'supplier' ? 'メーカー在庫出荷' : 
                             order.shipmentSource === 'inventory' ? '自社在庫出荷' : 
                             order.shipmentSource === 'wip' ? '仕掛仕上がり後出荷' : 
                             order.shipmentSource === 'wip-request' ? '仕掛依頼' : '自社在庫出荷'}
                        </span>
                    </div>
                </div>
            </div>

            {/* お届け先情報 */}
            <div className="bg-slate-50 p-4 rounded-lg mb-12 border">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">お届け先情報 (Delivery)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-slate-500 mb-1">お名前 / 屋号</p>
                        <p className="font-bold">{order.deliveryName || '（未指定）'}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 mb-1">電話番号</p>
                        <p className="font-bold">{order.deliveryPhone || '（未指定）'}</p>
                    </div>
                    <div className="col-span-full">
                        <p className="text-slate-500 mb-1">お届け先住所</p>
                        <p className="font-bold">
                            {order.deliveryPostalCode && !order.deliveryAddress?.startsWith('〒') ? `〒${order.deliveryPostalCode} ` : ''}
                            {order.deliveryAddress || '（未指定）'}
                        </p>
                    </div>
                </div>
            </div>

            {/* 明細 */}
            <div className="mb-12">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-900">
                            <th className="py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">受注No/SKU</th>
                            <th className="py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-24">量目</th>
                            <th className="py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">商品名</th>
                            <th className="py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">数量</th>
                            <th className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">形状</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {order.items.map((item: any, index: number) => (
                            <tr key={index}>
                                <td className="py-4 text-sm font-mono">{item.sku || '-'}</td>
                                <td className="py-4">
                                    <p className="text-sm font-bold">{item.weight ? `${item.weight}kg` : '-'}</p>
                                </td>
                                <td className="py-4">
                                    <p className="text-sm font-bold">{item.productName}</p>
                                </td>
                                <td className="py-4 text-right">
                                    <p className="font-bold">
                                        {item.quantity.toLocaleString()}
                                        <span className="text-xs font-normal text-slate-500 ml-1">
                                            {isRollBag(item.shape, item.category, item.metersPerRoll) || (item.metersPerRoll && item.metersPerRoll > 0) ? 'm' : '枚'}
                                        </span>
                                    </p>
                                </td>
                                <td className="py-4 text-center text-sm text-slate-600">
                                    {item.shape || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 備考・特記事項 */}
            <div className="border-2 border-slate-900 p-4 rounded-lg bg-white mt-8">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">特記事項 (Notes)</h2>
                <div className="text-slate-900">
                    {order.preferredShape ? (
                        <p className="text-lg font-bold flex items-center gap-2">
                            希望形状: <span className="text-2xl text-blue-700 underline underline-offset-4">{order.preferredShape}</span>
                        </p>
                    ) : (
                        <p className="text-sm text-slate-600 italic">特記事項はありません。</p>
                    )}
                </div>
            </div>

            {/* フッター */}
            <div className="mt-20 text-center text-[10px] text-slate-400">
                <p>本資料は、在庫管理システムより自動生成されました。</p>
            </div>

            {/* 印刷用スタイル */}
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
                    @page {
                        margin: 20mm;
                    }
                }
            `}</style>
        </div>
    );
}
