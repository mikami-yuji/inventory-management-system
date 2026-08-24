import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logError } from '@/lib/logger';
import type { Product, WorkInProgress, IncomingStock, SupplierStockLot } from '@/types';
import { calculateStockStatus, calculateStockPrediction, getPitch } from '@/lib/services';
import type { SaleEvent } from '@/hooks/use-sale-events';

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
            supabase.from('sale_events').select('*').in('status', ['active', 'upcoming']),
            supabase.from('work_in_progress').select('*').eq('status', 'in_progress'),
            supabase.from('incoming_stock').select('*').eq('is_completed', false),
            supabase.from('supplier_stock_lots').select('*'),
            supabase.from('app_settings').select('*')
        ]);

        if (productsRes.error) throw productsRes.error;
        if (inventoryRes.error) throw inventoryRes.error;

        const products: Product[] = (productsRes.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            janCode: p.jan_code,
            weight: p.weight,
            shape: p.shape,
            material: p.material,
            unitPrice: p.unit_price,
            printingCost: p.printing_cost,
            oldUnitPrice: p.old_unit_price,
            oldPrintingCost: p.old_printing_cost,
            priceIncreaseEffectiveDate: p.price_increase_effective_date,
            category: p.category,
            imageUrl: p.image_url,
            description: p.description,
            status: p.status,
            minStockAlert: p.min_stock_alert,
            supplierStock: p.supplier_stock,
            supplierStockUpdatedAt: p.supplier_stock_updated_at,
            metersPerRoll: p.meters_per_roll,
            dailyShipmentRate: p.daily_shipment_rate,
            productionLeadDays: p.production_lead_days,
            statusOverride: p.status_override
        }));

        // インベントリ Map 構築
        const inventoryMap = new Map<string, { quantity: number; oldPriceQuantity: number; updatedAt?: string }>();
        (inventoryRes.data || []).forEach((inv: any) => {
            inventoryMap.set(inv.product_id, {
                quantity: Number(inv.quantity) || 0,
                oldPriceQuantity: Number(inv.old_price_quantity) || 0,
                updatedAt: inv.updated_at
            });
        });

        // 特売引当 Map 構築
        const saleEvents: SaleEvent[] = (saleEventsRes.data || []).map((e: any) => ({
            id: e.id,
            clientName: e.client_name,
            scheduleType: e.schedule_type || 'single',
            dates: e.dates || [],
            status: e.status,
            description: e.description || null,
            createdAt: e.created_at || new Date().toISOString(),
            items: (e.items || []).map((item: any) => ({
                id: item.id || '',
                productId: item.product_id,
                productName: '',
                productSku: null,
                plannedQuantity: Number(item.planned_quantity) || Number(item.allocated_quantity) || 0,
                allocatedQuantity: Number(item.allocated_quantity) || 0,
                actualQuantity: null,
                currentStock: 0,
                isProduced: item.is_produced || false
            }))
        }));

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
        (wipRes.data || []).forEach((w: any) => {
            const list = wipMap.get(w.product_id) || [];
            list.push({
                id: w.id,
                productId: w.product_id,
                quantity: Number(w.quantity) || 0,
                status: w.status,
                expectedCompletion: w.expected_completion,
                termType: w.term_type,
                notes: w.notes
            } as unknown as WorkInProgress);
            wipMap.set(w.product_id, list);
        });

        // 入荷予定 Map 構築
        const incomingMap = new Map<string, { total: number; items: IncomingStock[] }>();
        (incomingRes.data || []).forEach((inc: any) => {
            const current = incomingMap.get(inc.product_id) || { total: 0, items: [] };
            const qty = Number(inc.quantity) || 0;
            current.total += qty;
            current.items.push({
                id: inc.id,
                productId: inc.product_id,
                quantity: qty,
                expectedDate: inc.expected_date,
                isCompleted: inc.is_completed,
                note: inc.note
            } as unknown as IncomingStock);
            incomingMap.set(inc.product_id, current);
        });

        // サプライヤーロット Map 構築
        const supplierStockLotsMap = new Map<string, SupplierStockLot[]>();
        (supplierLotsRes.data || []).forEach((lot: any) => {
            const list = supplierStockLotsMap.get(lot.product_id) || [];
            list.push({
                id: lot.id,
                productId: lot.product_id,
                quantity: Number(lot.quantity) || 0,
                stockDate: lot.stock_date
            } as unknown as SupplierStockLot);
            supplierStockLotsMap.set(lot.product_id, list);
        });

        // 設定
        const settingsMap: Record<string, unknown> = {};
        (settingsRes.data || []).forEach((s: any) => {
            settingsMap[s.key] = s.value;
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
