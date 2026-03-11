import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const searchParams = request.nextUrl.searchParams
        const email = searchParams.get('email')
        const password = searchParams.get('password')

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing email or password' })
        }

        const supabase = createServerClient()
        
        // 1. Check Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        if (authError) {
            return NextResponse.json({
                success: false,
                step: 'Supabase Auth',
                error_name: authError.name,
                error_message: authError.message,
                status: authError.status
            })
        }

        // 2. Check Public Users
        if (authData.user) {
            const { data: userData, error: dbError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id)
                .single()
            
            if (dbError) {
                return NextResponse.json({
                    success: false,
                    step: 'Database Fetch',
                    user_id: authData.user.id,
                    error_message: dbError.message,
                    error_details: dbError.details
                })
            }

            return NextResponse.json({
                success: true,
                message: 'All checks passed! The credentials and database are perfect.',
                user: userData
            })
        }

        return NextResponse.json({ success: false, message: 'Unknown error' })
    } catch (e: any) {
        return NextResponse.json({
            success: false,
            step: 'Try Catch Block',
            error_message: e?.message || String(e)
        })
    }
}
