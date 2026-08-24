"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Search,
    Filter,
    Loader2,
    Plus,
    Package,
    TrendingDown,
    LayoutGrid,
    List,
    X,
    AlertTriangle,
    Calendar,
    Printer,
    Download,
    ShoppingCart,
    FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import { exportElementToPdf } from "@/lib/pdf/inventory-pdf-generator";
import {
    bagsToMeters,
    calculateStockStatus,
    calculateStockPrediction
} from "@/lib/services";
import { useProducts } from "@/hooks/use-products";
import { useInventory } from "@/hooks/use-inventory";
import { useIncomingStock } from "@/hooks/use-incoming-stock";
import { useSaleEvents } from "@/hooks/use-sale-events";
import { useSupplierStockLots } from "@/hooks/use-supplier-stock-lots";
import { useAppSettings } from "@/hooks/use-masters";
import { useWorkInProgress, calculateWIPByProduct } from "@/hooks/use-work-in-progress";
import { useCart } from "@/contexts/cart-context";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { IncomingStockDialog } from "@/components/inventory/incoming-stock-dialog";
import type { Product, IncomingStock } from "@/types";
import { BagsInventoryTable } from "@/components/inventory/bags-inventory-table";
import { BagsInventoryCards } from "@/components/inventory/bags-inventory-cards";
import { ProductDetailDialog } from "@/components/inventory/product-detail-dialog";
import { ProductAnalysisDialog } from "@/components/inventory/product-analysis-dialog";
import { cn } from "@/lib/utils";
import { InventoryPrintView } from "@/components/inventory/inventory-print-view";

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

// 都道府県リスト（北から南、最後に国内産）
const PREFECTURES = [
    "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
    "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
    "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知",
    "三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山",
    "鳥取", "島根", "岡山", "広島", "山口",
    "徳島", "香川", "愛媛", "高知",
    "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄",
    "国内産", "国産" // 国内産を最後に追加
];

// 都道府県インデックスを取得
const getPrefectureIndex = (text: string | undefined): number => {
    if (!text) return 999;
    for (let i = 0; i < PREFECTURES.length; i++) {
        if (text.includes(PREFECTURES[i])) {
            return i;
        }
    }
    return 999;
};

// 商品のグループ分け
// 0: 通常
// 1: NB (NBかつ新米でない)
// 2: 新米 (新米を含む、NB・新米も含む)
const getProductGroup = (p: Product): number => {
    const name = p.name || "";
    const prefix = p.prefix || "";

    const isNewRice = name.includes("新米") || prefix.includes("新米") || p.category === "new_rice" || name.includes("ＮＢ・新米") || prefix.includes("ＮＢ・新米");
    const isNB = name.includes("NB") || name.includes("ＮＢ") || prefix.includes("NB") || prefix.includes("ＮＢ");

    if (isNewRice) return 2;
    if (isNB) return 1;
    return 0;
};

// 商品のベース名（重量表記などを除いた同一商品グループ用のキー）
const getBaseProductName = (name: string): string => {
    if (!name) return "";
    let base = name;
    // 重量表記の除去（例: 10kg, 10K, 5kg, 5K, 2kg, 2K, 300g, 1.4K, 1.4kg など）
    base = base.replace(/[0-9０-９]+(\.[0-9０-９]+)?\s*([kKＫgGｇ]|kg|KG|Kg|袋|枚)[^\s)]*/gi, "");
    // 末尾のロール記号（R, RZ, RA 等）の除去
    base = base.replace(/[\s　]+[rRＲ][zZＺａ-ｚＡ-Ｚ]?$/gi, "");
    // 末尾の単独Rの除去
    base = base.replace(/[rRＲ]$/g, "");
    return base.trim();
};

import type { SortKey, SortOrder, TableDensity } from "@/components/inventory/bags-inventory-table";

export type QuickFilterType = 'all' | 'need_order' | 'urgent_prediction' | 'reserved' | 'supply' | 'wip_check';

