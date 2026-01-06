export type UserRole = 'admin' | 'client';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string; // 商品コード
  janCode?: string; // JANコード
  weight?: number; // 重量 (kg) (例: 5)
  shape?: string; // 形状 (例: RZ)
  material?: string; // 材質名称 (例: 【ソフクラ】窓有り)
  unitPrice: number; // 単価
  printingCost: number; // 印刷代
  category: 'bag' | 'sticker' | 'other' | 'new_rice'; // 商品カテゴリ
  imageUrl?: string;
  description?: string;
  status: 'active' | 'inactive';
}

export interface Inventory {
  productId: string;
  quantity: number; // 通常在庫（フリー在庫）
}

export interface IncomingStock {
  id: string;
  productId: string;
  elementId?: string; // ユニークキー用
  expectedDate: string; // YYYY-MM-DD
  quantity: number;
  note?: string;
}

export interface SpecialEvent {
  id: string;
  clientId: string; // 特定のクライアント向け
  name: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'closed';
  description?: string;
}

export interface EventStock {
  eventId: string;
  productId: string;
  allocatedQuantity: number; // 当初確保した数量
  currentQuantity: number; // 現在の残数
}

export type OrderStatus = 'requested' | 'shipped' | 'cancelled';
export type OrderType = 'standard' | 'special_event';

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  clientId: string;
  createdAt: string;
  status: OrderStatus;
  type: OrderType;
  items: OrderItem[];
  eventId?: string; // 特売発注の場合のイベントID
}
