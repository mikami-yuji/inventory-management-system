import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeProductNames() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, sku, name, shape, weight, category, status')
    .order('name');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`=== Total Products: ${products.length} ===\n`);

  const issues = {
    // 1. 【プレフィックス】の表記ゆれ（例: 【NB】 【NB・新米】 【新米】 【無洗米】 【特税】など）
    prefixes: new Map(),
    // 2. スペースのゆれ（全角スペース vs 半角スペース、連続スペース）
    spaceIssues: [],
    // 3. 全角英数字・記号（例: ＪＡ, ＳＰ, ＮＢ, （株）, (株)）
    fullWidthAlphanumeric: [],
    // 4. カッコのゆれ（全角（） vs 半角()）
    bracketIssues: [],
    // 5. 産地・銘柄の表記（県名あり vs 県名なし、ひらがな vs 漢字）
    brandVariations: new Map(),
    // 6. 同一銘柄で別名・表記違い
    duplicatesOrSimilar: []
  };

  products.forEach(p => {
    const name = p.name || '';

    // 1. プレフィックス抽出
    const prefixMatch = name.match(/^(【[^】]+】|\[[^\]]+\])/);
    if (prefixMatch) {
      const pref = prefixMatch[1];
      issues.prefixes.set(pref, (issues.prefixes.get(pref) || 0) + 1);
    } else {
      issues.prefixes.set('（プレフィックスなし）', (issues.prefixes.get('（プレフィックスなし）') || 0) + 1);
    }

    // 2. スペースのゆれ（全角スペース、連続スペース、前後のトリム漏れ）
    if (name.includes('　') || name.match(/\s{2,}/) || name.startsWith(' ') || name.endsWith(' ')) {
      issues.spaceIssues.push({ id: p.sku || p.id, name, reason: name.includes('　') ? '全角スペース含有' : '連続/前後スペース' });
    }

    // 3. 全角英数字・アルファベット
    if (/[Ａ-Ｚａ-ｚ０-９]/.test(name) || name.includes('ＪＡ') || name.includes('ＳＰ') || name.includes('ＮＢ')) {
      issues.fullWidthAlphanumeric.push({ id: p.sku || p.id, name });
    }

    // 4. カッコのゆれ
    if (name.includes('(') || name.includes(')')) {
      issues.bracketIssues.push({ id: p.sku || p.id, name, type: '半角カッコ()' });
    }
    if (name.includes('（') || name.includes('）')) {
      issues.bracketIssues.push({ id: p.sku || p.id, name, type: '全角カッコ（）' });
    }
  });

  console.log('--- 1. プレフィックスのバリエーション ---');
  for (const [pref, count] of issues.prefixes.entries()) {
    console.log(`  ${pref}: ${count}件`);
  }

  console.log(`\n--- 2. スペース関連のゆれ (${issues.spaceIssues.length}件) ---`);
  issues.spaceIssues.slice(0, 15).forEach(item => {
    console.log(`  [${item.id}] ${item.name} (${item.reason})`);
  });
  if (issues.spaceIssues.length > 15) console.log(`  ... 他 ${issues.spaceIssues.length - 15}件`);

  console.log(`\n--- 3. 全角英数・記号のゆれ (${issues.fullWidthAlphanumeric.length}件) ---`);
  issues.fullWidthAlphanumeric.forEach(item => {
    console.log(`  [${item.id}] ${item.name}`);
  });

  console.log(`\n--- 4. カッコのゆれ（半角 vs 全角） (${issues.bracketIssues.length}件) ---`);
  issues.bracketIssues.slice(0, 15).forEach(item => {
    console.log(`  [${item.id}] [${item.type}] ${item.name}`);
  });

  // 全商品名をリスト出力
  console.log('\n--- 全商品名一覧 ---');
  products.forEach(p => {
    console.log(`[${p.sku || p.id}] ${p.name}`);
  });
}

analyzeProductNames();
