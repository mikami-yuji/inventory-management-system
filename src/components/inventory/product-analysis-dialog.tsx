"use client";

import React from "react";
import { Product } from "@/types";
import { StockPredictionDialog } from "@/components/inventory/stock-prediction-dialog";

type ProductAnalysisDialogProps = {
    product: Product;
    currentStock: number;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    hasUnconfirmedWIP?: boolean;
};

export function ProductAnalysisDialog({
    product,
    currentStock,
    trigger,
    open = false,
    onOpenChange,
}: ProductAnalysisDialogProps): React.ReactElement {
    return (
        <>
            {trigger}
            <StockPredictionDialog
                product={product}
                prediction={null}
                open={open}
                onOpenChange={onOpenChange || (() => {})}
                availableStock={currentStock}
                supplierStock={product.supplierStock || 0}
                saleItems={[]}
                wipItems={[]}
                incomingItems={[]}
                initialTab="history"
            />
        </>
    );
}

