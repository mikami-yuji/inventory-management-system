/**
 * JANコード復旧スクリプト
 * mock-data.tsからJANコードを取得し、Supabaseの商品データを更新する
 * 
 * 使用方法:
 * 1. .env.localでSupabase環境変数が設定されていることを確認
 * 2. node scripts/restore_jan_codes.js を実行
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 環境変数
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Supabase環境変数が設定されていません');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// mock-data.tsからJANコードマッピングを生成
// 注: mock-data.tsはTypeScriptなのでJSONで抽出が必要
// 以下はJSON形式で定義されたJANコードマップ

// このオブジェクトにmock-data.tsからJANコードを抽出して追加
// IDがキー、JANコードが値
const janCodeMap = {
    // mock-data.tsから抽出された主要なJANコードをここに追加
    // 例: "1241993": "4986869008219",
};

async function restoreJanCodes() {
    console.log('=== JANコード復旧スクリプト ===');
    console.log(`Supabase URL: ${supabaseUrl}`);

    // 現在の商品を取得
    const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, jan_code')
        .order('id');

    if (fetchError) {
        console.error('商品取得エラー:', fetchError);
        return;
    }

    console.log(`取得した商品数: ${products.length}`);

    // マップに登録されているJANコードを更新
    let updateCount = 0;
    for (const [productId, janCode] of Object.entries(janCodeMap)) {
        const { error: updateError } = await supabase
            .from('products')
            .update({ jan_code: janCode })
            .eq('id', productId);

        if (updateError) {
            console.error(`ID ${productId} 更新エラー:`, updateError);
        } else {
            updateCount++;
            console.log(`更新: ${productId} -> ${janCode}`);
        }
    }

    console.log(`\n完了: ${updateCount} 件のJANコードを更新しました`);
}

// 実行
restoreJanCodes().catch(console.error);
