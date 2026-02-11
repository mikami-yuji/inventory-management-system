'use client';

import { useState, useCallback, useEffect } from 'react';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { useProducts, useInventory, useUpdateInventory } from '@/hooks/use-supabase-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, History, ArrowLeft, Plus, Minus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ScanPage() {
    const router = useRouter();
    const { products, loading: productsLoading } = useProducts();
    const { inventory, refetch: refetchInventory } = useInventory();
    const { updateStock, loading: updateLoading } = useUpdateInventory();

    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [scannedProduct, setScannedProduct] = useState<any | null>(null);
    const [currentStock, setCurrentStock] = useState<number | null>(null);
    const [adjustQty, setAdjustQty] = useState<string>('1');
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Find product when code changes
    useEffect(() => {
        if (!scannedCode || productsLoading) return;

        console.log("Searching for JAN:", scannedCode);
        const product = products.find(p => p.janCode === scannedCode);

        if (product) {
            setScannedProduct(product);
            // Find current stock
            const stockItem = inventory.find(i => i.productId === product.id);
            setCurrentStock(stockItem ? stockItem.quantity : 0);
            setMessage({ type: 'success', text: '商品が見つかりました' });
        } else {
            setScannedProduct(null);
            setCurrentStock(null);
            setMessage({ type: 'error', text: `未登録のJANコードです: ${scannedCode}` });
        }
    }, [scannedCode, products, inventory, productsLoading]);

    const handleScan = useCallback((decodedText: string) => {
        // Prevent continuous scanning of the same code if we are already showing it
        if (scannedCode === decodedText || isProcessing) return;

        // Simple debounce/throttle could be added here if needed
        setScannedCode(decodedText);
    }, [scannedCode, isProcessing]);

    const handleManualSearch = () => {
        if (manualCode) {
            setScannedCode(manualCode);
        }
    };

    const handleStockUpdate = async (type: 'in' | 'out') => {
        if (!scannedProduct || !adjustQty) return;

        setIsProcessing(true);
        const qty = parseInt(adjustQty, 10);
        if (isNaN(qty) || qty <= 0) {
            setMessage({ type: 'error', text: '有効な数値を入力してください' });
            setIsProcessing(false);
            return;
        }

        const quantityChange = type === 'in' ? qty : -qty;
        const newStock = (currentStock || 0) + quantityChange;

        // Optimistic update? No, wait for API.
        try {
            const success = await updateStock(
                scannedProduct.id,
                qty, // API expects absolute quantity for history log
                // API expects 'incoming' or 'outgoing'
                type === 'in' ? 'incoming' : 'outgoing',
                'モバイル・スキャン入出力'
            );

            if (success) {
                setMessage({ type: 'success', text: `${type === 'in' ? '入庫' : '出庫'}完了しました` });
                await refetchInventory(); // Reload stock
                // Update local state for immediate feedback
                setCurrentStock(newStock);
            } else {
                setMessage({ type: 'error', text: '更新に失敗しました' });
            }
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: 'エラーが発生しました' });
        } finally {
            setIsProcessing(false);
        }
    };

    const resetScan = () => {
        setScannedCode(null);
        setScannedProduct(null);
        setMessage(null);
        setAdjustQty('1');
    };

    return (
        <div className="container mx-auto p-4 max-w-md pb-20">
            <div className="flex items-center mb-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-bold">スキャン入出庫</h1>
            </div>

            {/* Scanner Area */}
            {!scannedProduct && (
                <div className="mb-6 space-y-4">
                    <Card>
                        <CardContent className="p-0 overflow-hidden bg-black relative min-h-[300px] flex items-center justify-center">
                            <BarcodeScanner
                                qrCodeSuccessCallback={handleScan}
                                aspectRatio={1.0}
                            />
                            <div className="absolute inset-0 pointer-events-none border-2 border-white/30 flex items-center justify-center">
                                <p className="text-white/70 text-sm mt-32 bg-black/50 px-2 rounded">JANコードを読み取ってください</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-2">
                        <Input
                            placeholder="JANコード手入力"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            type="tel" // Numeric keyboard
                        />
                        <Button onClick={handleManualSearch} variant="secondary">
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Result Area */}
            {scannedProduct && (
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <CardHeader className="bg-muted/50 pb-2">
                        <CardTitle className="text-lg flex justify-between items-start">
                            <span>{scannedProduct.productName}</span>
                            <Badge variant="outline">{scannedProduct.productCode}</Badge>
                        </CardTitle>
                        <CardDescription>
                            {scannedProduct.size} / {scannedProduct.material} / {scannedProduct.shape}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">現在在庫</span>
                            <span className="text-3xl font-bold text-primary">
                                {currentStock !== null ? currentStock.toLocaleString() : <Loader2 className="h-6 w-6 animate-spin" />}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">調整数量</label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setAdjustQty(Math.max(1, (parseInt(adjustQty) || 0) - 1).toString())}
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="number"
                                    value={adjustQty}
                                    onChange={(e) => setAdjustQty(e.target.value)}
                                    className="text-center text-lg font-bold"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setAdjustQty(((parseInt(adjustQty) || 0) + 1).toString())}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                                variant="destructive"
                                onClick={() => handleStockUpdate('out')}
                                disabled={isProcessing || updateLoading}
                                className="h-12"
                            >
                                出庫 (-{adjustQty})
                            </Button>
                            <Button
                                variant="default"
                                onClick={() => handleStockUpdate('in')}
                                disabled={isProcessing || updateLoading}
                                className="h-12 bg-green-600 hover:bg-green-700"
                            >
                                入庫 (+{adjustQty})
                            </Button>
                        </div>

                        <Button variant="outline" className="w-full mt-4" onClick={resetScan}>
                            次の商品をスキャン
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Message Toast/Banner */}
            {message && (
                <div className={`mt-4 p-3 rounded-lg text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            {productsLoading && (
                <p className="text-center text-muted-foreground mt-4">商品データを読み込み中...</p>
            )}
        </div>
    );
}