export default function BagsInventoryPage(): React.ReactElement {
    // 表示モード (grid | table)
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    // フィルターの表示・非表示 (スマホ・風景モード用)
    const [showFilters, setShowFilters] = useState(true);
    const [isSmallHeight, setIsSmallHeight] = useState(false);

    // ソート状態
    const [sortKey, setSortKey] = useState<SortKey>('default');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // 表示密度（ローカルストレージ連携）
    const [density, setDensityState] = useState<TableDensity>('standard');

    useEffect(() => {
        const savedDensity = localStorage.getItem('bags_table_density') as TableDensity;
        if (savedDensity === 'standard' || savedDensity === 'compact') {
            setDensityState(savedDensity);
        }
    }, []);

    const setDensity = useCallback((newDensity: TableDensity) => {
        setDensityState(newDensity);
        try {
            localStorage.setItem('bags_table_density', newDensity);
        } catch {
            // localStorage not available
        }
    }, []);

    // ソート切り替えハンドラー
    const handleSort = useCallback((key: SortKey) => {
        if (key === 'default') {
            setSortKey('default');
            setSortOrder('desc');
            return;
        }

        if (sortKey === key) {
            if (sortOrder === 'desc') {
                setSortOrder('asc');
            } else {
                setSortKey('default');
                setSortOrder('desc');
            }
        } else {
            setSortKey(key);
            // 文字列や名前・重量は昇順デフォルト、在庫数などは降順デフォルト
            if (key === 'name' || key === 'weight') {
                setSortOrder('asc');
            } else {
                setSortOrder('desc');
            }
        }
    }, [sortKey, sortOrder]);

    // 画面の高さが低い場合（横向きなど）は初期状態でフィルターを閉じる
    useEffect(() => {
        const checkHeight = () => {
            const smallHeight = window.innerHeight < 768 || window.innerWidth > window.innerHeight;
            setIsSmallHeight(smallHeight);
            if (smallHeight) {
                setShowFilters(false);
            }
        };

        checkHeight();
        window.addEventListener('resize', checkHeight);
        return () => window.removeEventListener('resize', checkHeight);
    }, []);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const { addToCart } = useCart();

    // / キーで検索バーにフォーカスするショートカット
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 入力要素にフォーカスがある場合や修飾キー押下時は無視
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (e.key === '/') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
    const [searchQuery, setSearchQuery] = useState("");
    const [weightFilter, setWeightFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");
    const [originFilter, setOriginFilter] = useState("all");
    const [varietyFilter, setVarietyFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showRemovedZeroStock, setShowRemovedZeroStock] = useState(false);

    // Supabase APIから商品と在庫を取得
    const { products: allProducts, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();
    const { inventory: inventoryData, loading: inventoryLoading, refetch: refetchInventory } = useInventory();
    const { events: saleEvents, loading: eventsLoading, refetch: refetchEvents } = useSaleEvents();
    const { items: wipItems, loading: wipLoading, refetch: refetchWIP } = useWorkInProgress('in_progress');
    const { incomingStocks, loading: incomingLoading, refetch: refetchIncoming } = useIncomingStock();
    const { lotsMap: supplierStockLotsMap, loading: lotsLoading, refetch: refetchLots } = useSupplierStockLots();
    const { settings } = useAppSettings();

    const loading = productsLoading || inventoryLoading || eventsLoading || wipLoading || incomingLoading || lotsLoading;
    const error = productsError;

    // 米袋カテゴリのみをフィルタ (bag + new_rice)
    const bagProducts = useMemo(() =>
        allProducts.filter(p => p.category === 'bag' || p.category === 'new_rice'),
        [allProducts]
    );

    // 在庫マップを作成
    const inventoryMap = useMemo(() => {
        const map = new Map<string, { quantity: number; oldPriceQuantity: number; updatedAt?: string }>();
        inventoryData?.forEach(item => {
            map.set(item.productId, { quantity: item.quantity, oldPriceQuantity: item.oldPriceQuantity || 0, updatedAt: item.updatedAt });
        });
        return map;
    }, [inventoryData]);

    // 特売引当マップを作成
    const saleAllocationMap = useMemo(() => {
        const map = new Map<string, { bags: number; meters: number }>();
        saleEvents
            .filter(event => event.status !== 'completed' && event.status !== 'cancelled')
            .forEach(event => {
                event.items.forEach(item => {
                    if (item.isProduced) return;
                    const current = map.get(item.productId) || { bags: 0, meters: 0 };
                    const product = allProducts.find(p => p.id === item.productId);
                    const weight = product?.weight || 5;
                    const allocatedMeters = bagsToMeters(item.allocatedQuantity, weight);
                    map.set(item.productId, {
                        bags: current.bags + item.allocatedQuantity,
                        meters: current.meters + allocatedMeters
                    });
                });
            });
        return map;
    }, [saleEvents, allProducts]);

    // 特売引当の詳細マップを作成 (Client Name, Dates, Qty)
    const detailedSaleAllocationMap = useMemo(() => {
        const map = new Map<string, Array<{ eventId: string; clientName: string; quantity: number; dates: string[] }>>();
        saleEvents.forEach(event => {
            if (event.status === 'completed' || event.status === 'cancelled') return;
            event.items.forEach(item => {
                if (item.isProduced) return;
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

    // 仕掛中マップを作成
    const wipMap = useMemo(() => calculateWIPByProduct(wipItems), [wipItems]);

    // メーカー在庫マップを作成
    const supplierStockMap = useMemo(() => {
        const map = new Map<string, number>();
        allProducts.forEach(product => {
            const supplierStock = product.supplierStock || 0;
            map.set(product.id, supplierStock);
        });
        return map;
    }, [allProducts]);

    // 入荷予定マップ
    const incomingMap = useMemo(() => {
        const map = new Map<string, { total: number; items: IncomingStock[] }>();

        // 商品ごとに入荷予定をグループ化
        incomingStocks.forEach(stock => {
            const current = map.get(stock.productId) || { total: 0, items: [] };

            map.set(stock.productId, {
                total: current.total + stock.quantity,
                items: [...current.items, stock].sort((a, b) => {
                    const dateA = a.expectedDate || "9999-12-31";
                    const dateB = b.expectedDate || "9999-12-31";
                    return dateA.localeCompare(dateB);
                })
            });
        });

        return map;
    }, [incomingStocks]);

    const refetch = useCallback((): void => {
        refetchProducts();
        refetchInventory();
        refetchWIP();
        refetchIncoming();
        refetchLots();
        refetchEvents();
    }, [refetchProducts, refetchInventory, refetchWIP, refetchIncoming, refetchLots, refetchEvents]);

    // 商品フォームダイアログの状態
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // 削除確認ダイアログの状態
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    // 入荷予定ダイアログの状態
    const [incomingDialogOpen, setIncomingDialogOpen] = useState(false);
    const [incomingStockProduct, setIncomingStockProduct] = useState<Product | null>(null);

    // 商品詳細ダイアログの状態
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);

    // 商品分析ダイアログの状態
    const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
    const [analysisProduct, setAnalysisProduct] = useState<Product | null>(null);

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handlePrint = useCallback(() => {
        const originalTitle = document.title;
        document.title = `アサヒパック_在庫一覧_${format(new Date(), "yyyyMMdd_HHmm")}`;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 100);
    }, []);

    // PDF直接エクスポート（固定レイアウト生成）
    const handleDownloadPdf = useCallback(async () => {
        const container = document.getElementById('inventory-print-report-container');
        if (!container) {
            toast.error('帳票データの準備ができていません');
            return;
        }

        setIsGeneratingPdf(true);
        const toastId = toast.loading('高精度PDFを生成中...');
        try {
            const filename = `アサヒパック_在庫一覧_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
            await exportElementToPdf(container, {
                filename,
                orientation: 'portrait',
                format: 'a4'
            });
            toast.success('PDFをダウンロードしました', { id: toastId });
        } catch (err) {
            console.error('PDF export error:', err);
            toast.error('PDFの生成に失敗しました', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
        }
    }, []);



    const handleAddProduct = (): void => {
        setEditingProduct(null);
        setFormDialogOpen(true);
    };

    const handleEditProduct = (product: Product): void => {
        setEditingProduct(product);
        setFormDialogOpen(true);
    };

    const handleOpenDetail = (product: Product): void => {
        setDetailProduct(product);
        setDetailDialogOpen(true);
    };

    // 削除ボタンクリック時
    const handleDeleteClick = (product: Product): void => {
        setProductToDelete(product);
        setDeleteConfirmOpen(true);
    };

    // 削除実行
    const executeDelete = async (): Promise<void> => {
        if (!productToDelete) return;

        try {
            const response = await fetch(`/api/products?id=${productToDelete.id}`, { method: "DELETE" });
            if (response.ok) {
                refetch();
                setDeleteConfirmOpen(false);
                setProductToDelete(null);
            } else {
                const result = await response.json();
                alert(result.error || "削除に失敗しました");
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("削除中にエラーが発生しました");
        }
    };

    // 利用可能な重量リストを取得
    const availableWeights = useMemo(() => {
        const weights = new Set(bagProducts.map(p => p.weight).filter(Boolean));
        return Array.from(weights).sort((a, b) => (a || 0) - (b || 0)) as number[];
    }, [bagProducts]);

    // 利用可能な産地リストを取得
    const availableOrigins = useMemo(() => {
        const origins = new Set(bagProducts.map(p => p.origin).filter(Boolean));
        return Array.from(origins).sort((a, b) => (a || "").localeCompare(b || "", "ja")) as string[];
    }, [bagProducts]);

    // 利用可能な品種リストを取得
    const availableVarieties = useMemo(() => {
        const varieties = new Set(bagProducts.map(p => p.variety).filter(Boolean));
        return Array.from(varieties).sort((a, b) => (a || "").localeCompare(b || "", "ja")) as string[];
    }, [bagProducts]);

    // ステータスの表示名マップ（ProductStatusDialog と内容を統一）
    const statusLabels: Record<string, string> = useMemo(() => ({
        active: "有効/正常",
        wip_check: "仕掛確認",
        spot: "スポット",
        plate_removal_scheduled: "落版予定",
        plate_removed: "落版",
        discontinued: "廃盤",
        direct_delivery: "直送先在庫",
        on_sale_break: "販売中断",
        inactive: "無効 (非表示)",
    }), []);

    // 予測計算をメモ化
    const predictionMap = useMemo(() => {
        const map = new Map<string, ReturnType<typeof calculateStockPrediction>>();
        bagProducts.forEach(product => {
            const currentStock = inventoryMap.get(product.id)?.quantity || 0;
            const wipList = wipMap.get(product.id) || [];
            const incoming = incomingMap.get(product.id);

            const supplierStockLots = supplierStockLotsMap?.get(product.id) || [];
            const supplierStock = supplierStockLots.length > 0
                ? supplierStockLots.reduce((sum, lot) => sum + lot.quantity, 0)
                : (supplierStockMap.get(product.id) || 0);

            const relevantSaleItems = (saleEvents || [])
                .filter(event => (event.status === 'active' || event.status === 'upcoming'))
                .flatMap(event => {
                    const item = event.items.find(i => i.productId === product.id);
                    return item && !item.isProduced ? [{ dates: event.dates, quantity: item.allocatedQuantity, eventName: event.clientName }] : [];
                });

            map.set(product.id, calculateStockPrediction(
                currentStock,
                product.dailyShipmentRate || 0,
                product.productionLeadDays || 0,
                product,
                relevantSaleItems,
                wipList.filter(item => item.status === 'in_progress').map(item => ({
                    quantity: item.quantity,
                    expectedDate: item.expectedCompletion ? new Date(item.expectedCompletion) : null,
                    termType: item.termType
                })),
                incoming?.items.map(item => ({ 
                    quantity: item.quantity, 
                    expectedDate: item.expectedDate ? new Date(item.expectedDate) : null 
                })) || [],
                supplierStock
            ));
        });
        return map;
    }, [bagProducts, inventoryMap, wipMap, incomingMap, supplierStockLotsMap, supplierStockMap, saleEvents]);

    // フィルタリングされた商品
    const filteredProducts = useMemo(() => {
        let products = bagProducts;

        // 落版かつ現在庫0のものをデフォルトで非表示にする
        if (!showRemovedZeroStock) {
            products = products.filter(p => {
                const isPlateRemoved = p.status === 'plate_removed';
                const currentStock = inventoryMap.get(p.id)?.quantity || 0;
                return !(isPlateRemoved && currentStock === 0);
            });
        }

        // クイックフィルター
        if (quickFilter === 'need_order') {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isLowStock, isOutOfStock } = calculateStockStatus(p, qty, allocation, settings);
                return isLowStock || isOutOfStock;
            });
        } else if (quickFilter === 'urgent_prediction') {
            products = products.filter(p => {
                const pred = predictionMap.get(p.id);
                if (!pred) return false;
                if (pred.wipStartAlert) return true;
                const leadDays = p.productionLeadDays || 30;
                return pred.remainingDays !== null && pred.remainingDays <= leadDays;
            });
        } else if (quickFilter === 'reserved') {
            products = products.filter(p => (saleAllocationMap.get(p.id)?.bags || 0) > 0);
        } else if (quickFilter === 'supply') {
            products = products.filter(p => {
                const inc = incomingMap.get(p.id)?.total || 0;
                const wip = (wipMap.get(p.id) || []).reduce((sum, item) => sum + item.quantity, 0);
                const lots = supplierStockLotsMap?.get(p.id) || [];
                const sup = lots.length > 0 ? lots.reduce((sum, lot) => sum + lot.quantity, 0) : (supplierStockMap.get(p.id) || 0);
                return inc > 0 || wip > 0 || sup > 0;
            });
        } else if (quickFilter === 'wip_check') {
            products = products.filter(p => p.status === 'wip_check');
        }

        // 検索フィルター
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.janCode?.toLowerCase().includes(query) ||
                p.id.includes(query) ||
                p.sku?.toLowerCase().includes(query)
            );
        }

        // 重量フィルター
        if (weightFilter !== "all") {
            const weight = parseFloat(weightFilter);
            products = products.filter(p => p.weight === weight);
        }

        // 在庫フィルター
        if (stockFilter === "low") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isLowStock } = calculateStockStatus(p, qty, allocation, settings);
                return isLowStock;
            });
        } else if (stockFilter === "out") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isOutOfStock } = calculateStockStatus(p, qty, allocation, settings);
                return isOutOfStock;
            });
        } else if (stockFilter === "need_order") {
            products = products.filter(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const { isLowStock, isOutOfStock } = calculateStockStatus(p, qty, allocation, settings);
                return isLowStock || isOutOfStock;
            });
        } else if (stockFilter === "reserved") {
            products = products.filter(p => (saleAllocationMap.get(p.id)?.bags || 0) > 0);
        }

        // 産地フィルター
        if (originFilter !== "all") {
            products = products.filter(p => p.origin === originFilter);
        }

        // 品種フィルター
        if (varietyFilter !== "all") {
            products = products.filter(p => p.variety === varietyFilter);
        }

        // ステータスフィルター
        if (statusFilter !== "all") {
            products = products.filter(p => p.status === statusFilter);
        }

        // ソート実行
        return [...products].sort((a, b) => {
            if (sortKey !== 'default') {
                const multiplier = sortOrder === 'asc' ? 1 : -1;
                switch (sortKey) {
                    case 'name':
                        return multiplier * (a.name || '').localeCompare(b.name || '', 'ja');
                    case 'weight':
                        return multiplier * ((a.weight || 0) - (b.weight || 0));
                    case 'currentStock': {
                        const qtyA = inventoryMap.get(a.id)?.quantity || 0;
                        const qtyB = inventoryMap.get(b.id)?.quantity || 0;
                        return multiplier * (qtyA - qtyB);
                    }
                    case 'allocation': {
                        const allocA = saleAllocationMap.get(a.id)?.bags || 0;
                        const allocB = saleAllocationMap.get(b.id)?.bags || 0;
                        return multiplier * (allocA - allocB);
                    }
                    case 'availableStock': {
                        const qtyA = inventoryMap.get(a.id)?.quantity || 0;
                        const allocA = saleAllocationMap.get(a.id) || { bags: 0, meters: 0 };
                        const statA = calculateStockStatus(a, qtyA, allocA, settings);
                        const qtyB = inventoryMap.get(b.id)?.quantity || 0;
                        const allocB = saleAllocationMap.get(b.id) || { bags: 0, meters: 0 };
                        const statB = calculateStockStatus(b, qtyB, allocB, settings);
                        return multiplier * (statA.availableStock - statB.availableStock);
                    }
                    case 'incoming': {
                        const incA = incomingMap.get(a.id)?.total || 0;
                        const incB = incomingMap.get(b.id)?.total || 0;
                        return multiplier * (incA - incB);
                    }
                    case 'supplierStock': {
                        const lotsA = supplierStockLotsMap?.get(a.id) || [];
                        const supA = lotsA.length > 0 ? lotsA.reduce((sum, lot) => sum + lot.quantity, 0) : (supplierStockMap.get(a.id) || 0);
                        const lotsB = supplierStockLotsMap?.get(b.id) || [];
                        const supB = lotsB.length > 0 ? lotsB.reduce((sum, lot) => sum + lot.quantity, 0) : (supplierStockMap.get(b.id) || 0);
                        return multiplier * (supA - supB);
                    }
                    case 'wip': {
                        const wipA = (wipMap.get(a.id) || []).reduce((sum, item) => sum + item.quantity, 0);
                        const wipB = (wipMap.get(b.id) || []).reduce((sum, item) => sum + item.quantity, 0);
                        return multiplier * (wipA - wipB);
                    }
                    case 'remainingDays': {
                        const predA = predictionMap.get(a.id);
                        const predB = predictionMap.get(b.id);
                        const daysA = predA?.remainingDays ?? (sortOrder === 'asc' ? 999999 : -999999);
                        const daysB = predB?.remainingDays ?? (sortOrder === 'asc' ? 999999 : -999999);
                        return multiplier * (daysA - daysB);
                    }
                    case 'status': {
                        const statusA = a.status || '';
                        const statusB = b.status || '';
                        return multiplier * statusA.localeCompare(statusB);
                    }
                }
            }

            // 1. グループ順 (通常 -> NB -> 新米)
            const groupA = getProductGroup(a);
            const groupB = getProductGroup(b);
            if (groupA !== groupB) return groupA - groupB;

            // 2. 産地順 (北 -> 南 -> 国内産)
            const prefA = getPrefectureIndex(a.origin || a.name);
            const prefB = getPrefectureIndex(b.origin || b.name);
            if (prefA !== prefB) return prefA - prefB;

            // 3. ベース商品名順 (同一シリーズ・銘柄・補足をひとまとめにする)
            const baseA = getBaseProductName(a.name);
            const baseB = getBaseProductName(b.name);
            const nameCompare = baseA.localeCompare(baseB, "ja");
            if (nameCompare !== 0) return nameCompare;

            // 4. 量目（重量）順 (小さい順: 1kg -> 2kg -> 3kg -> 5kg -> 10kg)
            const weightA = a.weight || 0;
            const weightB = b.weight || 0;
            if (weightA !== weightB) return weightA - weightB;

            // 5. 完全商品名順
            const fullCompare = (a.name || "").localeCompare(b.name || "", "ja");
            if (fullCompare !== 0) return fullCompare;

            // 6. SKU順
            return (a.sku || "").localeCompare(b.sku || "");
        });
    }, [bagProducts, showRemovedZeroStock, quickFilter, searchQuery, weightFilter, stockFilter, originFilter, varietyFilter, statusFilter, sortKey, sortOrder, inventoryMap, saleAllocationMap, settings, predictionMap, incomingMap, wipMap, supplierStockLotsMap, supplierStockMap]);

    // Excel出力
    const handleExportExcel = useCallback((): void => {
        try {
            if (filteredProducts.length === 0) return;

            const excelData = filteredProducts.map(p => {
                const qty = inventoryMap.get(p.id)?.quantity || 0;
                const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
                const wip = wipMap.get(p.id) || [];
                const wipQty = wip.reduce((sum, item) => sum + item.quantity, 0);
                const supplierStock = p.supplierStock || 0;
                const incoming = incomingMap.get(p.id)?.total || 0;

                // 実質在庫
                const effectiveStock = qty - allocation.bags + wipQty + supplierStock;

                return {
                    "商品コード": p.sku || p.id,
                    "商品名": p.name,
                    "区分": p.prefix || "",
                    "産地": p.origin || "",
                    "品種": p.variety || "",
                    "重量": p.weight ? `${p.weight}kg` : "",
                    "現在庫": qty,
                    "特売引当": allocation.bags,
                    "仕掛中": wipQty,
                    "メーカー(直送)": supplierStock,
                    "実質在庫": effectiveStock,
                    "入荷予定": incoming,
                    "状態": statusLabels[p.status] || p.status
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const colWidths = [
                { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
                { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
                { wch: 10 }, { wch: 10 }, { wch: 15 }
            ];
            worksheet["!cols"] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "在庫一覧");

            const dateStr = format(new Date(), "yyyyMMdd_HHmm");
            XLSX.writeFile(workbook, `アサヒパック_在庫一覧_${dateStr}.xlsx`);
        } catch (error) {
            console.error("Excel export error:", error);
        }
    }, [filteredProducts, inventoryMap, saleAllocationMap, wipMap, incomingMap, statusLabels]);

    // サマリー計算
    const summary = useMemo(() => {
        let lowStock = 0;
        let outOfStock = 0;
        let hasReservation = 0;
        let urgentPrediction = 0;
        let inSupply = 0;
        let wipCheck = 0;

        bagProducts.forEach(p => {
            const qty = inventoryMap.get(p.id)?.quantity || 0;
            const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
            const { isOutOfStock, isLowStock } = calculateStockStatus(p, qty, allocation, settings);

            if (isOutOfStock) outOfStock++;
            else if (isLowStock) lowStock++;
            if (allocation.bags > 0) hasReservation++;
            if (p.status === 'wip_check') wipCheck++;

            const pred = predictionMap.get(p.id);
            if (pred && (pred.wipStartAlert || (pred.remainingDays !== null && pred.remainingDays <= (p.productionLeadDays || 30)))) {
                urgentPrediction++;
            }

            const inc = incomingMap.get(p.id)?.total || 0;
            const wip = (wipMap.get(p.id) || []).reduce((sum, item) => sum + item.quantity, 0);
            const lots = supplierStockLotsMap?.get(p.id) || [];
            const sup = lots.length > 0 ? lots.reduce((sum, lot) => sum + lot.quantity, 0) : (supplierStockMap.get(p.id) || 0);
            if (inc > 0 || wip > 0 || sup > 0) {
                inSupply++;
            }
        });

        const needOrder = lowStock + outOfStock;
        return { total: bagProducts.length, lowStock, outOfStock, hasReservation, needOrder, urgentPrediction, inSupply, wipCheck };
    }, [bagProducts, inventoryMap, saleAllocationMap, predictionMap, incomingMap, wipMap, supplierStockLotsMap, supplierStockMap, settings]);

    // 発注点割れ・欠品商品を推奨発注数で一括カート追加
    const handleAddAllLowStockToCart = useCallback(() => {
        const needOrderProducts = bagProducts.filter(p => {
            const qty = inventoryMap.get(p.id)?.quantity || 0;
            const allocation = saleAllocationMap.get(p.id) || { bags: 0, meters: 0 };
            const { isLowStock, isOutOfStock } = calculateStockStatus(p, qty, allocation, settings);
            return isLowStock || isOutOfStock;
        });

        if (needOrderProducts.length === 0) {
            toast("発注が必要な商品はありません", { icon: "ℹ️" });
            return;
        }

        let addedCount = 0;
        needOrderProducts.forEach(p => {
            const currentQty = inventoryMap.get(p.id)?.quantity || 0;
            const targetStock = p.minStockAlert ? p.minStockAlert * 2 : 1000;
            const orderQty = Math.max(100, targetStock - currentQty);
            addToCart(p, orderQty);
            addedCount++;
        });

        toast.success(`${addedCount}件の商品を推奨数量でカートに追加しました`);
    }, [bagProducts, inventoryMap, saleAllocationMap, settings, addToCart]);

    const hasActiveFilters = searchQuery || weightFilter !== "all" || stockFilter !== "all" || originFilter !== "all" || varietyFilter !== "all" || statusFilter !== "all";

    const clearFilters = (): void => {
        setSearchQuery("");
        setWeightFilter("all");
        setStockFilter("all");
        setOriginFilter("all");
        setVarietyFilter("all");
        setStatusFilter("all");
    };

    // 初回ロード時のみローディング表示（データがある場合は更新中も表示し続ける）
    if (loading && allProducts.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500">{error}</p>
                <Button onClick={refetch} className="mt-4">再読み込み</Button>
            </div>
        );
    }

    return (
        <div className="space-y-2.5 print:space-y-0">
            {/* 統合ヘッダー＆コントロールエリア */}
            <div className="space-y-2 print:hidden">
                {/* 1. タイトル、クイックステータスタブ、主要アクション */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* 左側: タイトル & クイックステータスタブ */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 mr-1">
                            <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                                在庫状況
                            </h1>
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {filteredProducts.length}
                            </span>
                        </div>

                        {/* クイックステータスタブ */}
                        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar py-0.5">
                            <button
                                type="button"
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                                    quickFilter === 'all'
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                )}
                                onClick={() => {
                                    setQuickFilter('all');
                                    setStockFilter('all');
                                }}
                            >
                                <span>すべて</span>
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold",
                                    quickFilter === 'all' ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
                                )}>
                                    {summary.total}
                                </span>
                            </button>

                            <button
                                type="button"
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                                    quickFilter === 'need_order'
                                        ? "bg-red-600 text-white border-red-600"
                                        : "bg-red-50/80 text-red-700 border-red-200/80 hover:bg-red-100/70"
                                )}
                                onClick={() => {
                                    setQuickFilter(quickFilter === 'need_order' ? 'all' : 'need_order');
                                    setStockFilter('all');
                                }}
                            >
                                <span>🚨 要発注</span>
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                                    quickFilter === 'need_order' ? "bg-red-700 text-white" : "bg-red-100 text-red-800"
                                )}>
                                    {summary.needOrder}
                                </span>
                            </button>

                            <button
                                type="button"
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                                    quickFilter === 'urgent_prediction'
                                        ? "bg-amber-600 text-white border-amber-600"
                                        : "bg-amber-50/80 text-amber-800 border-amber-200/80 hover:bg-amber-100/70"
                                )}
                                onClick={() => {
                                    setQuickFilter(quickFilter === 'urgent_prediction' ? 'all' : 'urgent_prediction');
                                    setStockFilter('all');
                                }}
                            >
                                <span>⏳ 予測切迫</span>
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                                    quickFilter === 'urgent_prediction' ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-900"
                                )}>
                                    {summary.urgentPrediction}
                                </span>
                            </button>

                            <button
                                type="button"
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                                    quickFilter === 'reserved'
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-blue-50/80 text-blue-700 border-blue-200/80 hover:bg-blue-100/70"
                                )}
                                onClick={() => {
                                    setQuickFilter(quickFilter === 'reserved' ? 'all' : 'reserved');
                                    setStockFilter('all');
                                }}
                            >
                                <span>📅 特売引当</span>
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                                    quickFilter === 'reserved' ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-800"
                                )}>
                                    {summary.hasReservation}
                                </span>
                            </button>

                            <button
                                type="button"
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                                    quickFilter === 'supply'
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-emerald-50/80 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70"
                                )}
                                onClick={() => {
                                    setQuickFilter(quickFilter === 'supply' ? 'all' : 'supply');
                                    setStockFilter('all');
                                }}
                            >
                                <span>🏭 供給中</span>
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                                    quickFilter === 'supply' ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"
                                )}>
                                    {summary.inSupply}
                                </span>
                            </button>

                            <button
                                type="button"
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs border cursor-pointer",
                                    quickFilter === 'wip_check'
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-indigo-50/80 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100/70"
                                )}
                                onClick={() => {
                                    setQuickFilter(quickFilter === 'wip_check' ? 'all' : 'wip_check');
                                    setStockFilter('all');
                                }}
                            >
                                <span>📋 仕掛確認</span>
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                                    quickFilter === 'wip_check' ? "bg-indigo-700 text-white" : "bg-indigo-100 text-indigo-800"
                                )}>
                                    {summary.wipCheck}
                                </span>
                            </button>

                            {summary.needOrder > 0 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddAllLowStockToCart}
                                    className="h-6.5 px-2 text-[11px] border-orange-300 text-orange-700 hover:bg-orange-50 gap-1 rounded-full shrink-0"
                                    title="要発注商品を推奨数量で一括カート追加"
                                >
                                    <ShoppingCart className="h-3 w-3" />
                                    一括カート
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 右側: アクションボタン群 */}
                    <div className="flex items-center gap-1.5 ml-auto">
                        <div className="bg-slate-100 p-0.5 rounded-md border flex items-center shrink-0">
                            <Button
                                variant={viewMode === "table" ? "secondary" : "ghost"}
                                size="sm"
                                className={cn("px-2 h-7 text-xs", viewMode === "table" && "bg-white shadow-2xs text-slate-900 font-medium")}
                                onClick={() => setViewMode("table")}
                            >
                                <List className="h-3.5 w-3.5 mr-1" />
                                リスト
                            </Button>
                            <Button
                                variant={viewMode === "grid" ? "secondary" : "ghost"}
                                size="sm"
                                className={cn("px-2 h-7 text-xs", viewMode === "grid" && "bg-white shadow-2xs text-slate-900 font-medium")}
                                onClick={() => setViewMode("grid")}
                            >
                                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                                カード
                            </Button>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleExportExcel} 
                            className="gap-1 h-7 px-2.5 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                            <Download className="h-3.5 w-3.5 text-emerald-600" />
                            Excel
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleDownloadPdf} 
                            disabled={isGeneratingPdf}
                            className="gap-1 h-7 px-2.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                            title="ズレのない高精度PDFファイルを直接ダウンロード"
                        >
                            {isGeneratingPdf ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                            ) : (
                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                            )}
                            PDF保存
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handlePrint} 
                            className="gap-1 h-7 px-2.5 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                            title="ブラウザの印刷ダイアログを開く"
                        >
                            <Printer className="h-3.5 w-3.5 text-slate-600" />
                            印刷
                        </Button>
                        <Button 
                            size="sm"
                            onClick={handleAddProduct} 
                            className="gap-1 h-7 px-3 text-xs bg-slate-900 text-white hover:bg-slate-800"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            商品追加
                        </Button>
                    </div>
                </div>

                {/* 2. 統合検索＆フィルターバー（1枚のコンパクトなカード） */}
                <div className="bg-white px-2.5 py-2 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* 検索入力 */}
                        <div className="relative flex-1 min-w-[180px] max-w-xs sm:max-w-sm">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                ref={searchInputRef}
                                placeholder="商品名、JAN、商品ID... (「/」でフォーカス)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-7 h-7.5 text-xs bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                            />
                            {searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            ) : (
                                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-4.5 select-none items-center rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[9px] text-slate-500">
                                    /
                                </kbd>
                            )}
                        </div>

                        {/* ドロップダウンフィルター群 */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {/* 重量 */}
                            <Select value={weightFilter} onValueChange={setWeightFilter}>
                                <SelectTrigger className={cn("h-7.5 text-xs w-[88px] bg-slate-50/50 border-slate-200", weightFilter !== "all" && "bg-blue-50/80 border-blue-300 text-blue-900 font-medium")}>
                                    <SelectValue placeholder="重量" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">重量: 全て</SelectItem>
                                    {availableWeights.map(w => (
                                        <SelectItem key={w} value={w.toString()}>{w}kg</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* 産地 */}
                            <Select value={originFilter} onValueChange={setOriginFilter}>
                                <SelectTrigger className={cn("h-7.5 text-xs w-[94px] bg-slate-50/50 border-slate-200", originFilter !== "all" && "bg-blue-50/80 border-blue-300 text-blue-900 font-medium")}>
                                    <SelectValue placeholder="産地" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">産地: 全て</SelectItem>
                                    {availableOrigins.map(o => (
                                        <SelectItem key={o} value={o}>{o}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* 品種 */}
                            <Select value={varietyFilter} onValueChange={setVarietyFilter}>
                                <SelectTrigger className={cn("h-7.5 text-xs w-[96px] bg-slate-50/50 border-slate-200", varietyFilter !== "all" && "bg-blue-50/80 border-blue-300 text-blue-900 font-medium")}>
                                    <SelectValue placeholder="品種" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">品種: 全て</SelectItem>
                                    {availableVarieties.map(v => (
                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* 状態 */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className={cn("h-7.5 text-xs w-[100px] bg-slate-50/50 border-slate-200", statusFilter !== "all" && "bg-blue-50/80 border-blue-300 text-blue-900 font-medium")}>
                                    <SelectValue placeholder="状態" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">状態: 全て</SelectItem>
                                    {Object.entries(statusLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* 全体状況 (在庫状況) */}
                            <Select value={stockFilter} onValueChange={setStockFilter}>
                                <SelectTrigger className={cn("h-7.5 text-xs w-[105px] bg-slate-50/50 border-slate-200", stockFilter !== "all" && "bg-blue-50/80 border-blue-300 text-blue-900 font-medium")}>
                                    <SelectValue placeholder="全体状況" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全体状況: 全て</SelectItem>
                                    <SelectItem value="need_order">要発注 (警告+欠品)</SelectItem>
                                    <SelectItem value="low">発注点以下</SelectItem>
                                    <SelectItem value="out">在庫切れ (0)</SelectItem>
                                    <SelectItem value="reserved">特売引当あり</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 右側：落版(在庫0)切り替え ＆ クリアボタン */}
                        <div className="flex items-center gap-2 ml-auto pl-2 border-l border-slate-200">
                            {/* 落版(在庫0)切り替え */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                    落版(在庫0):
                                </span>
                                <div className="inline-flex items-center p-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px]">
                                    <button
                                        type="button"
                                        className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer",
                                            !showRemovedZeroStock ? "bg-white text-slate-800 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-700"
                                        )}
                                        onClick={() => setShowRemovedZeroStock(false)}
                                    >
                                        OFF
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer",
                                            showRemovedZeroStock ? "bg-slate-800 text-white shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-700"
                                        )}
                                        onClick={() => setShowRemovedZeroStock(true)}
                                    >
                                        ON
                                    </button>
                                </div>
                            </div>

                            {/* フィルタークリアボタン */}
                            {hasActiveFilters && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={clearFilters} 
                                    className="h-7 px-2 text-[11px] text-slate-500 hover:text-red-600 hover:bg-red-50 gap-1"
                                >
                                    <X className="h-3 w-3" />
                                    リセット
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 在庫表示 (テーブル or カード) */}
            <div className="print:hidden">
                {viewMode === "table" ? (
                <BagsInventoryTable
                    products={filteredProducts}
                    inventoryMap={inventoryMap}
                    saleAllocationMap={saleAllocationMap}
                    wipMap={wipMap}
                    supplierStockMap={supplierStockMap}
                    supplierStockLotsMap={supplierStockLotsMap}
                    incomingMap={incomingMap}
                    saleEvents={saleEvents || []}
                    loading={loading}
                    sortKey={sortKey}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    density={density}
                    onDensityChange={setDensity}
                    onEdit={handleEditProduct}
                    onIncomingStockClick={(product) => {
                        setIncomingStockProduct(product);
                        setIncomingDialogOpen(true);
                    }}
                    onAnalyze={(product) => {
                        setAnalysisProduct(product);
                        setAnalysisDialogOpen(true);
                    }}
                    onRefetch={refetch}
                />
            ) : (
                <BagsInventoryCards
                    products={filteredProducts}
                    inventoryMap={inventoryMap}
                    saleAllocationMap={saleAllocationMap}
                    wipMap={wipMap}
                    supplierStockMap={supplierStockMap}
                    supplierStockLotsMap={supplierStockLotsMap}
                    incomingMap={incomingMap}
                    saleEvents={saleEvents}
                    onDetail={handleOpenDetail}
                    onRefetch={refetch}
                />
            )}
            </div>

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
                        <AlertDialogCancel onClick={() => setDeleteConfirmOpen(false)}>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">削除する</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 印刷用ビュー（画面には表示されず、印刷時のみ使用） */}
            <InventoryPrintView 
                products={filteredProducts}
                inventoryMap={inventoryMap}
                saleAllocationMap={saleAllocationMap}
                detailedSaleAllocationMap={detailedSaleAllocationMap}
                wipMap={wipMap}
                incomingMap={incomingMap}
                supplierStockMap={supplierStockMap}
                supplierStockLotsMap={supplierStockLotsMap}
                saleEvents={saleEvents}
                settings={settings}
            />
        </div>
    );
}
