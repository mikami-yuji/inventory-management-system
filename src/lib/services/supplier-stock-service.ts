import { createServerClient } from '@/lib/supabase';
import type { SupplierStockLot } from '@/types';

export interface CreateSupplierStockLotInput {
    productId: string;
    quantity: number;
    stockDate: string;
    note?: string | null;
}

export interface UpdateSupplierStockLotInput {
    lotId: string;
    quantity: number;
    stockDate: string;
    note?: string | null;
}

export interface MoveToIncomingSchedule {
    expectedDate: string;
    quantity: number;
    note?: string;
}

export interface MoveToIncomingInput {
    productId: string;
    schedules: MoveToIncomingSchedule[];
}

export const supplierStockService = {
    /**
     * メーカー在庫ロット一覧の取得
     */
    async getLots(productId?: string): Promise<SupplierStockLot[]> {
        const supabase = createServerClient();

        let query = supabase
            .from('supplier_stock_lots')
            .select('*')
            .gt('quantity', 0)
            .order('stock_date', { ascending: true });

        if (productId) {
            query = query.eq('product_id', productId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`ロット取得エラー: ${error.message}`);
        }

        return (data || []).map(lot => ({
            id: lot.id,
            productId: lot.product_id,
            stockDate: lot.stock_date,
            quantity: lot.quantity,
            note: lot.note || undefined,
            createdAt: lot.created_at
        }));
    },

    /**
     * 新規ロットの追加
     */
    async createLot(input: CreateSupplierStockLotInput): Promise<void> {
        if (input.quantity <= 0) return;
        const supabase = createServerClient();

        const { error } = await supabase
            .from('supplier_stock_lots')
            .insert({
                product_id: input.productId,
                quantity: input.quantity,
                stock_date: input.stockDate,
                note: input.note || null
            });

        if (error) {
            throw new Error(`ロット作成エラー: ${error.message}`);
        }
    },

    /**
     * ロットの更新 (数量が0以下の場合は自動削除)
     */
    async updateLot(input: UpdateSupplierStockLotInput): Promise<void> {
        if (input.quantity <= 0) {
            return this.deleteLot(input.lotId);
        }

        const supabase = createServerClient();

        const { error } = await supabase
            .from('supplier_stock_lots')
            .update({
                quantity: input.quantity,
                stock_date: input.stockDate,
                note: input.note || null
            })
            .eq('id', input.lotId);

        if (error) {
            throw new Error(`ロット更新エラー: ${error.message}`);
        }
    },

    /**
     * ロットの削除
     */
    async deleteLot(lotId: string): Promise<void> {
        const supabase = createServerClient();

        const { error } = await supabase
            .from('supplier_stock_lots')
            .delete()
            .eq('id', lotId);

        if (error) {
            throw new Error(`ロット削除エラー: ${error.message}`);
        }
    },

    /**
     * 入荷予定への移動 (RPCアトミック処理優先、フォールバック付き)
     */
    async moveToIncoming(input: MoveToIncomingInput): Promise<void> {
        const supabase = createServerClient();
        const totalMovementQuantity = input.schedules.reduce((sum, s) => sum + (s.quantity || 0), 0);

        if (totalMovementQuantity <= 0) {
            throw new Error('正の移動数量を指定してください');
        }

        // 1. RPCによるアトミック移動を試行
        const { data: rpcResult, error: rpcError } = await supabase.rpc('move_supplier_stock_to_incoming_atomic', {
            p_product_id: input.productId,
            p_schedules: input.schedules as unknown as import('@/types/database').Json
        });

        if (!rpcError && rpcResult?.success) {
            return;
        }

        console.warn('RPC move_supplier_stock_to_incoming_atomic unavailable or failed, falling back:', rpcError?.message);

        // フォールバック: FIFOでのロット減算
        const { data: lots, error: lotsError } = await supabase
            .from('supplier_stock_lots')
            .select('*')
            .eq('product_id', input.productId)
            .gt('quantity', 0)
            .order('stock_date', { ascending: true });

        if (lotsError) {
            throw new Error(`ロットの取得に失敗しました: ${lotsError.message}`);
        }

        const totalCurrentStock = (lots || []).reduce((sum, lot) => sum + lot.quantity, 0);
        if (totalCurrentStock < totalMovementQuantity) {
            throw new Error('メーカー在庫が不足しています');
        }

        let remainingToMove = totalMovementQuantity;
        for (const lot of (lots || [])) {
            if (remainingToMove <= 0) break;

            const deductQuantity = Math.min(lot.quantity, remainingToMove);
            const newLotQuantity = lot.quantity - deductQuantity;

            if (newLotQuantity <= 0) {
                // 0mになったロットは自動削除
                const { error: deleteError } = await supabase
                    .from('supplier_stock_lots')
                    .delete()
                    .eq('id', lot.id);

                if (deleteError) {
                    throw new Error(`ロットの削除に失敗しました: ${deleteError.message}`);
                }
            } else {
                const { error: updateError } = await supabase
                    .from('supplier_stock_lots')
                    .update({ quantity: newLotQuantity })
                    .eq('id', lot.id);

                if (updateError) {
                    throw new Error(`ロットの更新に失敗しました: ${updateError.message}`);
                }
            }

            remainingToMove -= deductQuantity;
        }

        const incomingRecords = input.schedules.map(s => ({
            product_id: input.productId,
            expected_date: s.expectedDate,
            quantity: s.quantity,
            note: s.note || 'メーカー在庫からの移動'
        }));

        const { error: incomingStockError } = await supabase
            .from('incoming_stock')
            .insert(incomingRecords);

        if (incomingStockError) {
            throw new Error(`入荷予定の作成に失敗しました: ${incomingStockError.message}`);
        }
    },

    /**
     * 旧仕様互換: 全体在庫の上書き
     */
    async resetSingleStock(productId: string, quantity: number): Promise<void> {
        const supabase = createServerClient();

        await supabase.from('supplier_stock_lots').delete().eq('product_id', productId);
        if (quantity > 0) {
            await supabase.from('supplier_stock_lots').insert({
                product_id: productId,
                quantity,
                stock_date: new Date().toISOString().split('T')[0],
                note: '一括調整'
            });
        }
    },

    /**
     * 全商品のメーカー在庫数をロット合計値と同期 (N+1解消・集約更新)
     */
    async syncAllStock(): Promise<void> {
        const supabase = createServerClient();

        // 1回で全ロットの合計値を集計
        const { data: lots, error: lotsError } = await supabase
            .from('supplier_stock_lots')
            .select('product_id, quantity');

        if (lotsError) {
            throw new Error(`ロット集計エラー: ${lotsError.message}`);
        }

        const totalsByProduct = new Map<string, number>();
        (lots || []).forEach(lot => {
            const current = totalsByProduct.get(lot.product_id) || 0;
            totalsByProduct.set(lot.product_id, current + (lot.quantity || 0));
        });

        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, supplier_stock');

        if (productsError) {
            throw new Error(`商品取得エラー: ${productsError.message}`);
        }

        // 不一致のある商品のみ更新
        for (const p of (products || [])) {
            const targetStock = totalsByProduct.get(p.id) || 0;
            if (p.supplier_stock !== targetStock) {
                await supabase
                    .from('products')
                    .update({ supplier_stock: targetStock })
                    .eq('id', p.id);
            }
        }
    }
};
