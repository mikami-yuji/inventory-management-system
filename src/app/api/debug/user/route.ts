import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const searchParams = request.nextUrl.searchParams
        const email = searchParams.get('email')

        if (!email) {
            return NextResponse.json({ error: 'Missing email' })
        }

        const supabase = createServerClient()
        
        // Fetch from public.users using Service Role
        const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            
        // Fetch from auth.admin
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
        const authMatched = authUsers?.users?.find(u => u.email === email)

        return NextResponse.json({
            success: true,
            email_searched: email,
            auth_user: authMatched ? {
                id: authMatched.id,
                email: authMatched.email,
                role: authMatched.role,
                email_confirmed_at: authMatched.email_confirmed_at,
                last_sign_in_at: authMatched.last_sign_in_at
            } : null,
            public_users: dbUser,
            db_error: dbError,
            auth_error: authError
        })

    } catch (e: any) {
        return NextResponse.json({
            success: false,
            error_message: e?.message || String(e)
        })
    }
}
