/**
 * 在庫データCSVエクスポートAPI
 * GET /api/inventory/export -> CSVファイルをダウンロード
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// CSVエスケープ
function escapeCSV(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export async function GET(): Promise<Response> {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 在庫データと商品名を結合取得
        const { data: inventory, error } = await supabase
            .from('inventory')
            .select(`
                id,
                product_id,
                quantity,
                updated_at,
                products:product_id (name, sku, jan_code, weight, shape, category)
            `)
            .order('product_id');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // CSVヘッダー
        const headers = [
            'product_id',
            'product_name',
            'sku',
            'jan_code',
            'weight',
            'shape',
            'category',
            'quantity',
            'updated_at',
        ];

        // CSVデータ生成
        const rows = [headers.join(',')];

        for (const item of inventory || []) {
            // 結合されたproductsデータを取得
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const product = (item as Record<string, any>).products as Record<string, unknown> | null;
            const row = [
                escapeCSV(item.product_id),
                escapeCSV(product?.name),
                escapeCSV(product?.sku),
                escapeCSV(product?.jan_code),
                escapeCSV(product?.weight),
                escapeCSV(product?.shape),
                escapeCSV(product?.category),
                escapeCSV(item.quantity),
                escapeCSV(item.updated_at),
            ];
            rows.push(row.join(','));
        }

        // BOM付きUTF-8
        const bom = '\uFEFF';
        const csv = bom + rows.join('\n');

        // ファイル名（日付形式）
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const filename = `inventory_${dateStr}.csv`;

        return new Response(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Inventory export error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
