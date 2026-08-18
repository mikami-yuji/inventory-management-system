
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin, requireAuth } from '@/lib/auth-guard';

export async function GET() {
    const auth = await requireAuth();
    if (!auth.success) {
        return auth.response;
    }

    const supabase = createServerClient();

    const { data: settings, error } = await supabase.from('app_settings').select('*');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Convert array to object for easier consumption { key: value }
    const settingsMap = (settings || []).reduce((acc: Record<string, string>, curr: Record<string, string>) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ data: settingsMap });
}

export async function PUT(request: Request) {
    const auth = await requireAdmin();
    if (!auth.success) {
        return auth.response;
    }

    const supabase = createServerClient();
    const body = await request.json();

    const { key, value } = body;

    if (!key || value === undefined) {
        return NextResponse.json({ error: 'Key and Value are required' }, { status: 400 });
    }

    const { data, error } = await supabase.from('app_settings').upsert({
        key,
        value,
        updated_at: new Date().toISOString()
    })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

