const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateInventoryFromExcel() {
    const filePath = "C:\\Users\\asahi\\Desktop\\新幸南食糧様　在庫261.16.xlsx";

    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // 5行目からデータ開始と仮定 (Row 5 にデータが見えたため)
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', range: 4 });

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    console.log(`Processing ${rows.length} rows...`);

    // 全商品マスタを取得（マッチング用）
    const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, sku, name');

    if (productError) {
        console.error('Failed to fetch products:', productError);
        return;
    }

    // SKUマップ作成 (key: SKU, value: product_id)
    // Excelの商品コードは数値で読まれることがあるのでString化して比較
    const productMap = new Map();
    products.forEach(p => {
        if (p.sku) productMap.set(String(p.sku).trim(), p.id);
        // 商品名でも検索できるようにする？今回は指示通り「商品CD」で。
    });

    for (const row of rows) {
        // 調査結果より:
        // C列: 商品コード (例: 1241993) -> これが商品ID (DBのskuやidと一致するか確認が必要)
        // H列: 在庫数 (例: 1200)

        // DB上の `id` (UUID) ではなく `sku` (商品コード) と一致させる前提
        // ただしモックデータを見ると `id` に数値が入っている (例: "1233867") ため、
        // 今回のExcelのC列は `id` or `sku` のどちらか。
        // モックデータでは id="1233867", sku="125650001" となっていた。
        // Excelの Row 5: C=1241993, D=北海道ゆめぴりか...
        // これはモックデータの `id` と形式が似ている（7桁の数字）。

        // よって、C列の値で `products` テーブルの `id` または `sku` を検索する。
        // しかし `products.id` はUUID (gen_random_uuid) に変更されている可能性がある（schema.sql参照）。
        // もし `migrate-to-supabase.js` でモックデータのIDをそのまま使っていればUUIDではない文字列が入っているかもだが
        // Supabaseのschema.sqlでは `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` となっている。

        // ここで重要な分岐: 
        // データ移行時、元のID(7桁数字)をどこに入れたか？
        // 通常は `sku` か `description` か、あるいは新しいカラムか。
        // モックデータ: `id: "1233867", sku: "125650001"`
        // ExcelのC列: `1241993`

        // 仮説: ExcelのC列は、システム上の「商品ID (旧ID)」である可能性が高い。
        // まずは `sku` と照合し、ダメなら `name` で部分一致などを試みるか、
        // あるいは `id`（もしUUIDでなくテキストで入れていれば）で照合。

        // 今回は `sku` に、このC列の値が入っていると期待して処理する。
        // もし `sku` が「125...」のようなJANコード系なら、C列はマッチしない。

        // とりあえず、全商品スキャンして、「C列の値」が `sku` または `id` に含まれるか探す。

        const excelCode = String(row['C']).trim();
        const quantity = row['H'];
        const productName = row['D'];

        if (!excelCode || !quantity || isNaN(excelCode)) {
            skipCount++;
            continue;
        }

        // 1. SKUで完全一致検索
        let matchedProduct = products.find(p => String(p.sku) === excelCode);

        // 2. IDで完全一致検索（もしIDがUUIDでなければ）
        if (!matchedProduct) {
            matchedProduct = products.find(p => String(p.id) === excelCode);
        }

        // 3. どちらのパターンもあり得るので、とりあえずマッチしたら更新
        if (matchedProduct) {
            // 在庫更新処理
            const { error: upsertError } = await supabase
                .from('inventory')
                .upsert({
                    product_id: matchedProduct.id,
                    quantity: Number(quantity),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'product_id' });

            if (upsertError) {
                console.error(`Error updating stock for ${excelCode}:`, upsertError);
                errorCount++;
            } else {
                console.log(`Updated: ${productName} (${excelCode}) -> ${quantity}`);
                successCount++;
            }
        } else {
            // マッチしなかった場合
            console.warn(`Product not found: ${productName} (Code: ${excelCode})`);
            skipCount++;
        }
    }

    console.log('--- Import Finished ---');
    console.log(`Success: ${successCount}`);
    console.log(`Error: ${errorCount}`);
    console.log(`Skipped/Not Found: ${skipCount}`);
}

updateInventoryFromExcel();
