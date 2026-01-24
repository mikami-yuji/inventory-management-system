/**
 * 商品データをCSVにエクスポートするスクリプト
 * 実行方法: node scripts/export_products_csv.js
 * 出力: exports/products_YYYYMMDD_HHMMSS.csv
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

// CSVエスケープ
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

async function exportProducts() {
    console.log('Fetching products from Supabase...');

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`Found ${products.length} products`);

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

    for (const p of products) {
        const row = [
            escapeCSV(p.id),
            escapeCSV(p.name),
            escapeCSV(p.sku),
            escapeCSV(p.jan_code),
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

    // exportsフォルダ作成
    const exportsDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
    }

    // ファイル名生成
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `products_${timestamp}.csv`;
    const filepath = path.join(exportsDir, filename);

    // BOM付きUTF-8で保存（Excelで文字化けしないように）
    const bom = '\uFEFF';
    fs.writeFileSync(filepath, bom + rows.join('\n'), 'utf8');

    console.log(`\nExported to: ${filepath}`);
    console.log('\n=== 使い方 ===');
    console.log('1. このCSVファイルをExcel/Googleスプレッドシートで開く');
    console.log('2. 必要な列を編集（id列は変更しないでください）');
    console.log('3. CSVとして保存');
    console.log('4. インポート: node scripts/import_products_csv.js exports/' + filename);
}

exportProducts();
