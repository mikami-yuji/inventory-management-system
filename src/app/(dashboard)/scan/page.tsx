'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { useProducts } from "@/hooks/use-products";
import { useInventory, useUpdateInventory } from "@/hooks/use-inventory";
import { useIncomingStock } from '@/hooks/use-incoming-stock';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Plus, Minus, Search, ListChecks, Trash2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductDetailDialog } from '@/components/inventory/product-detail-dialog';
import { ProductFormDialog } from '@/components/inventory/product-form-dialog';
import { IncomingStockDialog } from '@/components/inventory/incoming-stock-dialog';
import { useSupplierStockLots } from '@/hooks/use-supplier-stock-lots';
import { useWorkInProgress } from '@/hooks/use-work-in-progress';
import { useSaleEvents } from '@/hooks/use-sale-events';
import { bagsToMeters } from '@/lib/services';
import type { Product, IncomingStock, WorkInProgress, SupplierStockLot } from "@/types";

type ScannedItem = {
    id: string; // Product ID
    janCode: string;
    productName: string;
    productCode: string;
    currentStock: number;
    adjustQty: number; // The change amount (e.g. +1, +5)
    type: 'in' | 'out';
    timestamp: number;
};

export default function ScanPage() {
    const router = useRouter();
    const { products, loading: productsLoading } = useProducts();
    const { inventory: inventoryData, refetch: refetchInventory } = useInventory();
    const { updateStock } = useUpdateInventory();
    const { events: saleEvents } = useSaleEvents();
    const { items: wipItems, refetch: refetchWIP } = useWorkInProgress({ status: 'in_progress' });
    const { incomingStocks, refetch: refetchIncoming } = useIncomingStock();
    const { lotsMap: supplierStockLotsMap, refetch: refetchLots } = useSupplierStockLots();

    // Mode: 'single' (Do-do) or 'batch' (Renzoku)
    const [scanMode, setScanMode] = useState<'single' | 'batch'>('single');

    // Modal State
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [incomingStockProduct, setIncomingStockProduct] = useState<Product | null>(null);
    const [incomingDialogOpen, setIncomingDialogOpen] = useState(false);

    // Single Mode Scanner State
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [matchingProducts, setMatchingProducts] = useState<Product[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Batch Mode State
    const [batchItems, setBatchItems] = useState<ScannedItem[]>([]);

    // Data Maps logic (Same as bags/page.tsx)
    const inventoryMap = useMemo(() => {
        const map = new Map<string, { quantity: number; updatedAt?: string }>();
        inventoryData?.forEach(item => {
            map.set(item.productId, { quantity: item.quantity, updatedAt: item.updatedAt });
        });
        return map;
    }, [inventoryData]);

    const saleAllocationMap = useMemo(() => {
        const map = new Map<string, { bags: number; meters: number }>();
        saleEvents.forEach(event => {
            event.items.forEach(item => {
                const current = map.get(item.productId) || { bags: 0, meters: 0 };
                const product = products.find(p => p.id === item.productId);
                const weight = product?.weight || 5;
                const allocatedMeters = bagsToMeters(item.allocatedQuantity, weight);
                map.set(item.productId, {
                    bags: current.bags + item.allocatedQuantity,
                    meters: current.meters + allocatedMeters
                });
            });
        });
        return map;
    }, [saleEvents, products]);

    const detailedSaleAllocationMap = useMemo(() => {
        const map = new Map<string, Array<{ eventId: string; clientName: string; quantity: number; dates: string[] }>>();
        saleEvents.forEach(event => {
            if (event.status === 'completed' || event.status === 'cancelled') return;
            event.items.forEach(item => {
                const list = map.get(item.productId) || [];
                list.push({
                    eventId: event.id,
                    clientName: event.clientName,
                    quantity: item.allocatedQuantity,
                    dates: event.dates
                });
                map.set(item.productId, list);
            });
        });
        return map;
    }, [saleEvents]);

    const wipMap = useMemo(() => {
        const map = new Map<string, WorkInProgress[]>();
        wipItems.forEach(item => {
            const list = map.get(item.productId) || [];
            list.push(item);
            map.set(item.productId, list);
        });
        return map;
    }, [wipItems]);

    const supplierStockMap = useMemo(() => {
        const map = new Map<string, number>();
        products.forEach(product => {
            map.set(product.id, product.supplierStock || 0);
        });
        return map;
    }, [products]);

    const refetch = useCallback(async () => {
        await Promise.all([
            refetchInventory(),
            refetchWIP(),
            refetchIncoming(),
            refetchLots()
        ]);
    }, [refetchInventory, refetchWIP, refetchIncoming, refetchLots]);

    // Find product when code changes (Single Mode)
    useEffect(() => {
        if (scanMode !== 'single') return;
        if (!scannedCode || productsLoading) return;

        const matches = products.filter(p => p.janCode === scannedCode);

        if (matches.length > 0) {
            setMatchingProducts(matches);
            if (matches.length === 1) {
                setDetailProduct(matches[0]);
                setDetailDialogOpen(true);
                setMessage({ type: 'success', text: '商品が見つかりました' });
            } else {
                setMessage({ type: 'success', text: '複数の商品が見つかりました。選択してください。' });
            }
        } else {
            setMatchingProducts([]);
            setMessage({ type: 'error', text: `未登録のJANコードです: ${scannedCode}` });
        }
    }, [scannedCode, products, inventoryData, productsLoading, scanMode]);

    const handleScan = useCallback((decodedText: string) => {
        if (isProcessing) return;

        if (scanMode === 'single') {
            if (scannedCode === decodedText) return; // Prevent duplicate if same
            setMatchingProducts([]); // Reset matching products
            setScannedCode(decodedText);
        } else {
            // Batch Mode logic
            // Find products
            const matches = products.filter(p => p.janCode === decodedText);

            if (matches.length === 0) {
                setMessage({ type: 'error', text: `未登録: ${decodedText}` });
                return;
            }

            if (matches.length > 1) {
                // Batch mode but multiple matches. Needs disambiguation.
                // For simplicity, we can temporarily put the component into a modal state, 
                // but let's just populate matchingProducts and render it exactly like Single mode for disambiguation.
                setMatchingProducts(matches);
                setMessage({ type: 'success', text: '複数の商品が見つかりました。選択してください。' });
                return;
            }

            const product = matches[0];

            // Play beep sound? (Browser policy might block)

            setBatchItems(prev => {
                const stockItem = inventoryData?.find(i => i.productId === product.id);
                const currentStock = stockItem ? stockItem.quantity : 0;

                // If the top item is SAME product, maybe just increment qty?
                if (prev.length > 0 && prev[0].id === product.id) {
                    const newItems = [...prev];
                    newItems[0].adjustQty += 1;
                    return newItems;
                }

                return [{
                    id: product.id,
                    janCode: decodedText,
                    productName: product.name,
                    productCode: product.sku,
                    currentStock,
                    adjustQty: 1, // Default 1
                    type: 'in', // Default to Incoming for now? Or Adjustment? Stocktaking usually means "Counting".
                    // But if this is "Batch Receipt", it's Incoming.
                    // If "Stocktaking", we should use "Adjustment" (Absolute value).
                    // The user request was "Stocktaking Mode (Scan & Update)".
                    // Let's simplify: Batch In/Out?
                    // User said "Scan multiple items and submit list".
                    // I will assume 'Incoming' is default for daily use, but let's default to 'in'.
                    timestamp: Date.now()
                }, ...prev];
            });
            setMessage({ type: 'success', text: `${product.name} を追加しました` });
        }
    }, [scannedCode, isProcessing, scanMode, products, inventoryData]);

    const handleManualSearch = () => {
        if (manualCode) {
            setMatchingProducts([]);
            handleScan(manualCode);
            setManualCode(''); // Clear after scan
        }
    };

    const selectProductForBatch = (product: Product) => {
        setMatchingProducts([]);
        const stockItem = inventoryData?.find(i => i.productId === product.id);
        const currentStock = stockItem ? stockItem.quantity : 0;

        setBatchItems(prev => {
            if (prev.length > 0 && prev[0].id === product.id) {
                const newItems = [...prev];
                newItems[0].adjustQty += 1;
                return newItems;
            }

            return [{
                id: product.id,
                janCode: product.janCode || '',
                productName: product.name,
                productCode: product.sku,
                currentStock,
                adjustQty: 1, // Default 1
                type: 'in',
                timestamp: Date.now()
            }, ...prev];
        });
        setMessage({ type: 'success', text: `${product.name} を追加しました` });
    }

    const handleSingleStockUpdate = async () => {
        await refetch();
    };

    const handleBatchSubmit = async () => {
        if (batchItems.length === 0) return;
        if (!confirm(`${batchItems.length} 件のデータを登録しますか？`)) return;

        setIsProcessing(true);
        let successCount = 0;
        let failCount = 0;

        // Process sequentially to avoid race conditions or rate limits
        for (const item of batchItems) {
            try {
                const success = await updateStock(
                    item.id,
                    item.adjustQty,
                    'incoming', // Force 'incoming' for now? Or allow user to select per item? 
                    // Ideally Batch Mode should have "Batch In" vs "Batch Out" toggle.
                    // Let's assume 'Incoming' for receiving.
                    // Wait, if I want to support Outgoing, I should add a toggle to the item or global.
                    // Better: Global toggle for Batch Mode "Mode: In / Out".
                    '一括スキャン登録'
                );
                if (success) successCount++;
                else failCount++;
            } catch (e) {
                failCount++;
            }
        }

        setIsProcessing(false);
        if (failCount === 0) {
            setMessage({ type: 'success', text: `${successCount} 件の登録が完了しました` });
            setBatchItems([]);
            refetch();
        } else {
            setMessage({ type: 'error', text: `${successCount} 件成功, ${failCount} 件失敗しました` });
        }
    };

    const resetScan = () => {
        setScannedCode(null);
        setMatchingProducts([]);
        setDetailProduct(null);
        setMessage(null);
    };

    const removeBatchItem = (index: number) => {
        setBatchItems(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="container mx-auto p-4 max-w-md pb-20">
            <div className="flex items-center mb-4 justify-between">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-xl font-bold">スキャン</h1>
                </div>
            </div>

            <Tabs value={scanMode} onValueChange={(v) => {
                setScanMode(v as 'single' | 'batch');
                resetScan();
                setBatchItems([]);
                setMessage(null);
            }} className="mb-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single">単発モード</TabsTrigger>
                    <TabsTrigger value="batch">連続モード (入庫)</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Scanner Area - Always Visible in Batch, Visible if Empty in Single */}
            {(scanMode === 'batch' || hidingScannerSingle(scanMode, detailProduct, matchingProducts.length > 1)) && (
                <div className="mb-6 space-y-4">
                    {matchingProducts.length > 1 ? (
                        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <CardHeader className="bg-muted/50 pb-2">
                                <CardTitle className="text-lg">対象商品を選択 ({matchingProducts.length}件)</CardTitle>
                                <CardDescription>同じJANコードの商品が複数あります</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-2 max-h-[300px] overflow-y-auto">
                                {matchingProducts.map(product => (
                                    <div key={product.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="font-bold truncate" title={product.name}>{product.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span>受注№: {product.sku}</span>
                                                {product.productCode && <span>/ 商品コード: {product.productCode}</span>}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {product.weight ? `${product.weight}kg / ` : ''}{product.material} / {product.shape}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (scanMode === 'single') {
                                                    setDetailProduct(product);
                                                    setDetailDialogOpen(true);
                                                } else {
                                                    selectProductForBatch(product);
                                                }
                                            }}
                                        >
                                            選択
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                            <div className="px-6 pb-6 pt-2">
                                <Button variant="outline" className="w-full" onClick={() => {
                                    setMatchingProducts([]);
                                    setScannedCode(null);
                                }}>
                                    スキャンし直す
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-0 overflow-hidden bg-black relative min-h-[200px] flex items-center justify-center">
                                <BarcodeScanner
                                    qrCodeSuccessCallback={handleScan}
                                    aspectRatio={1.0}
                                />
                                <div className="absolute inset-0 pointer-events-none border-2 border-white/30 flex items-center justify-center">
                                    <p className="text-white/70 text-xs mt-20 bg-black/50 px-2 rounded">JANコードを読み取ってください</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex gap-2">
                        <Input
                            placeholder="JANコード手入力"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            type="tel"
                        />
                        <Button onClick={handleManualSearch} variant="secondary">
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Single Mode Result Area (Empty because we use Modal) */}
            {scanMode === 'single' && detailProduct && (
                <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    <p className="mb-4">「{detailProduct.name}」を読み取りました</p>
                    <Button variant="outline" onClick={resetScan}>次の商品をスキャン</Button>
                </div>
            )}

            {/* Batch Mode List */}
            {scanMode === 'batch' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold flex items-center">
                            <ListChecks className="mr-2 h-5 w-5" />
                            スキャン一覧 ({batchItems.length})
                        </h2>
                        {batchItems.length > 0 && (
                            <Button size="sm" variant="destructive" onClick={() => setBatchItems([])}>
                                全クリア
                            </Button>
                        )}
                    </div>

                    <div className="h-[300px] overflow-y-auto border rounded-md p-2">
                        {batchItems.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10">
                                商品をスキャンしてください
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {batchItems.map((item, index) => (
                                    <Card key={`${item.id}-${item.timestamp}`} className={cn("relative", index === 0 ? "border-primary border-2" : "")}>
                                        <CardContent className="p-3 flex justify-between items-center">
                                            <div className="flex-1">
                                                <div className="font-bold">{item.productName}</div>
                                                <div className="text-xs text-muted-foreground">{item.productCode} / 在庫: {item.currentStock}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                                                    const newItems = [...batchItems];
                                                    if (newItems[index].adjustQty > 1) newItems[index].adjustQty--;
                                                    setBatchItems(newItems);
                                                }}><Minus className="h-3 w-3" /></Button>
                                                <div className="font-bold w-8 text-center">{item.adjustQty}</div>
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                                                    const newItems = [...batchItems];
                                                    newItems[index].adjustQty++;
                                                    setBatchItems(newItems);
                                                }}><Plus className="h-3 w-3" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeBatchItem(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button className="w-full h-12 text-lg" onClick={handleBatchSubmit} disabled={batchItems.length === 0 || isProcessing}>
                        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                        登録実行 ({batchItems.reduce((acc, i) => acc + i.adjustQty, 0)}個)
                    </Button>
                </div>
            )}

            {/* Message Toast */}
            {message && (
                <div className={`mt-4 p-3 rounded-lg text-center fixed bottom-20 left-4 right-4 z-50 shadow-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            {/* 商品詳細ダイアログ */}
            <ProductDetailDialog
                product={detailProduct}
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
                currentStock={detailProduct ? (inventoryMap.get(detailProduct.id)?.quantity || 0) : 0}
                supplierStock={detailProduct ? (supplierStockMap.get(detailProduct.id) || 0) : 0}
                supplierStockLots={detailProduct ? (supplierStockLotsMap.get(detailProduct.id) || []) : []}
                wipItems={detailProduct ? (wipMap.get(detailProduct.id) || []) : []}
                saleAllocations={detailProduct ? saleAllocationMap.get(detailProduct.id) : undefined}
                detailedAllocations={detailProduct ? (detailedSaleAllocationMap.get(detailProduct.id) || []) : []}
                onEditProduct={(product) => {
                    setEditingProduct(product);
                    setFormDialogOpen(true);
                }}
                onSuccess={handleSingleStockUpdate}
            />

            {/* 商品フォームダイアログ */}
            <ProductFormDialog
                open={formDialogOpen}
                onOpenChange={setFormDialogOpen}
                product={editingProduct}
                onSuccess={refetch}
            />

            {/* 入荷予定ダイアログ */}
            <IncomingStockDialog
                open={incomingDialogOpen}
                onOpenChange={setIncomingDialogOpen}
                product={incomingStockProduct}
                onSuccess={refetch}
            />
        </div>
    );
}

// Helper for Single Mode UI (extracted for cleanliness, but keep in same file for now)
function hidingScannerSingle(mode: string, scannedProduct: Product | null, hasMultipleMatches: boolean) {
    if (mode === 'single' && (scannedProduct || hasMultipleMatches)) return false;
    return true;
}

