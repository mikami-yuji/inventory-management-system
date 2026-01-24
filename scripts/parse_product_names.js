/**
 * 商品名を構造化フィールドにパースするスクリプト
 * 実行方法: node scripts/parse_product_names.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 品種リスト（マッチング用）
const VARIETIES = [
    'ゆめぴりか', 'ななつぼし', 'コシヒカリ', 'こしひかり', 'ひのひかり',
    'あきたこまち', 'つや姫', 'はえぬき', 'きぬひかり', 'ミルキークイーン',
    '青天の霹靂', 'はれわたり', 'まっしぐら', 'ひとめぼれ', 'あきほなみ',
    '森のくまさん', 'にこまる', 'さがびより', '夢つくし', 'キヌヒカリ',
    'いちほまれ', 'なすひかり', 'あさひの夢', 'コシヒカリＢＬ',
];

// 産地リスト（マッチング用）
const ORIGINS = [
    '北海道', '青森県', '青森', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '新潟県', '新潟', '富山県', '石川県', '福井県', '長野県', '山梨県',
    '滋賀県', '京都府', '京都', '大阪府', '兵庫県', '奈良県', '和歌山県',
    '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県',
    '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
    '魚沼', '旭川', 'JA京都やましろ', 'JAたきかわ', 'JA新すながわ',
];

/**
 * 商品名をパースして構造化フィールドに分割
 */
function parseProductName(name) {
    let prefix = '';
    let origin = '';
    let variety = '';
    let suffix = '';
    let remaining = name;

    // 1. 先頭のマーカーを抽出 (prefix)
    const prefixPatterns = [
        /^【使用禁止】/,
        /^【新版】/,
        /^【改版】/,
        /^【構成変更】/,
        /^●【新版】/,
        /^●【改版】/,
        /^●◆/,
        /^●/,
        /^△/,
        /^◆/,
        /^（ロゴ無）/,
        /^別注/,
    ];

    for (const pattern of prefixPatterns) {
        const match = remaining.match(pattern);
        if (match) {
            prefix = match[0];
            remaining = remaining.slice(match[0].length);
            break;
        }
    }

    // 2. 品種を検索 (variety)
    for (const v of VARIETIES) {
        if (remaining.includes(v)) {
            variety = v;
            break;
        }
    }

    // 3. 産地を検索 (origin)
    // 「〇〇産」または「〇〇県産」のパターンを優先
    const originWithSanPattern = /((?:JA)?[^\s・【】]+)(?:産|県産)/;
    const originMatch = remaining.match(originWithSanPattern);
    if (originMatch) {
        origin = originMatch[1];
    } else {
        // 産地リストから直接マッチ
        for (const o of ORIGINS) {
            if (remaining.includes(o)) {
                origin = o;
                break;
            }
        }
    }

    // 4. 残りを suffix として抽出
    // シンプルに、品種の後ろの部分を取得
    if (variety) {
        const varietyIndex = remaining.indexOf(variety);
        if (varietyIndex !== -1) {
            const afterVariety = remaining.slice(varietyIndex + variety.length);
            // 括弧や記号を含む末尾部分をsuffixに
            suffix = afterVariety.replace(/^[・\s]+/, '').trim();
        }
    }

    return { prefix, origin, variety, suffix };
}

async function main() {
    console.log('Fetching products from Supabase...');

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, prefix, origin, variety, suffix')
        .order('id');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`Found ${products.length} products`);
    console.log('');

    // パース結果を出力
    const results = [];
    let updatedCount = 0;

    for (const product of products) {
        const parsed = parseProductName(product.name);

        // 既にフィールドが設定されていればスキップ
        if (product.prefix || product.origin || product.variety || product.suffix) {
            continue;
        }

        // 何かしら抽出できた場合のみ更新対象
        if (parsed.prefix || parsed.origin || parsed.variety || parsed.suffix) {
            results.push({
                id: product.id,
                name: product.name,
                ...parsed
            });
            updatedCount++;
        }
    }

    console.log(`Parsed ${updatedCount} products for update`);
    console.log('');

    // 最初の10件をプレビュー
    console.log('=== Preview (first 10) ===');
    for (let i = 0; i < Math.min(10, results.length); i++) {
        const r = results[i];
        console.log(`[${r.id}] ${r.name}`);
        console.log(`  prefix: ${r.prefix || '(なし)'}`);
        console.log(`  origin: ${r.origin || '(なし)'}`);
        console.log(`  variety: ${r.variety || '(なし)'}`);
        console.log(`  suffix: ${r.suffix || '(なし)'}`);
        console.log('');
    }

    // 引数で --apply が指定された場合のみ実際に更新
    if (process.argv.includes('--apply')) {
        console.log('Applying updates to database...');

        for (const r of results) {
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    prefix: r.prefix || null,
                    origin: r.origin || null,
                    variety: r.variety || null,
                    suffix: r.suffix || null,
                })
                .eq('id', r.id);

            if (updateError) {
                console.error(`Error updating ${r.id}:`, updateError);
            } else {
                console.log(`Updated: ${r.id}`);
            }
        }

        console.log('Done!');
    } else {
        console.log('');
        console.log('=== DRY RUN ===');
        console.log('To apply changes, run: node scripts/parse_product_names.js --apply');
    }
}

main();
