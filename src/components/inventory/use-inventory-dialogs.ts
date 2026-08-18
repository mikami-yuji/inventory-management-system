import { useState, useCallback } from "react";
import type { Product } from "@/types";

export interface SelectedImageState {
    url: string;
    alt: string;
    name: string;
}

export function useInventoryDialogs() {
    const [editSupplierStock, setEditSupplierStock] = useState<Product | null>(null);
    const [editWIP, setEditWIP] = useState<Product | null>(null);
    const [viewAllocation, setViewAllocation] = useState<Product | null>(null);
    const [adjustStock, setAdjustStock] = useState<Product | null>(null);
    const [editStatusProduct, setEditStatusProduct] = useState<Product | null>(null);
    const [viewPrediction, setViewPrediction] = useState<Product | null>(null);
    const [selectedImage, setSelectedImage] = useState<SelectedImageState | null>(null);

    const closeAllDialogs = useCallback(() => {
        setEditSupplierStock(null);
        setEditWIP(null);
        setViewAllocation(null);
        setAdjustStock(null);
        setEditStatusProduct(null);
        setViewPrediction(null);
        setSelectedImage(null);
    }, []);

    return {
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
        setSelectedImage,
        closeAllDialogs
    };
}

export type InventoryDialogsState = ReturnType<typeof useInventoryDialogs>;
