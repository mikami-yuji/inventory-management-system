import {
  Product,
  Inventory,
  IncomingStock,
  SpecialEvent,
  EventStock,
  User,
  Order,
} from '@/types';

// ユーザー
export const MOCK_USERS: User[] = [
  { id: 'u1', name: '自社 担当者', role: 'admin', email: 'admin@company.com' },
  { id: 'u2', name: '直送先 株式会社A', role: 'client', email: 'client_a@example.com' },
];

// 商品マスタ (Excelから生成)
export const MOCK_PRODUCTS: Product[] = [
  {
    "id": "1233867",
    "name": "●【新版】シール大【有機】２ｋ石坂さんの北海道旭川ゆめぴりか",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 0,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【有機】２ｋ石坂さんの北海道旭川ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1055429",
    "name": "●NO.596メッセージライス　金賞健康米（北海道ゆめぴりか３００ｇ）",
    "sku": "005969151",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【真空和紙レーヨン】窓無し",
    "unitPrice": 16,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●NO.596メッセージライス　金賞健康米（北海道ゆめぴりか３００ｇ）",
    "imageUrl": ""
  },
  {
    "id": "1195368",
    "name": "シール中【金賞健康米】300G北海道ゆめぴりか【住友生命VITALITY】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【金賞健康米】300G北海道ゆめぴりか【住友生命VITALITY】",
    "imageUrl": ""
  },
  {
    "id": "1260946",
    "name": "【新版】シール中300G北海道ゆめぴりか【WHITYうめだ】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール中300G北海道ゆめぴりか【WHITYうめだ】",
    "imageUrl": ""
  },
  {
    "id": "1241993",
    "name": "別注１Ｋ真空ラミ北海道ゆめぴりか",
    "sku": "",
    "janCode": "4986869008219",
    "weight": 1,
    "shape": "RＺ",
    "material": "【真空ラミ】",
    "unitPrice": 88.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●別注1K真空ラミ北海道ゆめぴりか（海外輸出用）RZ",
    "imageUrl": ""
  },
  {
    "id": "1159781",
    "name": "△シール小【ガイドライン】雪室貯蔵米・北海道ゆめぴりか",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール小【ガイドライン】雪室貯蔵米・北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1033117",
    "name": "●シール中【食味王】１Ｋ金賞健康米・北海道ゆめぴりか（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ金賞健康米・北海道ゆめぴりか（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1238765",
    "name": "●【新版】シール中【うれしいギフト】１Ｋ北海道ゆめぴりか（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中【うれしいギフト】１Ｋ北海道ゆめぴりか（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1032949",
    "name": "●シール中【食味王】１Ｋ北海道ななつぼし（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ北海道ななつぼし（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1195366",
    "name": "シール中【金賞健康米】１Ｋ北海道ゆめぴりか【住友生命VITALITY】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【金賞健康米】１Ｋ北海道ゆめぴりか【住友生命VITALITY】",
    "imageUrl": ""
  },
  {
    "id": "1028246",
    "name": "シール中【食味王】１Ｋ北海道ゆめぴりか【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王】１Ｋ北海道ゆめぴりか【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1206752",
    "name": "シール中【食味王・脱酸】１Ｋ北海道ゆめぴりか（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王・脱酸】１Ｋ北海道ゆめぴりか（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1118986",
    "name": "別注２ＫＳＦポリ　北海道産ななつぼしＲ",
    "sku": "",
    "janCode": "4986869264028",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 54.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注2K SFﾎﾟﾘDH北海道ななつぼしRZ",
    "imageUrl": ""
  },
  {
    "id": "1212143",
    "name": "●シール大【食味王】２Ｋ特栽米・北海道ゆめぴりか（ＪＡＮなし・新すながわ農協）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ特栽米・北海道ゆめぴりか（ＪＡＮなし・新すながわ農協）",
    "imageUrl": ""
  },
  {
    "id": "1029609",
    "name": "●シール大【食味王】２Ｋ北海道ゆめぴりか（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ北海道ゆめぴりか（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1024473",
    "name": "●シール大【食味王ＪＡＮ】２Ｋ北海道ゆめぴりか",
    "sku": "125650001",
    "janCode": "4986869470221",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王ＪＡＮ】２Ｋ北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1212345",
    "name": "△シール大【高度クリーン】２ＫJAたきかわ指定北海道ゆめぴりか",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【高度クリーン】２ＫJAたきかわ指定北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1195365",
    "name": "●シール大【金賞健康米】２Ｋ北海道ゆめぴりか【住友生命VITALITY】",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【金賞健康米】２Ｋ北海道ゆめぴりか【住友生命VITALITY】",
    "imageUrl": ""
  },
  {
    "id": "1243714",
    "name": "●【新版】シール大【食味王・年産あり】２Ｋ北海道ゆめぴりか（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【食味王・年産あり】２Ｋ北海道ゆめぴりか（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1220586",
    "name": "●シール大【食味王・脱酸】２Ｋ北海道ななつぼし（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王・脱酸】２Ｋ北海道ななつぼし（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1087919",
    "name": "シール大【食味王】２Ｋ北海道ななつぼし（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【食味王】２Ｋ北海道ななつぼし（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1183944",
    "name": "シール大【食味王・脱酸】２Ｋ北海道ゆめぴりか（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【食味王・脱酸】２Ｋ北海道ゆめぴりか（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1212344",
    "name": "【改版】シール大【高度クリーン・ガイドライン・表示】２ＫJAたきかわ指定北海道ななつぼし",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【改版】シール大【高度クリーン・ガイドライン・表示】２ＫJAたきかわ指定北海道ななつぼし",
    "imageUrl": ""
  },
  {
    "id": "1253485",
    "name": "【新版】シール大【家紋・表示】２Ｋ北海道ななつぼし",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール大【家紋・表示】２Ｋ北海道ななつぼし",
    "imageUrl": ""
  },
  {
    "id": "79865",
    "name": "【改版】シール大【家紋・表示】２Ｋ北海道ゆめぴりか",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【改版】シール大【家紋・表示】２Ｋ北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1256031",
    "name": "【新版】シール大【高度クリーン・ガイドライン・表示・脱酸素なし】２ＫJAたきかわ指定北海道ななつぼし",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール大【高度クリーン・ガイドライン・表示・脱酸素なし】２ＫJAたきかわ指定北海道ななつぼし",
    "imageUrl": ""
  },
  {
    "id": "1234215",
    "name": "●シール小【表示・有機】２Ｋ北海道旭川市産ゆめぴりか",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示・有機】２Ｋ北海道旭川市産ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "80536",
    "name": "【使用禁止】シール小【表示】２Ｋ北海道ゆめぴりか",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】シール小【表示】２Ｋ北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1212351",
    "name": "●シール中【ガイドライン表示・高度クリーン】２ＫJAたきかわ指定北海道ゆめぴりか",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【ガイドライン表示・高度クリーン】２ＫJAたきかわ指定北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1212349",
    "name": "【使用禁止】シール中【ガイドライン表示・高度クリーン】２ＫJAたきかわ指定北海道ななつぼし",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】シール中【ガイドライン表示・高度クリーン】２ＫJAたきかわ指定北海道ななつぼし",
    "imageUrl": ""
  },
  {
    "id": "1246748",
    "name": "●【新版】3K SFMﾎﾟﾘDH北海道ななつぼし（米匠庵）RZＳＰ雲竜柄無地",
    "sku": "009090303",
    "janCode": "4986869002262",
    "weight": 3,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 73,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●【新版】3K SFMﾎﾟﾘDH北海道ななつぼし（米匠庵）RZＳＰ雲竜柄無地",
    "imageUrl": ""
  },
  {
    "id": "1244578",
    "name": "シール大【家紋・表示】３Ｋ北海道ゆめぴりか",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【家紋・表示】３Ｋ北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1149926",
    "name": "別注５ＫＳＦＭポリ　北海道ななつぼしＲ",
    "sku": "",
    "janCode": "4986869264059",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K SFMﾎﾟﾘDH【ＮＢ】北海道ななつぼしRZ",
    "imageUrl": ""
  },
  {
    "id": "1197305",
    "name": "別注５ＫSFﾏｯﾄﾎﾟﾘ北海道ゆめぴりかR",
    "sku": "",
    "janCode": "-",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 54,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●【構成変更】（ロゴ無）別注【スギ薬局】ＴＳ5K SFMﾎﾟﾘDH北海道ゆめぴりかRZ",
    "imageUrl": ""
  },
  {
    "id": "1212346",
    "name": "△シール大【高度クリーン】５Ｋ　ＪＡたきかわ指定・北海道ゆめぴりか",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【高度クリーン】５Ｋ　ＪＡたきかわ指定・北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1245344",
    "name": "●【新版】シール大【家紋・表示】５Ｋ北海道ゆめぴりか",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【家紋・表示】５Ｋ北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1179002",
    "name": "●シール大【食味王】５Ｋ特栽米・北海道ゆめぴりか（ＪＡＮなし・新すながわ農協）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】５Ｋ特栽米・北海道ゆめぴりか（ＪＡＮなし・新すながわ農協）",
    "imageUrl": ""
  },
  {
    "id": "1040427",
    "name": "【使用禁止】△シール大【家紋】５Ｋ北海道ゆめぴりか",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】△シール大【家紋】５Ｋ北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1227420",
    "name": "シール大【高度クリーン】５Ｋハッピーバースデイ北海道ゆめぴりか",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【高度クリーン】５Ｋハッピーバースデイ北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1175834",
    "name": "【改版】シール大【家紋・表示】５Ｋ北海道ななつぼし",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【改版】シール大【家紋・表示】５Ｋ北海道ななつぼし",
    "imageUrl": ""
  },
  {
    "id": "1212343",
    "name": "【改版】シール大【高度クリーン・ガイドライン・表示・脱酸素なし】５ＫＪＡたきかわ指定北海道ななつぼし",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【改版】シール大【高度クリーン・ガイドライン・表示・脱酸素なし】５ＫＪＡたきかわ指定北海道ななつぼし",
    "imageUrl": ""
  },
  {
    "id": "1022595",
    "name": "【使用禁止】●シール小【表示】５Ｋ北海道ゆめぴりか",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】●シール小【表示】５Ｋ北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1175836",
    "name": "シール小【表示】５Ｋ北海道ななつぼし",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール小【表示】５Ｋ北海道ななつぼし",
    "imageUrl": ""
  },
  {
    "id": "1212352",
    "name": "シール中【ガイド表示・高度クリーン】５Ｋ北海道ゆめぴりか",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【ガイド表示・高度クリーン】５Ｋ北海道ゆめぴりか",
    "imageUrl": ""
  },
  {
    "id": "1212348",
    "name": "【使用禁止】●シール中【ガイドライン表示・高度クリーン】５ＫJAたきかわ指定北海道ななつぼし",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】●シール中【ガイドライン表示・高度クリーン】５ＫJAたきかわ指定北海道ななつぼし",
    "imageUrl": ""
  },
  {
    "id": "1213463",
    "name": "●【新版】シール中　【味の素様分】３００ｇ青森青天の霹靂",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中　【味の素様分】３００ｇ青森青天の霹靂",
    "imageUrl": ""
  },
  {
    "id": "1218219",
    "name": "●【新版】シール小１Ｋ（表示）青森県まっしぐら（ダスキン用）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール小１Ｋ（表示）青森県まっしぐら（ダスキン用）",
    "imageUrl": ""
  },
  {
    "id": "1238247",
    "name": "シール中【食味王・脱酸】１Ｋ青森県青天の霹靂【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王・脱酸】１Ｋ青森県青天の霹靂【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1096306",
    "name": "シール中【食味王】１Ｋ青森県青天の霹靂【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王】１Ｋ青森県青天の霹靂【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1226855",
    "name": "●【改版】シール小1.2K【ダスキン表示】青森県青天の霹靂",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1.2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【改版】シール小1.2K【ダスキン表示】青森県青天の霹靂",
    "imageUrl": ""
  },
  {
    "id": "1226199",
    "name": "２ＫSFMﾎﾟﾘシギ・青森県産はれわたり",
    "sku": "",
    "janCode": "4986869007298",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 59,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "2K SFMﾎﾟﾘDHシギ・青森県産はれわたりRZ",
    "imageUrl": ""
  },
  {
    "id": "1212148",
    "name": "●◆2K SFMﾎﾟﾘDHシギ・青森県産はれわたり（店名）RZ",
    "sku": "001300203",
    "janCode": "4986869007298",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 70,
    "printingCost": 20,
    "category": "bag",
    "status": "active",
    "description": "●◆2K SFMﾎﾟﾘDHシギ・青森県産はれわたり（店名）RZ",
    "imageUrl": ""
  },
  {
    "id": "1068809",
    "name": "●シール大【食味王】２Ｋ青森県まっしぐら（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ青森県まっしぐら（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1252614",
    "name": "【新版】シール大【家紋・表示】青森県青天の霹靂",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール大【家紋・表示】青森県青天の霹靂",
    "imageUrl": ""
  },
  {
    "id": "1087585",
    "name": "シール大　２Ｋ【食味王】青森県青天の霹靂（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大　２Ｋ【食味王】青森県青天の霹靂（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1191417",
    "name": "△シール小【ガイドライン】特栽米・青森県青天の霹靂（ＪＡＮなし）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール小【ガイドライン】特栽米・青森県青天の霹靂（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "63676",
    "name": "別注５Ｋポリ　青森県つがるロマンＲ",
    "sku": "",
    "janCode": "4986869585055",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 42.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5KﾎﾟﾘDH【楮紙柄】青森つがるロマン（キリン堂様）RZ",
    "imageUrl": ""
  },
  {
    "id": "81019",
    "name": "別注５Ｋポリ　青森県産まっしぐらR",
    "sku": "",
    "janCode": "4986869724058",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 41.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘDH青森まっしぐらRZ",
    "imageUrl": ""
  },
  {
    "id": "1256900",
    "name": "別注５Ｋポリ無洗米青森県まっしぐらＲ",
    "sku": "",
    "janCode": "4560141511002",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 41.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【新版】（ロゴ無）別注5KﾎﾟﾘDH無洗米青森県まっしぐら（販売者：銀シャリ）RZ",
    "imageUrl": ""
  },
  {
    "id": "1259412",
    "name": "別注５Ｋポリ青森県まっしぐらＲ",
    "sku": "",
    "janCode": "4560141571501",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 41.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【新版】（ロゴ無）別注5KﾎﾟﾘDH青森県まっしぐら（販売者：銀シャリ）RZ",
    "imageUrl": ""
  },
  {
    "id": "1231463",
    "name": "５ＫSFMﾎﾟﾘウミネコ・青森県産はれわたり",
    "sku": "",
    "janCode": "4986869007809",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 64,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K SFMﾎﾟﾘDHウミネコ・青森県産はれわたりRZ",
    "imageUrl": ""
  },
  {
    "id": "1235509",
    "name": "●5K SFMﾎﾟﾘDHウミネコ・青森県産はれわたり（店名）RZ",
    "sku": "001310503",
    "janCode": "4986869007809",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 87.5,
    "printingCost": 10,
    "category": "bag",
    "status": "active",
    "description": "●5K SFMﾎﾟﾘDHウミネコ・青森県産はれわたり（店名）RZ",
    "imageUrl": ""
  },
  {
    "id": "1228161",
    "name": "△【新版】シール大【家紋】５Ｋ青森県はれわたり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△【新版】シール大【家紋】５Ｋ青森県はれわたり",
    "imageUrl": ""
  },
  {
    "id": "1228163",
    "name": "●【新版】シール小【表示】５Ｋ青森県はれわたり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール小【表示】５Ｋ青森県はれわたり",
    "imageUrl": ""
  },
  {
    "id": "63675",
    "name": "別注１０Ｋﾎﾟﾘ　青森県つがるロマンＲ",
    "sku": "",
    "janCode": "4986869585109",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 49.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注10KﾎﾟﾘDH【楮紙柄】青森つがるロマン（キリン堂様）RZ",
    "imageUrl": ""
  },
  {
    "id": "81422",
    "name": "別注１０Ｋポリ　青森県産まっしぐらＲ",
    "sku": "",
    "janCode": "4986869724102",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 44.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注10KﾎﾟﾘDH青森まっしぐらRZ",
    "imageUrl": ""
  },
  {
    "id": "1257390",
    "name": "１０Ｋﾎﾟﾘハクチョウ青森県産はれわたり",
    "sku": "",
    "janCode": "4986869008585",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 54,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【新版】10K ﾎﾟﾘDHハクチョウ・青森県産はれわたりRZ",
    "imageUrl": ""
  },
  {
    "id": "1213433",
    "name": "●【新版】シール中　【味の素様分】３００ｇ岩手銀河のしずく",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中　【味の素様分】３００ｇ岩手銀河のしずく",
    "imageUrl": ""
  },
  {
    "id": "1217992",
    "name": "●シール大【ライフフーズ】１Ｋ岩手県ひとめぼれ",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【ライフフーズ】１Ｋ岩手県ひとめぼれ",
    "imageUrl": ""
  },
  {
    "id": "1216574",
    "name": "●【新版】シール小１Ｋ（表示）岩手県銀河のしずく（ダスキン用）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール小１Ｋ（表示）岩手県銀河のしずく（ダスキン用）",
    "imageUrl": ""
  },
  {
    "id": "1096305",
    "name": "●シール中【食味王】１Ｋ岩手県銀河のしずく【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ岩手県銀河のしずく【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1224191",
    "name": "●【新版】シール大【食味王・脱酸素剤】２Ｋ岩手県金色の風（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【食味王・脱酸素剤】２Ｋ岩手県金色の風（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1087583",
    "name": "●シール大【食味王】２Ｋ岩手県銀河のしずく（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ岩手県銀河のしずく（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1183948",
    "name": "●シール大【食味王・脱酸】２Ｋ岩手銀河のしずく（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王・脱酸】２Ｋ岩手銀河のしずく（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1178868",
    "name": "●シール大　３Ｋ特栽米・岩手県産ひとめぼれ",
    "sku": "125650001",
    "janCode": "4986869005447",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　３Ｋ特栽米・岩手県産ひとめぼれ",
    "imageUrl": ""
  },
  {
    "id": "1154393",
    "name": "別注５ＫＳＦＭポリ　岩手ひとめぼれＲ",
    "sku": "",
    "janCode": "4986869230054",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 57,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●（ロゴ無）別注5K SFMﾎﾟﾘDHＴＳ岩手ひとめぼれRZ",
    "imageUrl": ""
  },
  {
    "id": "1212754",
    "name": "●◆（別注後刷）10KﾎﾟﾘﾎﾟﾘDH【新米・万代ＰＢ】宮城ひとめぼれ（ベース1202002-7）",
    "sku": "999999999",
    "janCode": "-",
    "weight": 0,
    "shape": "その他",
    "material": "",
    "unitPrice": 71,
    "printingCost": 10,
    "category": "new_rice",
    "status": "active",
    "description": "●◆（別注後刷）10KﾎﾟﾘﾎﾟﾘDH【新米・万代ＰＢ】宮城ひとめぼれ（ベース1202002-7）",
    "imageUrl": ""
  },
  {
    "id": "1213434",
    "name": "●【新版】シール中　【味の素様分】３００ｇ宮城だて正夢",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中　【味の素様分】３００ｇ宮城だて正夢",
    "imageUrl": ""
  },
  {
    "id": "1220982",
    "name": "●【新版】シール小１Ｋ（表示）宮城県ひとめぼれ（ダスキン用）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール小１Ｋ（表示）宮城県ひとめぼれ（ダスキン用）",
    "imageUrl": ""
  },
  {
    "id": "1149609",
    "name": "●シール中【食味王】１Ｋ宮城県だて正夢【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ宮城県だて正夢【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1206754",
    "name": "シール中【食味王・脱酸素剤】１Ｋ宮城県産ひとめぼれ（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王・脱酸素剤】１Ｋ宮城県産ひとめぼれ（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1034120",
    "name": "シール中【食味王】１Ｋ宮城ひとめぼれ【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王】１Ｋ宮城ひとめぼれ【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1037926",
    "name": "シール中【食味王】１Ｋ宮城ささにしき【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王】１Ｋ宮城ささにしき【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1193813",
    "name": "●シール大　２Ｋ【有機米】宮城県石巻産ササニシキ（JAいしのまき指定）",
    "sku": "125650001",
    "janCode": "4986869006277",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　２Ｋ【有機米】宮城県石巻産ササニシキ（JAいしのまき指定）",
    "imageUrl": ""
  },
  {
    "id": "1139843",
    "name": "●【改版】シール大【食味王】２Ｋ宮城県だて正夢（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 16,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【改版】シール大【食味王】２Ｋ宮城県だて正夢（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1243715",
    "name": "●シール大【食味王・年産あり】２Ｋ宮城県ひとめぼれ（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王・年産あり】２Ｋ宮城県ひとめぼれ（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1247193",
    "name": "●【新版】シール大【家紋・一括表示あり・脱酸素剤】２Ｋ有機栽培米・宮城県ひとめぼれ",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【家紋・一括表示あり・脱酸素剤】２Ｋ有機栽培米・宮城県ひとめぼれ",
    "imageUrl": ""
  },
  {
    "id": "1183947",
    "name": "シール大【食味王・脱酸】２Ｋ宮城ひとめぼれ（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【食味王・脱酸】２Ｋ宮城ひとめぼれ（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1250904",
    "name": "【新版】シール大【家紋・表示】３Ｋ宮城県ひとめぼれ",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール大【家紋・表示】３Ｋ宮城県ひとめぼれ",
    "imageUrl": ""
  },
  {
    "id": "1202104",
    "name": "別注５Ｋｿﾌﾄｸﾗﾌﾄ特栽宮城ひとめぼれＲ",
    "sku": "",
    "janCode": "4986869006710",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ソフクラ】窓有り",
    "unitPrice": 135,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5KｿﾌｸﾗS【万代ＰＢ・特栽】宮城ひとめぼれRZ",
    "imageUrl": ""
  },
  {
    "id": "1202001",
    "name": "別注５Ｋﾎﾟﾘﾎﾟﾘ宮城ひとめぼれＲ",
    "sku": "",
    "janCode": "4986869006734",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリポリ】",
    "unitPrice": 69,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘﾎﾟﾘDHＴＳ【万代ＰＢ】ＪＡ加美よつば・宮城ひとめぼれRZ",
    "imageUrl": ""
  },
  {
    "id": "1208259",
    "name": "別注５ｋ真空ラミ【単】宮城県金のいぶき",
    "sku": "",
    "janCode": "4986869912509",
    "weight": 5,
    "shape": "単袋",
    "material": "【真空ラミ】",
    "unitPrice": 57,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5K真空ラミ【単】宮城県金のいぶき",
    "imageUrl": ""
  },
  {
    "id": "1166319",
    "name": "別注５ＫSFMﾎﾟﾘ宮城ひとめぼれＲ",
    "sku": "",
    "janCode": "4986869357058",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K SFMﾎﾟﾘDH【ＮＢ】宮城ひとめぼれRZ",
    "imageUrl": ""
  },
  {
    "id": "1102808",
    "name": "△シール大【家紋】５Ｋ宮城県ひとめぼれ",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【家紋】５Ｋ宮城県ひとめぼれ",
    "imageUrl": ""
  },
  {
    "id": "1102809",
    "name": "●シール小【表示】５Ｋ宮城ひとめぼれ",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】５Ｋ宮城ひとめぼれ",
    "imageUrl": ""
  },
  {
    "id": "1202002",
    "name": "別注１０Ｋﾎﾟﾘﾎﾟﾘ宮城ひとめぼれＲ",
    "sku": "",
    "janCode": "4986869006727",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリポリ】",
    "unitPrice": 81.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注10KﾎﾟﾘﾎﾟﾘDH【万代ＰＢ】ＪＡ加美よつば宮城ひとめぼれRZ",
    "imageUrl": ""
  },
  {
    "id": "1226051",
    "name": "別注１０Ｋﾎﾟﾘﾎﾟﾘ新米宮城ひとめぼれＲ",
    "sku": "",
    "janCode": "4986869006727",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリポリ】",
    "unitPrice": 71,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "●◆【新・兼版】別注10KﾎﾟﾘﾎﾟﾘDH【新米・万代ＰＢ】ＪＡ加美よつば宮城ひとめぼれRZ",
    "imageUrl": ""
  },
  {
    "id": "1158413",
    "name": "別注１０ＫＳＦＭﾎﾟﾘ宮城ひとめぼれＲ",
    "sku": "",
    "janCode": "4986869377100",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 71.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●別注10K SFMﾎﾟﾘDH【ＮＢ】宮城ひとめぼれRZ",
    "imageUrl": ""
  },
  {
    "id": "1028119",
    "name": "△シール小【ガイドライン】特栽米・秋田県大潟村あきたこまち（１・２Ｋ兼用）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 0,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール小【ガイドライン】特栽米・秋田県大潟村あきたこまち（１・２Ｋ兼用）",
    "imageUrl": ""
  },
  {
    "id": "1214371",
    "name": "●【新版】NO.596【３００ｇ】メッセージライス秋田県あきたこまち（渋谷スクランブルスクエアテナント会",
    "sku": "005969151",
    "janCode": "-",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【真空和紙レーヨン】窓無し",
    "unitPrice": 16,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●【新版】NO.596【３００ｇ】メッセージライス秋田県あきたこまち（渋谷スクランブルスクエアテナント会",
    "imageUrl": ""
  },
  {
    "id": "1213429",
    "name": "●【新版】シール中　【味の素様分】３００ｇ秋田あきたこまち",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中　【味の素様分】３００ｇ秋田あきたこまち",
    "imageUrl": ""
  },
  {
    "id": "1222115",
    "name": "●【新版】シール中【食味王ＪＡＮ】１Ｋ特栽米・秋田県大潟村あきたこまち",
    "sku": "125940001",
    "janCode": "4986869486215",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中【食味王ＪＡＮ】１Ｋ特栽米・秋田県大潟村あきたこまち",
    "imageUrl": ""
  },
  {
    "id": "1032950",
    "name": "●シール中【食味王】１Ｋ特栽米・秋田県大潟村あきたこまち（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ特栽米・秋田県大潟村あきたこまち（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1227164",
    "name": "●シール中【食味王・脱酸】１Ｋ・秋田県あきたこまち",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王・脱酸】１Ｋ・秋田県あきたこまち",
    "imageUrl": ""
  },
  {
    "id": "1240058",
    "name": "●シール中【食味王・ガイド】１Ｋ特栽米・秋田県大潟村あきたこまち（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王・ガイド】１Ｋ特栽米・秋田県大潟村あきたこまち（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1229383",
    "name": "●【改版】シール小1.4K【ダスキン・表示】秋田県あきたこまち",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1.4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【改版】シール小1.4K【ダスキン・表示】秋田県あきたこまち",
    "imageUrl": ""
  },
  {
    "id": "1120389",
    "name": "別注２Ｋポリポリ　玄米秋田県あきたこまち",
    "sku": "",
    "janCode": "4986869130026",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ポリポリ】",
    "unitPrice": 54,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注2KﾎﾟﾘﾎﾟﾘDH【玄米】秋田あきたこまちRZ",
    "imageUrl": ""
  },
  {
    "id": "1155387",
    "name": "別注２ＫＳＦＭポリ秋田県産あきたこまちＲ",
    "sku": "",
    "janCode": "4986869216027",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 57,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注2K SFMﾎﾟﾘDH【ＮＢ】秋田あきたこまちRZ",
    "imageUrl": ""
  },
  {
    "id": "1240056",
    "name": "●シール大【食味王・ガイド】２Ｋ特栽米・秋田県大潟村あきたこまち（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王・ガイド】２Ｋ特栽米・秋田県大潟村あきたこまち（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1180696",
    "name": "●シール大【スギ薬局】２Ｋ無洗米・秋田あきたこまち",
    "sku": "125650001",
    "janCode": "-",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【スギ薬局】２Ｋ無洗米・秋田あきたこまち",
    "imageUrl": ""
  },
  {
    "id": "1252746",
    "name": "【新版】シール大【食味王】２Ｋ秋田県あきたこまち（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール大【食味王】２Ｋ秋田県あきたこまち（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1149925",
    "name": "別注５ＫＳＦＭポリ　秋田あきたこまちＲ",
    "sku": "",
    "janCode": "4986869216058",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5K SFMﾎﾟﾘDH【ＮＢ】秋田あきたこまちRZ",
    "imageUrl": ""
  },
  {
    "id": "1164798",
    "name": "別注５ＫSFMﾎﾟﾘ新米秋田あきたこまちＲ",
    "sku": "",
    "janCode": "4986869216058",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 52.8,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "●◆別注5K SFMﾎﾟﾘDH【ＮＢ・新米】秋田あきたこまちRZ",
    "imageUrl": ""
  },
  {
    "id": "1235632",
    "name": "●【新版】5K MﾗﾐDH 秋田県産サキホコレTS（店名）RZ",
    "sku": "001290503",
    "janCode": "4986869007946",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ラミ】マット",
    "unitPrice": 123.5,
    "printingCost": 10,
    "category": "bag",
    "status": "active",
    "description": "●【新版】5K MﾗﾐDH 秋田県産サキホコレTS（店名）RZ",
    "imageUrl": ""
  },
  {
    "id": "1189312",
    "name": "●シール大　５Ｋ特栽米・秋田県大潟村あきたこまち",
    "sku": "125650001",
    "janCode": "-",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　５Ｋ特栽米・秋田県大潟村あきたこまち",
    "imageUrl": ""
  },
  {
    "id": "1240057",
    "name": "●シール大【家紋・ガイド表示】５Ｋ特栽米・秋田県大潟村あきたこまち（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【家紋・ガイド表示】５Ｋ特栽米・秋田県大潟村あきたこまち（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1245346",
    "name": "●【新版】シール大【家紋・表示】５Ｋ秋田あきたこまち",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【家紋・表示】５Ｋ秋田あきたこまち",
    "imageUrl": ""
  },
  {
    "id": "1040428",
    "name": "【使用禁止】△シール大【家紋】５Ｋ秋田県あきたこまち",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】△シール大【家紋】５Ｋ秋田県あきたこまち",
    "imageUrl": ""
  },
  {
    "id": "1180697",
    "name": "シール大【スギ薬局】５Ｋ無洗米・秋田あきたこまち",
    "sku": "125650001",
    "janCode": "-",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【スギ薬局】５Ｋ無洗米・秋田あきたこまち",
    "imageUrl": ""
  },
  {
    "id": "1040413",
    "name": "【使用禁止】●シール小【表示】５Ｋ秋田県あきたこまち",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】●シール小【表示】５Ｋ秋田県あきたこまち",
    "imageUrl": ""
  },
  {
    "id": "1149923",
    "name": "別注１０ＫＳＦＭﾎﾟﾘ秋田あきたこまちＲ",
    "sku": "",
    "janCode": "4986869216102",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 63,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注10K SFMﾎﾟﾘDH【ＮＢ】秋田あきたこまちRZ",
    "imageUrl": ""
  },
  {
    "id": "1164799",
    "name": "別注１０ＫSFMﾎﾟﾘ新米秋田あきたこまちＲ",
    "sku": "",
    "janCode": "4986869216102",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 63,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "●◆別注10K SFMﾎﾟﾘDH【ＮＢ・新米】秋田あきたこまちRZ",
    "imageUrl": ""
  },
  {
    "id": "1213431",
    "name": "●【新版】シール中　【味の素様分】３００ｇ山形つや姫",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中　【味の素様分】３００ｇ山形つや姫",
    "imageUrl": ""
  },
  {
    "id": "1219883",
    "name": "△【新版】シール小【ガイドライン】特栽山形県つや姫",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△【新版】シール小【ガイドライン】特栽山形県つや姫",
    "imageUrl": ""
  },
  {
    "id": "1225010",
    "name": "●【新版】シール中【食味王・脱酸素剤】１Ｋ山形つや姫（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中【食味王・脱酸素剤】１Ｋ山形つや姫（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1028247",
    "name": "●シール中【食味王】１Ｋ山形つや姫（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ山形つや姫（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1037520",
    "name": "●シール大【食味王】２Ｋ山形県つや姫（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ山形県つや姫（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1183946",
    "name": "●シール大【食味王・脱酸】２Ｋ山形つや姫（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王・脱酸】２Ｋ山形つや姫（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1179909",
    "name": "●シール中【ガイドライン・おきたま産】２Ｋ特栽米・山形県つや姫(スギ薬局用）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【ガイドライン・おきたま産】２Ｋ特栽米・山形県つや姫(スギ薬局用）",
    "imageUrl": ""
  },
  {
    "id": "1245338",
    "name": "●【新版】シール小【表示】３Ｋ山形つや姫",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール小【表示】３Ｋ山形つや姫",
    "imageUrl": ""
  },
  {
    "id": "1018293",
    "name": "別注５ＫSFポリ　山形県産はえぬきＲ",
    "sku": "",
    "janCode": "4986869347059",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 54,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5K SFﾎﾟﾘDH山形はえぬきRZ",
    "imageUrl": ""
  },
  {
    "id": "1020438",
    "name": "●◆5KﾎﾟﾘﾎﾟﾘDH【無洗米】山形はえぬきRZ",
    "sku": "007380503",
    "janCode": "4986869576053",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリポリ】",
    "unitPrice": 88,
    "printingCost": 20,
    "category": "bag",
    "status": "active",
    "description": "●◆5KﾎﾟﾘﾎﾟﾘDH【無洗米】山形はえぬきRZ",
    "imageUrl": ""
  },
  {
    "id": "1245345",
    "name": "●【新版】シール大【家紋・ガイド表示・おきたま産】５Ｋ特栽米・山形つや姫",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【家紋・ガイド表示・おきたま産】５Ｋ特栽米・山形つや姫",
    "imageUrl": ""
  },
  {
    "id": "1021313",
    "name": "【改版】シール大【家紋・ＪＡ庄内みどり】５Ｋ特栽米・山形つや姫",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【改版】シール大【家紋・ＪＡ庄内みどり】５Ｋ特栽米・山形つや姫",
    "imageUrl": ""
  },
  {
    "id": "1021315",
    "name": "●シール中【ガイドライン表示・おきたま産】５Ｋ特栽米・山形県つや姫",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【ガイドライン表示・おきたま産】５Ｋ特栽米・山形県つや姫",
    "imageUrl": ""
  },
  {
    "id": "1213464",
    "name": "●【新版】シール中　【味の素様分】３００ｇ福島こしひかり",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中　【味の素様分】３００ｇ福島こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1144084",
    "name": "別注５Ｋポリ　栃木県産あさひの夢R",
    "sku": "",
    "janCode": "4986869003191",
    "weight": 5,
    "shape": "RＡ",
    "material": "【ポリ】透明",
    "unitPrice": 41.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘDH【Ｒ】栃木あさひの夢RA",
    "imageUrl": ""
  },
  {
    "id": "1174528",
    "name": "別注５Ｋポリ　栃木県産こしひかりR",
    "sku": "",
    "janCode": "4986869003184",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 44,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘDH栃木こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1195653",
    "name": "△シール大【家紋】５Ｋ埼玉県こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【家紋】５Ｋ埼玉県こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1195655",
    "name": "●シール小【表示】５Ｋ埼玉県産こしひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】５Ｋ埼玉県産こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1252921",
    "name": "5K ﾎﾟﾘDH【新米】千葉県産ふさこがねRZ",
    "sku": "",
    "janCode": "4986869008516",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 44,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "別注5K ﾎﾟﾘDH【新米】千葉県産ふさこがねRZ",
    "imageUrl": ""
  },
  {
    "id": "1252885",
    "name": "【新版】5K ﾎﾟﾘDH【新米】千葉県産ふさこがねRZＳＰ彩り七色新米",
    "sku": "079310503",
    "janCode": "4986869008516",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 61.5,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "【新版】5K ﾎﾟﾘDH【新米】千葉県産ふさこがねRZＳＰ彩り七色新米",
    "imageUrl": ""
  },
  {
    "id": "1194468",
    "name": "●NO.596【３００ｇ】メッセージライス感謝をこめて新潟県こしひかり積水ハウス不動産東京㈱様分",
    "sku": "005969151",
    "janCode": "-",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【真空和紙レーヨン】窓無し",
    "unitPrice": 16,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●NO.596【３００ｇ】メッセージライス感謝をこめて新潟県こしひかり積水ハウス不動産東京㈱様分",
    "imageUrl": ""
  },
  {
    "id": "1238087",
    "name": "【貼り賃】シール貼り賃【１枚（小シール）】１ｋ新潟こしひかり",
    "sku": "999999999",
    "janCode": "なし",
    "weight": 0,
    "shape": "その他",
    "material": "",
    "unitPrice": 8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【貼り賃】シール貼り賃【１枚（小シール）】１ｋ新潟こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1217642",
    "name": "●【新版】小袋シール中300G新潟県上越こしひかり",
    "sku": "125940001",
    "janCode": "-",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】小袋シール中300G新潟県上越こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1226944",
    "name": "●【新版】シール中　３００ｇ【GLBBJAPAN】新潟県こしひかり",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中　３００ｇ【GLBBJAPAN】新潟県こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1227303",
    "name": "●【新版】シール中　３００ｇ記念品　新潟魚沼こしひかり【ティジー株式会社】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中　３００ｇ記念品　新潟魚沼こしひかり【ティジー株式会社】",
    "imageUrl": ""
  },
  {
    "id": "1217405",
    "name": "●小袋シール中300G新潟県産新之助",
    "sku": "125940001",
    "janCode": "-",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●小袋シール中300G新潟県産新之助",
    "imageUrl": ""
  },
  {
    "id": "78658",
    "name": "別注１Ｋラミ　新潟県こしひかり",
    "sku": "",
    "janCode": "4986869301013",
    "weight": 1,
    "shape": "RＺ",
    "material": "【ラミ】",
    "unitPrice": 69.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注1KﾗﾐDH新潟県こしひかり（米匠庵）RZ",
    "imageUrl": ""
  },
  {
    "id": "1080058",
    "name": "●シール小【表示】１Ｋ新潟県魚沼こしひかり（アピデ様）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】１Ｋ新潟県魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1080057",
    "name": "△シール中　１Ｋ新潟県魚沼こしひかり（アピデ様）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール中　１Ｋ新潟県魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1037934",
    "name": "●シール中【食味王】１Ｋ特栽米・新潟県こしひかり・ＪＡ北越後産（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ特栽米・新潟県こしひかり・ＪＡ北越後産（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1236451",
    "name": "●シール中　１Ｋ新潟こしひかり（ＪＡＮあり）【受78658の間に合わせ】",
    "sku": "125940001",
    "janCode": "4986869301013",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中　１Ｋ新潟こしひかり（ＪＡＮあり）【受78658の間に合わせ】",
    "imageUrl": ""
  },
  {
    "id": "1250387",
    "name": "【新版】シール中【家紋】１Ｋ新潟県こしひかり【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール中【家紋】１Ｋ新潟県こしひかり【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1240055",
    "name": "シール中【食味王・ガイド表示】１Ｋ特栽米・新潟こしひかり・ＪＡ北新潟産（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王・ガイド表示】１Ｋ特栽米・新潟こしひかり・ＪＡ北新潟産（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1080059",
    "name": "△シール大　1.3Ｋ　新潟県魚沼こしひかり（アピデ様）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 1.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大　1.3Ｋ　新潟県魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1080060",
    "name": "●シール小【表示】1.3Ｋ　新潟県魚沼こしひかり（アピデ様）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】1.3Ｋ　新潟県魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1038858",
    "name": "別注２Ｋポリポリ　玄米新潟こしひかりＲ",
    "sku": "",
    "janCode": "4986869002026",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ポリポリ】",
    "unitPrice": 61.55,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注2KﾎﾟﾘﾎﾟﾘDHＴＳ【玄米】特栽米・新潟こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1125442",
    "name": "別注２Ｋポリ新潟こしひかりＲＺ",
    "sku": "",
    "janCode": "4986869414027",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 40,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注2KﾎﾟﾘDH【コーヨー様】新潟こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1149933",
    "name": "別注２ＫＳＦＭポリ　新潟こしひかりＲ",
    "sku": "",
    "janCode": "4986869201023",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 57,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注2K SFMﾎﾟﾘDH【ＮＢ】新潟こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1024474",
    "name": "●シール大【食味王ＪＡＮ】２Ｋ新潟県魚沼こしひかり",
    "sku": "125650001",
    "janCode": "4986869156224",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王ＪＡＮ】２Ｋ新潟県魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1239546",
    "name": "●【新版】シール大【食味王・特栽米・脱酸】２Ｋ特栽米・新潟県佐渡産こしひかり（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【食味王・特栽米・脱酸】２Ｋ特栽米・新潟県佐渡産こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1244577",
    "name": "●シール大【家紋・ガイド表示】２Ｋ特栽米・新潟こしひかり・ＪＡ北新潟産（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【家紋・ガイド表示】２Ｋ特栽米・新潟こしひかり・ＪＡ北新潟産（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1240053",
    "name": "●シール大【食味王・ガイド】２Ｋ特栽米・新潟県こしひかり・ＪＡ北新潟産（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王・ガイド】２Ｋ特栽米・新潟県こしひかり・ＪＡ北新潟産（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1249348",
    "name": "シール大【家紋・表示】２Ｋ新潟県こしひかり（エディオン×象印）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【家紋・表示】２Ｋ新潟県こしひかり（エディオン×象印）",
    "imageUrl": ""
  },
  {
    "id": "1200558",
    "name": "シール大【スギ薬局】２Ｋ無洗米・新潟こしひかり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【スギ薬局】２Ｋ無洗米・新潟こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1086772",
    "name": "シール大【食味王】２Ｋ新潟県魚沼こしひかり（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【食味王】２Ｋ新潟県魚沼こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1028118",
    "name": "△シール小【食味王ガイドライン】特栽米・新潟県ＪＡ北越後こしひかり（１・２Ｋ兼用）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール小【食味王ガイドライン】特栽米・新潟県ＪＡ北越後こしひかり（１・２Ｋ兼用）",
    "imageUrl": ""
  },
  {
    "id": "1239547",
    "name": "△【新版】シール小【ガイドライン】特栽米・新潟県佐渡産こしひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△【新版】シール小【ガイドライン】特栽米・新潟県佐渡産こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1080063",
    "name": "△シール大2.5Ｋ新潟県魚沼こしひかり（アピデ様）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2.5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大2.5Ｋ新潟県魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1080064",
    "name": "●シール小【表示】2.5Ｋ新潟県魚沼こしひかり（アピデ様）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 2.5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】2.5Ｋ新潟県魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1080065",
    "name": "△シール大　３Ｋ新潟県魚沼こしひかり（アピデ様）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大　３Ｋ新潟県魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1198312",
    "name": "△シール大【家紋】３Ｋ新潟県魚沼こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【家紋】３Ｋ新潟県魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1198315",
    "name": "【使用禁止】△シール大【家紋】３Ｋ特栽米・新潟県魚沼こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】△シール大【家紋】３Ｋ特栽米・新潟県魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1080066",
    "name": "●シール小【表示】３Ｋ新潟県魚沼こしひかり（アピデ様）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】３Ｋ新潟県魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1198700",
    "name": "【使用禁止】●シール中【ガイドライン表示・金澤さん】３Ｋ特栽米・新潟県魚沼こしひかり",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】●シール中【ガイドライン表示・金澤さん】３Ｋ特栽米・新潟県魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1128145",
    "name": "●シール大　４Ｋ新潟県北魚沼こしひかり（ＪＡ北魚沼）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　４Ｋ新潟県北魚沼こしひかり（ＪＡ北魚沼）",
    "imageUrl": ""
  },
  {
    "id": "1129866",
    "name": "●シール大　４Ｋ新潟県見附市あきだわら",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　４Ｋ新潟県見附市あきだわら",
    "imageUrl": ""
  },
  {
    "id": "1131770",
    "name": "●シール大　４Ｋ特栽米・新潟県北越後産こしひか（ＪＡ北越後指定）",
    "sku": "125650001",
    "janCode": "-",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　４Ｋ特栽米・新潟県北越後産こしひか（ＪＡ北越後指定）",
    "imageUrl": ""
  },
  {
    "id": "1133086",
    "name": "●シール大　４Ｋ新潟県南魚沼こしひかり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　４Ｋ新潟県南魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1080067",
    "name": "△シール大　４Ｋ新潟県魚沼こしひかり（アピデ様）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大　４Ｋ新潟県魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1134507",
    "name": "●シール大　４Ｋ新潟県見附市えみのあき",
    "sku": "125650001",
    "janCode": "-",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　４Ｋ新潟県見附市えみのあき",
    "imageUrl": ""
  },
  {
    "id": "1135927",
    "name": "●シール大【雪室貯蔵米】４Ｋ新潟県北魚沼産こしひかり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【雪室貯蔵米】４Ｋ新潟県北魚沼産こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1137938",
    "name": "●シール大　４Ｋ新潟県上越産みずほの輝き",
    "sku": "125650001",
    "janCode": "-",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　４Ｋ新潟県上越産みずほの輝き",
    "imageUrl": ""
  },
  {
    "id": "1198316",
    "name": "△シール大【家紋】４Ｋ特栽米・新潟県魚沼こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【家紋】４Ｋ特栽米・新潟県魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1139112",
    "name": "●シール大　４Ｋ新潟県佐渡産・棚田米こしひかり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　４Ｋ新潟県佐渡産・棚田米こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1140586",
    "name": "●シール大　４Ｋ新潟県上越産ちほみのり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　４Ｋ新潟県上越産ちほみのり",
    "imageUrl": ""
  },
  {
    "id": "1142056",
    "name": "●シール大　４Ｋ新潟県北魚沼新之助（ＪＡ北魚沼）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　４Ｋ新潟県北魚沼新之助（ＪＡ北魚沼）",
    "imageUrl": ""
  },
  {
    "id": "1080068",
    "name": "●シール小【表示】４Ｋ新潟県魚沼こしひかり（アピデ様）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】４Ｋ新潟県魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1198698",
    "name": "●シール中【ガイドライン表示・金澤さん】４Ｋ特栽米・新潟県魚沼こしひかり",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【ガイドライン表示・金澤さん】４Ｋ特栽米・新潟県魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1233884",
    "name": "△【新版】別注シール【家紋】４ｋ無洗米・新潟県魚沼こしひかり",
    "sku": "701233884",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 58.5,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△【新版】別注シール【家紋】４ｋ無洗米・新潟県魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "77656",
    "name": "別注５Ｋマットポリ　新潟こしいぶきRZ",
    "sku": "",
    "janCode": "4986869474052",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 44,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K MﾎﾟﾘDH新潟こしいぶきRZ",
    "imageUrl": ""
  },
  {
    "id": "1124421",
    "name": "別注５Ｋポリ　新潟こしひかりＲ",
    "sku": "",
    "janCode": "4986869414058",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 41.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5KﾎﾟﾘDH【新米・コーヨー様】新潟こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1129939",
    "name": "別注５Ｋポリ　新潟こしひかりＲ",
    "sku": "",
    "janCode": "4986869414058",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 44,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘDH【通常・コーヨー様】新潟こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1149928",
    "name": "別注５ＫＳＦＭポリ　新潟こしひかりＲ",
    "sku": "",
    "janCode": "4986869201054",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K SFMﾎﾟﾘDH【ＮＢ】新潟こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1164796",
    "name": "別注５ＫＳＦＭポリ　新米新潟こしひかりＲ",
    "sku": "",
    "janCode": "4986869201054",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "別注5K SFMﾎﾟﾘDH【ＮＢ・新米】新潟こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1040424",
    "name": "△シール大【家紋】５Ｋ新潟県魚沼こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【家紋】５Ｋ新潟県魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1240054",
    "name": "●シール大【家紋・ガイド表示】５Ｋ特栽米・新潟県こしひかり・ＪＡ北新潟産（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【家紋・ガイド表示】５Ｋ特栽米・新潟県こしひかり・ＪＡ北新潟産（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1040422",
    "name": "【使用禁止】△シール大【家紋】５Ｋ新潟県こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】△シール大【家紋】５Ｋ新潟県こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1200559",
    "name": "シール大【スギ薬局】５Ｋ無洗米・新潟こしひかり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【スギ薬局】５Ｋ無洗米・新潟こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1245349",
    "name": "シール大【家紋・表示】５Ｋ新潟こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【家紋・表示】５Ｋ新潟こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1040410",
    "name": "【使用禁止】●シール小【表示】５Ｋ新潟県こしひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】●シール小【表示】５Ｋ新潟県こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1022510",
    "name": "別注シール【家紋】５Ｋ無洗米・新潟県魚沼こしひかり（一括表示あり）",
    "sku": "701022510",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 58.5,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "別注シール【家紋】５Ｋ無洗米・新潟県魚沼こしひかり（一括表示あり）",
    "imageUrl": ""
  },
  {
    "id": "1151684",
    "name": "別注１０ＫＳＦＭﾎﾟﾘ新潟こしひかりＲ",
    "sku": "",
    "janCode": "4986869201108",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 63,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注10K SFMﾎﾟﾘDH【ＮＢ】新潟こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1037935",
    "name": "●シール中【食味王】１Ｋ富山県こしひかり（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ富山県こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1151675",
    "name": "別注２ＫＳＦＭポリ　富山県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869341026",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 57,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注2K SFMﾎﾟﾘDH【ＮＢ】富山こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1180700",
    "name": "シール大【スギ薬局】２Ｋ無洗米富山こしひかり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【スギ薬局】２Ｋ無洗米富山こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1149927",
    "name": "別注５ＫＳＦＭポリ　富山こしひかりＲ",
    "sku": "",
    "janCode": "4986869205052",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K SFMﾎﾟﾘDH【ＮＢ】富山こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1180701",
    "name": "●シール大【スギ薬局】５Ｋ無洗米・富山こしひかり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【スギ薬局】５Ｋ無洗米・富山こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1258049",
    "name": "【新版】丸型シール小　石川県能登地方復興応援こしひかり",
    "sku": "125640001",
    "janCode": "なし",
    "weight": 0,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】丸型シール小　石川県能登地方復興応援こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1251123",
    "name": "【新版】シール中【食味王】１Ｋ石川県奥能登産こしひかり【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール中【食味王】１Ｋ石川県奥能登産こしひかり【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1088271",
    "name": "●シール大【食味王】２Ｋ石川県こしひかり・能登の棚田米（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ石川県こしひかり・能登の棚田米（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1110086",
    "name": "●シール大【食味王】２Ｋ石川県ひゃくまん穀（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ石川県ひゃくまん穀（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1225613",
    "name": "シール大【食味王・脱酸素剤】２Ｋ石川県こしひかり・能登の棚田米（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【食味王・脱酸素剤】２Ｋ石川県こしひかり・能登の棚田米（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1260498",
    "name": "【新版】シール大　２Ｋ特栽米・石川県奥能登こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール大　２Ｋ特栽米・石川県奥能登こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1240125",
    "name": "【改版】シール大【食味王】２Ｋ石川県奥能登産こしひかり（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【改版】シール大【食味王】２Ｋ石川県奥能登産こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1236917",
    "name": "●【新版】シール中【ガイドライン表示・ファーマー】２Ｋ特栽・石川県奥能登棚田米こしひかり",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中【ガイドライン表示・ファーマー】２Ｋ特栽・石川県奥能登棚田米こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1088880",
    "name": "別注５Ｋポリ　石川県産ゆめみづほＲ",
    "sku": "",
    "janCode": "4986869500058",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 44,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘDH石川ゆめみづほRZ",
    "imageUrl": ""
  },
  {
    "id": "1222498",
    "name": "●シール大　５Ｋ特栽・石川奥能登棚田米こしひかり【スギ薬局】",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　５Ｋ特栽・石川奥能登棚田米こしひかり【スギ薬局】",
    "imageUrl": ""
  },
  {
    "id": "1231018",
    "name": "△シール大【家紋】５Ｋ石川ひゃくまん穀",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【家紋】５Ｋ石川ひゃくまん穀",
    "imageUrl": ""
  },
  {
    "id": "1167265",
    "name": "●シール大【スギ薬局】５Ｋ石川能登棚田米こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【スギ薬局】５Ｋ石川能登棚田米こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1250469",
    "name": "【新版】シール大【食味王】５Ｋ石川県奥能登産こしひかり（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール大【食味王】５Ｋ石川県奥能登産こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1231019",
    "name": "●シール小【表示】５Ｋ石川ひゃくまん穀",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】５Ｋ石川ひゃくまん穀",
    "imageUrl": ""
  },
  {
    "id": "1222499",
    "name": "シール中【ガイド表示・ファーマー】５Ｋ特栽・石川県奥能登棚田米こしひかり",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【ガイド表示・ファーマー】５Ｋ特栽・石川県奥能登棚田米こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1233558",
    "name": "●NO.596メッセージライス　福井県華越前(㈱ヒーロー様分）",
    "sku": "005969151",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【真空和紙レーヨン】窓無し",
    "unitPrice": 16,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●NO.596メッセージライス　福井県華越前(㈱ヒーロー様分）",
    "imageUrl": ""
  },
  {
    "id": "1258919",
    "name": "【新版】シール中  300ｇ福井県越南３１５号（JA越前たけふ様）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール中  300ｇ福井県越南３１５号（JA越前たけふ様）",
    "imageUrl": ""
  },
  {
    "id": "1258918",
    "name": "【新版】シール中  300ｇ福井県しきゆたか（JA越前たけふ様）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール中  300ｇ福井県しきゆたか（JA越前たけふ様）",
    "imageUrl": ""
  },
  {
    "id": "1234072",
    "name": "●【新版】シール中【家紋】450ｇ福井県産華越前（表示あり）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.45,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中【家紋】450ｇ福井県産華越前（表示あり）",
    "imageUrl": ""
  },
  {
    "id": "1234076",
    "name": "●【新版】シール大【家紋】１Ｋ福井県産華越前（表示あり）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【家紋】１Ｋ福井県産華越前（表示あり）",
    "imageUrl": ""
  },
  {
    "id": "1219869",
    "name": "●【改版（品種等変更）】シール小１Ｋ（表示）福井県いちほまれ（ダスキン用）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【改版（品種等変更）】シール小１Ｋ（表示）福井県いちほまれ（ダスキン用）",
    "imageUrl": ""
  },
  {
    "id": "1227108",
    "name": "●シール中【食味王・脱酸素剤】１Ｋ福井いちほまれ",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王・脱酸素剤】１Ｋ福井いちほまれ",
    "imageUrl": ""
  },
  {
    "id": "1253318",
    "name": "【新版】シール中【家紋・新米】１Ｋ福井県産華越前（表示あり）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール中【家紋・新米】１Ｋ福井県産華越前（表示あり）",
    "imageUrl": ""
  },
  {
    "id": "1167270",
    "name": "シール中【食味王】１Ｋ福井いちほまれ",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王】１Ｋ福井いちほまれ",
    "imageUrl": ""
  },
  {
    "id": "1225457",
    "name": "●【新版】シール小1.2Ｋ（表示）福井県いちほまれ（ダスキン用）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1.2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール小1.2Ｋ（表示）福井県いちほまれ（ダスキン用）",
    "imageUrl": ""
  },
  {
    "id": "1106955",
    "name": "別注２ＫＳＦポリ　福井県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869001012",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 51.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注2K SFﾎﾟﾘDH【黒】福井こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1251234",
    "name": "別注２ＫSFMﾎﾟﾘ 福井県坂井市産華越前Ｒ",
    "sku": "",
    "janCode": "-",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 56,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【新版】別注2K SFMﾎﾟﾘDH福井県坂井市産華越前RZ",
    "imageUrl": ""
  },
  {
    "id": "1167279",
    "name": "●シール大【食味王】２Ｋ福井いちほまれ",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ福井いちほまれ",
    "imageUrl": ""
  },
  {
    "id": "1188556",
    "name": "●シール大【食味王ＪＡＮ】２Ｋ福井いちほまれ",
    "sku": "125650001",
    "janCode": "4986869005928",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王ＪＡＮ】２Ｋ福井いちほまれ",
    "imageUrl": ""
  },
  {
    "id": "1222502",
    "name": "●【新版】シール大【食味王・省農薬米】２Ｋ福井県あきさかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【食味王・省農薬米】２Ｋ福井県あきさかり",
    "imageUrl": ""
  },
  {
    "id": "1222500",
    "name": "●【新版】シール大【食味王】２Ｋ特栽・福井県JA越前たけふこしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【食味王】２Ｋ特栽・福井県JA越前たけふこしひかり",
    "imageUrl": ""
  },
  {
    "id": "1175838",
    "name": "●シール大【食味王】２Ｋ福井県華越前（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ福井県華越前（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1230813",
    "name": "●【新版】シール大【食味王・新米】２Ｋ福井県華越前（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【食味王・新米】２Ｋ福井県華越前（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1222501",
    "name": "△【新版】シール小【食味王ガイドライン】特栽・福井県ＪＡ越前たけふこしひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△【新版】シール小【食味王ガイドライン】特栽・福井県ＪＡ越前たけふこしひかり",
    "imageUrl": ""
  },
  {
    "id": "1178867",
    "name": "●シール大　３Ｋ特栽米・福井県産こしひかり",
    "sku": "125650001",
    "janCode": "4986869005454",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　３Ｋ特栽米・福井県産こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1244584",
    "name": "●【新版】シール大【家紋・ガイド表示】３Ｋ特栽米・福井こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【家紋・ガイド表示】３Ｋ特栽米・福井こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1106953",
    "name": "別注５ＫＳＦポリ　福井県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869001005",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 52.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【構成・仕様変更】別注5K SFﾎﾟﾘDH【黒・通常】福井こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1149929",
    "name": "別注５ＫＳＦＭポリ　福井こしひかりＲ",
    "sku": "",
    "janCode": "4986869343051",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5K SFMﾎﾟﾘDH【ＮＢ】福井こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1163041",
    "name": "別注５ＫSFMﾎﾟﾘ新米福井こしひかりＲ",
    "sku": "",
    "janCode": "4986869343051",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 52.8,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "●◆別注5K SFMﾎﾟﾘDH【ＮＢ・新米】福井こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1168363",
    "name": "●シール小【表示】５Ｋ福井いちほまれ",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】５Ｋ福井いちほまれ",
    "imageUrl": ""
  },
  {
    "id": "1146936",
    "name": "別注１０ＫＳＦポリ　福井県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869003283",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 64.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注10K SFﾎﾟﾘDH【黒】福井県こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1149924",
    "name": "別注１０ＫＳＦＭﾎﾟﾘ福井こしひかりＲ",
    "sku": "",
    "janCode": "4986869343105",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 63,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注10K SFMﾎﾟﾘDH【ＮＢ】福井こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1163052",
    "name": "別注１０ＫSFMﾎﾟﾘ新米福井こしひかりＲ",
    "sku": "",
    "janCode": "4986869343105",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 63,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "●◆別注10K SFMﾎﾟﾘDH【ＮＢ・新米】福井こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1214034",
    "name": "●【新版】NO.596【３００ｇ】メッセージライス長野県上伊那こしひかり（KOA株式会社様分）",
    "sku": "005969151",
    "janCode": "-",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【真空和紙レーヨン】窓無し",
    "unitPrice": 16,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●【新版】NO.596【３００ｇ】メッセージライス長野県上伊那こしひかり（KOA株式会社様分）",
    "imageUrl": ""
  },
  {
    "id": "1037927",
    "name": "●シール中【食味王】１Ｋ岐阜県こしひかり・飛騨高山産（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ岐阜県こしひかり・飛騨高山産（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1109366",
    "name": "シール大【食味王】２Ｋ岐阜県こしひかり・飛騨高山産（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【食味王】２Ｋ岐阜県こしひかり・飛騨高山産（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1167274",
    "name": "シール大【家紋】５Ｋ岐阜飛騨高山こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【家紋】５Ｋ岐阜飛騨高山こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1168071",
    "name": "シール小【表示】５Ｋ岐阜高山市コシヒカリ",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール小【表示】５Ｋ岐阜高山市コシヒカリ",
    "imageUrl": ""
  },
  {
    "id": "1233233",
    "name": "●【新版】シール大【ライフフーズ】１Ｋ愛知県あいちのかおり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【ライフフーズ】１Ｋ愛知県あいちのかおり",
    "imageUrl": ""
  },
  {
    "id": "1261483",
    "name": "シール大【有機米】２Ｋ愛知県あいちのかおり（JAなごや）",
    "sku": "125650001",
    "janCode": "-",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【有機米】２Ｋ愛知県あいちのかおり（JAなごや）",
    "imageUrl": ""
  },
  {
    "id": "1232193",
    "name": "●シール中【新米】300ｇ三重こしひかり",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【新米】300ｇ三重こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1259965",
    "name": "【新版】シール中【食味王】１Ｋ三重県こしひかり（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール中【食味王】１Ｋ三重県こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1028123",
    "name": "●シール大【食味王ＪＡＮ】２Ｋ三重県伊賀こしひかり",
    "sku": "125650001",
    "janCode": "4986869516028",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王ＪＡＮ】２Ｋ三重県伊賀こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1233127",
    "name": "●【新版】シール大２Ｋ新米三重こしひかり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大２Ｋ新米三重こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1259964",
    "name": "【新版】シール大【食味王】２Ｋ三重県こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール大【食味王】２Ｋ三重県こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1039988",
    "name": "別注５Ｋマットポリ　三重県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869197050",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 42,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5K MﾎﾟﾘDH【通常】三重こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1214304",
    "name": "別注５Ｋﾏｯﾄﾎﾟﾘ無洗米三重県産こしＲ",
    "sku": "",
    "janCode": "4986869007281",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 42,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5K MﾎﾟﾘDH【無洗米】三重こしひかりRZ (JA鈴鹿指定）",
    "imageUrl": ""
  },
  {
    "id": "1162327",
    "name": "別注５ＫSFMﾎﾟﾘ新米三重あきたこまちＲ",
    "sku": "",
    "janCode": "4986869146058",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "別注5K SFMﾎﾟﾘDH【ＮＢ・新米】三重あきたこまちRZ",
    "imageUrl": ""
  },
  {
    "id": "1164483",
    "name": "別注５ＫＳＦＭポリ　三重こしひかりＲ",
    "sku": "",
    "janCode": "4986869482057",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K SFMﾎﾟﾘDH【ＮＢ】三重こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1166010",
    "name": "別注５ＫSFMﾎﾟﾘ新米三重こしひかりＲ",
    "sku": "",
    "janCode": "4986869482057",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "別注5K SFMﾎﾟﾘDH【ＮＢ・新米】三重こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1132090",
    "name": "●（ロゴ無）5KﾎﾟﾘﾎﾟﾘDH伊賀の米・三重伊賀こしひかりRZＳＰ黄昏筆柄",
    "sku": "008850503",
    "janCode": "4986869516059",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリポリ】",
    "unitPrice": 81,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●（ロゴ無）5KﾎﾟﾘﾎﾟﾘDH伊賀の米・三重伊賀こしひかりRZＳＰ黄昏筆柄",
    "imageUrl": ""
  },
  {
    "id": "1039986",
    "name": "別注１０Ｋマットポリ三重県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869197104",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 49.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注10K MﾎﾟﾘDH【通常】三重こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1229994",
    "name": "別注１０Ｋポリ　三重県こしひかり",
    "sku": "",
    "janCode": "4560141322004",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 43.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●（ロゴ無）別注10KﾎﾟﾘDH三重県こしひかり（ロピア用）RZ",
    "imageUrl": ""
  },
  {
    "id": "1163055",
    "name": "別注１０ＫSFMﾎﾟﾘ新米三重こしひかりＲ",
    "sku": "",
    "janCode": "4986869197104",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 63,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "●◆別注10K SFMﾎﾟﾘDH【ＮＢ・新米】三重こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1169744",
    "name": "別注１０ＫSFMﾎﾟﾘ三重こしひかりＲ",
    "sku": "",
    "janCode": "4986869197104",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 63,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注10K SFMﾎﾟﾘDH【ＮＢ】三重こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1155931",
    "name": "●（ロゴ無）10KﾎﾟﾘﾎﾟﾘDH伊賀の米・三重県伊賀こしひかりRZＳＰ黄昏筆柄",
    "sku": "008851003",
    "janCode": "4986869355108",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリポリ】",
    "unitPrice": 95,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●（ロゴ無）10KﾎﾟﾘﾎﾟﾘDH伊賀の米・三重県伊賀こしひかりRZＳＰ黄昏筆柄",
    "imageUrl": ""
  },
  {
    "id": "1213711",
    "name": "●【新版】シール小１Ｋ（表示）滋賀県こしひかり（ダスキン用）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール小１Ｋ（表示）滋賀県こしひかり（ダスキン用）",
    "imageUrl": ""
  },
  {
    "id": "1217751",
    "name": "●シール中【食味王・脱酸素剤】１Ｋ滋賀みずかがみ（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王・脱酸素剤】１Ｋ滋賀みずかがみ（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1037939",
    "name": "シール中【食味王】１Ｋ滋賀みずかがみ【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王】１Ｋ滋賀みずかがみ【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1089491",
    "name": "別注１．４Ｋポリ　滋賀県産羽二重糯Ｒ",
    "sku": "",
    "janCode": "4986869920146",
    "weight": 1.4,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 37.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注1.4KﾎﾟﾘDH滋賀羽二重糯(220MM幅）RZ",
    "imageUrl": ""
  },
  {
    "id": "1206683",
    "name": "別注２Ｋﾏｯﾄﾎﾟﾘ無洗米滋賀県こしひかりＲ",
    "sku": "",
    "janCode": "4986869677026",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 42.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注2K MﾎﾟﾘDH【無洗米】滋賀こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1149932",
    "name": "別注２ＫＳＦＭポリ　滋賀県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869360027",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 57,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注2K SFMﾎﾟﾘDH【ＮＢ】滋賀こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1222582",
    "name": "●シール大【食味王】２Ｋ特栽・魚のゆりかご水田米滋賀こしひかり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ特栽・魚のゆりかご水田米滋賀こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1089948",
    "name": "●【改版】シール大【食味王】２Ｋ滋賀県みずかがみ（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【改版】シール大【食味王】２Ｋ滋賀県みずかがみ（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1098698",
    "name": "△シール大　２Ｋ有機栽培米・滋賀県ミルキークイーン",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大　２Ｋ有機栽培米・滋賀県ミルキークイーン",
    "imageUrl": ""
  },
  {
    "id": "1099720",
    "name": "△シール大　２Ｋ有機栽培米・滋賀こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大　２Ｋ有機栽培米・滋賀こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1098697",
    "name": "●シール小【表示ＪＡＮ】２Ｋ有機栽培米・滋賀県ミルキークイーン",
    "sku": "125660001",
    "janCode": "4986869000237",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示ＪＡＮ】２Ｋ有機栽培米・滋賀県ミルキークイーン",
    "imageUrl": ""
  },
  {
    "id": "1099721",
    "name": "●シール小【表示ＪＡＮ】２Ｋ有機栽培米・滋賀県こしひかり",
    "sku": "125660001",
    "janCode": "4986869000220",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示ＪＡＮ】２Ｋ有機栽培米・滋賀県こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1197414",
    "name": "●シール中【ガイドライン表示】２Ｋ特栽・魚のゆりかご水田米滋賀こしひかり",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【ガイドライン表示】２Ｋ特栽・魚のゆりかご水田米滋賀こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1114868",
    "name": "別注５Ｋﾏｯﾄﾎﾟﾘ無洗米滋賀県こしひかりＲ",
    "sku": "",
    "janCode": "4986869677057",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 46.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K MﾎﾟﾘDH【無洗米】滋賀こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1149930",
    "name": "別注５ＫＳＦＭポリ　滋賀こしひかりＲ",
    "sku": "",
    "janCode": "4986869171050",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5K SFMﾎﾟﾘDH【ＮＢ】滋賀こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1258070",
    "name": "【新版】シール中150ｇ京都府産きぬむすめ",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.15,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール中150ｇ京都府産きぬむすめ",
    "imageUrl": ""
  },
  {
    "id": "1215985",
    "name": "●【新版】シール中【表示・ガイドライン】300G特別栽培米京都府やましろの恵（販売者：京都やましろ）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中【表示・ガイドライン】300G特別栽培米京都府やましろの恵（販売者：京都やましろ）",
    "imageUrl": ""
  },
  {
    "id": "1192710",
    "name": "【改版】シール中【食味王・特別栽培米】１ｋ京都府京式部（ＪＡＮなし・ガイドラインあり）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【改版】シール中【食味王・特別栽培米】１ｋ京都府京式部（ＪＡＮなし・ガイドラインあり）",
    "imageUrl": ""
  },
  {
    "id": "1037937",
    "name": "シール中【食味王】１Ｋ京都府京丹後こしひかり（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王】１Ｋ京都府京丹後こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1028137",
    "name": "●シール大【食味王ＪＡＮ】２Ｋ京都府京丹後こしひかり",
    "sku": "125650001",
    "janCode": "4986869249322",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王ＪＡＮ】２Ｋ京都府京丹後こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1211838",
    "name": "●シール大　２Ｋ【食味王・脱酸・特栽米】京都府京式部（表示なし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　２Ｋ【食味王・脱酸・特栽米】京都府京式部（表示なし）",
    "imageUrl": ""
  },
  {
    "id": "1170330",
    "name": "△シール大【家紋】２Ｋ京都ひのひかり（ＪＡ京都やましろ指定）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【家紋】２Ｋ京都ひのひかり（ＪＡ京都やましろ指定）",
    "imageUrl": ""
  },
  {
    "id": "1191418",
    "name": "【改版】シール大　２Ｋ【食味王・特栽米】京都府京式部（ＪＡＮなし・ガイドラインあり）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【改版】シール大　２Ｋ【食味王・特栽米】京都府京式部（ＪＡＮなし・ガイドラインあり）",
    "imageUrl": ""
  },
  {
    "id": "1170333",
    "name": "●シール小【表示】２Ｋ京都ひのひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】２Ｋ京都ひのひかり",
    "imageUrl": ""
  },
  {
    "id": "1212018",
    "name": "別注３ＫＳＦポリ金賞健康米京都丹後コシＲ",
    "sku": "",
    "janCode": "4986869007267",
    "weight": 3,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 82.6,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【新版】別注3K SFMﾎﾟﾘDH金賞健康米京都丹後コシRZ",
    "imageUrl": ""
  },
  {
    "id": "1166883",
    "name": "（ロゴ無）5K SFMﾎﾟﾘDH特栽米・ＪＡ京都やましろ産ひのひかりRAＳＰ雲竜柄無地",
    "sku": "009090503",
    "janCode": "-",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 93,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "（ロゴ無）5K SFMﾎﾟﾘDH特栽米・ＪＡ京都やましろ産ひのひかりRAＳＰ雲竜柄無地",
    "imageUrl": ""
  },
  {
    "id": "1242848",
    "name": "△【新版】シール大【家紋】５Ｋ京の豆っこ米こしひかり（京都府与謝野町産こしひかり）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△【新版】シール大【家紋】５Ｋ京の豆っこ米こしひかり（京都府与謝野町産こしひかり）",
    "imageUrl": ""
  },
  {
    "id": "1242849",
    "name": "●【新版】シール小【表示】５Ｋ京の豆っこ米こしひかり（京都府与謝野町産こしひかり）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール小【表示】５Ｋ京の豆っこ米こしひかり（京都府与謝野町産こしひかり）",
    "imageUrl": ""
  },
  {
    "id": "1216571",
    "name": "△【新版】シール小【ガイドライン】特別栽培米【ちくさの舞】兵庫県宍粟市こしひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△【新版】シール小【ガイドライン】特別栽培米【ちくさの舞】兵庫県宍粟市こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1034118",
    "name": "シール小【ガイドライン】特栽米・コウノトリ兵庫県但馬こし（１・２Ｋ兼用）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール小【ガイドライン】特栽米・コウノトリ兵庫県但馬こし（１・２Ｋ兼用）",
    "imageUrl": ""
  },
  {
    "id": "1034119",
    "name": "●シール中【食味王】１Ｋ特栽米・兵庫県但馬こしひかり・コウノトリ育むお米（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ特栽米・兵庫県但馬こしひかり・コウノトリ育むお米（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1246063",
    "name": "●シール中【食味王・ガイドライン】１Ｋ特栽米・兵庫県但馬こしひかり・コウノトリ育むお米",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王・ガイドライン】１Ｋ特栽米・兵庫県但馬こしひかり・コウノトリ育むお米",
    "imageUrl": ""
  },
  {
    "id": "1251284",
    "name": "【新版】シール中【食味王・脱酸素剤】１Ｋ特栽米・兵庫県但馬こしひかり・コウノトリ育むお米",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール中【食味王・脱酸素剤】１Ｋ特栽米・兵庫県但馬こしひかり・コウノトリ育むお米",
    "imageUrl": ""
  },
  {
    "id": "1158106",
    "name": "別注２ＫSFMﾎﾟﾘ兵庫丹波こしひかりＲ",
    "sku": "",
    "janCode": "4986869208022",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 51.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注2K SFMﾎﾟﾘDH兵庫丹波こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1216570",
    "name": "●【新版】シール大【食味王】２Ｋ特栽米【ちくさの舞】兵庫県宍粟市こしひかり（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【食味王】２Ｋ特栽米【ちくさの舞】兵庫県宍粟市こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1193795",
    "name": "●シール大　２Ｋ【有機米】兵庫県丹波ひかみ産こしひかり（ＪＡ丹波ひかみ指定）",
    "sku": "125650001",
    "janCode": "4986869006253",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　２Ｋ【有機米】兵庫県丹波ひかみ産こしひかり（ＪＡ丹波ひかみ指定）",
    "imageUrl": ""
  },
  {
    "id": "1080750",
    "name": "△シール大【家紋】２Ｋ有機栽培米・兵庫県丹波ひかみこしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【家紋】２Ｋ有機栽培米・兵庫県丹波ひかみこしひかり",
    "imageUrl": ""
  },
  {
    "id": "1095151",
    "name": "●シール大【食味王】２Ｋ特栽米・兵庫県但馬こしひかり・コウノトリ育むお米（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ特栽米・兵庫県但馬こしひかり・コウノトリ育むお米（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1173852",
    "name": "●シール大【食味王・脱酸】２Ｋ特栽米・兵庫県但馬こしひかり・コウノトリ育むお米表示なし",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王・脱酸】２Ｋ特栽米・兵庫県但馬こしひかり・コウノトリ育むお米表示なし",
    "imageUrl": ""
  },
  {
    "id": "1259861",
    "name": "【新版】シール大　２Ｋ有機精米・兵庫県丹波産こしひかり",
    "sku": "125650001",
    "janCode": "4986869008615",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール大　２Ｋ有機精米・兵庫県丹波産こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1080753",
    "name": "●シール小【表示】２Ｋ有機栽培米・兵庫県丹波ひかみこしひかり",
    "sku": "125660001",
    "janCode": "4986869502106",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】２Ｋ有機栽培米・兵庫県丹波ひかみこしひかり",
    "imageUrl": ""
  },
  {
    "id": "1178866",
    "name": "●シール大　３Ｋ特栽米・兵庫県丹波産こしひかり",
    "sku": "125650001",
    "janCode": "4986869005430",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　３Ｋ特栽米・兵庫県丹波産こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1145760",
    "name": "別注５Ｋﾏｯﾄﾎﾟﾘﾎﾟﾘ兵庫丹波こしひかりR",
    "sku": "",
    "janCode": "4986869208053",
    "weight": 5,
    "shape": "RＺ",
    "material": "【マットポリポリ】",
    "unitPrice": 71.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5K MﾎﾟﾘﾎﾟﾘDH兵庫丹波こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1228239",
    "name": "●【新版】シール中【食味王・脱酸素剤】１Ｋ奈良ヒノヒカリ（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール中【食味王・脱酸素剤】１Ｋ奈良ヒノヒカリ（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1100236",
    "name": "●シール大【食味王】２Ｋ奈良県ひのひかり（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ奈良県ひのひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1183945",
    "name": "シール大【食味王・脱酸】２Ｋ島根仁多米こしひかり（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【食味王・脱酸】２Ｋ島根仁多米こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1022593",
    "name": "【使用禁止】●シール小【表示】３Ｋ無洗米・島根県仁多米こしひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】●シール小【表示】３Ｋ無洗米・島根県仁多米こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1022509",
    "name": "●【改版】別注シール【家紋】３Ｋ無洗米・島根県仁多米こしひかり",
    "sku": "701022509",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 58.5,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【改版】別注シール【家紋】３Ｋ無洗米・島根県仁多米こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1246064",
    "name": "●【新版】シール大【家紋・表示あり】５Ｋ島根県仁多米こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【家紋・表示あり】５Ｋ島根県仁多米こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1201498",
    "name": "【使用禁止】△シール大【家紋】５Ｋ島根県仁多米こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】△シール大【家紋】５Ｋ島根県仁多米こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1201499",
    "name": "【使用禁止】●シール小【表示】５Ｋ島根県仁多米こしひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】●シール小【表示】５Ｋ島根県仁多米こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1220111",
    "name": "●シール中　３００ｇ【通常】やまぐち米　山口県こしひかり",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中　３００ｇ【通常】やまぐち米　山口県こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1204167",
    "name": "●シール中【食味王】１Ｋ山口県こしひかり（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王】１Ｋ山口県こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1217753",
    "name": "●【新版】シール大【金賞健康米・特別栽培米】３Ｋ山口県こしひかり（コープやまぐち様）",
    "sku": "125650001",
    "janCode": "4986869007410",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【金賞健康米・特別栽培米】３Ｋ山口県こしひかり（コープやまぐち様）",
    "imageUrl": ""
  },
  {
    "id": "1060495",
    "name": "別注５ＫSFポリ　徳島県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869895055",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 55.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【厚み変更】別注5K SFﾎﾟﾘDH【通常】徳島こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1189957",
    "name": "別注５ＫSFﾎﾟﾘ新米徳島県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869895055",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 52,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "●◆別注5K SFﾎﾟﾘDH【新米】徳島こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1001035",
    "name": "別注１０ＫSFポリ　徳島県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869417103",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 62.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注10K SFﾎﾟﾘDH【通常】徳島こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1031960",
    "name": "別注１０ＫSFポリ新米徳島県こしひかりＲ",
    "sku": "",
    "janCode": "4986869417103",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 62.5,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "●◆別注10K SFﾎﾟﾘDH【新米】徳島こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1217991",
    "name": "●シール大【ライフフーズ】１Ｋ香川県ひのひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【ライフフーズ】１Ｋ香川県ひのひかり",
    "imageUrl": ""
  },
  {
    "id": "1226856",
    "name": "●【改版】シール小【ダスキン表示】１Ｋ香川おいでまい",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【改版】シール小【ダスキン表示】１Ｋ香川おいでまい",
    "imageUrl": ""
  },
  {
    "id": "1217643",
    "name": "●シール中【食味王・脱酸素剤】１Ｋ香川おいでまい（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【食味王・脱酸素剤】１Ｋ香川おいでまい（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1244594",
    "name": "●【新版】シール大【家紋・表示】２Ｋ香川姫ごのみ",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【家紋・表示】２Ｋ香川姫ごのみ",
    "imageUrl": ""
  },
  {
    "id": "1046533",
    "name": "別注５ＫSFポリ　香川県産おいでまいＲ",
    "sku": "",
    "janCode": "4986869571058",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 54,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5K SFﾎﾟﾘDH香川おいでまい（マルナカ様）RZ",
    "imageUrl": ""
  },
  {
    "id": "1149931",
    "name": "別注５ＫＳＦＭポリ　香川こしひかりＲ",
    "sku": "",
    "janCode": "4986869425054",
    "weight": 5,
    "shape": "RＡ",
    "material": "【ＳＦマットポリ】",
    "unitPrice": 58,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K SFMﾎﾟﾘDH【ＮＢ】香川こしひかりRA",
    "imageUrl": ""
  },
  {
    "id": "1244598",
    "name": "●【新版】シール大【家紋・表示】５Ｋ香川姫ごのみ",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【家紋・表示】５Ｋ香川姫ごのみ",
    "imageUrl": ""
  },
  {
    "id": "1252589",
    "name": "【新版】シール大【新米】２Ｋ高知南国そだち（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール大【新米】２Ｋ高知南国そだち（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1229058",
    "name": "△【新版】シール大【家紋・新米】５Ｋ高知県こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△【新版】シール大【家紋・新米】５Ｋ高知県こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1229059",
    "name": "●【新版】シール小【表示】５Ｋ高知県こしひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール小【表示】５Ｋ高知県こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1243460",
    "name": "●【新版】シール大【食味王】２Ｋ福岡夢つくし（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【食味王】２Ｋ福岡夢つくし（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1243189",
    "name": "●【改版】5K SFﾎﾟﾘDH福岡のお米夢つくし（店名）",
    "sku": "006900501",
    "janCode": "-",
    "weight": 5,
    "shape": "単袋",
    "material": "【ＳＦポリ】",
    "unitPrice": 41,
    "printingCost": 16,
    "category": "bag",
    "status": "active",
    "description": "●【改版】5K SFﾎﾟﾘDH福岡のお米夢つくし（店名）",
    "imageUrl": ""
  },
  {
    "id": "1012298",
    "name": "別注1．４Ｋポリ　佐賀県産ひよくもちＲ",
    "sku": "",
    "janCode": "4986869093017",
    "weight": 1.4,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 40,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注1.4KﾎﾟﾘDH佐賀ひよくもち（赤飯）（サイズ220巾）RZ",
    "imageUrl": ""
  },
  {
    "id": "80912",
    "name": "別注１．４Ｋポリ　熊本県産ひよくもちＲ",
    "sku": "",
    "janCode": "4986869940144",
    "weight": 1.4,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 40,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注1.4KﾎﾟﾘDH熊本ひよくもちRZ",
    "imageUrl": ""
  },
  {
    "id": "1016982",
    "name": "ＣＵＴ代：１．４Ｋポリ熊本県産ひよくもち",
    "sku": "999999999",
    "janCode": "4986869940144",
    "weight": 1.4,
    "shape": "その他",
    "material": "",
    "unitPrice": 5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【カット】別注1.4KﾎﾟﾘDH熊本ひよくもち【原反80912-38】",
    "imageUrl": ""
  },
  {
    "id": "1244704",
    "name": "【改版】シール大【食味王】1.5K熊本森のくまさん（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 1.5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【改版】シール大【食味王】1.5K熊本森のくまさん（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1024475",
    "name": "●シール大【食味王】２Ｋ熊本県森のくまさん（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王】２Ｋ熊本県森のくまさん（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1244581",
    "name": "シール大【家紋・表示】２Ｋ熊本もりのくまさん（ひらがな）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【家紋・表示】２Ｋ熊本もりのくまさん（ひらがな）",
    "imageUrl": ""
  },
  {
    "id": "1201496",
    "name": "【使用禁止】△シール大【家紋】４Ｋ熊本森のくまさん",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】△シール大【家紋】４Ｋ熊本森のくまさん",
    "imageUrl": ""
  },
  {
    "id": "1244585",
    "name": "シール大【家紋・表示】４Ｋ熊本森のくまさん",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【家紋・表示】４Ｋ熊本森のくまさん",
    "imageUrl": ""
  },
  {
    "id": "1201497",
    "name": "【使用禁止】●シール小【表示】４Ｋ熊本森のくまさん",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】●シール小【表示】４Ｋ熊本森のくまさん",
    "imageUrl": ""
  },
  {
    "id": "1116472",
    "name": "△シール大【家紋】５Ｋ熊本県森のくまさん",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大【家紋】５Ｋ熊本県森のくまさん",
    "imageUrl": ""
  },
  {
    "id": "1116470",
    "name": "●シール小【表示】５Ｋ熊本県森のくまさん",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】５Ｋ熊本県森のくまさん",
    "imageUrl": ""
  },
  {
    "id": "1226391",
    "name": "別注５Ｋポリ新米宮崎県産こしひかりＲ",
    "sku": "",
    "janCode": "4986869007717",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 41.5,
    "printingCost": 0,
    "category": "new_rice",
    "status": "active",
    "description": "●◆別注5KﾎﾟﾘDH【新米】宮崎県産こしひかりRZ",
    "imageUrl": ""
  },
  {
    "id": "1200722",
    "name": "別注のぼり（大）おくさま印",
    "sku": "999999998",
    "janCode": "なし",
    "weight": 0,
    "shape": "その他",
    "material": "",
    "unitPrice": 1200,
    "printingCost": 0,
    "category": "other",
    "status": "active",
    "description": "△別注のぼり大　おくさま印（ポリエステル・防炎加工なし・左耳仕様）",
    "imageUrl": ""
  },
  {
    "id": "1232843",
    "name": "【貼り賃】シール貼り賃【２枚（大シール・中シール）】８ｋ国内産こしひかり",
    "sku": "999999999",
    "janCode": "なし",
    "weight": 0,
    "shape": "その他",
    "material": "",
    "unitPrice": 11,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【貼り賃】シール貼り賃【２枚（大シール・中シール）】８ｋ国内産こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1240553",
    "name": "【貼り賃】シール貼り賃【１枚】",
    "sku": "999999999",
    "janCode": "なし",
    "weight": 0,
    "shape": "その他",
    "material": "",
    "unitPrice": 9,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【貼り賃】シール貼り賃【１枚】",
    "imageUrl": ""
  },
  {
    "id": "1241076",
    "name": "【貼り賃】シール貼り賃【１枚】",
    "sku": "999999999",
    "janCode": "なし",
    "weight": 0,
    "shape": "その他",
    "material": "",
    "unitPrice": 8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【貼り賃】シール貼り賃【１枚】",
    "imageUrl": ""
  },
  {
    "id": "1241079",
    "name": "【貼り賃】シール貼り賃【１枚】",
    "sku": "999999999",
    "janCode": "なし",
    "weight": 0,
    "shape": "その他",
    "material": "",
    "unitPrice": 8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【貼り賃】シール貼り賃【１枚】",
    "imageUrl": ""
  },
  {
    "id": "1260843",
    "name": "【貼り賃】シール貼り賃【１枚】",
    "sku": "999999999",
    "janCode": "なし",
    "weight": 0,
    "shape": "その他",
    "material": "",
    "unitPrice": 8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【貼り賃】シール貼り賃【１枚】",
    "imageUrl": ""
  },
  {
    "id": "1261047",
    "name": "【貼り賃】シール貼り賃【１枚】",
    "sku": "999999999",
    "janCode": "なし",
    "weight": 0,
    "shape": "その他",
    "material": "",
    "unitPrice": 8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【貼り賃】シール貼り賃【１枚】",
    "imageUrl": ""
  },
  {
    "id": "1222278",
    "name": "△小袋シール（正方形）金賞健康米の新春キャンペーン",
    "sku": "125630001",
    "janCode": "なし",
    "weight": 0,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 15,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△小袋シール（正方形）金賞健康米の新春キャンペーン",
    "imageUrl": ""
  },
  {
    "id": "1258004",
    "name": "【新版】シール小　NTT西日本ルセント様分",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 0,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール小　NTT西日本ルセント様分",
    "imageUrl": ""
  },
  {
    "id": "1212145",
    "name": "●シール中【金澤さん】こがね餅（杵つき）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 0,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【金澤さん】こがね餅（杵つき）",
    "imageUrl": ""
  },
  {
    "id": "1225594",
    "name": "△【新版】別注シールエディオン・100満ボルト・象印ロゴ（84×54MM)",
    "sku": "701225594",
    "janCode": "なし",
    "weight": 0,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 19,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△【新版】別注シールエディオン・100満ボルト・象印ロゴ（84×54MM)",
    "imageUrl": ""
  },
  {
    "id": "1260040",
    "name": "【新版】別注シール　京式部ガイドライン",
    "sku": "701260040",
    "janCode": "なし",
    "weight": 0,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 11.5,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】別注シール　京式部ガイドライン",
    "imageUrl": ""
  },
  {
    "id": "1191210",
    "name": "【改版】NO.596【３００ｇ】メッセージライス【精白米】スクリーンの米",
    "sku": "005969151",
    "janCode": "-",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【真空和紙レーヨン】窓無し",
    "unitPrice": 18,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【改版】NO.596【３００ｇ】メッセージライス【精白米】スクリーンの米",
    "imageUrl": ""
  },
  {
    "id": "1261205",
    "name": "【新版】NO.596【３００ｇ】メッセージライス　まぁるいマ米（藤交商事様分）",
    "sku": "005969151",
    "janCode": "-",
    "weight": 0.3,
    "shape": "単袋",
    "material": "【真空和紙レーヨン】窓無し",
    "unitPrice": 18,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【新版】NO.596【３００ｇ】メッセージライス　まぁるいマ米（藤交商事様分）",
    "imageUrl": ""
  },
  {
    "id": "1191907",
    "name": "別注１ｋSFﾎﾟﾘ扇・もち米RZ",
    "sku": "",
    "janCode": "4986869437019",
    "weight": 1,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 56,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注1K SFﾎﾟﾘDH扇・もち米（日之出物産様）RZ",
    "imageUrl": ""
  },
  {
    "id": "1255943",
    "name": "【新版】シール小【ダスキン表示】１.4Ｋ国内産",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【新版】シール小【ダスキン表示】１.4Ｋ国内産",
    "imageUrl": ""
  },
  {
    "id": "1243876",
    "name": "【改版】シール小【ダスキン表示】１Ｋ国内産",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【改版】シール小【ダスキン表示】１Ｋ国内産",
    "imageUrl": ""
  },
  {
    "id": "1225009",
    "name": "シール中【食味王・脱酸素剤】１Ｋ魚沼こしひかり（ＪＡＮなし）",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王・脱酸素剤】１Ｋ魚沼こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1032951",
    "name": "シール中【食味王】１Ｋ魚沼こしひかり【ＪＡＮなし】",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 1,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール中【食味王】１Ｋ魚沼こしひかり【ＪＡＮなし】",
    "imageUrl": ""
  },
  {
    "id": "1167146",
    "name": "2KﾎﾟﾘﾎﾟﾘDH特栽米・金澤さんの魚沼産こしひかりRZＳＰ雲竜柄無地",
    "sku": "009210203",
    "janCode": "-",
    "weight": 2,
    "shape": "RＺ",
    "material": "【ポリポリ】",
    "unitPrice": 128,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "2KﾎﾟﾘﾎﾟﾘDH特栽米・金澤さんの魚沼産こしひかりRZＳＰ雲竜柄無地",
    "imageUrl": ""
  },
  {
    "id": "1246138",
    "name": "●【新版】2K MﾎﾟﾘﾎﾟﾘDH白い宝石（米匠庵）RZＳＰ丸窓雲竜柄無地",
    "sku": "008280203",
    "janCode": "-",
    "weight": 2,
    "shape": "RＺ",
    "material": "【マットポリポリ】",
    "unitPrice": 165.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●【新版】2K MﾎﾟﾘﾎﾟﾘDH白い宝石（米匠庵）RZＳＰ丸窓雲竜柄無地",
    "imageUrl": ""
  },
  {
    "id": "1243716",
    "name": "●【新版】シール大【食味王・年産あり】２Ｋ魚沼こしひかり（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【食味王・年産あり】２Ｋ魚沼こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1183949",
    "name": "●シール大【食味王・脱酸】２Ｋ魚沼こしひかり（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大【食味王・脱酸】２Ｋ魚沼こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "80535",
    "name": "【使用禁止】シール大【家紋】２Ｋ無洗米・魚沼こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】シール大【家紋】２Ｋ無洗米・魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1244607",
    "name": "シール大【家紋・表示】２Ｋ無洗米・魚沼こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【家紋・表示】２Ｋ無洗米・魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "80539",
    "name": "【使用禁止】シール小【表示】２Ｋ無洗米・魚沼こしひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 2,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】シール小【表示】２Ｋ無洗米・魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1236383",
    "name": "△【新版】シール大　３Ｋあいちのかおり【陽娘】",
    "sku": "125650001",
    "janCode": "-",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△【新版】シール大　３Ｋあいちのかおり【陽娘】",
    "imageUrl": ""
  },
  {
    "id": "1247513",
    "name": "シール大【家紋・表示】３Ｋあいちのかおり",
    "sku": "125650001",
    "janCode": "-",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【家紋・表示】３Ｋあいちのかおり",
    "imageUrl": ""
  },
  {
    "id": "1244579",
    "name": "シール大【家紋・ガイド表示】３Ｋ特栽米・魚沼こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【家紋・ガイド表示】３Ｋ特栽米・魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1236385",
    "name": "●【新版】シール小【表示】３Ｋあいちのかおり【陽娘】",
    "sku": "125660001",
    "janCode": "-",
    "weight": 3,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール小【表示】３Ｋあいちのかおり【陽娘】",
    "imageUrl": ""
  },
  {
    "id": "1184643",
    "name": "△シール大　４Ｋあいちのかおり【陽娘】",
    "sku": "125650001",
    "janCode": "-",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大　４Ｋあいちのかおり【陽娘】",
    "imageUrl": ""
  },
  {
    "id": "1184642",
    "name": "●シール小【表示】４Ｋあいちのかおり【陽娘】",
    "sku": "125660001",
    "janCode": "-",
    "weight": 4,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】４Ｋあいちのかおり【陽娘】",
    "imageUrl": ""
  },
  {
    "id": "1249596",
    "name": "別注５Ｋポリ　備蓄米精米",
    "sku": "",
    "janCode": "4986869008431",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】乳白Ｕ－0.8",
    "unitPrice": 39,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘDH【万代】備蓄米精米RZ",
    "imageUrl": ""
  },
  {
    "id": "75432",
    "name": "別注５Ｋマットポリ近江の米こしひかりRZ",
    "sku": "",
    "janCode": "4986869169057",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 44,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K MﾎﾟﾘDH【通常】近江の米・滋賀こしひかり（マンダイ様）RZ",
    "imageUrl": ""
  },
  {
    "id": "1007369",
    "name": "別注５Ｋポリ　得々ごはんＲ",
    "sku": "",
    "janCode": "4986869240053",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 39,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘDH得々ごはん（販売者：日之出物産）RZ",
    "imageUrl": ""
  },
  {
    "id": "1090502",
    "name": "別注５Ｋポリ　アメリカ産カルローズＲ",
    "sku": "",
    "janCode": "4986869716152",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 45,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘDH【Ｚ】アメリカ産カルローズRZ",
    "imageUrl": ""
  },
  {
    "id": "1121699",
    "name": "別注５Ｋマットポリ近江の米こしひかりＲ",
    "sku": "",
    "janCode": "4986869169057",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 44,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K MﾎﾟﾘDH【新米】近江の米・滋賀こしひかり（マンダイ様）RZ",
    "imageUrl": ""
  },
  {
    "id": "1132556",
    "name": "別注５Ｋポリ無洗米おくさま印Ｒ",
    "sku": "",
    "janCode": "4986869403052",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 39,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘDH【無洗米】おくさま印「洗うなんてもういいんだよ」RZ",
    "imageUrl": ""
  },
  {
    "id": "1221173",
    "name": "別注５Ｋポリあきたこまち複数原料米",
    "sku": "",
    "janCode": "4986869881058",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 41.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5KﾎﾟﾘDHあきたこまち複数原料米RZ",
    "imageUrl": ""
  },
  {
    "id": "1223058",
    "name": "別注５ｋポリ　無洗米アメリカ産カルローズ",
    "sku": "",
    "janCode": "4986869000244",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 41.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●【新版】（ロゴ無）5KﾎﾟﾘDH無洗米・アメリカ産カルローズRZ米粒青",
    "imageUrl": ""
  },
  {
    "id": "1226862",
    "name": "別注５Ｋポリ　国内産ブレンドＲ",
    "sku": "",
    "janCode": "4560141352056",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 39.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●（ロゴ無）別注5KﾎﾟﾘDH国内産【ブレンド】（ロピア用）RZ",
    "imageUrl": ""
  },
  {
    "id": "1230622",
    "name": "別注５Ｋポリ　国内産ブレンドＲ",
    "sku": "",
    "janCode": "4986869007908",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 41.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5KﾎﾟﾘDH【万代】国内産ブレンドRZ",
    "imageUrl": ""
  },
  {
    "id": "1244055",
    "name": "別注５Ｋポリ　アメリカ産カルローズＲ",
    "sku": "",
    "janCode": "4986869716152",
    "weight": 5,
    "shape": "RＡ",
    "material": "【ポリ】透明",
    "unitPrice": 45,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5KﾎﾟﾘDH【Ａ】アメリカ産カルローズRA",
    "imageUrl": ""
  },
  {
    "id": "1084704",
    "name": "別注５ＫＳＦポリ　ささの金星Ｒ",
    "sku": "",
    "janCode": "4986869930503",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 49.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注5K SFﾎﾟﾘDHささの金星・宮城東北１９４号RZ",
    "imageUrl": ""
  },
  {
    "id": "1139903",
    "name": "別注５ＫSFポリお家ごはんＲ",
    "sku": "",
    "janCode": "4986869002095",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 55.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注5K SFﾎﾟﾘDHお家ごはんRZ",
    "imageUrl": ""
  },
  {
    "id": "1170638",
    "name": "●（ロゴ無）5KｿﾌｸﾗSつながるおこめRZＳＰソフクラ無地",
    "sku": "008140503",
    "janCode": "4986869005041",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ソフクラ】窓有り",
    "unitPrice": 166,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●（ロゴ無）5KｿﾌｸﾗSつながるおこめRZＳＰソフクラ無地",
    "imageUrl": ""
  },
  {
    "id": "1222876",
    "name": "●（ロゴ無）5KﾎﾟﾘDH無洗米・アメリカ産カルローズRZＳＰ米粒青",
    "sku": "008240503",
    "janCode": "4986869000244",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 80,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●（ロゴ無）5KﾎﾟﾘDH無洗米・アメリカ産カルローズRZＳＰ米粒青",
    "imageUrl": ""
  },
  {
    "id": "1219516",
    "name": "●【新版】（ロゴ無）5KﾎﾟﾘDHアメリカ産カルローズRZＳＰ晴天青空グリーン",
    "sku": "009900503",
    "janCode": "4986869716152",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 80,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●【新版】（ロゴ無）5KﾎﾟﾘDHアメリカ産カルローズRZＳＰ晴天青空グリーン",
    "imageUrl": ""
  },
  {
    "id": "1167149",
    "name": "5KﾎﾟﾘﾎﾟﾘDH特栽米・金澤さんの魚沼産こしひかりRZＳＰ雲竜柄無地",
    "sku": "009210503",
    "janCode": "-",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ポリポリ】",
    "unitPrice": 129,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "5KﾎﾟﾘﾎﾟﾘDH特栽米・金澤さんの魚沼産こしひかりRZＳＰ雲竜柄無地",
    "imageUrl": ""
  },
  {
    "id": "57354",
    "name": "5KﾗﾐDH焼き餅・もち米（店名）RZ",
    "sku": "006660503",
    "janCode": "4986869437057",
    "weight": 5,
    "shape": "RＺ",
    "material": "【ラミ】",
    "unitPrice": 116,
    "printingCost": 10,
    "category": "bag",
    "status": "active",
    "description": "5KﾗﾐDH焼き餅・もち米（店名）RZ",
    "imageUrl": ""
  },
  {
    "id": "1227497",
    "name": "廃棄版代　受1226862 校正間違い分",
    "sku": "910000004",
    "weight": 5,
    "shape": "その他",
    "material": "",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "other",
    "status": "active",
    "description": "廃棄版代 受1226862 校正間違い分",
    "imageUrl": ""
  },
  {
    "id": "1163083",
    "name": "△シール大　５Ｋあいちのかおり【陽娘】",
    "sku": "125650001",
    "janCode": "-",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大　５Ｋあいちのかおり【陽娘】",
    "imageUrl": ""
  },
  {
    "id": "1212993",
    "name": "●シール大　５Ｋ【食味王・特栽米】青天の霹靂（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール大　５Ｋ【食味王・特栽米】青天の霹靂（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1080069",
    "name": "△シール大　５Ｋ魚沼こしひかり（アピデ様）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大　５Ｋ魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1245342",
    "name": "●【新版】シール大【家紋・表示】５Ｋ魚沼こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●【新版】シール大【家紋・表示】５Ｋ魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1243895",
    "name": "シール大【食味王・有機】５Ｋ魚沼こしひかり（ＪＡＮなし）",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "シール大【食味王・有機】５Ｋ魚沼こしひかり（ＪＡＮなし）",
    "imageUrl": ""
  },
  {
    "id": "1163084",
    "name": "●シール小【表示】５Ｋあいちのかおり【陽娘】",
    "sku": "125660001",
    "janCode": "-",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】５Ｋあいちのかおり【陽娘】",
    "imageUrl": ""
  },
  {
    "id": "1080070",
    "name": "●シール小【表示】５Ｋ魚沼こしひかり（アピデ様）",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール小【表示】５Ｋ魚沼こしひかり（アピデ様）",
    "imageUrl": ""
  },
  {
    "id": "1022594",
    "name": "【使用禁止】●シール小【表示】５Ｋ魚沼こしひかり",
    "sku": "125660001",
    "janCode": "なし",
    "weight": 5,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 8.8,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "【使用禁止】●シール小【表示】５Ｋ魚沼こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1007250",
    "name": "●◆8K MﾎﾟﾘﾎﾟﾘDH国内産こしひかりRZＳＰ和紙調無地",
    "sku": "006081003",
    "janCode": "4986869116082",
    "weight": 8,
    "shape": "RＺ",
    "material": "【マットポリポリ】",
    "unitPrice": 95,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆8K MﾎﾟﾘﾎﾟﾘDH国内産こしひかりRZＳＰ和紙調無地",
    "imageUrl": ""
  },
  {
    "id": "1232572",
    "name": "△シール大８Ｋ国内産こしひかり",
    "sku": "125650001",
    "janCode": "なし",
    "weight": 8,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 17.6,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "△シール大８Ｋ国内産こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1232571",
    "name": "●シール中【表示】８ｋ国内産こしひかり",
    "sku": "125940001",
    "janCode": "なし",
    "weight": 8,
    "shape": "単袋",
    "material": "【シール】上質",
    "unitPrice": 14.3,
    "printingCost": 0,
    "category": "sticker",
    "status": "active",
    "description": "●シール中【表示】８ｋ国内産こしひかり",
    "imageUrl": ""
  },
  {
    "id": "1249543",
    "name": "別注１０Ｋ乳白ポリ　備蓄米精米Ｒ",
    "sku": "",
    "janCode": "4986869008448",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】乳白Ｕ－0.5",
    "unitPrice": 36,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "【新版】別注10K乳白ﾎﾟﾘDH【万代】国内産備蓄米RZ",
    "imageUrl": ""
  },
  {
    "id": "76186",
    "name": "別注１０Ｋポリ　稔りの輝きＲ",
    "sku": "",
    "janCode": "4986869215105",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 47,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注10KﾎﾟﾘDH笑顔の食卓・稔りの輝きRZ",
    "imageUrl": ""
  },
  {
    "id": "1090492",
    "name": "別注１０Ｋポリ　アメリカ産カルローズＲ",
    "sku": "",
    "janCode": "4986869716206",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 54,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●（ロゴ無）別注10KﾎﾟﾘDHアメリカ産カルローズRZ",
    "imageUrl": ""
  },
  {
    "id": "1119954",
    "name": "別注１０Ｋポリ　お買い得米Ｒ",
    "sku": "",
    "janCode": "4986869438108",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 39.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●（ロゴ無）別注10KﾎﾟﾘDHお買い得米RZ",
    "imageUrl": ""
  },
  {
    "id": "1121695",
    "name": "別注１０Ｋマットポリ近江の米こしひかりRZ",
    "sku": "",
    "janCode": "4986869169101",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 44,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●◆別注10K MﾎﾟﾘDH【新米】近江の米・滋賀こしひかり（マンダイ様）RZ",
    "imageUrl": ""
  },
  {
    "id": "1127583",
    "name": "別注１０Ｋマットポリ近江の米こしひかりＲ",
    "sku": "",
    "janCode": "4986869169101",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 48.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注10K MﾎﾟﾘDH【通常】近江の米・滋賀こしひかり（マンダイ様）RZ",
    "imageUrl": ""
  },
  {
    "id": "1222691",
    "name": "別注１０Ｋポリ　アメリカ産カルローズＲ",
    "sku": "",
    "janCode": "4986869007571",
    "weight": 10,
    "shape": "RＡ",
    "material": "【ポリ】透明",
    "unitPrice": 46.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注10KﾎﾟﾘDH【ロピア用】アメリカ産カルローズRA",
    "imageUrl": ""
  },
  {
    "id": "1226861",
    "name": "別注１０Ｋポリ　国内産ブレンドＲ",
    "sku": "",
    "janCode": "4560141352100",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 43.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●（ロゴ無）別注10KﾎﾟﾘDH国内産【ブレンド】（ロピア用）RZ",
    "imageUrl": ""
  },
  {
    "id": "1250213",
    "name": "別注１０ＫＳＦポリ　国産備蓄米Ｒ",
    "sku": "",
    "janCode": "4986869008417",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ＳＦポリ】",
    "unitPrice": 50,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "別注10K SFﾎﾟﾘDH国産備蓄米RZ",
    "imageUrl": ""
  },
  {
    "id": "1219517",
    "name": "●【新版】（ロゴ無）10KﾎﾟﾘDHアメリカ産カルローズRZＳＰ晴天青空グリーン",
    "sku": "009901003",
    "janCode": "4986869716206",
    "weight": 10,
    "shape": "RＺ",
    "material": "【ポリ】透明",
    "unitPrice": 90.5,
    "printingCost": 0,
    "category": "bag",
    "status": "active",
    "description": "●【新版】（ロゴ無）10KﾎﾟﾘDHアメリカ産カルローズRZＳＰ晴天青空グリーン",
    "imageUrl": ""
  },
  {
    "id": "1227498",
    "name": "廃棄版代　受1226861 校正間違い分",
    "sku": "910000004",
    "weight": 10,
    "shape": "その他",
    "material": "",
    "unitPrice": 0,
    "printingCost": 0,
    "category": "other",
    "status": "active",
    "description": "廃棄版代 受1226861 校正間違い分",
    "imageUrl": ""
  }
];

// 通常在庫 (Excelから生成)
export const MOCK_INVENTORY: Inventory[] = [
  {
    "productId": "1202104",
    "quantity": 8000
  },
  {
    "productId": "1038858",
    "quantity": 4000
  },
  {
    "productId": "1120389",
    "quantity": 4000
  },
  {
    "productId": "1202001",
    "quantity": 10000
  },
  {
    "productId": "1202002",
    "quantity": 8000
  },
  {
    "productId": "1226051",
    "quantity": 10000
  },
  {
    "productId": "1145760",
    "quantity": 4000
  },
  {
    "productId": "78658",
    "quantity": 4000
  },
  {
    "productId": "1241993",
    "quantity": 4000
  },
  {
    "productId": "1208259",
    "quantity": 8510
  },
  {
    "productId": "1249543",
    "quantity": 70000
  },
  {
    "productId": "1249596",
    "quantity": 14000
  },
  {
    "productId": "80912",
    "quantity": 12000
  },
  {
    "productId": "1012298",
    "quantity": 4000
  },
  {
    "productId": "1089491",
    "quantity": 4000
  },
  {
    "productId": "1125442",
    "quantity": 4000
  },
  {
    "productId": "1206683",
    "quantity": 8000
  },
  {
    "productId": "63676",
    "quantity": 6000
  },
  {
    "productId": "75432",
    "quantity": 10000
  },
  {
    "productId": "77656",
    "quantity": 6000
  },
  {
    "productId": "81019",
    "quantity": 8000
  },
  {
    "productId": "1007369",
    "quantity": 8000
  },
  {
    "productId": "1039988",
    "quantity": 4000
  },
  {
    "productId": "1088880",
    "quantity": 4000
  },
  {
    "productId": "1090502",
    "quantity": 30000
  },
  {
    "productId": "1114868",
    "quantity": 8000
  },
  {
    "productId": "1121699",
    "quantity": 20000
  },
  {
    "productId": "1124421",
    "quantity": 4000
  },
  {
    "productId": "1129939",
    "quantity": 4000
  },
  {
    "productId": "1132556",
    "quantity": 20000
  },
  {
    "productId": "1144084",
    "quantity": 4000
  },
  {
    "productId": "1174528",
    "quantity": 4000
  },
  {
    "productId": "1214304",
    "quantity": 4000
  },
  {
    "productId": "1221173",
    "quantity": 8000
  },
  {
    "productId": "1223058",
    "quantity": 10000
  },
  {
    "productId": "1226391",
    "quantity": 4000
  },
  {
    "productId": "1226862",
    "quantity": 4000
  },
  {
    "productId": "1230622",
    "quantity": 26000
  },
  {
    "productId": "1244055",
    "quantity": 40000
  },
  {
    "productId": "1252921",
    "quantity": 4000
  },
  {
    "productId": "1256900",
    "quantity": 8000
  },
  {
    "productId": "1259412",
    "quantity": 8000
  },
  {
    "productId": "63675",
    "quantity": 8000
  },
  {
    "productId": "76186",
    "quantity": 10000
  },
  {
    "productId": "81422",
    "quantity": 8000
  },
  {
    "productId": "1039986",
    "quantity": 10000
  },
  {
    "productId": "1090492",
    "quantity": 10000
  },
  {
    "productId": "1119954",
    "quantity": 4000
  },
  {
    "productId": "1121695",
    "quantity": 20000
  },
  {
    "productId": "1127583",
    "quantity": 12000
  },
  {
    "productId": "1222691",
    "quantity": 8000
  },
  {
    "productId": "1226861",
    "quantity": 8000
  },
  {
    "productId": "1229994",
    "quantity": 10000
  },
  {
    "productId": "1257390",
    "quantity": 4000
  },
  {
    "productId": "1191907",
    "quantity": 4000
  },
  {
    "productId": "1106955",
    "quantity": 4000
  },
  {
    "productId": "1118986",
    "quantity": 8000
  },
  {
    "productId": "1212018",
    "quantity": 2000
  },
  {
    "productId": "1018293",
    "quantity": 4000
  },
  {
    "productId": "1046533",
    "quantity": 4000
  },
  {
    "productId": "1060495",
    "quantity": 8000
  },
  {
    "productId": "1084704",
    "quantity": 4000
  },
  {
    "productId": "1106953",
    "quantity": 4000
  },
  {
    "productId": "1139903",
    "quantity": 16000
  },
  {
    "productId": "1189957",
    "quantity": 8000
  },
  {
    "productId": "1001035",
    "quantity": 6000
  },
  {
    "productId": "1031960",
    "quantity": 4000
  },
  {
    "productId": "1146936",
    "quantity": 4000
  },
  {
    "productId": "1250213",
    "quantity": 6000
  },
  {
    "productId": "1149932",
    "quantity": 4000
  },
  {
    "productId": "1149933",
    "quantity": 6000
  },
  {
    "productId": "1151675",
    "quantity": 4000
  },
  {
    "productId": "1155387",
    "quantity": 4000
  },
  {
    "productId": "1158106",
    "quantity": 4000
  },
  {
    "productId": "1226199",
    "quantity": 4000
  },
  {
    "productId": "1251234",
    "quantity": 6000
  },
  {
    "productId": "1149925",
    "quantity": 8000
  },
  {
    "productId": "1149926",
    "quantity": 12000
  },
  {
    "productId": "1149927",
    "quantity": 8000
  },
  {
    "productId": "1149928",
    "quantity": 8000
  },
  {
    "productId": "1149929",
    "quantity": 4000
  },
  {
    "productId": "1149930",
    "quantity": 10000
  },
  {
    "productId": "1149931",
    "quantity": 4000
  },
  {
    "productId": "1154393",
    "quantity": 4000
  },
  {
    "productId": "1162327",
    "quantity": 8000
  },
  {
    "productId": "1163041",
    "quantity": 4000
  },
  {
    "productId": "1164483",
    "quantity": 10000
  },
  {
    "productId": "1164796",
    "quantity": 12000
  },
  {
    "productId": "1164798",
    "quantity": 6000
  },
  {
    "productId": "1166010",
    "quantity": 20000
  },
  {
    "productId": "1166319",
    "quantity": 4000
  },
  {
    "productId": "1197305",
    "quantity": 4000
  },
  {
    "productId": "1231463",
    "quantity": 4000
  },
  {
    "productId": "1149923",
    "quantity": 8000
  },
  {
    "productId": "1149924",
    "quantity": 4000
  },
  {
    "productId": "1151684",
    "quantity": 8000
  },
  {
    "productId": "1158413",
    "quantity": 4000
  },
  {
    "productId": "1163052",
    "quantity": 4000
  },
  {
    "productId": "1163055",
    "quantity": 8000
  },
  {
    "productId": "1164799",
    "quantity": 6000
  },
  {
    "productId": "1169744",
    "quantity": 10000
  },
  {
    "productId": "1170638",
    "quantity": 910
  },
  {
    "productId": "1222876",
    "quantity": 1200
  },
  {
    "productId": "1219516",
    "quantity": 800
  },
  {
    "productId": "1252885",
    "quantity": 4000
  },
  {
    "productId": "1219517",
    "quantity": 800
  },
  {
    "productId": "1167146",
    "quantity": 600
  },
  {
    "productId": "1020438",
    "quantity": 900
  },
  {
    "productId": "1132090",
    "quantity": 300
  },
  {
    "productId": "1167149",
    "quantity": 600
  },
  {
    "productId": "1155931",
    "quantity": 300
  },
  {
    "productId": "1246138",
    "quantity": 600
  },
  {
    "productId": "1007250",
    "quantity": 300
  },
  {
    "productId": "57354",
    "quantity": 2100
  },
  {
    "productId": "1235632",
    "quantity": 1200
  },
  {
    "productId": "1212148",
    "quantity": 600
  },
  {
    "productId": "1246748",
    "quantity": 2700
  },
  {
    "productId": "1235509",
    "quantity": 2100
  },
  {
    "productId": "1166883",
    "quantity": 900
  },
  {
    "productId": "1212754",
    "quantity": 4000
  },
  {
    "productId": "1243189",
    "quantity": 300
  },
  {
    "productId": "1227497",
    "quantity": 1
  },
  {
    "productId": "1227498",
    "quantity": 1
  },
  {
    "productId": "1214034",
    "quantity": 600
  },
  {
    "productId": "1214371",
    "quantity": 1100
  },
  {
    "productId": "1194468",
    "quantity": 50
  },
  {
    "productId": "1055429",
    "quantity": 1000
  },
  {
    "productId": "1233558",
    "quantity": 100
  },
  {
    "productId": "1191210",
    "quantity": 3100
  },
  {
    "productId": "1261205",
    "quantity": 600
  },
  {
    "productId": "1016982",
    "quantity": 18750
  },
  {
    "productId": "1200722",
    "quantity": 20
  },
  {
    "productId": "1232843",
    "quantity": 1052
  },
  {
    "productId": "1238087",
    "quantity": 2191
  },
  {
    "productId": "1240553",
    "quantity": 978
  },
  {
    "productId": "1241076",
    "quantity": 600
  },
  {
    "productId": "1241079",
    "quantity": 2800
  },
  {
    "productId": "1260843",
    "quantity": 2000
  },
  {
    "productId": "1261047",
    "quantity": 3200
  },
  {
    "productId": "1222278",
    "quantity": 400
  },
  {
    "productId": "1258049",
    "quantity": 1100
  },
  {
    "productId": "1233867",
    "quantity": 200
  },
  {
    "productId": "1028119",
    "quantity": 100
  },
  {
    "productId": "1258004",
    "quantity": 1100
  },
  {
    "productId": "1212145",
    "quantity": 400
  },
  {
    "productId": "1258070",
    "quantity": 200
  },
  {
    "productId": "1213429",
    "quantity": 150
  },
  {
    "productId": "1213464",
    "quantity": 150
  },
  {
    "productId": "1213463",
    "quantity": 150
  },
  {
    "productId": "1213434",
    "quantity": 150
  },
  {
    "productId": "1213433",
    "quantity": 150
  },
  {
    "productId": "1213431",
    "quantity": 150
  },
  {
    "productId": "1215985",
    "quantity": 300
  },
  {
    "productId": "1217642",
    "quantity": 650
  },
  {
    "productId": "1220111",
    "quantity": 250
  },
  {
    "productId": "1226944",
    "quantity": 100
  },
  {
    "productId": "1227303",
    "quantity": 200
  },
  {
    "productId": "1232193",
    "quantity": 2100
  },
  {
    "productId": "1217405",
    "quantity": 300
  },
  {
    "productId": "1195368",
    "quantity": 3000
  },
  {
    "productId": "1258919",
    "quantity": 800
  },
  {
    "productId": "1258918",
    "quantity": 400
  },
  {
    "productId": "1260946",
    "quantity": 300
  },
  {
    "productId": "1234072",
    "quantity": 100
  },
  {
    "productId": "1217992",
    "quantity": 1812
  },
  {
    "productId": "1217991",
    "quantity": 4026
  },
  {
    "productId": "1233233",
    "quantity": 1812
  },
  {
    "productId": "1234076",
    "quantity": 100
  },
  {
    "productId": "1216571",
    "quantity": 2700
  },
  {
    "productId": "1219883",
    "quantity": 2720
  },
  {
    "productId": "1080058",
    "quantity": 200
  },
  {
    "productId": "1218219",
    "quantity": 850
  },
  {
    "productId": "1216574",
    "quantity": 1000
  },
  {
    "productId": "1213711",
    "quantity": 620
  },
  {
    "productId": "1220982",
    "quantity": 650
  },
  {
    "productId": "1219869",
    "quantity": 450
  },
  {
    "productId": "1226856",
    "quantity": 400
  },
  {
    "productId": "1159781",
    "quantity": 100
  },
  {
    "productId": "1034118",
    "quantity": 200
  },
  {
    "productId": "1255943",
    "quantity": 50
  },
  {
    "productId": "1243876",
    "quantity": 1200
  },
  {
    "productId": "1204167",
    "quantity": 100
  },
  {
    "productId": "1080057",
    "quantity": 200
  },
  {
    "productId": "1037934",
    "quantity": 200
  },
  {
    "productId": "1222115",
    "quantity": 100
  },
  {
    "productId": "1217751",
    "quantity": 150
  },
  {
    "productId": "1225010",
    "quantity": 100
  },
  {
    "productId": "1037927",
    "quantity": 200
  },
  {
    "productId": "1028247",
    "quantity": 200
  },
  {
    "productId": "1217643",
    "quantity": 200
  },
  {
    "productId": "1228239",
    "quantity": 100
  },
  {
    "productId": "1227108",
    "quantity": 100
  },
  {
    "productId": "1033117",
    "quantity": 300
  },
  {
    "productId": "1236451",
    "quantity": 2195
  },
  {
    "productId": "1238765",
    "quantity": 100
  },
  {
    "productId": "1037935",
    "quantity": 300
  },
  {
    "productId": "1034119",
    "quantity": 200
  },
  {
    "productId": "1032950",
    "quantity": 100
  },
  {
    "productId": "1032949",
    "quantity": 300
  },
  {
    "productId": "1227164",
    "quantity": 200
  },
  {
    "productId": "1096305",
    "quantity": 100
  },
  {
    "productId": "1149609",
    "quantity": 100
  },
  {
    "productId": "1240058",
    "quantity": 200
  },
  {
    "productId": "1246063",
    "quantity": 200
  },
  {
    "productId": "1251123",
    "quantity": 100
  },
  {
    "productId": "1250387",
    "quantity": 100
  },
  {
    "productId": "1192710",
    "quantity": 200
  },
  {
    "productId": "1225009",
    "quantity": 100
  },
  {
    "productId": "1206754",
    "quantity": 100
  },
  {
    "productId": "1251284",
    "quantity": 200
  },
  {
    "productId": "1238247",
    "quantity": 250
  },
  {
    "productId": "1195366",
    "quantity": 200
  },
  {
    "productId": "1253318",
    "quantity": 1296
  },
  {
    "productId": "1037937",
    "quantity": 200
  },
  {
    "productId": "1032951",
    "quantity": 400
  },
  {
    "productId": "1034120",
    "quantity": 100
  },
  {
    "productId": "1037926",
    "quantity": 100
  },
  {
    "productId": "1028246",
    "quantity": 200
  },
  {
    "productId": "1167270",
    "quantity": 100
  },
  {
    "productId": "1240055",
    "quantity": 100
  },
  {
    "productId": "1037939",
    "quantity": 100
  },
  {
    "productId": "1096306",
    "quantity": 100
  },
  {
    "productId": "1206752",
    "quantity": 500
  },
  {
    "productId": "1259965",
    "quantity": 2050
  },
  {
    "productId": "1225457",
    "quantity": 490
  },
  {
    "productId": "1226855",
    "quantity": 350
  },
  {
    "productId": "1080059",
    "quantity": 100
  },
  {
    "productId": "1080060",
    "quantity": 100
  },
  {
    "productId": "1229383",
    "quantity": 60
  },
  {
    "productId": "1244704",
    "quantity": 700
  },
  {
    "productId": "1212143",
    "quantity": 100
  },
  {
    "productId": "1216570",
    "quantity": 2700
  },
  {
    "productId": "1029609",
    "quantity": 400
  },
  {
    "productId": "1167279",
    "quantity": 500
  },
  {
    "productId": "1024473",
    "quantity": 200
  },
  {
    "productId": "1188556",
    "quantity": 100
  },
  {
    "productId": "1222582",
    "quantity": 200
  },
  {
    "productId": "1024475",
    "quantity": 200
  },
  {
    "productId": "1224191",
    "quantity": 3000
  },
  {
    "productId": "1100236",
    "quantity": 350
  },
  {
    "productId": "1028123",
    "quantity": 200
  },
  {
    "productId": "1088271",
    "quantity": 200
  },
  {
    "productId": "1037520",
    "quantity": 300
  },
  {
    "productId": "1193795",
    "quantity": 1000
  },
  {
    "productId": "1110086",
    "quantity": 100
  },
  {
    "productId": "1080750",
    "quantity": 500
  },
  {
    "productId": "1233127",
    "quantity": 100
  },
  {
    "productId": "1212345",
    "quantity": 100
  },
  {
    "productId": "1193813",
    "quantity": 500
  },
  {
    "productId": "1095151",
    "quantity": 200
  },
  {
    "productId": "1195365",
    "quantity": 200
  },
  {
    "productId": "1068809",
    "quantity": 200
  },
  {
    "productId": "1087583",
    "quantity": 500
  },
  {
    "productId": "1028137",
    "quantity": 100
  },
  {
    "productId": "1089948",
    "quantity": 100
  },
  {
    "productId": "1024474",
    "quantity": 200
  },
  {
    "productId": "1222502",
    "quantity": 100
  },
  {
    "productId": "1222500",
    "quantity": 150
  },
  {
    "productId": "1175838",
    "quantity": 100
  },
  {
    "productId": "1230813",
    "quantity": 1250
  },
  {
    "productId": "1139843",
    "quantity": 200
  },
  {
    "productId": "1243714",
    "quantity": 600
  },
  {
    "productId": "1243715",
    "quantity": 100
  },
  {
    "productId": "1244594",
    "quantity": 300
  },
  {
    "productId": "1243716",
    "quantity": 600
  },
  {
    "productId": "1243460",
    "quantity": 350
  },
  {
    "productId": "1240056",
    "quantity": 200
  },
  {
    "productId": "1183949",
    "quantity": 600
  },
  {
    "productId": "1183946",
    "quantity": 200
  },
  {
    "productId": "1239546",
    "quantity": 3000
  },
  {
    "productId": "1183948",
    "quantity": 200
  },
  {
    "productId": "1180696",
    "quantity": 200
  },
  {
    "productId": "1173852",
    "quantity": 500
  },
  {
    "productId": "1211838",
    "quantity": 200
  },
  {
    "productId": "1098698",
    "quantity": 500
  },
  {
    "productId": "1244577",
    "quantity": 200
  },
  {
    "productId": "1099720",
    "quantity": 500
  },
  {
    "productId": "1247193",
    "quantity": 3600
  },
  {
    "productId": "1240053",
    "quantity": 200
  },
  {
    "productId": "1220586",
    "quantity": 100
  },
  {
    "productId": "1170330",
    "quantity": 1000
  },
  {
    "productId": "1183945",
    "quantity": 700
  },
  {
    "productId": "1109366",
    "quantity": 500
  },
  {
    "productId": "1087919",
    "quantity": 300
  },
  {
    "productId": "1191418",
    "quantity": 200
  },
  {
    "productId": "80535",
    "quantity": 500
  },
  {
    "productId": "1249348",
    "quantity": 1200
  },
  {
    "productId": "1183947",
    "quantity": 200
  },
  {
    "productId": "1183944",
    "quantity": 150
  },
  {
    "productId": "1225613",
    "quantity": 200
  },
  {
    "productId": "1252589",
    "quantity": 100
  },
  {
    "productId": "1212344",
    "quantity": 3600
  },
  {
    "productId": "1252614",
    "quantity": 300
  },
  {
    "productId": "1252746",
    "quantity": 150
  },
  {
    "productId": "1200558",
    "quantity": 300
  },
  {
    "productId": "1253485",
    "quantity": 400
  },
  {
    "productId": "79865",
    "quantity": 400
  },
  {
    "productId": "1256031",
    "quantity": 300
  },
  {
    "productId": "1086772",
    "quantity": 400
  },
  {
    "productId": "1244607",
    "quantity": 600
  },
  {
    "productId": "1180700",
    "quantity": 200
  },
  {
    "productId": "1259861",
    "quantity": 1000
  },
  {
    "productId": "1244581",
    "quantity": 200
  },
  {
    "productId": "1087585",
    "quantity": 300
  },
  {
    "productId": "1259964",
    "quantity": 2050
  },
  {
    "productId": "1260498",
    "quantity": 300
  },
  {
    "productId": "1261483",
    "quantity": 700
  },
  {
    "productId": "1240125",
    "quantity": 3200
  },
  {
    "productId": "1028118",
    "quantity": 200
  },
  {
    "productId": "1222501",
    "quantity": 150
  },
  {
    "productId": "1191417",
    "quantity": 200
  },
  {
    "productId": "1080753",
    "quantity": 500
  },
  {
    "productId": "1234215",
    "quantity": 200
  },
  {
    "productId": "1239547",
    "quantity": 3000
  },
  {
    "productId": "1098697",
    "quantity": 500
  },
  {
    "productId": "1099721",
    "quantity": 500
  },
  {
    "productId": "1170333",
    "quantity": 1000
  },
  {
    "productId": "80539",
    "quantity": 500
  },
  {
    "productId": "80536",
    "quantity": 500
  },
  {
    "productId": "1197414",
    "quantity": 200
  },
  {
    "productId": "1179909",
    "quantity": 300
  },
  {
    "productId": "1212351",
    "quantity": 100
  },
  {
    "productId": "1236917",
    "quantity": 300
  },
  {
    "productId": "1212349",
    "quantity": 450
  },
  {
    "productId": "1080063",
    "quantity": 200
  },
  {
    "productId": "1080064",
    "quantity": 200
  },
  {
    "productId": "1178867",
    "quantity": 100
  },
  {
    "productId": "1178866",
    "quantity": 100
  },
  {
    "productId": "1178868",
    "quantity": 100
  },
  {
    "productId": "1217753",
    "quantity": 310
  },
  {
    "productId": "1080065",
    "quantity": 400
  },
  {
    "productId": "1198312",
    "quantity": 300
  },
  {
    "productId": "1236383",
    "quantity": 700
  },
  {
    "productId": "1244584",
    "quantity": 300
  },
  {
    "productId": "1198315",
    "quantity": 300
  },
  {
    "productId": "1250904",
    "quantity": 200
  },
  {
    "productId": "1244578",
    "quantity": 200
  },
  {
    "productId": "1247513",
    "quantity": 2100
  },
  {
    "productId": "1244579",
    "quantity": 400
  },
  {
    "productId": "1080066",
    "quantity": 300
  },
  {
    "productId": "1236385",
    "quantity": 700
  },
  {
    "productId": "1022593",
    "quantity": 650
  },
  {
    "productId": "1245338",
    "quantity": 540
  },
  {
    "productId": "1198700",
    "quantity": 300
  },
  {
    "productId": "1128145",
    "quantity": 30
  },
  {
    "productId": "1129866",
    "quantity": 24
  },
  {
    "productId": "1131770",
    "quantity": 18
  },
  {
    "productId": "1133086",
    "quantity": 18
  },
  {
    "productId": "1080067",
    "quantity": 400
  },
  {
    "productId": "1134507",
    "quantity": 18
  },
  {
    "productId": "1135927",
    "quantity": 12
  },
  {
    "productId": "1137938",
    "quantity": 12
  },
  {
    "productId": "1198316",
    "quantity": 400
  },
  {
    "productId": "1139112",
    "quantity": 12
  },
  {
    "productId": "1140586",
    "quantity": 12
  },
  {
    "productId": "1142056",
    "quantity": 12
  },
  {
    "productId": "1184643",
    "quantity": 200
  },
  {
    "productId": "1201496",
    "quantity": 400
  },
  {
    "productId": "1244585",
    "quantity": 500
  },
  {
    "productId": "1080068",
    "quantity": 400
  },
  {
    "productId": "1184642",
    "quantity": 200
  },
  {
    "productId": "1201497",
    "quantity": 400
  },
  {
    "productId": "1198698",
    "quantity": 400
  },
  {
    "productId": "1189312",
    "quantity": 100
  },
  {
    "productId": "1195653",
    "quantity": 100
  },
  {
    "productId": "1116472",
    "quantity": 100
  },
  {
    "productId": "1163083",
    "quantity": 150
  },
  {
    "productId": "1228161",
    "quantity": 100
  },
  {
    "productId": "1229058",
    "quantity": 200
  },
  {
    "productId": "1102808",
    "quantity": 150
  },
  {
    "productId": "1040424",
    "quantity": 1000
  },
  {
    "productId": "1242848",
    "quantity": 100
  },
  {
    "productId": "1212993",
    "quantity": 200
  },
  {
    "productId": "1222498",
    "quantity": 100
  },
  {
    "productId": "1231018",
    "quantity": 300
  },
  {
    "productId": "1244598",
    "quantity": 300
  },
  {
    "productId": "1212346",
    "quantity": 200
  },
  {
    "productId": "1080069",
    "quantity": 100
  },
  {
    "productId": "1240057",
    "quantity": 100
  },
  {
    "productId": "1240054",
    "quantity": 100
  },
  {
    "productId": "1167265",
    "quantity": 200
  },
  {
    "productId": "1180701",
    "quantity": 200
  },
  {
    "productId": "1245344",
    "quantity": 1000
  },
  {
    "productId": "1245346",
    "quantity": 300
  },
  {
    "productId": "1245345",
    "quantity": 300
  },
  {
    "productId": "1245342",
    "quantity": 1000
  },
  {
    "productId": "1246064",
    "quantity": 300
  },
  {
    "productId": "1179002",
    "quantity": 100
  },
  {
    "productId": "1040428",
    "quantity": 300
  },
  {
    "productId": "1201498",
    "quantity": 200
  },
  {
    "productId": "1040422",
    "quantity": 200
  },
  {
    "productId": "1040427",
    "quantity": 500
  },
  {
    "productId": "1250469",
    "quantity": 100
  },
  {
    "productId": "1167274",
    "quantity": 1300
  },
  {
    "productId": "1227420",
    "quantity": 100
  },
  {
    "productId": "1200559",
    "quantity": 200
  },
  {
    "productId": "1175834",
    "quantity": 400
  },
  {
    "productId": "1245349",
    "quantity": 100
  },
  {
    "productId": "1021313",
    "quantity": 200
  },
  {
    "productId": "1212343",
    "quantity": 400
  },
  {
    "productId": "1243895",
    "quantity": 100
  },
  {
    "productId": "1180697",
    "quantity": 300
  },
  {
    "productId": "1116470",
    "quantity": 100
  },
  {
    "productId": "1163084",
    "quantity": 150
  },
  {
    "productId": "1228163",
    "quantity": 100
  },
  {
    "productId": "1229059",
    "quantity": 200
  },
  {
    "productId": "1102809",
    "quantity": 150
  },
  {
    "productId": "1168363",
    "quantity": 200
  },
  {
    "productId": "1242849",
    "quantity": 100
  },
  {
    "productId": "1195655",
    "quantity": 100
  },
  {
    "productId": "1231019",
    "quantity": 300
  },
  {
    "productId": "1080070",
    "quantity": 100
  },
  {
    "productId": "1040413",
    "quantity": 300
  },
  {
    "productId": "1201499",
    "quantity": 200
  },
  {
    "productId": "1040410",
    "quantity": 1000
  },
  {
    "productId": "1022594",
    "quantity": 1300
  },
  {
    "productId": "1022595",
    "quantity": 400
  },
  {
    "productId": "1168071",
    "quantity": 1300
  },
  {
    "productId": "1175836",
    "quantity": 200
  },
  {
    "productId": "1021315",
    "quantity": 200
  },
  {
    "productId": "1222499",
    "quantity": 400
  },
  {
    "productId": "1212352",
    "quantity": 100
  },
  {
    "productId": "1212348",
    "quantity": 100
  },
  {
    "productId": "1232572",
    "quantity": 1100
  },
  {
    "productId": "1232571",
    "quantity": 1100
  },
  {
    "productId": "1225594",
    "quantity": 1100
  },
  {
    "productId": "1260040",
    "quantity": 2000
  },
  {
    "productId": "1022509",
    "quantity": 630
  },
  {
    "productId": "1233884",
    "quantity": 630
  },
  {
    "productId": "1022510",
    "quantity": 2520
  }
];

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
