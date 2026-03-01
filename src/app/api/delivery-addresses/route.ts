
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { DeliveryAddress, ApiResponse } from '@/types';

// セッションからユーザーIDを取得するヘルパー
function getUserId(session: { user?: Record<string, unknown> } | null): string | null {
    if (!session?.user) return null;
    return (session.user as Record<string, unknown>).id as string | null;
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createServerClient();
        const isAdmin = (session?.user as any)?.role === 'admin';

        let query = (supabase as any).from('delivery_addresses').select('*');

        // 管理者以外は自分のデータのみ
        if (!isAdmin) {
            query = query.eq('client_id', userId);
        }

        const { data, error } = await query
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        // キャメルケースに変換
        const addresses = (data || []).map((addr: Record<string, unknown>) => ({
            id: addr.id,
            clientId: addr.client_id,
            name: addr.name,
            postalCode: addr.postal_code,
            address: addr.address,
            phone: addr.phone,
            isDefault: addr.is_default,
            preferredShape: addr.preferred_shape
        }));

        return NextResponse.json(addresses);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, postalCode, address, phone, isDefault, preferredShape } = body;

        // バリデーション
        if (!name || !address || !phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // デフォルト設定の場合、既存のデフォルトを解除
        const supabase = createServerClient();
        if (isDefault) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('delivery_addresses')
                .update({ is_default: false })
                .eq('client_id', userId);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('delivery_addresses')
            .insert({
                client_id: userId,
                name,
                postal_code: postalCode,
                address,
                phone,
                is_default: isDefault || false,
                preferred_shape: preferredShape || null
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating address:', error);
        return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
        const supabase = createServerClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
            .from('delivery_addresses')
            .delete()
            .eq('id', id)
            .eq('client_id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting address:', error);
        return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
    }
}
export async function PATCH(request: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, name, postalCode, address, phone, isDefault, preferredShape } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const supabase = createServerClient();

        // デフォルト設定の場合、既存のデフォルトを解除
        if (isDefault) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('delivery_addresses')
                .update({ is_default: false })
                .eq('client_id', userId);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('delivery_addresses')
            .update({
                name,
                postal_code: postalCode,
                address,
                phone,
                is_default: isDefault,
                preferred_shape: preferredShape || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('client_id', userId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating address:', error);
        return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
    }
}
