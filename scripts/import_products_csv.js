/**
 * CSVから商品データをインポートするスクリプト
 * 実行方法: node scripts/import_products_csv.js [CSVファイルパス]
 * 例: node scripts/import_products_csv.js exports/products_20260124_103000.csv
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials not found');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CSVパース（シンプル版）
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }

    return rows;
}

// CSVの1行をパース（カンマ区切り、ダブルクォート対応）
function parseCSVLine(line) {
    const result = [];
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

async function importProducts(csvPath) {
    console.log(`Reading CSV: ${csvPath}`);

    if (!fs.existsSync(csvPath)) {
        console.error('Error: File not found:', csvPath);
        process.exit(1);
    }

    // BOM除去
    let content = fs.readFileSync(csvPath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    const rows = parseCSV(content);
    console.log(`Found ${rows.length} products in CSV`);

    if (rows.length === 0) {
        console.log('No data to import');
        return;
    }

    // プレビュー
    console.log('\n=== Preview (first 3) ===');
    for (let i = 0; i < Math.min(3, rows.length); i++) {
        const r = rows[i];
        console.log(`[${r.id}] ${r.name}`);
        console.log(`  prefix: ${r.prefix || '(なし)'}, origin: ${r.origin || '(なし)'}, variety: ${r.variety || '(なし)'}, suffix: ${r.suffix || '(なし)'}`);
    }

    // --apply オプションがあれば実際に更新
    if (process.argv.includes('--apply')) {
        console.log('\nApplying updates to database...');
        let successCount = 0;
        let errorCount = 0;

        for (const row of rows) {
            if (!row.id) {
                console.log('Skipping row without id');
                continue;
            }

            const updateData = {
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
                console.error(`Error updating ${row.id}:`, error.message);
                errorCount++;
            } else {
                successCount++;
            }
        }

        console.log(`\nDone! Success: ${successCount}, Errors: ${errorCount}`);
    } else {
        console.log('\n=== DRY RUN ===');
        console.log('To apply changes, run with --apply flag:');
        console.log(`node scripts/import_products_csv.js "${csvPath}" --apply`);
    }
}

// 引数からCSVパスを取得
const csvPath = process.argv[2];
if (!csvPath) {
    console.log('Usage: node scripts/import_products_csv.js <csv_file_path> [--apply]');
    console.log('Example: node scripts/import_products_csv.js exports/products_20260124.csv --apply');
    process.exit(1);
}

importProducts(path.resolve(csvPath));
