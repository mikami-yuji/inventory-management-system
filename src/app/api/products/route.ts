/**
 * 商品API
 * Supabaseから商品データを取得・作成・更新・削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: 商品一覧を取得
export async function GET(): Promise<NextResponse> {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .order('name');

        if (error) {
            console.error('Error fetching products:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // TypeScript型に変換
        const products = data.map(item => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
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
        }));

        return NextResponse.json(products);
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: 商品を新規作成
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();

        // バリデーション
        if (!body.name || !body.category) {
            return NextResponse.json(
                { error: '商品名とカテゴリは必須です' },
                { status: 400 }
            );
        }

        // Supabase用のフォーマットに変換
        const productData = {
            name: body.name,
            sku: body.sku || null,
            jan_code: body.janCode || null,
            weight: body.weight || null,
            shape: body.shape || null,
            material: body.material || null,
            unit_price: body.unitPrice || 0,
            printing_cost: body.printingCost || 0,
            category: body.category,
            image_url: body.imageUrl || null,
            description: body.description || null,
            status: 'active',
            min_stock_alert: body.minStockAlert || 100,
        };

        const { data, error } = await supabase
            .from('products')
            .insert(productData)
            .select()
            .single();

        if (error) {
            console.error('Error creating product:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 在庫レコードも作成
        await supabase.from('inventory').insert({
            product_id: data.id,
            quantity: 0,
        });

        return NextResponse.json({
            id: data.id,
            name: data.name,
            sku: data.sku,
            category: data.category,
        }, { status: 201 });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: 商品を更新
export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { error: '商品IDは必須です' },
                { status: 400 }
            );
        }

        // 更新データを準備
        const updateData: Record<string, unknown> = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.sku !== undefined) updateData.sku = body.sku;
        if (body.janCode !== undefined) updateData.jan_code = body.janCode;
        if (body.weight !== undefined) updateData.weight = body.weight;
        if (body.shape !== undefined) updateData.shape = body.shape;
        if (body.material !== undefined) updateData.material = body.material;
        if (body.unitPrice !== undefined) updateData.unit_price = body.unitPrice;
        if (body.printingCost !== undefined) updateData.printing_cost = body.printingCost;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.minStockAlert !== undefined) updateData.min_stock_alert = body.minStockAlert;

        const { data, error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', body.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating product:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            id: data.id,
            name: data.name,
            message: '商品を更新しました',
        });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: 商品を削除（論理削除）
export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: '商品IDは必須です' },
                { status: 400 }
            );
        }

        // 論理削除（statusをinactiveに変更）
        const { error } = await supabase
            .from('products')
            .update({ status: 'inactive' })
            .eq('id', id);

        if (error) {
            console.error('Error deleting product:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: '商品を削除しました' });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

