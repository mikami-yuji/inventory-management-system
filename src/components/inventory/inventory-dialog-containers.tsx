import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import Image from "next/image";
import type { Product, WorkInProgress, IncomingStock, SupplierStockLot } from "@/types";
import type { SaleEvent } from "@/hooks/use-sale-events";
import { SupplierStockDialog } from "@/components/inventory/supplier-stock-dialog";
import { WIPDialog } from "@/components/inventory/wip-dialog";
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog";
import { StockAllocationDialog } from "@/components/inventory/stock-allocation-dialog";
import { ProductStatusDialog } from "@/components/inventory/product-status-dialog";
import { StockPredictionDialog } from "@/components/inventory/stock-prediction-dialog";
import type { InventoryDialogsState } from "./use-inventory-dialogs";
import type { calculateStockPrediction } from "@/lib/services";

export interface InventoryDialogContainersProps {
    dialogs: InventoryDialogsState;
    inventoryMap: Map<string, { quantity: number; oldPriceQuantity: number; updatedAt?: string }>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    wipMap: Map<string, WorkInProgress[]>;
    supplierStockMap: Map<string, number>;
    supplierStockLotsMap: Map<string, SupplierStockLot[]>;
    incomingMap: Map<string, { total: number; items: IncomingStock[] }>;
    saleEvents: SaleEvent[];
    predictionMap: Map<string, ReturnType<typeof calculateStockPrediction>>;
    onRefetch: () => void;
}

