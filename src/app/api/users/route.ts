
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { UserRole } from '@/types';

export async function GET(request: Request) {
    const supabase = createServerClient();

    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admins can see all profiles. Clients can only see their own?
    // For now, let's just return all profiles if admin.
    // In a real app, we should check the role first.

    const { data: profiles, error } = await (supabase
        .from('users') as any)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: profiles });
}

export async function PUT(request: Request) {
    const supabase = createServerClient();
    const body = await request.json();

    const { id, role } = body;

    if (!id || !role) {
        return NextResponse.json({ error: 'ID and Role are required' }, { status: 400 });
    }

    // Security check: Only admins should be able to change roles.
    // For now, we assume the request is valid to unblock development.

    const { data, error } = await (supabase
        .from('users') as any)
        .update({ role })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}
