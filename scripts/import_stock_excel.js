/**
 * 新幸南食糧様 Excel在庫インポートスクリプト
 * 
 * 指定されたExcelファイルから在庫情報を読み込み、Supabaseを更新します。
 * 
 * ・C列 (Index 2): 品番 -> SKU (マッチングキー)
 * ・H列 (Index 7): 現在庫 -> inventoryテーブル
 * ・K列 (Index 10): メーカー在庫 -> products.supplier_stock (合計値) & products.supplier_stock_detail (詳細)
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXCEL_PATH = 'C:\\Users\\asahi\\Desktop\\新幸南食糧様　在庫261.22.xlsx';

if (!supabaseUrl || !supabaseKey) {
    console.error('エラー: Supabase環境変数が設定されていません');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 全角数値を半角数値に変換するヘルパー関数
function normalizeNumberString(str) {
    if (!str) return '';
    return String(str).trim()
        .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角→半角
        .replace(/,/g, ''); // カンマ削除
}

// "100+50" などの文字列を計算して合計を返す
function parseSupplierStock(value) {
    if (!value) return { total: 0, detail: null };

    const strValue = String(value).trim();

    // 計算式が含まれる場合 (+ のみ対応)
    if (strValue.includes('+') || strValue.includes('＋')) { // 全角プラスも対応
        const parts = strValue.split(/[+＋]/);
        let total = 0;
        for (const part of parts) {
            const normalized = normalizeNumberString(part);
            const num = parseFloat(normalized);
            if (!isNaN(num)) {
                total += num;
            }
        }
        return { total, detail: strValue };
    }

    // 数値のみの場合
    const normalized = normalizeNumberString(strValue);
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
        return { total: num, detail: null };
    }

    // 数値として解釈できない場合（文字など）
    return { total: 0, detail: strValue };
}

// 数値をパース（無効な文字は0）
function parseStock(value) {
    if (!value) return 0;
    const strValue = String(value);
    const normalized = normalizeNumberString(strValue); // 全角対応追加
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
}

async function main() {
    console.log(`Reading Excel: ${EXCEL_PATH}`);
    const logLines = [];
    const log = (msg) => {
        console.log(msg);
        logLines.push(msg);
    };
    const errorLog = (msg) => {
        console.error(msg);
        logLines.push(`[ERROR] ${msg}`);
    };

    try {
        if (!fs.existsSync(EXCEL_PATH)) {
            throw new Error(`ファイルが見つかりません: ${EXCEL_PATH}`);
        }

        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // ヘッダー行を含めてJSON化
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 4行目（インデックス3）からデータ開始と仮定（Row 0-2はヘッダー等）
        const dataRows = rows.slice(3);

        log(`Total data rows to process: ${dataRows.length}`);

        let updatedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        const missingSkus = [];

        for (const row of dataRows) {
            const sku = row[2]; // C列 (Index 2): 品番 (SKU)
            if (!sku || String(sku).trim() === '') {
                // 行自体が空の可能性もあるので、ログに出しすぎないように注意
                continue;
            }

            const rawCurrentStock = row[7]; // H列 (Index 7): 現在庫
            const rawSupplierStock = row[10]; // K列 (Index 10): メーカー在庫

            const currentStock = parseStock(rawCurrentStock);
            const { total: supplierStock, detail: supplierStockDetail } = parseSupplierStock(rawSupplierStock);

            // 商品IDをSKUから検索
            const { data: products, error: findError } = await supabase
                .from('products')
                .select('id, name')
                .or(`sku.eq.${String(sku)}, sku.eq.${String(sku).padStart(7, '0')}`) // 0埋めありなし両方検索
                .limit(1);

            if (findError || !products || products.length === 0) {
                missingSkus.push(sku);
                skippedCount++;
                continue;
            }

            const product = products[0];

            // 1. 在庫更新 (inventoryテーブル)
            const { data: invData } = await supabase
                .from('inventory')
                .select('id')
                .eq('product_id', product.id)
                .limit(1);

            let invError;
            if (invData && invData.length > 0) {
                // 更新
                const { error } = await supabase
                    .from('inventory')
                    .update({ quantity: currentStock, updated_at: new Date() })
                    .eq('product_id', product.id);
                invError = error;
            } else {
                // 新規作成
                const { error } = await supabase
                    .from('inventory')
                    .insert({ product_id: product.id, quantity: currentStock });
                invError = error;
            }

            // 2. メーカー在庫更新 (productsテーブル)
            const { error: prodError } = await supabase
                .from('products')
                .update({
                    supplier_stock: supplierStock,
                    supplier_stock_detail: supplierStockDetail
                })
                .eq('id', product.id);

            if (invError || prodError) {
                errorLog(`Failed to update SKU: ${sku} (${product.name}) - InvErr: ${invError?.message}, ProdErr: ${prodError?.message}`);
                errorCount++;
            } else {
                updatedCount++;
                if (updatedCount % 10 === 0) process.stdout.write('.');
            }
        }

        log('\n--- Import Completed ---');
        log(`Updated: ${updatedCount}`);
        log(`Skipped (Product Not Found): ${skippedCount}`);
        log(`Errors: ${errorCount}`);

        if (missingSkus.length > 0) {
            log('\n[Missing SKUs]');
            missingSkus.forEach(s => logLines.push(`- ${s}`));
            // コンソールには最初の10件だけ表示防止
            missingSkus.slice(0, 10).forEach(s => console.log(`- ${s}`));
            if (missingSkus.length > 10) console.log(`... and ${missingSkus.length - 10} more`);
        }

        // ログファイル出力
        const logFileName = `import_log_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.txt`;
        fs.writeFileSync(logFileName, logLines.join('\n'));
        console.log(`\nLog saved to ${logFileName}`);

    } catch (err) {
        errorLog(`File read error: ${err.message}`);
    }
}

main();
