// ユーザーロール
export type UserRole = 'admin' | 'client';

// ユーザー情報
export type User = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
};

// 商品カテゴリ
export type ProductCategory = 'bag' | 'sticker' | 'other' | 'new_rice';

// 商品ステータス
export type ProductStatus = 'active' | 'inactive';

// 商品マスタ
export type Product = {
  id: string;
  name: string;
  sku: string; // 商品コード
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
  expectedDate: string; // YYYY-MM-DD
  quantity: number;
  note?: string;
};

// イベントステータス
export type EventStatus = 'planning' | 'active' | 'closed';

// 特売イベント
export type SpecialEvent = {
  id: string;
  clientId: string; // 特定のクライアント向け
  name: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  description?: string;
};

// イベント在庫
export type EventStock = {
  eventId: string;
  productId: string;
  allocatedQuantity: number; // 当初確保した数量
  currentQuantity: number; // 現在の残数
};

// 発注ステータス
export type OrderStatus = 'requested' | 'shipped' | 'cancelled';

// 発注タイプ
export type OrderType = 'standard' | 'special_event';

// 発注明細
export type OrderItem = {
  productId: string;
  quantity: number;
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
};

// 在庫履歴
export type StockHistory = {
  id: string;
  productId: string;
  date: string; // ISO string
  quantity: number; // その時点の在庫数
  type: 'check' | 'incoming' | 'adjustment' | 'order'; // 確認、入荷、調整、発注(出庫)
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
