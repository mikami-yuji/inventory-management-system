
"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FileSpreadsheet, Loader2, RefreshCw } from "lucide-react";
import { Product } from "@/types";
import { useProducts } from "@/hooks/use-products";
import { useInventory } from "@/hooks/use-inventory";
import { useSuppliers } from "@/hooks/use-masters";

import { orderSheetService } from "@/lib/services/order-sheet-service";


// Helper to get recommended quantity
// Real implementation would need history for ALL products.
// For now, we will use a simple rule or fetch history one by one?
// Fetching history for all products at once is heavy.
// Let's use a simpler heuristic for now: max(0, safe_stock - current_stock)
// Or just let user input.

interface OrderSheetDialogProps {
    products: Product[];
    inventoryMap: Map<string, number>;
    trigger?: React.ReactNode;
}

export function OrderSheetDialog({ products, inventoryMap, trigger }: OrderSheetDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [orderQuantities, setOrderQuantities] = useState<Map<string, number>>(new Map());
    const { suppliers } = useSuppliers();

    // Filter low stock items (Simple check: stock < 50 for Roll, < 100 for Sheet)
    // Actually, we can reuse the logic from InventoryPage?
    // Let's duplicate simple logic for now or pass props.

    // Initialize with low stock items when opened
    useEffect(() => {
        if (open) {
            const initialSelection = new Set<string>();
            const initialQuantities = new Map<string, number>();

            products.forEach(p => {
                const stock = inventoryMap.get(p.id) || 0;
                // Simple Low Stock Logic
                const isRoll = p.shape?.includes('巻') || false; // Simple check
                const threshold = isRoll ? 50 : 100;

                if (stock < threshold) {
                    initialSelection.add(p.id);
                    // Default order quantity: 
                    // Roll: 1000 - stock (round up to 500?)
                    // Bag: 3000 - stock (round up to 500?)
                    // Just a placeholder: 
                    const suggested = isRoll ? 1000 : 3000;
                    initialQuantities.set(p.id, suggested);
                }
            });
            setSelectedProducts(initialSelection);
            setOrderQuantities(initialQuantities);
        }
    }, [open, products, inventoryMap]);

    const handleQuantityChange = (id: string, qty: number) => {
        setOrderQuantities(prev => new Map(prev).set(id, qty));
    };

    const handleToggleSelect = (id: string) => {
        setSelectedProducts(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleGenerate = () => {
        // Collect selected items
        const selectedItems = products.filter(p => selectedProducts.has(p.id));
        const quantities = new Map<string, number>();
        selectedItems.forEach(p => {
            quantities.set(p.id, orderQuantities.get(p.id) || 0);
        });

        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        orderSheetService.generateExcel(selectedItems, quantities, supplierMap);
        setOpen(false);
    };

    // Sorted products (Low stock first)
    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
            const stockA = inventoryMap.get(a.id) || 0;
            const stockB = inventoryMap.get(b.id) || 0;
            return stockA - stockB;
        });
    }, [products, inventoryMap]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" />発注書作成</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>発注書作成</DialogTitle>
                    <DialogDescription>
                        発注が必要な商品を選択し、数量を入力してください。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto border rounded-md">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white z-10">
                            <TableRow>
                                <TableHead className="w-[50px]">選択</TableHead>
                                <TableHead>商品名</TableHead>
                                <TableHead className="text-right">現在庫</TableHead>
                                <TableHead className="w-[120px]">発注数量</TableHead>
                                <TableHead className="w-[80px]">単位</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedProducts.map(product => {
                                const stock = inventoryMap.get(product.id) || 0;
                                const isSelected = selectedProducts.has(product.id);
                                const format = product.category === 'bag' ? '枚' : '個';
                                // Simple safe threshold check for styling
                                const isRoll = product.shape?.includes('巻') || false;
                                const threshold = isRoll ? 50 : 100;
                                const isLow = stock < threshold;

                                return (
                                    <TableRow key={product.id} className={isLow ? "bg-red-50/50" : ""}>
                                        <TableCell>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggleSelect(product.id)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-xs text-muted-foreground">{product.productCode}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {stock.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={orderQuantities.get(product.id) === 0 ? '' : (orderQuantities.get(product.id) || 0)}
                                                onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                                                placeholder="数量入力"
                                                className="h-8 text-right"
                                                disabled={!isSelected}
                                            />
                                        </TableCell>
                                        <TableCell>{format}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter>
                    <div className="flex justify-between w-full items-center">
                        <div className="text-sm text-muted-foreground">
                            {selectedProducts.size} 件選択中
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
                            <Button onClick={handleGenerate} disabled={selectedProducts.size === 0}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Excel出力
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
