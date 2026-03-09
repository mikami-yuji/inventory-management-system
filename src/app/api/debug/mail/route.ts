import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
    const resendKey = process.env.RESEND_API_KEY ? 'Set (starts with ' + process.env.RESEND_API_KEY.substring(0, 4) + '...)' : 'Not Set';
    const mailFrom = process.env.MAIL_FROM_ADDRESS || 'Not Set (using onboarding@resend.dev)';

    const supabase = createServerClient();
    const { data: adminUsers, error } = await supabase
        .from('users')
        .select('name, email, receives_order_emails')
        .eq('receives_order_emails', true);

    return NextResponse.json({
        resendKey,
        mailFrom,
        adminUsersToNotify: adminUsers || [],
        dbError: error || null,
        instructions: [
            "1. RESEND_API_KEY が 'Not Set' の場合、.env ファイルに設定が必要です。",
            "2. adminUsersToNotify が空の場合、ユーザー管理画面で通知を ON にしたユーザーがいません。",
            "3. Resendの制限により、ドメイン認証前は送信元が onboarding@resend.dev に固定され、送信先も制限される場合があります。"
        ]
    });
}
