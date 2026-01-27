/**
 * 入荷予定API
 * 入荷予定データの取得・作成・更新・削除を行います
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: 入荷予定一覧を取得
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        let query = supabase
            .from('incoming_stock')
            .select('*')
            .order('expected_date', { ascending: true });

        // 商品IDでフィルタリング
        if (productId) {
            query = query.eq('product_id', productId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('入荷予定の取得エラー:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // キャメルケースに変換して返却
        const formattedData = data.map(item => ({
            id: item.id,
            productId: item.product_id,
            expectedDate: item.expected_date,
            quantity: item.quantity,
            note: item.note,
        }));

        return NextResponse.json(formattedData);
    } catch (err) {
        console.error('予期せぬエラー:', err);
        return NextResponse.json({ error: 'サーバー内部エラーが発生しました' }, { status: 500 });
    }
}

// POST: 入荷予定を新規作成
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();

        // 必須チェック
        if (!body.productId || !body.expectedDate || body.quantity === undefined) {
            return NextResponse.json(
                { error: '商品ID、入荷予定日、数量は必須です' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('incoming_stock')
            .insert({
                product_id: body.productId,
                expected_date: body.expectedDate,
                quantity: body.quantity,
                note: body.note
            })
            .select()
            .single();

        if (error) {
            console.error('入荷予定の作成エラー:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            id: data.id,
            productId: data.product_id,
            expectedDate: data.expected_date,
            quantity: data.quantity,
            note: data.note,
        }, { status: 201 });
    } catch (err) {
        console.error('予期せぬエラー:', err);
        return NextResponse.json({ error: 'サーバー内部エラーが発生しました' }, { status: 500 });
    }
}

// PUT: 入荷予定を更新
export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { error: '入荷予定IDは必須です' },
                { status: 400 }
            );
        }

        const updateData: any = {};
        if (body.expectedDate) updateData.expected_date = body.expectedDate;
        if (body.quantity !== undefined) updateData.quantity = body.quantity;
        if (body.note !== undefined) updateData.note = body.note;

        const { data, error } = await supabase
            .from('incoming_stock')
            .update(updateData)
            .eq('id', body.id)
            .select()
            .single();

        if (error) {
            console.error('入荷予定の更新エラー:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            id: data.id,
            productId: data.product_id,
            expectedDate: data.expected_date,
            quantity: data.quantity,
            note: data.note,
        });
    } catch (err) {
        console.error('予期せぬエラー:', err);
        return NextResponse.json({ error: 'サーバー内部エラーが発生しました' }, { status: 500 });
    }
}

// DELETE: 入荷予定を削除
export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: '入荷予定IDは必須です' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('incoming_stock')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('入荷予定の削除エラー:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: '入荷予定を削除しました' });
    } catch (err) {
        console.error('予期せぬエラー:', err);
        return NextResponse.json({ error: 'サーバー内部エラーが発生しました' }, { status: 500 });
    }
}
