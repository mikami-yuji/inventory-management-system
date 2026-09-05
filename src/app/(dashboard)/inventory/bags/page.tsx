import React, { Suspense } from "react";
import type { Metadata } from "next";
import { BagsInventoryView } from "@/components/inventory/bags/bags-inventory-view";
import { BagsInventorySkeleton } from "@/components/inventory/bags/bags-inventory-skeleton";

export const metadata: Metadata = {
    title: "米袋在庫一覧 | 在庫管理システム",
    description: "米袋・シールの在庫状況、特売引当、入荷予定、仕掛中データを一元管理",
};

export default function BagsInventoryPage(): React.ReactElement {
    return (
        <Suspense fallback={<BagsInventorySkeleton />}>
            <BagsInventoryView />
        </Suspense>
    );
}