export function InventoryDialogContainers({
    dialogs,
    inventoryMap,
    saleAllocationMap,
    wipMap,
    supplierStockMap,
    supplierStockLotsMap,
    incomingMap,
    saleEvents,
    predictionMap,
    onRefetch
}: InventoryDialogContainersProps): React.ReactElement {
    const {
        editSupplierStock,
        setEditSupplierStock,
        editWIP,
        setEditWIP,
        viewAllocation,
        setViewAllocation,
        adjustStock,
        setAdjustStock,
        editStatusProduct,
        setEditStatusProduct,
        viewPrediction,
        setViewPrediction,
        selectedImage,
        setSelectedImage
    } = dialogs;

    return (
        <>
            {viewPrediction && (() => {
                const product = viewPrediction;
                const currentStock = inventoryMap.get(product.id)?.quantity || 0;
                const wipList = wipMap.get(product.id) || [];
                const incoming = incomingMap.get(product.id);
                const supplierStockLots = supplierStockLotsMap?.get(product.id) || [];
                const supplierStock = supplierStockLots.length > 0
                    ? supplierStockLots.reduce((sum, lot) => sum + lot.quantity, 0)
                    : (supplierStockMap.get(product.id) || 0);

                const relevantSaleItems = saleEvents
                    .filter(event => (event.status === 'active' || event.status === 'upcoming'))
                    .flatMap(event => {
                        const item = event.items.find(i => i.productId === product.id);
                        return item && !item.isProduced ? [{ dates: event.dates, quantity: item.allocatedQuantity, eventName: event.clientName }] : [];
                    });

                return (
                    <StockPredictionDialog
                        product={product}
                        prediction={predictionMap.get(product.id)}
                        open={!!viewPrediction}
                        onOpenChange={(open) => !open && setViewPrediction(null)}
                        availableStock={currentStock}
                        supplierStock={supplierStock}
                        saleItems={relevantSaleItems}
                        wipItems={wipList.filter(item => item.status === 'in_progress').map(item => ({
                            quantity: item.quantity,
                            expectedDate: item.expectedCompletion ? new Date(item.expectedCompletion) : null,
                            termType: item.termType
                        }))}
                        incomingItems={incoming?.items.map(item => ({ quantity: item.quantity, expectedDate: item.expectedDate ? new Date(item.expectedDate) : null })) || []}
                    />
                );
            })()}

            <StockAdjustmentDialog
                product={adjustStock}
                open={!!adjustStock}
                onOpenChange={(open) => !open && setAdjustStock(null)}
                currentStock={adjustStock ? (inventoryMap.get(adjustStock.id)?.quantity || 0) : 0}
                oldPriceQuantity={adjustStock ? (inventoryMap.get(adjustStock.id)?.oldPriceQuantity || 0) : 0}
                supplierStock={adjustStock ? (supplierStockMap.get(adjustStock.id) || 0) : 0}
                wipItems={adjustStock ? (wipMap.get(adjustStock.id) || []) : []}
                saleAllocations={adjustStock ? saleAllocationMap.get(adjustStock.id) : undefined}
                onSuccess={onRefetch}
            />

            <SupplierStockDialog
                product={editSupplierStock}
                open={!!editSupplierStock}
                onOpenChange={(open) => !open && setEditSupplierStock(null)}
                currentStock={editSupplierStock ? (supplierStockMap.get(editSupplierStock.id) || 0) : 0}
                onSuccess={onRefetch}
            />

            <WIPDialog
                product={editWIP}
                open={!!editWIP}
                onOpenChange={(open) => !open && setEditWIP(null)}
                onSuccess={onRefetch}
            />

            <StockAllocationDialog
                product={viewAllocation}
                isOpen={!!viewAllocation}
                onClose={() => setViewAllocation(null)}
                saleEvents={saleEvents}
                currentInventory={viewAllocation ? (inventoryMap.get(viewAllocation.id)?.quantity || 0) : 0}
                wips={viewAllocation ? (wipMap.get(viewAllocation.id) || []) : []}
                incomingItems={viewAllocation ? (incomingMap.get(viewAllocation.id)?.items || []) : []}
                supplierStock={viewAllocation ? (supplierStockMap.get(viewAllocation.id) || 0) : 0}
                onUpdate={onRefetch}
            />

            <ProductStatusDialog
                product={editStatusProduct}
                open={!!editStatusProduct}
                onOpenChange={(open) => !open && setEditStatusProduct(null)}
                onSuccess={onRefetch}
            />

            {/* 画像拡大・ダウンロードダイアログ */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-black/95 border-none">
                    <DialogTitle className="sr-only">画像プレビュー</DialogTitle>
                    <DialogDescription className="sr-only">商品の拡大画像プレビュー</DialogDescription>
                    {selectedImage && (
                        <div className="relative flex flex-col items-center justify-center min-h-[400px] pt-12 pb-8 px-6">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-white/70 hover:text-white hover:bg-white/20 rounded-full h-10 w-10 transition-colors"
                                onClick={() => setSelectedImage(null)}
                            >
                                <X className="h-6 w-6" />
                            </Button>

                            <Image
                                src={selectedImage.url}
                                alt={selectedImage.alt}
                                width={1200}
                                height={900}
                                unoptimized
                                className="w-auto h-auto max-w-full max-h-[75vh] object-contain rounded-md"
                            />

                            <div className="mt-6 flex flex-col items-center gap-4 w-full">
                                <p className="text-white text-base font-medium text-center line-clamp-2 px-12">
                                    {selectedImage.name}
                                </p>
                                <Button
                                    variant="secondary"
                                    className="w-full sm:w-auto flex items-center gap-2 mt-2"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        fetch(selectedImage.url)
                                            .then(response => response.blob())
                                            .then(blob => {
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.style.display = 'none';
                                                a.href = url;

                                                const extMatch = selectedImage.url.match(/\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i);
                                                const ext = extMatch ? extMatch[1] : 'jpg';
                                                a.download = `${selectedImage.name}.${ext}`;

                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                                document.body.removeChild(a);
                                            })
                                            .catch(err => {
                                                console.error('Download failed:', err);
                                                window.open(selectedImage.url, '_blank');
                                            });
                                    }}
                                >
                                    <Download className="h-4 w-4" />
                                    画像をダウンロード
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
