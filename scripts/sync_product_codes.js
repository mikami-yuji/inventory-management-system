/**
 * 商品コード（Excel Column D）をSupabaseに同期するスクリプト
 * 
 * 現在、Supabaseの 'sku' カラムには '受注№' (Col A) が入っています。
 * Supabaseの 'product_code' カラムに '商品コード' (Col D) を入れます。
 * 
 * 使用方法:
 * node scripts/sync_product_codes.js
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
    console.log('=== 商品コード同期スクリプト ===');
    console.log('Excelファイルを読み込んでいます...');

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Excel行数: ${rows.length}`);

    // 更新対象のリストを作成
    // Format: { orderNo: string, productCode: string }
    const updates = rows
        .map(row => ({
            orderNo: String(row['受注№'] || ''),
            productCode: String(row['商品コード'] || '')
        }))
        .filter(item => item.orderNo && item.productCode);

    console.log(`更新対象（商品コードあり）: ${updates.length} 件`);

    if (updates.length === 0) {
        console.log('更新対象がありません。終了します。');
        return;
    }

    // テストアップデート (最初の1件)
    console.log('\n--- カラム存在確認テスト (1件実行) ---');
    const testItem = updates[0];
    console.log(`Test Item: OrderNo=${testItem.orderNo}, ProductCode=${testItem.productCode}`);

    // SKU (OrderNo) で検索して update
    const { data: testData, error: testError } = await supabase
        .from('products')
        .update({ product_code: testItem.productCode })
        .eq('sku', testItem.orderNo)
        .select();

    if (testError) {
        console.error('テスト更新エラー:', testError.message);
        if (testError.message.includes('column "product_code" of relation "products" does not exist')) {
            console.error('\n【重要】DBに "product_code" カラムが存在しません。');
            console.error('SupabaseのSQLエディタで以下のSQLを実行してカラムを追加してください：');
            console.error('ALTER TABLE products ADD COLUMN product_code TEXT;');
        }
        return;
    }

    console.log('テスト更新成功:', testData);
    console.log('カラムが存在することを確認しました。全件更新を開始します...');

    // 残りを更新
    let successCount = 1; // テスト分
    let errorCount = 0;
    const batchSize = 10; // 並列数

    // updates[0] は済んだので除外... してもいいが、冪等なので含めてもOK。
    // Index 1から開始
    for (let i = 1; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const promises = batch.map(item =>
            supabase
                .from('products')
                .update({ product_code: item.productCode })
                .eq('sku', item.orderNo)
                .then(({ error }) => ({ item, error }))
        );

        const results = await Promise.all(promises);

        results.forEach(res => {
            if (res.error) {
                console.error(`Error updating OrderNo ${res.item.orderNo}:`, res.error.message);
                errorCount++;
            } else {
                successCount++;
            }
        });

        process.stdout.write(`\r進捗: ${successCount}/${updates.length} (Errors: ${errorCount})`);
    }

    console.log('\n\n=== 同期完了 ===');
    console.log(`成功: ${successCount}`);
    console.log(`失敗: ${errorCount}`);
}

main().catch(err => console.error(err));
