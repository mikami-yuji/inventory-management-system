
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: Request) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase.from('suppliers').select('*').order('name');

    if (activeOnly) {
        query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

export async function POST(request: Request) {
    const supabase = createServerClient();
    const body = await request.json();

    const { data, error } = await supabase
        .from('suppliers')
        .insert([
            {
                name: body.name,
                contact_person: body.contactPerson,
                email: body.email,
                phone: body.phone,
                address: body.address,
                note: body.note,
                active: body.active !== undefined ? body.active : true,
            },
        ])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

export async function PUT(request: Request) {
    const supabase = createServerClient();
    const body = await request.json();

    if (!body.id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('suppliers')
        .update({
            name: body.name,
            contact_person: body.contactPerson,
            email: body.email,
            phone: body.phone,
            address: body.address,
            note: body.note,
            active: body.active,
            updated_at: new Date().toISOString(),
        })
        .eq('id', body.id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('suppliers').delete().eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
