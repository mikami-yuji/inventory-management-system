import React from "react";
import type { Product, WorkInProgress, SupplierStockLot } from "@/types";
import { ProductDetailDialog } from "@/components/inventory/product-detail-dialog";
import { ProductAnalysisDialog } from "@/components/inventory/product-analysis-dialog";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { IncomingStockDialog } from "@/components/inventory/incoming-stock-dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type BagsDialogContainersProps = {
    detailProduct: Product | null;
    detailDialogOpen: boolean;
    setDetailDialogOpen: (open: boolean) => void;
    analysisProduct: Product | null;
    analysisDialogOpen: boolean;
    setAnalysisDialogOpen: (open: boolean) => void;
    editingProduct: Product | null;
    setEditingProduct: (product: Product | null) => void;
    formDialogOpen: boolean;
    setFormDialogOpen: (open: boolean) => void;
    incomingStockProduct: Product | null;
    incomingDialogOpen: boolean;
    setIncomingDialogOpen: (open: boolean) => void;
    deleteConfirmOpen: boolean;
    setDeleteConfirmOpen: (open: boolean) => void;
    productToDelete: Product | null;
    executeDelete: () => Promise<void>;
    handleDeleteClick: (product: Product) => void;
    refetch: () => Promise<void>;
    inventoryMap: Map<string, { quantity: number; oldPriceQuantity: number; updatedAt?: string }>;
    supplierStockMap: Map<string, number>;
    supplierStockLotsMap: Map<string, SupplierStockLot[]>;
    wipMap: Map<string, WorkInProgress[]>;
    saleAllocationMap: Map<string, { bags: number; meters: number }>;
    detailedSaleAllocationMap: Map<string, Array<{ eventId: string; clientName: string; quantity: number; dates: string[] }>>;
};

export function BagsDialogContainers({
    detailProduct,
    detailDialogOpen,
    setDetailDialogOpen,
    analysisProduct,
    analysisDialogOpen,
    setAnalysisDialogOpen,
    editingProduct,
    setEditingProduct,
    formDialogOpen,
    setFormDialogOpen,
    incomingStockProduct,
    incomingDialogOpen,
    setIncomingDialogOpen,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    productToDelete,
    executeDelete,
    handleDeleteClick,
    refetch,
    inventoryMap,
    supplierStockMap,
    supplierStockLotsMap,
    wipMap,
    saleAllocationMap,
    detailedSaleAllocationMap,
}: BagsDialogContainersProps): React.ReactElement {
    return (
        <>
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
                onEditProduct={(product): void => {
                    setEditingProduct(product);
                    setFormDialogOpen(true);
                }}
                onSuccess={refetch}
            />

            {/* 商品分析ダイアログ */}
            {analysisProduct && (
                <ProductAnalysisDialog
                    product={analysisProduct}
                    currentStock={inventoryMap.get(analysisProduct.id)?.quantity || 0}
                    open={analysisDialogOpen}
                    onOpenChange={setAnalysisDialogOpen}
                />
            )}

            {/* 商品フォームダイアログ */}
            <ProductFormDialog
                open={formDialogOpen}
                onOpenChange={setFormDialogOpen}
                product={editingProduct}
                onSuccess={refetch}
                onDelete={handleDeleteClick}
            />

            {/* 入荷予定ダイアログ */}
            <IncomingStockDialog
                open={incomingDialogOpen}
                onOpenChange={setIncomingDialogOpen}
                product={incomingStockProduct}
                onSuccess={refetch}
            />

            {/* 削除確認ダイアログ */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            「{productToDelete?.name}」を削除してもよろしいですか？<br />
                            この操作は元に戻せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(): void => setDeleteConfirmOpen(false)}>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">削除する</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
