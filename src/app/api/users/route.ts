import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin, requireAuth } from '@/lib/auth-guard';

export async function GET(): Promise<NextResponse> {
    const auth = await requireAuth();
    if (!auth.success) {
        return auth.response;
    }

    const supabase = createServerClient();
    const isAdmin = auth.user.role === 'admin';

    // 管理者は全ユーザー一覧を取得可能、一般ユーザーは自分のプロファイルのみ取得可能
    let query = supabase.from('users').select('*');
    if (!isAdmin) {
        query = query.eq('id', auth.user.id);
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data: profiles, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedProfiles = (profiles as Record<string, unknown>[] || []).map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        receivesOrderEmails: p.receives_order_emails,
    }));

    return NextResponse.json({ data: formattedProfiles });
}

export async function PUT(request: Request): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.success) {
        return auth.response;
    }

    const supabase = createServerClient();
    const body = await request.json();

    const { id, role, receivesOrderEmails } = body;

    if (!id || !role) {
        return NextResponse.json({ error: 'ID and Role are required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('users')
        .update({
            role,
            receives_order_emails: receivesOrderEmails
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

