/**
 * 商品種別（Excel Column Type）をSupabaseに同期するスクリプト
 * 
 * Supabaseの 'product_type' カラムに Excelの '種別' を入れます。
 * 
 * 使用方法:
 * node scripts/sync_product_types.js
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXCEL_PATH = 'C:\\Users\\見上　祐司\\Desktop\\43006_幸南食糧（株）.xlsx';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('エラー: Supabase環境変数が設定されていません');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('=== 商品種別同期スクリプト ===');
    console.log('Excelファイルを読み込んでいます...');

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Excel行数: ${rows.length}`);

    // 更新対象のリストを作成
    const updates = rows
        .map(row => ({
            orderNo: String(row['受注№'] || ''),
            type: String(row['種別'] || '')
        }))
        .filter(item => item.orderNo && item.type);

    console.log(`更新対象（種別あり）: ${updates.length} 件`);

    if (updates.length === 0) {
        return;
    }

    // テストアップデート (最初の1件)
    console.log('\n--- カラム存在確認テスト (1件実行) ---');
    const testItem = updates[0];
    const { data: testData, error: testError } = await supabase
        .from('products')
        .update({ product_type: testItem.type })
        .eq('sku', testItem.orderNo)
        .select();

    if (testError) {
        console.error('テスト更新エラー:', testError.message);
        if (testError.message.includes('column "product_type" of relation "products" does not exist')) {
            console.error('\n【重要】DBに "product_type" カラムが存在しません。');
            console.error('SupabaseのSQLエディタで provided SQL を実行してください。');
        }
        return;
    }

    console.log('カラム確認OK。同期開始...');

    // バッチ更新
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 20;

    for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const promises = batch.map(item =>
            supabase
                .from('products')
                .update({ product_type: item.type })
                .eq('sku', item.orderNo)
                .then(({ error }) => ({ item, error }))
        );

        const results = await Promise.all(promises);
        results.forEach(res => {
            if (res.error) errorCount++;
            else successCount++;
        });
        process.stdout.write(`\r進捗: ${successCount}/${updates.length} (Errors: ${errorCount})`);
    }

    console.log('\n\n=== 同期完了 ===');
}

main().catch(err => console.error(err));
