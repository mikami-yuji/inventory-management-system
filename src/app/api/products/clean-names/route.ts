/**
 * 商品名表記ゆれスキャン＆一括修復API
 * GET  /api/products/clean-names -> スキャン（差分リストの返却）
 * POST /api/products/clean-names -> 一括正規化の実行
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin, requireAuth } from '@/lib/auth-guard';
import { normalizeProductName } from '@/lib/utils/product-name-cleaner';

// GET: 表記ゆれスキャン
export async function GET() {
    try {
        const auth = await requireAuth();
        if (!auth.success) {
            return auth.response;
        }

        const supabase = createServerClient();
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, sku, category, weight, shape')
            .order('name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const diffs: Array<{
            id: string;
            sku: string | null;
            category: string;
            currentName: string;
            suggestedName: string;
        }> = [];

        (products || []).forEach(p => {
            const currentName = p.name || '';
            const suggestedName = normalizeProductName(currentName);
            if (currentName !== suggestedName) {
                diffs.push({
                    id: p.id,
                    sku: p.sku,
                    category: p.category,
                    currentName,
                    suggestedName,
                });
            }
        });

        return NextResponse.json({
            totalProducts: (products || []).length,
            issuesCount: diffs.length,
            issues: diffs
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// POST: 一括修復実行
export async function POST() {
    try {
        const auth = await requireAdmin();
        if (!auth.success) {
            return auth.response;
        }

        const supabase = createServerClient();
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        let updatedCount = 0;
        const errors: string[] = [];

        for (const p of products || []) {
            const currentName = p.name || '';
            const suggestedName = normalizeProductName(currentName);
            if (currentName !== suggestedName) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ name: suggestedName })
                    .eq('id', p.id);

                if (updateError) {
                    errors.push(`ID ${p.id}: ${updateError.message}`);
                } else {
                    updatedCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount,
            errors
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
