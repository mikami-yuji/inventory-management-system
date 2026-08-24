import fs from 'fs';
import path from 'path';

// 商品名クレンジング関数
export function cleanProductName(rawName) {
    if (!rawName) return '';
    let name = rawName.trim();

    // 1. 先頭の管理記号（●、△、◆、●◆など）を削除
    name = name.replace(/^[●△◆▲★☆■□▼▽\s]+/g, '');

    // 2. 先頭の「別注〜」などの仕様接頭語を整理
    // 例: "別注５ＫＳＦＭポリ　富山こしひかりＲ" -> "富山県こしひかりR"
    // 例: "別注５ＫSFMﾎﾟﾘ新米三重あきたこまちＲ" -> "【新米】三重県あきたこまちR"
    // 例: "別注５Ｋポリ無洗米おくさま印Ｒ" -> "【無洗米】おくさま印R"
    const isNewRiceInSpec = /別注.*新米/i.test(name);
    const isMusenmaiInSpec = /別注.*無洗米/i.test(name);
    const isGenmaiInSpec = /別注.*玄米/i.test(name);

    name = name.replace(/^別注[0-9０-９]+[kKＫ]?\s*([^\s　]+[\s　]+)?/g, '');
    name = name.replace(/^別注[0-9０-９]+[kKＫ]?/g, '');
    name = name.replace(/^(ＳＦＭ|SFM|ＳＦ|SF|ポリ|ﾎﾟﾘ|マットポリ|ﾏｯﾄﾎﾟﾘ|ｿﾌﾄｸﾗﾌﾄ|ソフトクラフト|和紙|クラフト|ラミ)+[\s　]*/g, '');

    if (isNewRiceInSpec && !name.includes('新米')) {
        name = `【新米】${name}`;
    }
    if (isMusenmaiInSpec && !name.includes('無洗米')) {
        name = `【無洗米】${name}`;
    }
    if (isGenmaiInSpec && !name.includes('玄米')) {
        name = `【玄米】${name}`;
    }

    // 3. 全角英数字を半角に変換
    name = name.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

    // 4. 特定記号・略称の統一
    name = name.replace(/【ＮＢ】/g, '【NB】');
    name = name.replace(/【ＮＢ・新米】/g, '【NB・新米】');
    name = name.replace(/【新米・万代ＰＢ】/g, '【新米・万代PB】');
    name = name.replace(/ＪＡ/g, 'JA');
    name = name.replace(/ＳＰ/g, 'SP');
    name = name.replace(/ＰＢ/g, 'PB');
    name = name.replace(/ＲＺ/g, 'RZ');
    name = name.replace(/ＲＡ/g, 'RA');
    name = name.replace(/Ｒ(?=[)\]\s　]|$)/g, 'R'); // 末尾の全角Ｒを半角Rに

    // 5. カッコの半角化
    name = name.replace(/（/g, '(').replace(/）/g, ')');

    // 閉じカッコ忘れの補正 (例: (万代PB -> (万代PB))
    const openCount = (name.match(/\(/g) || []).length;
    const closeCount = (name.match(/\)/g) || []).length;
    if (openCount > closeCount) {
        name = name + ')'.repeat(openCount - closeCount);
    }

    // 6. 産地名（都道府県名）の統一
    // 「〇〇県産」 -> 「〇〇県」
    name = name.replace(/北海道産/g, '北海道');
    const prefectures = [
        "青森", "岩手", "宮城", "秋田", "山形", "福島",
        "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
        "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜",
        "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫",
        "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口",
        "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎",
        "熊本", "大分", "宮崎", "鹿児島", "沖縄"
    ];

    prefectures.forEach(pref => {
        // 例: 「青森県産」->「青森県」、「京都府産」->「京都府」
        const suffix = (pref === '京都' || pref === '大阪') ? '府' : (pref === '東京' ? '都' : '県');
        const full = pref + suffix;
        const fullSanRegex = new RegExp(`${full}産`, 'g');
        name = name.replace(fullSanRegex, full);

        // 例: 「宮城ひとめぼれ」->「宮城県ひとめぼれ」 （ただし既に「宮城県」の場合はスキップ）
        // プレフィックス直後、またはJA等の直後の単独県名を補完
        const shortRegex = new RegExp(`(?<![都道府県市区町村])${pref}(?![都道府県市区町村産])(?=(こしひかり|こしいぶき|ひとめぼれ|あきたこまち|ななつぼし|ゆめぴりか|まっしぐら|はれわたり|ふさこがね|つや姫|はえぬき|ひのひかり|きぬむすめ|おいでまい|銀河のしずく|雪若丸|青天の霹靂|サキホコレ|だて正夢|華越前|いちほまれ|みずかがみ|夢つくし|ひよくもち|森のくまさん|伊賀|金賞健康米))`, 'g');
        name = name.replace(shortRegex, full);
    });

    // 7. 新米・無洗米・玄米のプレフィックス標準化
    if (/^新米(?![\w・])/i.test(name) && !name.startsWith('【新米】')) {
        name = name.replace(/^新米\s*/, '【新米】');
    }
    if (/^無洗米(?![\w・])/i.test(name) && !name.startsWith('【無洗米】')) {
        name = name.replace(/^無洗米\s*・?/, '【無洗米】');
    }
    if (/^玄米(?![\w・])/i.test(name) && !name.startsWith('【玄米】')) {
        name = name.replace(/^玄米\s*・?/, '【玄米】');
    }

    // 8. スペースの整理（全角スペース->半角、重複スペース->1個、前後トリム）
    name = name.replace(/　/g, ' ');
    name = name.replace(/\s+/g, ' ');
    name = name.trim();

    return name;
}

// CSVを読み込んで全件シミュレーション実行
const csvPath = path.resolve('exports/products_20260124013214.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n').filter(Boolean);
const headers = lines[0].split(',');

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else current += char;
    }
    result.push(current);
    return result;
}

const diffs = [];
const sqlStatements = [];

for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < headers.length) continue;
    const item = {};
    headers.forEach((h, idx) => { item[h.trim()] = (cols[idx] || '').trim(); });
    
    // 米袋・新米
    if (item.category === 'bag' || item.category === 'new_rice') {
        const original = item.name;
        const cleaned = cleanProductName(original);
        if (original !== cleaned) {
            diffs.push({ id: item.id, sku: item.sku, original, cleaned });
            sqlStatements.push(`UPDATE products SET name = '${cleaned.replace(/'/g, "''")}' WHERE id = '${item.id}';`);
        }
    }
}

console.log(`=== クレンジング対象: ${diffs.length}件 ===\n`);
diffs.forEach((d, idx) => {
    console.log(`${idx + 1}. [${d.sku}]`);
    console.log(`   Before: ${d.original}`);
    console.log(`   After : ${d.cleaned}\n`);
});

// SQLファイル出力
const sqlContent = `-- 商品名クレンジング マイグレーション\n-- 生成日時: ${new Date().toISOString()}\n-- 対象件数: ${sqlStatements.length}件\n\nBEGIN;\n\n` + sqlStatements.join('\n') + '\n\nCOMMIT;\n';
fs.writeFileSync('scripts/clean_product_names.sql', sqlContent, 'utf8');
console.log('SQLファイル生成完了: scripts/clean_product_names.sql');
