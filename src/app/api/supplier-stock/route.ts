import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, SupplierStockLot } from '@/types';
import { requireAuth } from '@/lib/auth-guard';
import { z } from 'zod';
import { logError } from '@/lib/logger';
import { supplierStockService } from '@/lib/services/supplier-stock-service';

// GET: メーカー在庫ロット一覧の取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SupplierStockLot[]>>> {
    try {
        const auth = await requireAuth();
        if (!auth.success) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId') || undefined;

        const lots = await supplierStockService.getLots(productId);
        return NextResponse.json({ data: lots, error: null });
    } catch (error) {
        await logError({
            route: '/api/supplier-stock',
            method: 'GET',
            error
        });
        return NextResponse.json({ data: null, error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}

const createLotSchema = z.object({
    productId: z.string().min(1, '商品IDは必須です'),
    quantity: z.number().nonnegative('数量は0以上である必要があります'),
    stockDate: z.string().min(1, 'ロット日付は必須です'),
    note: z.string().optional().nullable()
});

// POST: 新規ロットの追加
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const auth = await requireAuth();
        if (!auth.success) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validated = createLotSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { data: null, error: '入力値が不正です。', details: validated.error.format() },
                { status: 400 }
            );
        }

        await supplierStockService.createLot(validated.data);
        return NextResponse.json({ data: { success: true }, error: null });
    } catch (error) {
        await logError({
            route: '/api/supplier-stock',
            method: 'POST',
            error
        });
        return NextResponse.json(
            { data: null, error: error instanceof Error ? error.message : 'サーバーエラーが発生しました' },
            { status: 500 }
        );
    }
}

const patchLotSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('update_lot'),
        lotId: z.string().min(1, 'ロットIDは必須です'),
        quantity: z.number().nonnegative('数量は0以上である必要があります'),
        stockDate: z.string().min(1, 'ロット日付は必須です'),
        note: z.string().optional().nullable()
    }),
    z.object({
        action: z.literal('move_to_incoming'),
        productId: z.string().min(1, '商品IDは必須です'),
        schedules: z.array(z.object({
            expectedDate: z.string().min(1, '入荷予定日は必須です'),
            quantity: z.number().positive('数量は1以上である必要があります'),
            note: z.string().optional().nullable()
        })).min(1, '少なくとも1つの移動予定を指定してください')
    }),
    z.object({
        action: z.literal('sync_all')
    }),
    z.object({
        action: z.literal('reset_single'),
        productId: z.string().min(1, '商品IDは必須です'),
        supplierStock: z.number().nonnegative()
    })
]);

// PATCH: ロットの更新 / 入荷予定移動 / 在庫同期
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const auth = await requireAuth();
        if (!auth.success) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // 互換性: actionが明示されていないが supplierStock と productId がある場合は reset_single にマッピング
        if (!body.action && body.productId && body.supplierStock !== undefined) {
            body.action = 'reset_single';
        }

        const validated = patchLotSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { data: null, error: '入力値が不正です。', details: validated.error.format() },
                { status: 400 }
            );
        }

        const data = validated.data;
        if (data.action === 'update_lot') {
            await supplierStockService.updateLot({
                lotId: data.lotId,
                quantity: data.quantity,
                stockDate: data.stockDate,
                note: data.note
            });
        } else if (data.action === 'move_to_incoming') {
            await supplierStockService.moveToIncoming({
                productId: data.productId,
                schedules: data.schedules.map(s => ({
                    expectedDate: s.expectedDate,
                    quantity: s.quantity,
                    note: s.note || undefined
                }))
            });
        } else if (data.action === 'sync_all') {
            await supplierStockService.syncAllStock();
        } else if (data.action === 'reset_single') {
            await supplierStockService.resetSingleStock(data.productId, data.supplierStock);
        }

        return NextResponse.json({ data: { success: true }, error: null });
    } catch (error) {
        await logError({
            route: '/api/supplier-stock',
            method: 'PATCH',
            error
        });
        return NextResponse.json(
            { data: null, error: error instanceof Error ? error.message : 'サーバーエラーが発生しました' },
            { status: 500 }
        );
    }
}

// DELETE: ロットの削除
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const auth = await requireAuth();
        if (!auth.success) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const lotId = searchParams.get('lotId') || searchParams.get('id');

        if (!lotId) {
            return NextResponse.json({ data: null, error: 'ロットIDが必要です' }, { status: 400 });
        }

        await supplierStockService.deleteLot(lotId);
        return NextResponse.json({ data: { success: true }, error: null });
    } catch (error) {
        await logError({
            route: '/api/supplier-stock',
            method: 'DELETE',
            error
        });
        return NextResponse.json(
            { data: null, error: error instanceof Error ? error.message : 'サーバーエラーが発生しました' },
            { status: 500 }
        );
    }
}
