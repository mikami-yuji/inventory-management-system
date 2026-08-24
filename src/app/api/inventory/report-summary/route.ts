import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logError } from '@/lib/logger';
import type { Product, WorkInProgress, IncomingStock, SupplierStockLot } from '@/types';
import { calculateStockStatus, calculateStockPrediction, getPitch } from '@/lib/services';
import type { SaleEvent } from '@/hooks/use-sale-events';
import { normalizeProductName } from '@/lib/utils/product-name-cleaner';

export interface ReportItemSummary {
    productId: string;
    productName: string;
    sku?: string | null;
    janCode?: string | null;
    weight: number;
    pitch: number;
    shape?: string | null;
    isRoll: boolean;
    currentStock: number;
    availableStock: number;
    oldPriceQuantity: number;
    isOutOfStock: boolean;
    isLowStock: boolean;
    productStatus?: string | null;
    allocation: {
        totalBags: number;
        items: Array<{
            date: string | null;
            quantity: number;
            clientName: string;
        }>;
    };
    incoming: {
        total: number;
        items: Array<{
            expectedDate: string | null;
            quantity: number;
            note: string | null;
        }>;
    };
    supplierStock: {
        total: number;
        lots: Array<{
            stockDate: string | null;
            quantity: number;
        }>;
    };
    wip: {
        total: number;
        items: Array<{
            expectedDate: string | null;
            termType: string;
            quantity: number;
        }>;
    };
    prediction: {
        remainingDays: number | null;
        estimatedDate: string | null;
        wipStartAlert: boolean;
    } | null;
}

export interface ReportSummaryResponse {
    generatedAt: string;
    totalCount: number;
    summary: {
        totalRollMeters: number;
        totalBags: number;
        totalPrice: number;
        outOfStockCount: number;
        lowStockCount: number;
        wipAlertCount: number;
    };
    items: ReportItemSummary[];
}

