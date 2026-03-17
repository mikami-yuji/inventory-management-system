"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PurchaseOrderView } from "@/components/orders/purchase-order-view";
import { Button } from "@/components/ui/button";
import { Printer, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function PurchaseOrderPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const [order, setOrder] = useState<any>(null);
    const [senderInfo, setSenderInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // 発注データとお届け先設定（デフォルト送信元用）を並列で取得
                const [orderRes, addressRes] = await Promise.all([
                    fetch("/api/orders"),
                    fetch("/api/delivery-addresses")
                ]);

                if (!orderRes.ok) throw new Error("発注データの取得に失敗しました");
                
                const orders = await orderRes.json();
                console.log('Orders from API:', orders.slice(0, 1)); // Debug if needed
                const foundOrder = orders.find((o: any) => o.id === id);
                
                if (!foundOrder) {
                    throw new Error("指定された発注が見つかりませんでした");
                }
                
                setOrder(foundOrder);

                // デフォルトの納品先情報を取得して、送信元として使用
                if (addressRes.ok) {
                    const addresses = await addressRes.json();
                    const defaultAddr = addresses.find((addr: any) => addr.isDefault);
                    if (defaultAddr) {
                        setSenderInfo({
                            name: defaultAddr.name,
                            postalCode: defaultAddr.postalCode,
                            address: defaultAddr.address,
                            phone: defaultAddr.phone
                        });
                    }
                }
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : "エラーが発生しました");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">発注書を準備しています...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
                <p className="text-destructive font-bold mb-4">{error || "データが見つかりません"}</p>
                <Button asChild variant="outline">
                    <Link href="/orders">一覧に戻る</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
            {/* 操作バー */}
            <div className="max-w-[800px] mx-auto mb-6 flex justify-between items-center no-print">
                <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    戻る
                </Button>
                <Button onClick={handlePrint} className="gap-2 shadow-lg">
                    <Printer className="h-4 w-4" />
                    印刷する
                </Button>
            </div>

            {/* 帳票本体 */}
            <div className="shadow-2xl print:shadow-none">
                <PurchaseOrderView order={order} senderInfo={senderInfo} />
            </div>

            {/* 印刷用案内（PC用） */}
            <div className="max-w-[800px] mx-auto mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm no-print">
                <p className="font-bold mb-1">💡 印刷のヒント</p>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>ブラウザの印刷設定で「背景のグラフィック」をオンにすると、色や枠線が綺麗に表示されます。</li>
                    <li>余白設定を「なし」または「最小」にすると、A4サイズにフィットしやすくなります。</li>
                </ul>
            </div>
        </div>
    );
}
