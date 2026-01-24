/**
 * JANコード復旧スクリプト
 * Excelファイルから商品コードとJANコードを抽出し、Supabaseを更新する
 * 
 * 使用方法: node scripts/extract_jan_from_excel.js
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// ファイルパス
const EXCEL_FILE = 'C:\\Users\\見上　祐司\\Desktop\\43006_幸南食糧（株）.xlsx';

// 環境変数
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
    console.log('=== JANコード復旧スクリプト ===');
    console.log(`Excelファイル: ${EXCEL_FILE}`);

    // Excelファイルを読み込み
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    console.log(`シート名: ${sheetName}`);

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`総行数: ${data.length}`);

    // ヘッダーを解析
    const headers = data[0];
    const orderNoColIndex = 0;  // 受注№
    const janColIndex = 16;     // JANコード

    // JANコードマップを作成 (受注№ -> JANコード)
    const janMap = new Map();
    let validJanCount = 0;

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;

        const orderNo = String(row[orderNoColIndex] || '').trim();
        const jan = String(row[janColIndex] || '').trim();

        // 有効なJANコード（13桁の数字）のみ
        if (/^\d{13}$/.test(jan) && orderNo) {
            janMap.set(orderNo, jan);
            validJanCount++;
        }
    }

    console.log(`有効なJANコード数: ${validJanCount}`);
    console.log('サンプル:', [...janMap.entries()].slice(0, 5));

    // Supabaseに接続して更新
    if (!supabaseUrl || !supabaseKey) {
        console.log('\nSupabase環境変数が設定されていません。');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('\nSupabaseに接続中...');

    // まず全商品を取得
    const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, sku, name, jan_code');

    if (fetchError) {
        console.error('商品取得エラー:', fetchError);
        return;
    }

    console.log(`DB商品数: ${products.length}`);

    let updateCount = 0;
    let skipCount = 0;

    for (const product of products) {
        // SKUまたはIDで受注№とマッチ
        let jan = janMap.get(product.sku);
        if (!jan) {
            // 商品名から受注№を検索 (受注№が商品データに含まれている可能性)
            for (const [orderNo, janCode] of janMap) {
                if (product.sku === orderNo || product.id === orderNo) {
                    jan = janCode;
                    break;
                }
            }
        }

        if (jan && jan !== product.jan_code) {
            const { error } = await supabase
                .from('products')
                .update({ jan_code: jan })
                .eq('id', product.id);

            if (!error) {
                updateCount++;
                if (updateCount <= 10) {
                    console.log(`更新: ${product.name?.substring(0, 30)} -> ${jan}`);
                }
            }
        } else {
            skipCount++;
        }
    }

    console.log(`\n完了: ${updateCount} 件更新, ${skipCount} 件スキップ`);

    // SQL生成（バックアップ用）
    const sqlLines = ['-- JAN Code Restore Script', `-- Generated from ${EXCEL_FILE}`, `-- Total: ${validJanCount} records`, ''];
    for (const [orderNo, jan] of janMap) {
        sqlLines.push(`-- 受注№: ${orderNo}`);
        sqlLines.push(`UPDATE products SET jan_code = '${jan}' WHERE sku = '${orderNo}' OR id::text = '${orderNo}';`);
    }
    fs.writeFileSync('scripts/restore_jan_codes.sql', sqlLines.join('\n'));
    console.log('SQLファイル生成: scripts/restore_jan_codes.sql');
}

main().catch(console.error);
