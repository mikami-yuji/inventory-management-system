/**
 * 商品API
 * Supabaseから商品データを取得・作成・更新・削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';
import { logError } from '@/lib/logger';
// GET: 商品一覧を取得
export async function GET(): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseClient = createServerClient();
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .neq('status', 'inactive') // inactive以外をすべて取得
            .order('name');

        if (error || !data) {
            console.error('Error fetching products:', error);
            return NextResponse.json({ error: error?.message || 'データが見つかりません' }, { status: 500 });
        }

        // TypeScript型に変換
        const products = data.map((item: Record<string, unknown>) => ({
            id: item.id,
            name: item.name,
            sku: item.sku, // 受注№ (Col A)
            productCode: item.product_code, // 商品コード (Col D)
            janCode: item.jan_code,
            weight: item.weight ? Number(item.weight) : undefined,
            shape: item.shape,
            material: item.material,
            unitPrice: Number(item.unit_price),
            printingCost: Number(item.printing_cost),
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
            discontinuedDate: item.discontinued_date,
            metersPerRoll: item.meters_per_roll !== null && item.meters_per_roll !== undefined ? Number(item.meters_per_roll) : 400,
        }));

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
    frontColorCount: z.number().or(z.string()).optional().nullable(),
    backColorCount: z.number().or(z.string()).optional().nullable(),
    totalColorCount: z.number().or(z.string()).optional().nullable(),
    supplierId: z.string().optional().nullable(),
    metersPerRoll: z.number().or(z.string()).optional().nullable()
});

// POST: 商品を新規作成
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            name: validData.name,
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
            front_color_count: validData.frontColorCount !== undefined && validData.frontColorCount !== null && validData.frontColorCount !== '' ? Number(validData.frontColorCount) : null,
            back_color_count: validData.backColorCount !== undefined && validData.backColorCount !== null && validData.backColorCount !== '' ? Number(validData.backColorCount) : null,
            total_color_count: validData.totalColorCount !== undefined && validData.totalColorCount !== null && validData.totalColorCount !== '' ? Number(validData.totalColorCount) : null,
            supplier_id: validData.supplierId === 'none' || !validData.supplierId ? null : validData.supplierId,
            meters_per_roll: validData.metersPerRoll !== undefined && validData.metersPerRoll !== null && validData.metersPerRoll !== '' ? Number(validData.metersPerRoll) : 400,
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
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        if (validData.name !== undefined) updateData.name = validData.name;
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
        if (validData.frontColorCount !== undefined) updateData.front_color_count = validData.frontColorCount !== null && validData.frontColorCount !== '' ? Number(validData.frontColorCount) : null;
        if (validData.backColorCount !== undefined) updateData.back_color_count = validData.backColorCount !== null && validData.backColorCount !== '' ? Number(validData.backColorCount) : null;
        if (validData.totalColorCount !== undefined) updateData.total_color_count = validData.totalColorCount !== null && validData.totalColorCount !== '' ? Number(validData.totalColorCount) : null;
        if (validData.supplierId !== undefined) updateData.supplier_id = validData.supplierId === 'none' || !validData.supplierId ? null : validData.supplierId;
        if (validData.metersPerRoll !== undefined) updateData.meters_per_roll = validData.metersPerRoll !== null && validData.metersPerRoll !== '' ? Number(validData.metersPerRoll) : 400;

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
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
