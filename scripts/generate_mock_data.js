const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = 'C:\\Users\\見上　祐司\\Desktop\\43006_幸南食糧（株）.xlsx';
const OUTPUT_PATH = 'C:\\Users\\見上　祐司\\.gemini\\antigravity\\在庫管理システム\\src\\lib\\mock-data.ts';

function generate() {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Found ${rows.length} rows.`);

  const products = rows.map(row => {
    // Map Excel columns to Product interface
    const type = row['種別'] || '';
    let category = 'other';

    // Categorization logic
    const bagTypes = ['別注', 'ポリ別注', 'SP', 'シルク', 'プレコレ・インクジェット印刷', 'カット注文', '既製品'];
    const stickerTypes = ['シール（セミオーダー）', 'シール（フルオーダー）'];

    const name = row['商品名'] || '';

    // 米袋で商品名に「新米」が含まれる場合は「新米」カテゴリ
    if (bagTypes.includes(type) && name.includes('新米')) {
      category = 'new_rice';
    } else if (bagTypes.includes(type)) {
      category = 'bag';
    } else if (stickerTypes.includes(type)) {
      category = 'sticker';
    } else {
      if (name.includes('シール')) {
        category = 'sticker';
      }
    }

    // Determine name based on category
    let productName = row['商品名'] || 'Unknown Product';
    const useTitleTypes = ['SP', 'シルク', 'プレコレ・インクジェット印刷'];

    if ((category === 'sticker' || useTitleTypes.includes(type)) && row['タイトル']) {
      productName = row['タイトル'];
    }

    return {
      id: String(row['受注№'] || ''), // Assuming 受注№ is unique ID
      name: productName,
      sku: row['商品コード'] || '',
      janCode: row['JANコード'] ? String(row['JANコード']) : undefined,
      weight: typeof row['重量'] === 'number' ? row['重量'] : 0,
      shape: row['形状'] || '',
      material: row['材質名称'] || '',
      unitPrice: typeof row['単価'] === 'number' ? row['単価'] : 0,
      printingCost: typeof row['印刷代'] === 'number' ? row['印刷代'] : 0,
      category: category,
      status: 'active',
      description: row['タイトル'] || '',
      imageUrl: '', // No image URL in Excel
    };
  }).filter(p => p.id !== ''); // Filter out empty IDs

  const inventory = rows.map(row => {
    // Map Order Quantity as Current Inventory
    return {
      productId: String(row['受注№'] || ''),
      quantity: typeof row['受注数'] === 'number' ? row['受注数'] : 0,
    };
  }).filter(i => i.productId !== '');

  // Sort products
  const prefectures = [
    "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
    "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
    "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知",
    "三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山",
    "鳥取", "島根", "岡山", "広島", "山口",
    "徳島", "香川", "愛媛", "高知",
    "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"
  ];

  const getPrefectureIndex = (name) => {
    for (let i = 0; i < prefectures.length; i++) {
      if (name.includes(prefectures[i])) {
        return i;
      }
    }
    return 999; // Not found
  };

  products.sort((a, b) => {
    // 1. Sort by Prefecture (North to South)
    const prefIndexA = getPrefectureIndex(a.name);
    const prefIndexB = getPrefectureIndex(b.name);

    if (prefIndexA !== prefIndexB) {
      return prefIndexA - prefIndexB;
    }

    // 2. Sort by Weight (Ascending)
    return a.weight - b.weight;
  });

  // Static Mock Data for other entities
  const staticContent = `import {
  Product,
  Inventory,
  IncomingStock,
  SpecialEvent,
  EventStock,
  User,
  Order,
  StockHistory,
} from '@/types';

// ユーザー
export const MOCK_USERS: User[] = [
  { id: 'u1', name: '自社 担当者', role: 'admin', email: 'admin@company.com' },
  { id: 'u2', name: '直送先 株式会社A', role: 'client', email: 'client_a@example.com' },
];

// 商品マスタ (Excelから生成)
export const MOCK_PRODUCTS: Product[] = ${JSON.stringify(products, null, 2)};

// 通常在庫 (Excelから生成)
export const MOCK_INVENTORY: Inventory[] = ${JSON.stringify(inventory, null, 2)};

// 入荷予定 (サンプル)
export const MOCK_INCOMING_STOCK: IncomingStock[] = [
  // 必要に応じてExcelの日付(最新受注日)から生成可能だが、過去日のため一旦保留
];

// 特売イベント (サンプル)
export const MOCK_EVENTS: SpecialEvent[] = [
  {
    id: 'evt1',
    clientId: 'u2',
    name: '秋の収穫祭セール',
    startDate: '2025-09-01',
    endDate: '2025-10-31',
    status: 'planning',
    description: '販促イベント',
  },
];

// 特売用確保在庫 (サンプル)
export const MOCK_EVENT_STOCK: EventStock[] = [];

// 注文履歴
export const MOCK_ORDERS: Order[] = [];

// その他データ（在庫履歴など）
export const MOCK_DATA = {
  stockHistory: [] as StockHistory[],
};
`;

  console.log('Writing to mock-data.ts...');
  fs.writeFileSync(OUTPUT_PATH, staticContent, 'utf8');
  console.log('Done.');
}

try {
  generate();
} catch (error) {
  console.error('Failed to generate mock data:', error);
}
