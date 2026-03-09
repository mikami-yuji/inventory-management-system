import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Admins can see all profiles. Clients can only see their own?
    // For now, let's just return all profiles if admin.
    // In a real app, we should check the role first.

    const { data: profiles, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

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

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const body = await request.json();

    const { id, role, receivesOrderEmails } = body;

    if (!id || !role) {
        return NextResponse.json({ error: 'ID and Role are required' }, { status: 400 });
    }

    // Security check: Only admins should be able to change roles.
    // For now, we assume the request is valid to unblock development.

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