export async function GET() {
    try {
        const auth = await requireAuth();
        if (!auth.success) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerClient();

        // 必要なテーブルデータを並列取得
        const [
            productsRes,
            inventoryRes,
            saleEventsRes,
            wipRes,
            incomingRes,
            supplierLotsRes,
            settingsRes
        ] = await Promise.all([
            supabase.from('products').select('*').order('name'),
            supabase.from('inventory').select('*'),
            supabase.from('sale_events').select('*, items:sale_event_items(*)'),
            supabase.from('work_in_progress').select('*').eq('status', 'in_progress'),
            supabase.from('incoming_stock').select('*').eq('is_completed', false),
            supabase.from('supplier_stock_lots').select('*'),
            supabase.from('app_settings').select('*')
        ]);

        if (productsRes.error) throw productsRes.error;
        if (inventoryRes.error) throw inventoryRes.error;

        const products: Product[] = ((productsRes.data || []) as Array<Record<string, unknown>>).map((p) => ({
            id: String(p.id || ''),
            name: normalizeProductName(String(p.name || '')),
            sku: String(p.sku || ''),
            janCode: p.jan_code ? String(p.jan_code) : undefined,
            weight: Number(p.weight) || undefined,
            shape: p.shape ? String(p.shape) : undefined,
            material: p.material ? String(p.material) : undefined,
            unitPrice: Number(p.unit_price) || 0,
            printingCost: Number(p.printing_cost) || 0,
            oldUnitPrice: p.old_unit_price !== null && p.old_unit_price !== undefined ? Number(p.old_unit_price) : undefined,
            oldPrintingCost: p.old_printing_cost !== null && p.old_printing_cost !== undefined ? Number(p.old_printing_cost) : undefined,
            priceIncreaseEffectiveDate: p.price_increase_effective_date ? String(p.price_increase_effective_date) : undefined,
            category: (p.category as Product['category']) || 'bag',
            imageUrl: p.image_url ? String(p.image_url) : undefined,
            description: p.description ? String(p.description) : undefined,
            status: String(p.status || 'active') as Product['status'],
            minStockAlert: p.min_stock_alert !== null && p.min_stock_alert !== undefined ? Number(p.min_stock_alert) : undefined,
            supplierStock: p.supplier_stock !== null && p.supplier_stock !== undefined ? Number(p.supplier_stock) : undefined,
            supplierStockUpdatedAt: p.supplier_stock_updated_at ? String(p.supplier_stock_updated_at) : undefined,
            metersPerRoll: p.meters_per_roll !== null && p.meters_per_roll !== undefined ? Number(p.meters_per_roll) : undefined,
            dailyShipmentRate: p.daily_shipment_rate !== null && p.daily_shipment_rate !== undefined ? Number(p.daily_shipment_rate) : undefined,
            productionLeadDays: p.production_lead_days !== null && p.production_lead_days !== undefined ? Number(p.production_lead_days) : undefined,
            statusOverride: p.status_override ? (String(p.status_override) as Product['statusOverride']) : undefined
        }));

        // インベントリ Map 構築
        const inventoryMap = new Map<string, { quantity: number; oldPriceQuantity: number; updatedAt?: string }>();
        ((inventoryRes.data || []) as Array<Record<string, unknown>>).forEach((inv) => {
            const productId = String(inv.product_id || '');
            inventoryMap.set(productId, {
                quantity: Number(inv.quantity) || 0,
                oldPriceQuantity: Number(inv.old_price_quantity) || 0,
                updatedAt: inv.updated_at ? String(inv.updated_at) : undefined
            });
        });

        // 特売引当 Map 構築
        const saleEvents: SaleEvent[] = ((saleEventsRes.data || []) as Array<Record<string, unknown>>).map((e) => {
            const rawItems = (e.items || []) as Array<Record<string, unknown>>;
            return {
                id: String(e.id || ''),
                clientName: String(e.client_name || ''),
                scheduleType: (e.schedule_type as 'single' | 'monthly') || 'single',
                dates: (e.dates as string[]) || [],
                status: String(e.status || 'active') as SaleEvent['status'],
                description: e.description ? String(e.description) : null,
                createdAt: String(e.created_at || new Date().toISOString()),
                items: rawItems.map((item) => ({
                    id: String(item.id || ''),
                    productId: String(item.product_id || ''),
                    productName: '',
                    productSku: null,
                    plannedQuantity: Number(item.planned_quantity) || Number(item.allocated_quantity) || 0,
                    allocatedQuantity: Number(item.allocated_quantity) || 0,
                    actualQuantity: null,
                    currentStock: 0,
                    isProduced: Boolean(item.is_produced)
                }))
            };
        });

        const saleAllocationMap = new Map<string, { bags: number; meters: number }>();
        const detailedSaleAllocationMap = new Map<string, Array<{ eventId: string; clientName: string; quantity: number; dates: string[] }>>();

        saleEvents.forEach(event => {
            event.items.forEach(item => {
                const current = saleAllocationMap.get(item.productId) || { bags: 0, meters: 0 };
                saleAllocationMap.set(item.productId, {
                    bags: current.bags + item.allocatedQuantity,
                    meters: current.meters
                });

                const detailed = detailedSaleAllocationMap.get(item.productId) || [];
                detailed.push({
                    eventId: event.id,
                    clientName: event.clientName,
                    quantity: item.allocatedQuantity,
                    dates: event.dates
                });
                detailedSaleAllocationMap.set(item.productId, detailed);
            });
        });

        // 仕掛 Map 構築
        const wipMap = new Map<string, WorkInProgress[]>();
        ((wipRes.data || []) as Array<Record<string, unknown>>).forEach((w) => {
            const productId = String(w.product_id || '');
            const list = wipMap.get(productId) || [];
            list.push({
                id: String(w.id || ''),
                productId,
                quantity: Number(w.quantity) || 0,
                status: String(w.status || 'in_progress') as WorkInProgress['status'],
                expectedCompletion: w.expected_completion ? String(w.expected_completion) : null,
                termType: String(w.term_type || 'specific') as WorkInProgress['termType'],
                notes: w.notes ? String(w.notes) : null
            } as unknown as WorkInProgress);
            wipMap.set(productId, list);
        });

        // 入荷予定 Map 構築
        const incomingMap = new Map<string, { total: number; items: IncomingStock[] }>();
        ((incomingRes.data || []) as Array<Record<string, unknown>>).forEach((inc) => {
            const productId = String(inc.product_id || '');
            const current = incomingMap.get(productId) || { total: 0, items: [] };
            const qty = Number(inc.quantity) || 0;
            current.total += qty;
            current.items.push({
                id: String(inc.id || ''),
                productId,
                quantity: qty,
                expectedDate: inc.expected_date ? String(inc.expected_date) : null,
                isCompleted: Boolean(inc.is_completed),
                note: inc.note ? String(inc.note) : null
            } as unknown as IncomingStock);
            incomingMap.set(productId, current);
        });

        // サプライヤーロット Map 構築
        const supplierStockLotsMap = new Map<string, SupplierStockLot[]>();
        ((supplierLotsRes.data || []) as Array<Record<string, unknown>>).forEach((lot) => {
            const productId = String(lot.product_id || '');
            const list = supplierStockLotsMap.get(productId) || [];
            list.push({
                id: String(lot.id || ''),
                productId,
                quantity: Number(lot.quantity) || 0,
                stockDate: lot.stock_date ? String(lot.stock_date) : null
            } as unknown as SupplierStockLot);
            supplierStockLotsMap.set(productId, list);
        });

        // 設定
        const settingsMap: Record<string, unknown> = {};
        ((settingsRes.data || []) as Array<Record<string, unknown>>).forEach((s) => {
            const key = String(s.key || '');
            if (key) settingsMap[key] = s.value;
        });

        // 集計計算
        let totalRollMeters = 0;
        let totalBags = 0;
        let totalPrice = 0;
        let outOfStockCount = 0;
        let lowStockCount = 0;
        let wipAlertCount = 0;

        const items: ReportItemSummary[] = products.map((product) => {
            const inv = inventoryMap.get(product.id) || { quantity: 0, oldPriceQuantity: 0 };
            const currentStock = inv.quantity;
            const oldQty = inv.oldPriceQuantity || 0;
            const allocation = saleAllocationMap.get(product.id) || { bags: 0, meters: 0 };
            const incoming = incomingMap.get(product.id);
            const wips = wipMap.get(product.id) || [];
            const lots = supplierStockLotsMap.get(product.id) || [];

            const supplierStockTotal = lots.length > 0
                ? lots.reduce((sum, l) => sum + l.quantity, 0)
                : (Number(product.supplierStock) || 0);

            const {
                availableStock,
                isOutOfStock,
                isLowStock,
                isRoll
            } = calculateStockStatus(product, currentStock, allocation, settingsMap);

            if (isRoll) {
                totalRollMeters += currentStock;
            } else {
                totalBags += currentStock;
            }

            // 金額計算
            const newQty = Math.max(0, currentStock - oldQty);
            if (oldQty > 0) {
                const oldUnit = Number(product.oldUnitPrice ?? product.unitPrice) || 0;
                const oldPrint = Number(product.oldPrintingCost ?? product.printingCost) || 0;
                totalPrice += oldQty * (oldUnit + oldPrint);
            }
            if (newQty > 0) {
                const unit = Number(product.unitPrice) || 0;
                const print = Number(product.printingCost) || 0;
                totalPrice += newQty * (unit + print);
            }

            if (isOutOfStock) outOfStockCount++;
            else if (isLowStock) lowStockCount++;

            // 予測計算
            const relevantSaleItems = saleEvents.flatMap(event => {
                const item = event.items.find(i => i.productId === product.id);
                return item && !item.isProduced ? [{ dates: event.dates, quantity: item.allocatedQuantity, eventName: event.clientName }] : [];
            });

            const predResult = calculateStockPrediction(
                currentStock,
                product.dailyShipmentRate || 0,
                product.productionLeadDays || 0,
                product,
                relevantSaleItems,
                wips.map(w => ({
                    quantity: w.quantity,
                    expectedDate: w.expectedCompletion ? new Date(w.expectedCompletion) : null,
                    termType: w.termType
                })),
                incoming?.items.map(inc => ({
                    quantity: inc.quantity,
                    expectedDate: inc.expectedDate ? new Date(inc.expectedDate) : null
                })) || [],
                supplierStockTotal
            );

            if (predResult?.wipStartAlert) {
                wipAlertCount++;
            }

            return {
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                janCode: product.janCode,
                weight: product.weight || 0,
                pitch: getPitch(product.weight || 0),
                shape: product.shape,
                isRoll: !!isRoll,
                currentStock,
                availableStock,
                oldPriceQuantity: oldQty,
                isOutOfStock,
                isLowStock,
                productStatus: product.status,
                allocation: {
                    totalBags: allocation.bags,
                    items: (detailedSaleAllocationMap.get(product.id) || []).map(a => ({
                        date: a.dates[0] || null,
                        quantity: a.quantity,
                        clientName: a.clientName
                    }))
                },
                incoming: {
                    total: incoming?.total || 0,
                    items: (incoming?.items || []).map(inc => ({
                        expectedDate: inc.expectedDate || null,
                        quantity: inc.quantity,
                        note: inc.note || null
                    }))
                },
                supplierStock: {
                    total: supplierStockTotal,
                    lots: lots.map(l => ({
                        stockDate: l.stockDate || null,
                        quantity: l.quantity
                    }))
                },
                wip: {
                    total: wips.reduce((sum, w) => sum + w.quantity, 0),
                    items: wips.map(w => ({
                        expectedDate: w.expectedCompletion || null,
                        termType: w.termType || 'specific',
                        quantity: w.quantity
                    }))
                },
                prediction: predResult ? {
                    remainingDays: predResult.remainingDays ?? null,
                    estimatedDate: predResult.estimatedDate ? predResult.estimatedDate.toISOString() : null,
                    wipStartAlert: !!predResult.wipStartAlert
                } : null
            };
        });

        // 産地順・ベース商品名順・量目順にソート
        const PREFECTURES = [
            "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
            "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
            "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知",
            "三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山",
            "鳥取", "島根", "岡山", "広島", "山口",
            "徳島", "香川", "愛媛", "高知",
            "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄",
            "国内産", "国産"
        ];

        const getPrefectureIndex = (text: string | undefined): number => {
            if (!text) return 999;
            for (let i = 0; i < PREFECTURES.length; i++) {
                if (text.includes(PREFECTURES[i])) return i;
            }
            return 999;
        };

        const getProductGroup = (name: string): number => {
            const isNewRice = name.includes("新米") || name.includes("ＮＢ・新米");
            const isNB = name.includes("NB") || name.includes("ＮＢ");
            if (isNewRice) return 2;
            if (isNB) return 1;
            return 0;
        };

        const getBaseProductName = (name: string): string => {
            if (!name) return "";
            let base = name;
            base = base.replace(/[0-9０-９]+(\.[0-9０-９]+)?\s*([kKＫgGｇ]|kg|KG|Kg|袋|枚)[^\s)]*/gi, "");
            base = base.replace(/[\s　]+[rRＲ][zZＺａ-ｚＡ-Ｚ]?$/gi, "");
            base = base.replace(/[rRＲ]$/g, "");
            return base.trim();
        };

        items.sort((a, b) => {
            const groupA = getProductGroup(a.productName);
            const groupB = getProductGroup(b.productName);
            if (groupA !== groupB) return groupA - groupB;

            const prefA = getPrefectureIndex(a.productName);
            const prefB = getPrefectureIndex(b.productName);
            if (prefA !== prefB) return prefA - prefB;

            const baseA = getBaseProductName(a.productName);
            const baseB = getBaseProductName(b.productName);
            const nameCompare = baseA.localeCompare(baseB, "ja");
            if (nameCompare !== 0) return nameCompare;

            const weightA = a.weight || 0;
            const weightB = b.weight || 0;
            if (weightA !== weightB) return weightA - weightB;

            return (a.sku || "").localeCompare(b.sku || "");
        });

        const responseData: ReportSummaryResponse = {
            generatedAt: new Date().toISOString(),
            totalCount: items.length,
            summary: {
                totalRollMeters,
                totalBags,
                totalPrice: Math.round(totalPrice),
                outOfStockCount,
                lowStockCount,
                wipAlertCount
            },
            items
        };

        return NextResponse.json({ data: responseData, error: null });
    } catch (error) {
        await logError({
            route: '/api/inventory/report-summary',
            method: 'GET',
            error
        });
        return NextResponse.json(
            { data: null, error: 'サーバー集計中にエラーが発生しました' },
            { status: 500 }
        );
    }
}
