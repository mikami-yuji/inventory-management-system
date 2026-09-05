import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { Product, Inventory, ApiResponse } from '@/types';
import { requireAuth, requireAdmin } from '@/lib/auth-guard';
import { z } from 'zod';
import { logError } from '@/lib/logger';

// PostgREST フィルターインジェクション対策サニタイザー
function sanitizeSearchQuery(input: string): string {
    return input.replace(/[,():%\\`"']/g, '').trim();
}

// 在庫データ（商品情報含む）の型
type InventoryWithProduct = Inventory & {
    product: Product;
};

// GET: 在庫一覧を取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryWithProduct[]>>> {
    try {
        const auth = await requireAuth();
        if (!auth.success) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerClient();
        const { searchParams } = new URL(request.url);

        // クエリパラメータ
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const lowStock = searchParams.get('lowStock') === 'true';

        // ベースクエリ
        let query = supabase
            .from('inventory')
            .select(`
                product_id,
                quantity,
                old_price_quantity,
                updated_at,
                product:products (
                  id,
                  name,
                  sku,
                  jan_code,
                  weight,
                  shape,
                  material,
                  unit_price,
                  printing_cost,
                  old_unit_price,
                  old_printing_cost,
                  price_increase_effective_date,
                  category,
                  image_url,
                  description,
                  status,
                  min_stock_alert,
                  supplier_stock,
                  supplier_stock_updated_at,
                  meters_per_roll
                )
            `);

        // カテゴリフィルター
        if (category && category !== 'all') {
            query = query.eq('product.category', category);
        }

        // 検索フィルター (サニタイズ適用)
        if (search) {
            const sanitized = sanitizeSearchQuery(search);
            if (sanitized) {
                query = query.or(`product.name.ilike.%${sanitized}%,product.sku.ilike.%${sanitized}%`);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('在庫取得エラー:', error);
            return NextResponse.json({ data: null, error: error.message }, { status: 500 });
        }

        // 在庫アラート対象のみ抽出（DBのスネークケースmin_stock_alertもフォールバック考慮）
        let result = data as unknown as InventoryWithProduct[];
        if (lowStock) {
            result = result.filter(item => {
                const rawProduct = item.product as unknown as Record<string, unknown>;
                const minAlert = (typeof rawProduct?.min_stock_alert === 'number' ? rawProduct.min_stock_alert : null)
                    ?? item.product?.minStockAlert
                    ?? 100;
                return item.quantity < minAlert;
            });
        }

        return NextResponse.json({ data: result, error: null });
    } catch (error) {
        await logError({
            route: '/api/inventory',
            method: 'GET',
            error,
        });
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        );
    }
}

const updateInventorySchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().min(0, 'Quantity must be positive'),
    type: z.enum(['incoming', 'outgoing', 'adjustment']),
    note: z.string().optional()
});

// PATCH: 在庫を更新（管理者のみ・入出庫処理・アトミックRPC）
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<Inventory>>> {
    try {
        const auth = await requireAdmin();
        if (!auth.success) {
            return auth.response as NextResponse<ApiResponse<Inventory>>;
        }

        const supabase = createServerClient();
        const body = await request.json();

        const validated = updateInventorySchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { data: null, error: '入力値が不正です。数量は正の整数を指定してください。' },
                { status: 400 }
            );
        }

        const { productId, quantity, type, note } = validated.data;

        // 1. PostgreSQL アトミック RPC を呼び出し（行ロック + 在庫更新 + 履歴登録を1トランザクションで実行）
        const { data: rpcResult, error: rpcError } = await supabase.rpc('update_inventory_atomic', {
            p_product_id: productId,
            p_quantity: quantity,
            p_type: type,
            p_note: note || null,
            p_user_id: auth.user.id
        });

        if (!rpcError && rpcResult) {
            const updated = rpcResult as {
                product_id: string;
                quantity: number;
                old_price_quantity: number;
                updated_at: string;
            };

            return NextResponse.json({
                data: {
                    id: '', // compatibility
                    productId: updated.product_id,
                    quantity: updated.quantity,
                    oldPriceQuantity: updated.old_price_quantity,
                    updatedAt: updated.updated_at
                } as unknown as Inventory,
                error: null
            });
        }

        // RPC エラー時の詳細分岐
        if (rpcError) {
            // 在庫不足エラーの場合
            if (rpcError.message && rpcError.message.includes('INSUFFICIENT_STOCK')) {
                return NextResponse.json(
                    { data: null, error: '在庫数が不足しています' },
                    { status: 400 }
                );
            }

            // RPC 未デプロイ時のフォールバック処理
            console.warn('RPC update_inventory_atomic failed, falling back to direct update:', rpcError.message);
        }

        // フォールバック: 直接更新（※DBマイグレーション適用前の互換性維持）
        const { data: currentInventoryData, error: fetchError } = await supabase
            .from('inventory')
            .select('quantity, old_price_quantity')
            .eq('product_id', productId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('在庫取得エラー:', fetchError);
            return NextResponse.json({ data: null, error: fetchError.message }, { status: 500 });
        }

        const currentInventory = currentInventoryData as { quantity: number; old_price_quantity: number } | null;
        let newQuantity = currentInventory?.quantity ?? 0;
        let newOldPriceQuantity = currentInventory?.old_price_quantity ?? 0;

        if (type === 'incoming') {
            newQuantity += quantity;
        } else if (type === 'outgoing') {
            newQuantity -= quantity;
            if (newQuantity < 0) {
                return NextResponse.json(
                    { data: null, error: '在庫数が不足しています' },
                    { status: 400 }
                );
            }
            if (newOldPriceQuantity > 0) {
                const oldReduction = Math.min(newOldPriceQuantity, quantity);
                newOldPriceQuantity -= oldReduction;
            }
        } else {
            newQuantity = quantity;
            const currentQty = currentInventory?.quantity ?? 0;
            const diff = currentQty - newQuantity;
            if (diff > 0) {
                const currentOldQty = currentInventory?.old_price_quantity ?? 0;
                newOldPriceQuantity = Math.max(0, currentOldQty - diff);
            }
        }

        if (newOldPriceQuantity > newQuantity) {
            newOldPriceQuantity = newQuantity;
        }

        const { data: updateResults, error: updateError } = await supabase
            .from('inventory')
            .upsert({
                product_id: productId,
                quantity: newQuantity,
                old_price_quantity: newOldPriceQuantity,
                updated_at: new Date().toISOString()
            }, { onConflict: 'product_id' })
            .select();

        if (updateError) {
            console.error('在庫更新エラー:', updateError);
            return NextResponse.json({ data: null, error: updateError.message }, { status: 500 });
        }

        if (!updateResults || updateResults.length === 0) {
            return NextResponse.json({ data: null, error: '在庫の更新結果を取得できませんでした' }, { status: 500 });
        }

        const updatedInventory = updateResults[0];

        // 履歴を記録
        await supabase.from('stock_history').insert({
            product_id: productId,
            user_id: auth.user.id,
            type,
            quantity,
            note
        });

        const formattedInventory: Inventory = {
            productId: updatedInventory.product_id,
            quantity: updatedInventory.quantity,
            oldPriceQuantity: updatedInventory.old_price_quantity,
            updatedAt: updatedInventory.updated_at
        };

        return NextResponse.json({ data: formattedInventory, error: null });

    } catch (error) {
        console.error('サーバーエラー:', error);
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        );
    }
}
