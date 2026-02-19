/**
 * Excelファイルから未登録商品をSupabaseに追加するスクリプト
 * 
 * 使い方: node scripts/import_missing_products.js
 * 
 * 処理内容:
 * 1. Excelファイルから全商品を読み取り
 * 2. DB既存商品と品番・名前で比較
 * 3. 未登録商品をproductsテーブルに追加
 * 4. 2/16の在庫数をsupplier_stockとして設定
 * 5. inventoryテーブルにも初期レコードを作成（quantity=0）
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabaseクライアント初期化
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Excelファイルパス
const EXCEL_PATH = 'C:\\Users\\asahi\\Desktop\\新幸南食糧様　在庫26.02.16.xlsx';

/**
 * Excelから商品データを抽出
 */
function extractExcelProducts() {
    const wb = XLSX.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]]; // 「在庫表」シート
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    const products = [];
    for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[2] || !row[3]) continue; // 品番・商品名がない行はスキップ

        const code = String(row[2]).trim();
        const name = String(row[3]).trim();
        const weight = row[4] != null ? Number(row[4]) : null;
        const stock216 = row[7] != null ? Number(row[7]) : 0;
        const unit = row[8] ? String(row[8]).trim() : null;
        const janRaw = row[14];
        const janCode = (janRaw && janRaw !== '-' && janRaw !== '－') ? String(janRaw) : null;
        const price2nd = row[18] != null ? Number(row[18]) : null;
        const price3rd = row[19] != null ? Number(row[19]) : null;
        const material = row[20] ? String(row[20]).trim() : null;
        const colorCount = row[21] != null ? Number(row[21]) : null;

        // 単価: 3次単価を優先、なければ2次単価
        const unitPrice = price3rd || price2nd || 0;

        products.push({
            code,
            name,
            weight,
            stock216: isNaN(stock216) ? 0 : stock216,
            unit,
            janCode,
            unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
            material,
            colorCount,
        });
    }

    return products;
}

/**
 * DB既存商品コード・名前のセットを取得
 */
async function getExistingProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('product_code, name');

    if (error) {
        throw new Error(`DB取得エラー: ${error.message}`);
    }

    const codeSet = new Set(data.filter(p => p.product_code).map(p => p.product_code));
    const nameSet = new Set(data.map(p => p.name.replace(/[\s　]/g, '')));

    return { codeSet, nameSet };
}

/**
 * 商品の形状を推定（単位から）
 */
function guessShape(unit, weight) {
    if (!unit) return null;
    const u = unit.toLowerCase();
    if (u === 'm' || u === 'ｍ') return 'ロール';
    if (u === '枚' || u === 'ｍa') return '平袋';
    return null;
}

/**
 * メイン処理
 */
async function main() {
    console.log('=== 未登録商品インポートスクリプト ===');
    console.log('');

    // 1. Excelから商品データを抽出
    console.log('1. Excelファイルを読み込み中...');
    const excelProducts = extractExcelProducts();
    console.log(`   Excel商品数: ${excelProducts.length}`);

    // 2. DB既存商品を取得
    console.log('2. DB既存商品を確認中...');
    const { codeSet, nameSet } = await getExistingProducts();
    console.log(`   DB登録済み商品: ${codeSet.size}件(コード) / ${nameSet.size}件(名前)`);

    // 3. 未登録商品を特定
    const missingProducts = excelProducts.filter(p => {
        const normName = p.name.replace(/[\s　]/g, '');
        return !codeSet.has(p.code) && !nameSet.has(normName);
    });

    console.log(`   未登録商品: ${missingProducts.length}件`);
    console.log('');

    if (missingProducts.length === 0) {
        console.log('追加する商品はありません。処理を終了します。');
        return;
    }

    // 4. 商品をバッチ挿入
    console.log('3. 商品を追加中...');
    const batchSize = 20;
    let insertedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < missingProducts.length; i += batchSize) {
        const batch = missingProducts.slice(i, i + batchSize);

        const productsToInsert = batch.map(p => ({
            name: p.name,
            product_code: p.code,
            sku: p.code,
            weight: p.weight,
            jan_code: p.janCode,
            unit_price: p.unitPrice,
            printing_cost: 0,
            material: p.material,
            shape: guessShape(p.unit, p.weight),
            category: 'bag',
            status: 'active',
            supplier_stock: p.stock216,
            product_type: '別注品',
            description: p.material ? `${p.material} ${p.name}` : p.name,
            min_stock_alert: 100,
            supplier_stock_updated_at: new Date().toISOString(),
        }));

        const { data: insertedProducts, error: insertError } = await supabase
            .from('products')
            .insert(productsToInsert)
            .select('id, name');

        if (insertError) {
            console.error(`   バッチ${Math.floor(i / batchSize) + 1} エラー:`, insertError.message);
            failedCount += batch.length;
            continue;
        }

        // 5. inventoryテーブルにもレコード作成（自社在庫=0）
        if (insertedProducts && insertedProducts.length > 0) {
            const inventoryRecords = insertedProducts.map(p => ({
                product_id: p.id,
                quantity: 0,
            }));

            const { error: invError } = await supabase
                .from('inventory')
                .insert(inventoryRecords);

            if (invError) {
                console.error(`   在庫レコード作成エラー:`, invError.message);
            }
        }

        insertedCount += (insertedProducts ? insertedProducts.length : 0);
        console.log(`   バッチ${Math.floor(i / batchSize) + 1}: ${insertedProducts ? insertedProducts.length : 0}件追加`);
    }

    console.log('');
    console.log('=== 完了 ===');
    console.log(`  追加成功: ${insertedCount}件`);
    console.log(`  追加失敗: ${failedCount}件`);
    console.log('');

    // 追加された商品リストを表示
    if (insertedCount > 0) {
        console.log('追加された商品一覧:');
        missingProducts.forEach((p, idx) => {
            console.log(`  ${idx + 1}. [${p.code}] ${p.name} (${p.weight}kg) 単価:¥${p.unitPrice} 在庫:${p.stock216}`);
        });
    }
}

main().catch(err => {
    console.error('致命的エラー:', err);
    process.exit(1);
});
