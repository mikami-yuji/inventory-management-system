/**
 * 商品CSVエクスポートAPI
 * GET /api/products/export → CSVファイルをダウンロード
 */

import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(_request: NextRequest): Promise<Response> {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // CSVヘッダー
        const headers = [
            'id',
            'name',
            'sku',
            'jan_code',
            'weight',
            'shape',
            'material',
            'unit_price',
            'printing_cost',
            'category',
            'status',
            'description',
            'min_stock_alert',
            'prefix',
            'origin',
            'variety',
            'suffix',
            'image_url',
        ];

        // CSVデータ生成
        const rows = [headers.join(',')];

        for (const p of products || []) {
            // JANコードはExcelで数値変換されないよう先頭に'を付けてテキストとして保持
            // CSVではダブルクォートで囲み、先頭に=を付けて文字列として強制
            const janCode = p.jan_code ? `="${p.jan_code}"` : '';

            const row = [
                escapeCSV(p.id),
                escapeCSV(p.name),
                escapeCSV(p.sku),
                janCode, // 特殊処理済み
                escapeCSV(p.weight),
                escapeCSV(p.shape),
                escapeCSV(p.material),
                escapeCSV(p.unit_price),
                escapeCSV(p.printing_cost),
                escapeCSV(p.category),
                escapeCSV(p.status),
                escapeCSV(p.description),
                escapeCSV(p.min_stock_alert),
                escapeCSV(p.prefix),
                escapeCSV(p.origin),
                escapeCSV(p.variety),
                escapeCSV(p.suffix),
                escapeCSV(p.image_url),
            ];
            rows.push(row.join(','));
        }

        // BOM付きUTF-8
        const bom = '\uFEFF';
        const csv = bom + rows.join('\n');

        // ファイル名（日付形式）
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const filename = `products_${dateStr}.csv`;

        // レスポンスを返す（標準のResponseを使用）
        return new Response(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}

