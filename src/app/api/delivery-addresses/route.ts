
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    try {
        const supabase = createServerClient();
        // @ts-ignore - Database types not yet updated
        const { data, error } = await supabase
            .from('delivery_addresses')
            .select('*')
            .eq('client_id', userId)
            .order('is_default', { ascending: false }) // デフォルトを先に
            .order('created_at', { ascending: false });

        if (error) throw error;

        // キャメルケースに変換
        const addresses = (data || []).map((addr: any) => ({
            id: addr.id,
            clientId: addr.client_id,
            name: addr.name,
            postalCode: addr.postal_code,
            address: addr.address,
            phone: addr.phone,
            isDefault: addr.is_default
        }));

        return NextResponse.json(addresses);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    try {
        const body = await request.json();
        const { name, postalCode, address, phone, isDefault } = body;

        // バリデーション
        if (!name || !address || !phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // デフォルト設定の場合、既存のデフォルトを解除
        const supabase = createServerClient();
        if (isDefault) {
            // @ts-ignore
            await supabase
                .from('delivery_addresses')
                .update({ is_default: false })
                .eq('client_id', userId);
        }

        // @ts-ignore
        const { data, error } = await supabase
            .from('delivery_addresses')
            .insert({
                client_id: userId,
                name,
                postal_code: postalCode,
                address,
                phone,
                is_default: isDefault || false
            })
            .select() // create後のデータを取得
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating address:', error);
        return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
        const supabase = createServerClient();
        // @ts-ignore
        const { error } = await supabase
            .from('delivery_addresses')
            .delete()
            .eq('id', id)
            .eq('client_id', userId); // 自分のデータのみ削除可能

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting address:', error);
        return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
    }
}
