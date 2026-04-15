// ユーザーロール
export type UserRole = 'admin' | 'client' | 'blocked';

// ユーザー情報
export type User = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  receivesOrderEmails: boolean;
};

// 商品カテゴリ
export type ProductCategory = 'bag' | 'sticker' | 'other' | 'new_rice';

// 商品ステータス
export type ProductStatus = 'active' | 'inactive' | 'plate_removal_scheduled' | 'plate_removed' | 'direct_delivery' | 'on_sale_break' | 'discontinued' | 'spot' | 'wip_check';

// 商品マスタ
export type Product = {
  id: string;
  name: string;
  sku: string; // 商品コード (現在は受注№(Col A)として使用)
  productCode?: string; // Excel Column D (本来の商品コード)
  janCode?: string; // JANコード
  weight?: number; // 重量 (kg) (例: 5)
  shape?: string; // 形状 (例: RZ)
  material?: string; // 材質名称 (例: 【ソフクラ】窓有り)
  unitPrice: number; // 単価
  printingCost: number; // 印刷代
  category: ProductCategory; // 商品カテゴリ
  imageUrl?: string;
  description?: string;
  status: ProductStatus;
  minStockAlert?: number; // 在庫アラート閾値
  // 商品名構造化フィールド
  prefix?: string; // 備考1（先頭注記）例: （ロゴ無）、【使用禁止】
  origin?: string; // 産地 例: JA京都やましろ、魚沼
  variety?: string; // 品種 例: ひのひかり、コシヒカリ
  suffix?: string; // 備考2（末尾補足）例: RASP雲竜柄無地
  // 色数フィールド
  frontColorCount?: number; // 表色数
  backColorCount?: number; // 裏色数
  totalColorCount?: number; // 総色数
  productType?: string; // Excel Column Type (種別) 例: 既製品, 別注
  supplierStock?: number; // メーカー在庫
  statusOverride?: 'normal' | 'low_stock' | 'out_of_stock'; // ステータス手動上書き
  supplierId?: string; // 仕入先ID
  supplierName?: string; // 仕入先名
  discontinuedDate?: string; // 落版日/廃盤日 (YYYY-MM-DD)
  metersPerRoll?: number; // 1巻あたりのメートル数 (300 or 400、デフォルト400)
  dailyShipmentRate?: number; // 1日あたりの通常出荷数
  productionLeadDays?: number; // 仕掛リードタイム（日数）
};

// 仕入先マスタ
export type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  note?: string;
  active: boolean;
};

// メーカー在庫ロット
export type SupplierStockLot = {
  id: string;
  productId: string;
  stockDate: string; // YYYY-MM-DD
  quantity: number;
  note?: string;
  createdAt: string;
};

// 在庫情報
export type Inventory = {
  productId: string;
  quantity: number; // 通常在庫（フリー在庫）
  updatedAt?: string;
};

// 入荷予定
export type IncomingStock = {
  id: string;
  productId: string;
  elementId?: string; // ユニークキー用
  expectedDate: string | null; // YYYY-MM-DD または null (納期確認中)
  shippedDate?: string; // 出荷日 (YYYY-MM-DD)
  quantity: number;
  note?: string;
};

// 特売イベントのステータス
export type SaleEventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

// 特売イベント商品
export type SaleEventItem = {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  plannedQuantity: number;
  allocatedQuantity: number;
  actualQuantity: number | null;
  currentStock: number;
  isProduced: boolean;
};

// 特売イベント本体
export type SaleEvent = {
  id: string;
  clientName: string;
  scheduleType: 'single' | 'monthly';
  dates: string[];
  status: SaleEventStatus;
  description: string | null;
  createdAt: string;
  items: SaleEventItem[];
};

// 新規イベント作成用の入力型
export type SaleEventInput = {
  clientName: string;
  scheduleType: 'single' | 'monthly';
  dates: string[];
  description?: string;
  items: Array<{ productId: string; quantity: number }>;
};

// 発注ステータス
export type OrderStatus = 'requested' | 'shipped' | 'cancelled';

// 発注タイプ
export type OrderType = 'standard' | 'special_event';

// 発注明細
export type OrderItem = {
  productId: string;
  quantity: number;
  // APIレスポンスで返される商品情報（joinによって付与される）
  productName?: string;
  sku?: string;
  weight?: number | null;
  shape?: string | null;
  category?: string;
  metersPerRoll?: number | null;
  unitPrice?: number;
  printingCost?: number;
};

// 発注
export type Order = {
  id: string;
  clientId: string;
  createdAt: string;
  status: OrderStatus;
  type: OrderType;
  items: OrderItem[];
  eventId?: string; // 特売発注の場合のイベントID
  shipmentSource?: 'inventory' | 'supplier' | 'wip' | 'wip-request'; // 出荷元
  deliveryName?: string;
  deliveryPostalCode?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  preferredShape?: string; // 希望形状（特記事項）
};

// 納品先住所
export type DeliveryAddress = {
  id: string;
  clientId: string;
  name: string;
  postalCode?: string;
  address: string;
  phone: string;
  isDefault: boolean;
  preferredShape?: 'RA' | 'RZ' | '単袋';
};

// 在庫履歴
export type StockHistory = {
  id: string;
  productId: string;
  date: string; // ISO string
  quantity: number; // その時点の在庫数
  type: 'check' | 'incoming' | 'adjustment' | 'order' | 'outgoing'; // 確認、入荷、調整、発注(出庫)、通常出庫
  changeAmount?: number; // 増減数 (checkの場合はnullも可だが、計算で使うなら算出しておく)
  note?: string;
};

// API レスポンス型
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};

// ページネーション型
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

// 仕掛中アイテムの型
export type WorkInProgress = {
  id: string;
  productId: string;
  quantity: number;
  startedAt: string;
  expectedCompletion: string | null;
  completedAt: string | null;
  note: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  termType: 'specific' | 'early' | 'mid' | 'late';
  confirmationStatus: 'unconfirmed' | 'confirmed' | 'scheduled' | 'shipping_arranged';
  createdAt: string;
};

// 仕掛中登録用の入力型
export type WIPInput = {
  productId: string;
  quantity: number;
  startedAt: string;
  expectedCompletion?: string;
  termType?: 'specific' | 'early' | 'mid' | 'late';
  note?: string;
};
