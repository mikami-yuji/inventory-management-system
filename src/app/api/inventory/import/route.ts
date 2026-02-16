/**
 * 在庫データCSVインポートAPI
 * POST /api/inventory/import → CSVファイルで在庫数量を一括更新
 * CSVフォーマット: product_id, quantity
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// CSVの1行をパース
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"') {
                if (line[i + 1] === '"') { current += '"'; i++; }
                else { inQuotes = false; }
            } else { current += char; }
        } else {
            if (char === '"') { inQuotes = true; }
            else if (char === ',') { result.push(current); current = ''; }
            else { current += char; }
        }
    }
    result.push(current);
    return result;
}

// CSVパース
function parseCSV(content: string): Record<string, string>[] {
    const lines = content.split('\n');
    const headers = parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            row[header.trim()] = values[index] || '';
        });
        rows.push(row);
    }
    return rows;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'ファイルが指定されていません' }, { status: 400 });
        }

        let content = await file.text();
        // BOM除去
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }

        const rows = parseCSV(content);
        if (rows.length === 0) {
            return NextResponse.json({ error: 'CSVにデータが見つかりません' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const row of rows) {
            const productId = row.product_id;
            const quantity = parseFloat(row.quantity);

            if (!productId) {
                errors.push('product_idが未指定のためスキップ');
                errorCount++;
                continue;
            }
            if (isNaN(quantity)) {
                errors.push(`${productId}: quantityが不正な値です`);
                errorCount++;
                continue;
            }

            // upsert: 既存なら更新、なければ挿入
            const { error } = await supabase
                .from('inventory')
                .upsert(
                    { product_id: productId, quantity: quantity, updated_at: new Date().toISOString() },
                    { onConflict: 'product_id' }
                );

            if (error) {
                errors.push(`${productId}: ${error.message}`);
                errorCount++;
            } else {
                successCount++;
            }
        }

        return NextResponse.json({
            success: true,
            totalRows: rows.length,
            successCount,
            errorCount,
            errors: errors.slice(0, 10),
        });
    } catch (error) {
        console.error('Inventory import error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'インポートに失敗しました'
        }, { status: 500 });
    }
}
