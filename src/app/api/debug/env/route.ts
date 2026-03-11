import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
    return NextResponse.json({
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET (Hidden)" : "NOT SET",
        VERCEL_URL: process.env.VERCEL_URL || "NOT SET",
        NODE_ENV: process.env.NODE_ENV
    })
}
