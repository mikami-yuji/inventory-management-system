/**
 * モックデータをSupabaseに移行するスクリプト
 * 
 * 使用方法:
 * npm run migrate-data
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// 環境変数を読み込む
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('エラー: Supabase環境変数が設定されていません');
    console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// モックデータファイルを読み込む
const mockDataPath = path.join(__dirname, '../src/lib/mock-data.ts');
const mockDataContent = fs.readFileSync(mockDataPath, 'utf-8');

// 元ID → 新UUID のマッピング
const idMapping = {};

// TypeScriptからデータを抽出する簡易パーサー
function extractArrayData(content, variableName) {
    const regex = new RegExp(`export const ${variableName}[^=]*=\\s*\\[`, 'g');
    const match = regex.exec(content);
    if (!match) return [];

    let startIndex = match.index + match[0].length - 1;
    let bracketCount = 1;
    let endIndex = startIndex + 1;

    while (bracketCount > 0 && endIndex < content.length) {
        if (content[endIndex] === '[') bracketCount++;
        if (content[endIndex] === ']') bracketCount--;
        endIndex++;
    }

    const arrayString = content.substring(startIndex, endIndex);

    // TypeScript構文をJSONに変換
    let jsonString = arrayString
        .replace(/\/\/.*$/gm, '') // コメント削除
        .replace(/\/\*[\s\S]*?\*\//g, '') // ブロックコメント削除
        .replace(/(\w+):/g, '"$1":') // キーをダブルクォート
        .replace(/'([^']*)'/g, '"$1"') // シングルクォートをダブルクォートに
        .replace(/,(\s*[}\]])/g, '$1') // 末尾カンマ削除
        .replace(/undefined/g, 'null');

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error(`${variableName} のパースに失敗:`, e.message);
        return [];
    }
}

async function migrateProducts() {
    console.log('商品データを移行中...');

    const products = extractArrayData(mockDataContent, 'MOCK_PRODUCTS');

    if (products.length === 0) {
        console.log('  商品データが見つかりません');
        return;
    }

    // UUID形式に変換し、元IDをSKUに保存
    const supabaseProducts = products.map(p => {
        const newId = randomUUID();
        idMapping[p.id] = newId; // マッピングを保存

        return {
            id: newId,
            name: p.name,
            sku: p.id, // 元のIDをSKUとして保存
            jan_code: p.janCode || null,
            weight: p.weight || null,
            shape: p.shape || null,
            material: p.material || null,
            unit_price: p.unitPrice || 0,
            printing_cost: p.printingCost || 0,
            category: p.category || 'other',
            image_url: p.imageUrl || null,
            description: p.description || null,
            status: p.status || 'active',
            min_stock_alert: p.minStockAlert || 100,
        };
    });

    // バッチで挿入
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < supabaseProducts.length; i += batchSize) {
        const batch = supabaseProducts.slice(i, i + batchSize);
        const { error } = await supabase.from('products').insert(batch);

        if (error) {
            console.error(`  バッチ ${Math.floor(i / batchSize) + 1} でエラー:`, error.message);
        } else {
            inserted += batch.length;
        }
    }

    console.log(`  ${inserted}/${supabaseProducts.length} 件の商品を移行しました`);
}

async function migrateInventory() {
    console.log('在庫データを移行中...');

    const inventory = extractArrayData(mockDataContent, 'MOCK_INVENTORY');

    if (inventory.length === 0) {
        console.log('  在庫データが見つかりません');
        return;
    }

    // 元のproductIdを新しいUUIDに変換
    const supabaseInventory = inventory
        .filter(i => idMapping[i.productId]) // マッピングが存在するもののみ
        .map(i => ({
            product_id: idMapping[i.productId],
            quantity: i.quantity || 0,
            updated_at: i.updatedAt || new Date().toISOString(),
        }));

    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < supabaseInventory.length; i += batchSize) {
        const batch = supabaseInventory.slice(i, i + batchSize);
        const { error } = await supabase.from('inventory').insert(batch);

        if (error) {
            console.error(`  バッチ ${Math.floor(i / batchSize) + 1} でエラー:`, error.message);
        } else {
            inserted += batch.length;
        }
    }

    console.log(`  ${inserted}/${supabaseInventory.length} 件の在庫を移行しました`);
}

async function main() {
    console.log('=== Supabaseへのデータ移行を開始 ===\n');
    console.log(`URL: ${supabaseUrl}\n`);

    try {
        await migrateProducts();
        await migrateInventory();

        console.log('\n=== 移行完了 ===');
        console.log(`IDマッピング: ${Object.keys(idMapping).length} 件`);
    } catch (error) {
        console.error('移行中にエラーが発生:', error);
        process.exit(1);
    }
}

main();
