/**
 * 入荷予定API
 * 入荷予定データの取得・作成・更新・削除を行います
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
// GET: 入荷予定一覧を取得
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const supabaseClient = createServerClient();
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        let query = supabaseClient
            .from('incoming_stock')
            .select('*, products(name, weight, shape)')
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

        // キャメルケースに変換して返却（商品名を含む）
        const formattedData = (data as (typeof data[number] & { products: { name: string, weight: number | null, shape: string | null } | null })[]).map(item => ({
            id: item.id,
            productId: item.product_id,
            productName: item.products?.name || '不明',
            productWeight: item.products?.weight || null,
            productShape: item.products?.shape || null,
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
        const supabaseClient = createServerClient();
        const body = await request.json();

        // 必須チェック (expectedDate は null または undefined の場合にチェックを緩和)
        if (!body.productId || body.quantity === undefined) {
            return NextResponse.json(
                { error: '商品ID、数量は必須です' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseClient
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
        const supabaseClient = createServerClient();
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { error: '入荷予定IDは必須です' },
                { status: 400 }
            );
        }

        const updateData: Record<string, string | number | null> = {};
        if (body.expectedDate !== undefined) updateData.expected_date = body.expectedDate;
        if (body.quantity !== undefined) updateData.quantity = body.quantity;
        if (body.note !== undefined) updateData.note = body.note;

        const { data, error } = await supabaseClient
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
        const supabaseClient = createServerClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: '入荷予定IDは必須です' },
                { status: 400 }
            );
        }

        const { error } = await supabaseClient
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

// PATCH: 入荷予定を本在庫へ反映（またはアクション実行）
export async function PATCH(request: NextRequest): Promise<NextResponse> {
    try {
        const supabaseClient = createServerClient();
        const body = await request.json();

        if (body.action === 'receive' && body.id) {
            // 1. 入荷予定の取得
            const { data: incomingStock, error: fetchError } = await supabaseClient
                .from('incoming_stock')
                .select('*')
                .eq('id', body.id)
                .single();

            if (fetchError || !incomingStock) {
                return NextResponse.json({ error: '入荷予定が見つかりません' }, { status: 404 });
            }

            // 出荷先がデフォルト以外かチェック
            let shouldUpdateInventory = true;
            let historyNote = '入荷予定から反映';

            if (incomingStock.note) {
                // 納品先マスタから検索
                const { data: address } = await supabaseClient
                    .from('delivery_addresses')
                    .select('is_default')
                    .eq('name', incomingStock.note)
                    .maybeSingle();

                if (address && !address.is_default) {
                    shouldUpdateInventory = false;
                    historyNote = `直送入荷 (出荷先: ${incomingStock.note})`;
                }
            }

            if (shouldUpdateInventory) {
                // 2. 現在の在庫数を取得
                const { data: inventory } = await supabaseClient
                    .from('inventory')
                    .select('quantity')
                    .eq('product_id', incomingStock.product_id)
                    .maybeSingle();

                // レコードがない場合は0とする
                const currentQty = (inventory as { quantity: number } | null)?.quantity || 0;
                const newQty = currentQty + incomingStock.quantity;

                // 3. 在庫数を更新 (upsert)
                const { error: upsertError } = await supabaseClient
                    .from('inventory')
                    .upsert({
                        product_id: incomingStock.product_id,
                        quantity: newQty,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'product_id' });

                if (upsertError) {
                    throw upsertError;
                }

                // 4. 履歴を記録
                await supabaseClient.from('stock_history').insert({
                    product_id: incomingStock.product_id,
                    type: 'incoming',
                    quantity: newQty,
                    change_amount: incomingStock.quantity,
                    note: historyNote
                });
            } else {
                // 在庫更新はしないが履歴には残す（直送扱い）
                // 現在の在庫数を取得（履歴のスナップショット用）
                const { data: inventory } = await supabaseClient
                    .from('inventory')
                    .select('quantity')
                    .eq('product_id', incomingStock.product_id)
                    .maybeSingle();
                
                const currentQty = (inventory as { quantity: number } | null)?.quantity || 0;

                await supabaseClient.from('stock_history').insert({
                    product_id: incomingStock.product_id,
                    type: 'order', // 直送は受注に関連するので 'order' または 'outgoing'
                    quantity: currentQty, // 在庫は変わらない
                    change_amount: -incomingStock.quantity, // 出荷分としてマイナス
                    note: historyNote
                });
            }

            // 5. 入荷予定を削除
            await supabaseClient
                .from('incoming_stock')
                .delete()
                .eq('id', body.id);

            return NextResponse.json({ 
                success: true, 
                message: shouldUpdateInventory ? '在庫に反映しました' : '直送として処理しました（在庫は変動しません）' 
            });
        }

        return NextResponse.json({ error: '不正なアクションです' }, { status: 400 });

    } catch (err) {
        console.error('入荷処理エラー:', err);
        return NextResponse.json({ error: 'サーバー内部エラーが発生しました' }, { status: 500 });
    }
}
