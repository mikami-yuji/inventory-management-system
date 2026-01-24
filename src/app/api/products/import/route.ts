/**
 * 商品CSVインポートAPI
 * POST /api/products/import → CSVファイルをアップロードして一括更新
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
                if (line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
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
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // ファイル内容を読み取り
        let content = await file.text();

        // BOM除去
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }

        const rows = parseCSV(content);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'No data found in CSV' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const row of rows) {
            if (!row.id) {
                errors.push('Row without id skipped');
                continue;
            }

            const updateData: Record<string, unknown> = {
                name: row.name || null,
                sku: row.sku || null,
                jan_code: row.jan_code || null,
                weight: row.weight ? parseFloat(row.weight) : null,
                shape: row.shape || null,
                material: row.material || null,
                unit_price: row.unit_price ? parseFloat(row.unit_price) : 0,
                printing_cost: row.printing_cost ? parseFloat(row.printing_cost) : 0,
                category: row.category || 'other',
                status: row.status || 'active',
                description: row.description || null,
                min_stock_alert: row.min_stock_alert ? parseInt(row.min_stock_alert) : 100,
                prefix: row.prefix || null,
                origin: row.origin || null,
                variety: row.variety || null,
                suffix: row.suffix || null,
                image_url: row.image_url || null,
            };

            const { error } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', row.id);

            if (error) {
                errors.push(`${row.id}: ${error.message}`);
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
            errors: errors.slice(0, 10), // 最大10件のエラーを返す
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Import failed'
        }, { status: 500 });
    }
}
