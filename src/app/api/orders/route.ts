import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Order } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';
import { logError } from '@/lib/logger';
import { orderService } from '@/lib/services/order-service';

// GET: 発注一覧を取得
export async function GET(): Promise<NextResponse<Order[] | { error: string }>> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const orders = await orderService.getOrders();
        return NextResponse.json(orders);
    } catch (error) {
        await logError({
            route: '/api/orders',
            method: 'GET',
            error,
        });
        return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}

const createOrderSchema = z.object({
    items: z.array(z.object({
        productId: z.string().min(1, '商品IDは必須です'),
        quantity: z.number().positive('数量は1以上である必要があります')
    })).min(1, '少なくとも1つの商品を選択してください'),
    clientId: z.string().min(1, 'クライアントIDは必須です'),
    type: z.enum(['standard', 'special_event']).default('standard'),
    eventId: z.string().optional().nullable(),
    shipmentSource: z.enum(['inventory', 'supplier', 'wip', 'wip-request']),
    preferredShape: z.string().optional().nullable(),
    deliveryName: z.string().optional().nullable(),
    deliveryPostalCode: z.string().optional().nullable(),
    deliveryAddress: z.string().optional().nullable(),
    deliveryPhone: z.string().optional().nullable()
});

// POST: 新規発注作成
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Order>>> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validated = createOrderSchema.safeParse(body);
        if (!validated.success) {
            console.error('Order Validation Error:', JSON.stringify(validated.error.format(), null, 2));
            return NextResponse.json(
                { data: null, error: '入力値が不正です。', details: validated.error.format() },
                { status: 400 }
            );
        }

        const order = await orderService.createOrder(validated.data);

        return NextResponse.json({
            data: order,
            error: null
        });
    } catch (error) {
        await logError({
            route: '/api/orders',
            method: 'POST',
            error,
        });
        return NextResponse.json(
            { data: null, error: error instanceof Error ? error.message : 'サーバーエラーが発生しました' },
            { status: 500 }
        );
    }
}
