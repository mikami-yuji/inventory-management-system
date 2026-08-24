import fs from 'fs';
import path from 'path';

const csvPath = path.resolve('exports/products_20260124013214.csv');
const content = fs.readFileSync(csvPath, 'utf8');

const lines = content.split('\n').filter(Boolean);
const headers = lines[0].split(',');

// CSVパーサー（簡易）
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

const products = [];
for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < headers.length) continue;
    const item = {};
    headers.forEach((h, idx) => {
        item[h.trim()] = (cols[idx] || '').trim();
    });
    // 米袋・新米のみ
    if (item.category === 'bag' || item.category === 'new_rice') {
        products.push(item);
    }
}

console.log(`=== 米袋・新米 商品総数: ${products.length} ===\n`);

// 表記ゆれ分析
const categories = {
    // 1. 全角・半角英数
    zenkakuAlphanumeric: [],
    // 2. プレフィックスのゆれ
    prefixes: new Map(),
    // 3. スペースのゆれ（全角スペース、半角スペース、スペースなし）
    spacing: [],
    // 4. 産地表記のゆれ（例: 「宮城」vs「宮城県」、「北海道」vs「北海道産」、「魚沼」vs「新潟県魚沼」）
    regionNaming: new Map(),
    // 5. 品種・ブランド名のゆれ（例: 「ひとめぼれ」vs「宮城ひとめぼれ」、「ふさこがね」vs「ふさこがねSP」）
    varietyNaming: new Map(),
    // 6. カッコのゆれ（全角（） vs 半角()）
    brackets: []
};

products.forEach(p => {
    const name = p.name;

    // プレフィックス
    const m = name.match(/^(【[^】]+】|\[[^\]]+\]|●|△|◆)/);
    const prefix = m ? m[0] : 'なし';
    categories.prefixes.set(prefix, (categories.prefixes.get(prefix) || 0) + 1);

    // 全角英数
    if (/[Ａ-Ｚａ-ｚ０-９]/.test(name) || name.includes('ＪＡ') || name.includes('ＳＰ') || name.includes('ＮＢ') || name.includes('ＲＺ') || name.includes('ＲＡ')) {
        categories.zenkakuAlphanumeric.push({ sku: p.sku, name });
    }

    // スペース
    if (name.includes('　')) {
        categories.spacing.push({ sku: p.sku, name, type: '全角スペース' });
    } else if (name.includes(' ')) {
        categories.spacing.push({ sku: p.sku, name, type: '半角スペース' });
    }

    // カッコ
    if (name.includes('(') || name.includes(')')) {
        categories.brackets.push({ sku: p.sku, name, type: '半角カッコ()' });
    }
    if (name.includes('（') || name.includes('）')) {
        categories.brackets.push({ sku: p.sku, name, type: '全角カッコ（）' });
    }

    // 産地ゆれ
    const cleaned = name.replace(/^(【[^】]+】|\[[^\]]+\]|●|△|◆|\s)+/, '');
    const regMatch = cleaned.match(/^(北海道|青森県|青森|岩手県|岩手|宮城県|宮城|秋田県|秋田|山形県|山形|福島県|福島|茨城県|茨城|栃木県|栃木|群馬県|群馬|埼玉県|埼玉|千葉県|千葉|東京都|東京|神奈川県|神奈川|新潟県|新潟|富山県|富山|石川県|石川|福井県|福井|山梨県|山梨|長野県|長野|岐阜県|岐阜|静岡県|静岡|愛知県|愛知|三重県|三重|滋賀県|滋賀|京都府|京都|大阪府|大阪|兵庫県|兵庫|奈良県|奈良|和歌山県|和歌山|鳥取県|鳥取|島根県|島根|岡山県|岡山|広島県|広島|山口県|山口|徳島県|徳島|香川県|香川|愛媛県|愛媛|高知県|高知|福岡県|福岡|佐賀県|佐賀|長崎県|長崎|熊本県|熊本|大分県|大分|宮崎県|宮崎|鹿児島県|鹿児島|沖縄県|沖縄|国内産|国産|魚沼|丹波|奥能登)/);
    if (regMatch) {
        const reg = regMatch[1];
        categories.regionNaming.set(reg, (categories.regionNaming.get(reg) || 0) + 1);
    }
});

console.log('--- 1. プレフィックスのバリエーション ---');
for (const [k, v] of categories.prefixes.entries()) {
    console.log(`  ${k}: ${v}件`);
}

console.log(`\n--- 2. 全角英数字・記号 (${categories.zenkakuAlphanumeric.length}件) ---`);
categories.zenkakuAlphanumeric.forEach(x => console.log(`  [${x.sku}] ${x.name}`));

console.log(`\n--- 3. スペースのゆれ (${categories.spacing.length}件) ---`);
categories.spacing.forEach(x => console.log(`  [${x.sku}] [${x.type}] ${x.name}`));

console.log(`\n--- 4. カッコのゆれ (${categories.brackets.length}件) ---`);
categories.brackets.forEach(x => console.log(`  [${x.sku}] [${x.type}] ${x.name}`));

console.log('\n--- 5. 産地表記のバリエーション ---');
for (const [k, v] of categories.regionNaming.entries()) {
    console.log(`  ${k}: ${v}件`);
}

console.log('\n--- 全米袋商品名リスト ---');
products.forEach(p => {
    console.log(`[${p.sku}] ${p.name} (${p.weight}kg, ${p.shape}, ${p.status})`);
});
