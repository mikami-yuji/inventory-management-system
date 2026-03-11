
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

const createSupplierSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    contactPerson: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    active: z.boolean().optional()
});

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const body = await request.json();

    const validated = createSupplierSchema.safeParse(body);
    if (!validated.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const validData = validated.data;

    const { data, error } = await supabase
        .from('suppliers')
        .insert([
            {
                name: validData.name,
                contact_person: validData.contactPerson,
                email: validData.email,
                phone: validData.phone,
                address: validData.address,
                note: validData.note,
                active: validData.active !== undefined ? validData.active : true,
            },
        ])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

const updateSupplierSchema = createSupplierSchema.partial().extend({
    id: z.string().min(1, 'ID is required')
});

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const body = await request.json();

    const validated = updateSupplierSchema.safeParse(body);
    if (!validated.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const validData = validated.data;

    const { data, error } = await supabase
        .from('suppliers')
        .update({
            name: validData.name,
            contact_person: validData.contactPerson,
            email: validData.email,
            phone: validData.phone,
            address: validData.address,
            note: validData.note,
            active: validData.active,
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
