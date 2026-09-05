/**
 * 商品API
 * Supabaseから商品データを取得・作成・更新・削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { requireAdmin } from '@/lib/auth-guard';
import { z } from 'zod';
import { logError } from '@/lib/logger';
import { normalizeProductName } from '@/lib/utils/product-name-cleaner';

// GET: 商品一覧を取得
type RawProductData = {
    id: string;
    name: string;
    sku: string | null;
    product_code: string | null;
    jan_code: string | null;
    weight: string | number | null;
    shape: string | null;
    material: string | null;
    unit_price: string | number;
    printing_cost: string | number;
    category: string;
    image_url: string | null;
    description: string | null;
    status: string;
    min_stock_alert: number | null;
    prefix: string | null;
    origin: string | null;
    variety: string | null;
    suffix: string | null;
    product_type: string | null;
    supplier_stock: string | number | null;
    status_override: string | null;
    supplier_id: string | null;
    discontinued_date: string | null;
    meters_per_roll: number | null;
    daily_shipment_rate: string | number | null;
    production_lead_days: number | null;
    old_unit_price?: string | number | null;
    old_printing_cost?: string | number | null;
    price_increase_effective_date?: string | null;
    suppliers: { name: string | null } | { name: string | null }[] | null;
    price_revisions?: {
        id: string;
        product_id: string;
        unit_price: number;
        printing_cost: number;
        effective_date: string;
        created_at: string;
    }[];
};

export async function GET(): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseClient = createServerClient();
        const { data, error } = await supabaseClient
            .from('products')
            .select('*, suppliers(name), price_revisions(*)')
            .neq('status', 'inactive') // inactive以外をすべて取得
            .order('name');

        if (error || !data) {
            console.error('Error fetching products:', error);
            return NextResponse.json({ error: error?.message || 'データが見つかりません' }, { status: 500 });
        }

        // TypeScript型に変換
        const todayStr = new Date().toISOString().split('T')[0];

        const products = (data as unknown as RawProductData[]).map((item) => {
            // suppliersが配列で返ってくるケースやnullのケースに対応
            const supplierData = Array.isArray(item.suppliers) ? item.suppliers[0] : item.suppliers;
            const supplierName = (supplierData as { name: string | null })?.name || "朝日パピルス株式会社";

            // 価格改定の計算（今日以前で最も新しい effective_date を探す）
            const revisions = item.price_revisions || [];
            revisions.sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()); // 降順
            
            const activeRevision = revisions.find(r => r.effective_date <= todayStr);
            const baseUnitPrice = Number(item.unit_price) || 0;
            const basePrintingCost = Number(item.printing_cost) || 0;

            const currentUnitPrice = activeRevision ? Number(activeRevision.unit_price) : baseUnitPrice;
            const currentPrintingCost = activeRevision ? Number(activeRevision.printing_cost) : basePrintingCost;

            const mappedRevisions = revisions.map(r => ({
                id: r.id,
                productId: r.product_id,
                unitPrice: Number(r.unit_price),
                printingCost: Number(r.printing_cost),
                effectiveDate: r.effective_date,
                createdAt: r.created_at
            }));

            return {
                id: item.id,
                name: normalizeProductName(item.name),
                sku: item.sku, // 受注№ (Col A)
                productCode: item.product_code, // 商品コード (Col D)
                janCode: item.jan_code,
                weight: item.weight ? Number(item.weight) : undefined,
                shape: item.shape,
                material: item.material,
                unitPrice: Number(item.unit_price) || 0,
                printingCost: Number(item.printing_cost) || 0,
                category: item.category,
                imageUrl: item.image_url,
                description: item.description,
                status: item.status,
                minStockAlert: item.min_stock_alert,
                // 商品名構造化フィールド
                prefix: item.prefix,
                origin: item.origin,
                variety: item.variety,
                suffix: item.suffix,
                productType: item.product_type, // Excel Column Type
                supplierStock: item.supplier_stock && !isNaN(Number(item.supplier_stock)) ? Number(item.supplier_stock) : 0,
                statusOverride: item.status_override,
                supplierId: item.supplier_id,
                supplierName: supplierName,
                discontinuedDate: item.discontinued_date,
                metersPerRoll: item.meters_per_roll !== null && item.meters_per_roll !== undefined ? Number(item.meters_per_roll) : 400,
                dailyShipmentRate: item.daily_shipment_rate !== null && item.daily_shipment_rate !== undefined ? Number(item.daily_shipment_rate) : 0,
                productionLeadDays: item.production_lead_days !== null && item.production_lead_days !== undefined ? Number(item.production_lead_days) : 0,
                currentUnitPrice,
                currentPrintingCost,
                oldUnitPrice: item.old_unit_price !== undefined && item.old_unit_price !== null ? Number(item.old_unit_price) : undefined,
                oldPrintingCost: item.old_printing_cost !== undefined && item.old_printing_cost !== null ? Number(item.old_printing_cost) : undefined,
                priceIncreaseEffectiveDate: item.price_increase_effective_date || undefined,
                priceRevisions: mappedRevisions,
            };
        });

        // 「落版予定」から「落版」への自動遷移ロジック
        const today = new Date().toISOString().split('T')[0];
        const statusUpdates = products.filter(p =>
            p.status === 'plate_removal_scheduled' &&
            p.discontinuedDate &&
            p.discontinuedDate <= today
        );

        if (statusUpdates.length > 0) {
            const idsToUpdate = statusUpdates.map(p => p.id);
            await supabaseClient
                .from('products')
                .update({ status: 'plate_removed' })
                .in('id', idsToUpdate);

            // 返却用データも更新
            statusUpdates.forEach(p => {
                p.status = 'plate_removed';
            });
        }

        return NextResponse.json({ data: products, error: null });
    } catch (error) {
        await logError({
            route: '/api/products',
            method: 'GET',
            error,
        })
        return NextResponse.json({ data: null, error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}

const createProductSchema = z.object({
    name: z.string().min(1, '商品名は必須です'),
    category: z.string().min(1, 'カテゴリは必須です'),
    sku: z.string().optional().nullable(),
    productCode: z.string().optional().nullable(),
    janCode: z.string().optional().nullable(),
    weight: z.number().optional().nullable(),
    shape: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
    unitPrice: z.number().optional(),
    printingCost: z.number().optional(),
    imageUrl: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    minStockAlert: z.string().or(z.number()).optional().nullable(),
    prefix: z.string().optional().nullable(),
    origin: z.string().optional().nullable(),
    variety: z.string().optional().nullable(),
    suffix: z.string().optional().nullable(),
    productType: z.string().optional().nullable(),
    statusOverride: z.string().optional().nullable(),
    discontinuedDate: z.string().optional().nullable(),
    supplierId: z.string().optional().nullable(),
    metersPerRoll: z.number().or(z.string()).optional().nullable(),
    dailyShipmentRate: z.number().or(z.string()).optional().nullable(),
    productionLeadDays: z.number().or(z.string()).optional().nullable()
});

// POST: 商品を新規作成
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const auth = await requireAdmin();
        if (!auth.success) {
            return auth.response;
        }

        const supabaseClient = createServerClient();
        const body = await request.json();

        const validated = createProductSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { error: '入力値が不正です。', details: validated.error.flatten() },
                { status: 400 }
            );
        }

        const validData = validated.data;

        // Supabase用のフォーマットに変換
        const productData = {
            name: normalizeProductName(validData.name),
            sku: validData.sku || null, // 受注№
            product_code: validData.productCode || null, // 商品コード
            jan_code: validData.janCode || null,
            weight: validData.weight || null,
            shape: validData.shape || null,
            material: validData.material || null,
            unit_price: validData.unitPrice || 0,
            printing_cost: validData.printingCost || 0,
            category: validData.category,
            image_url: validData.imageUrl || null,
            description: validData.description || null,
            status: 'active',
            min_stock_alert: validData.minStockAlert === null || validData.minStockAlert === ''
                ? null
                : Number(validData.minStockAlert),
            // 商品名構造化フィールド
            prefix: validData.prefix || null,
            origin: validData.origin || null,
            variety: validData.variety || null,
            suffix: validData.suffix || null,
            product_type: validData.productType || null,
            status_override: validData.statusOverride || 'normal',
            discontinued_date: validData.discontinuedDate || null,
            supplier_id: validData.supplierId === 'none' || !validData.supplierId ? null : validData.supplierId,
            meters_per_roll: validData.metersPerRoll !== undefined && validData.metersPerRoll !== null && validData.metersPerRoll !== '' ? Number(validData.metersPerRoll) : 400,
            daily_shipment_rate: validData.dailyShipmentRate !== undefined && validData.dailyShipmentRate !== null && validData.dailyShipmentRate !== '' ? Number(validData.dailyShipmentRate) : 0,
            production_lead_days: validData.productionLeadDays !== undefined && validData.productionLeadDays !== null && validData.productionLeadDays !== '' ? Number(validData.productionLeadDays) : 0,
        };

        const { data, error } = await supabaseClient
            .from('products')
            .insert(productData)
            .select()
            .single();

        if (error) {
            console.error('Error creating product:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 在庫レコードも作成
        if (data && data.id) {
            await supabaseClient.from('inventory').insert({
                product_id: data.id,
                quantity: 0,
            });
        }

        return NextResponse.json({
            data: {
                id: data?.id,
                name: data?.name,
                sku: data?.sku,
                category: data?.category,
            },
            error: null
        }, { status: 201 });
    } catch (error) {
        await logError({
            route: '/api/products',
            method: 'POST',
            error,
        })
        return NextResponse.json({ data: null, error: '商品登録でエラーが発生しました。' }, { status: 500 });
    }
}

const updateProductSchema = createProductSchema.partial().extend({
    id: z.string().min(1, '商品IDは必須です'),
    status: z.string().optional()
});

// PUT: 商品を更新
export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const auth = await requireAdmin();
        if (!auth.success) {
            return auth.response;
        }

        const supabaseClient = createServerClient();
        const body = await request.json();

        const validated = updateProductSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { error: '入力値が不正です。', details: validated.error.flatten() },
                { status: 400 }
            );
        }

        const validData = validated.data;

        // 更新データを準備
        const updateData: Record<string, unknown> = {};
        if (validData.name !== undefined) updateData.name = normalizeProductName(validData.name);
        if (validData.sku !== undefined) updateData.sku = validData.sku;
        if (validData.productCode !== undefined) updateData.product_code = validData.productCode;
        if (validData.janCode !== undefined) updateData.jan_code = validData.janCode;
        if (validData.weight !== undefined) updateData.weight = validData.weight;
        if (validData.shape !== undefined) updateData.shape = validData.shape;
        if (validData.material !== undefined) updateData.material = validData.material;
        if (validData.unitPrice !== undefined) updateData.unit_price = validData.unitPrice;
        if (validData.printingCost !== undefined) updateData.printing_cost = validData.printingCost;
        if (validData.category !== undefined) updateData.category = validData.category;
        if (validData.imageUrl !== undefined) updateData.image_url = validData.imageUrl;
        if (validData.description !== undefined) updateData.description = validData.description;
        if (validData.minStockAlert !== undefined) {
            updateData.min_stock_alert = validData.minStockAlert === null || validData.minStockAlert === ''
                ? null
                : Number(validData.minStockAlert);
        }
        // 商品名構造化フィールド
        if (validData.prefix !== undefined) updateData.prefix = validData.prefix;
        if (validData.origin !== undefined) updateData.origin = validData.origin;
        if (validData.variety !== undefined) updateData.variety = validData.variety;
        if (validData.suffix !== undefined) updateData.suffix = validData.suffix;
        if (validData.productType !== undefined) updateData.product_type = validData.productType;
        if (validData.statusOverride !== undefined) updateData.status_override = validData.statusOverride;
        if (validData.status !== undefined) updateData.status = validData.status;
        if (validData.discontinuedDate !== undefined) updateData.discontinued_date = validData.discontinuedDate;
        if (validData.supplierId !== undefined) updateData.supplier_id = validData.supplierId === 'none' || !validData.supplierId ? null : validData.supplierId;
        if (validData.metersPerRoll !== undefined) updateData.meters_per_roll = validData.metersPerRoll !== null && validData.metersPerRoll !== '' ? Number(validData.metersPerRoll) : 400;
        if (validData.dailyShipmentRate !== undefined) updateData.daily_shipment_rate = validData.dailyShipmentRate !== null && validData.dailyShipmentRate !== '' ? Number(validData.dailyShipmentRate) : 0;
        if (validData.productionLeadDays !== undefined) updateData.production_lead_days = validData.productionLeadDays !== null && validData.productionLeadDays !== '' ? Number(validData.productionLeadDays) : 0;

        const { data: updateResults, error } = await supabaseClient
            .from('products')
            .update(updateData)
            .eq('id', body.id)
            .select();

        if (error) {
            console.error('Error updating product:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!updateResults || updateResults.length === 0) {
            console.error('Product not found or not updated:', body.id);
            return NextResponse.json({ error: `DIAGNOSTIC_v1: 商品が見つからないか、更新されませんでした (ID: ${body.id})` }, { status: 404 });
        }

        const data = updateResults[0];

        return NextResponse.json({
            id: data.id,
            name: data.name,
            message: '商品を更新しました',
        });
    } catch (error) {
        await logError({
            route: '/api/products',
            method: 'PUT',
            error,
        })
        return NextResponse.json({ data: null, error: '商品更新でエラーが発生しました。' }, { status: 500 });
    }
}

// DELETE: 商品を削除（論理削除）
export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const auth = await requireAdmin();
        if (!auth.success) {
            return auth.response;
        }

        const supabaseClient = createServerClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: '商品IDは必須です' },
                { status: 400 }
            );
        }

        // 論理削除（statusをinactiveに変更）
        const { error } = await supabaseClient
            .from('products')
            .update({ status: 'inactive' })
            .eq('id', id);

        if (error) {
            console.error('Error deleting product:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: '商品を削除しました' });
    } catch (error) {
        await logError({
            route: '/api/products',
            method: 'DELETE',
            error,
        })
        return NextResponse.json({ data: null, error: '商品削除でエラーが発生しました。' }, { status: 500 });
    }
}
