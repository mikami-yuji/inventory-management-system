/**
 * 既製品（Ready-made）インポートスクリプト
 * 
 * Excelの「種別: 既製品」の行をSupabaseにインポートします。
 * これらは「受注№」が空であるため、通常の同期でスキップされていました。
 * SKUとして「商品コード」を使用します。
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const { randomUUID } = require('crypto');
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
    console.log('=== 既製品インポートスクリプト ===');
    console.log('Excelファイルを読み込んでいます...');

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    // 既製品を抽出
    const readyMadeRows = rows.filter(r => r['種別'] === '既製品');
    console.log(`既製品の行数: ${readyMadeRows.length} 件`);

    if (readyMadeRows.length === 0) {
        console.log('対象データがありません。終了します。');
        return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const row of readyMadeRows) {
        // マッピング
        // SKUには 商品コード (Column D) を使用する（受注Noがないため）
        const sku = String(row['商品コード'] || '');
        if (!sku) {
            console.error('商品コードもないためスキップ:', row['商品名']);
            continue;
        }

        const productData = {
            sku: sku,
            name: row['商品名'] || '名称不明',
            product_code: String(row['商品コード'] || ''),
            jan_code: row['JANコード'] || null,
            unit_price: row['単価'] || 0,
            printing_cost: row['印刷代'] || 0,
            category: 'bag', // 「袋」カテゴリとして扱う
            product_type: '既製品',
            description: row['備考'] || row['タイトル'] || null,
            status: 'active',
            min_stock_alert: 100,
            // 構造化フィールド (nullにしておく)
            prefix: null,
            origin: null,
            variety: null,
            suffix: null,
            material: row['材質名称'] || null,
            shape: row['形状'] || null,
        };

        // SKU(商品コード)で重複チェックしてからインサート
        // まず既存チェック
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('sku', sku)
            .single();

        let productId;

        if (existing) {
            // 更新
            productId = existing.id;
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId);

            if (error) {
                console.error(`更新エラー (${row['商品名']}):`, error.message);
                errorCount++;
                continue;
            }
        } else {
            // 新規作成
            const { data: newPro, error } = await supabase
                .from('products')
                .insert(productData)
                .select()
                .single();

            if (error) {
                console.error(`作成エラー (${row['商品名']}):`, error.message);
                errorCount++;
                continue;
            }
            productId = newPro.id;
            // 在庫初期化
            await supabase.from('inventory').insert({ product_id: productId, quantity: 0 });
        }

        successCount++;
    }

    console.log(`\n完了: ${successCount} 件成功, ${errorCount} 件失敗`);
}

main().catch(err => console.error(err));
