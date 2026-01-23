const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Supabase credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importInventory() {
    const filePath = "C:\\Users\\asahi\\Desktop\\新幸南食糧様　在庫261.16.xlsx";

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // ExcelデータをJSONに変換（ヘッダー行は自動判定）
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });

    // ヘッダー行を探す（"商品コード"などが含まれる行）
    // 今回は列固定指定のため、A列=商品名, H列=在庫数などを想定して処理
    // ユーザー指示: 商品CDが一致する商品にカラムHの数値を在庫数として記載

    // マッピング確認用ログ
    console.log('Sample row:', JSON.stringify(data[5], null, 2));

    let updatedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    for (const row of data) {
        // データ形式の確認が必要。通常Excelの列は:
        // A: 品名? B: 商品コード? ... H: 在庫数
        // ユーザー指示「商品CDが一致する商品」→ 商品CDがどの列か特定が必要。
        // 仮定: 通常の在庫表などを参考に、B列あたりにあることが多いが、まずは商品CDを探す。

        // カラムHの値を在庫数とする
        const quantity = row['H'];

        // 商品コードを探す (SKU)
        // Excelによっては列がずれる可能性があるため、数値または文字列の商品コードらしきものを探す
        // ここでは一般的なフォーマットを想定して、商品CDと思われる列（例: SKU列）を指定する必要があるが
        // ユーザープロンプトには「商品CDが一致する商品」とあるため、Excel内に商品CD列があると推測。

        // とりあえず全商品データを取得して照合するほうが確実かもだが、件数が多いので1件ずつ更新を試みる
        // 商品コードがどの列かわからないので、まずはデータの中身を見てみる必要がある。
        // スクリプトを変更して、まずは中身を表示するモードにするか、あるいは汎用的に探すか。

        // 今回はスクリプトを「検査＆更新」の2段階にするのが安全だが、一発でやるなら
        // 「商品CD」というヘッダーを持つ列を探すか、特定の列（例: B列）を商品CDとみなすか。

        // ここでは、データ行の判定ロジックを入れる
        // H列が数値(在庫数)で、かつ商品CDらしきものがある行
        if (typeof quantity === 'number') {
            // 商品コードを探す (ここではB列またはC列あたりと仮定、あるいは明示的に探す)
            // 実データを見ないとわからないが、一旦、SKUとして使えそうな値を探す

            // 仮実装: 商品コード列を特定するために一度全列をスキャンして検証...は手間なので
            // 代表的な列（例: CODE, SKU, 商品CD）を探す。
            // もしExcelが「商品CD」というヘッダーを持っていれば `sheet_to_json` の `header: 0` オプション等で取れるが
            // 列指定 `header: 'A'` で読んでいるので、値から推測する。

            // 多くの在庫表では A=品名, B=規格, C=商品コード のような並びか、あるいは A=商品コード か。
            // ここではサンプルログを出してから、実際の更新処理ロジックを確定させたいが
            // ユーザーが「商品CDが一致する」と言っているので、どこかに必ずある。

            let sku = null;

            // 行オブジェクトのキー(A,B,C...)を走査して商品コードらしき値を探すのは危険
            // 一般的なパターン： 
            // パターンA: A列=商品コード
            // パターンB: B列=商品コード
            // パターンC: C列=商品コード

            // 既存の商品マスタからSKUリストを取得して、マッチする列を探すのが一番確実。
        }
    }
}

// 検査用スクリプトとして実行
async function inspectAndConfirm() {
    const filePath = "C:\\Users\\asahi\\Desktop\\新幸南食糧様　在庫261.16.xlsx";
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // ヘッダー行を含めて少しデータを読む
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', range: 0, defval: '' });

    console.log('Total rows:', rows.length);
    console.log('--- First 5 rows (to identify columns) ---');
    for (let i = 0; i < 5; i++) {
        console.log(`Row ${i + 1}:`, JSON.stringify(rows[i]));
    }

    console.log('\nPlease verify which column contains "Product Code" (SKU).');
    console.log('Target Quantity Column is H.');
}

inspectAndConfirm();
