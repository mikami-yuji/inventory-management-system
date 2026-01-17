// 型定義をtypeに統一（interfaceからtypeへ変換）
export type UserRole = 'admin' | 'client'

export type User = {
  id: string
  name: string
  role: UserRole
  email: string
}

export type Product = {
  id: string
  name: string
  sku: string // 商品コード
  janCode?: string // JANコード
  weight?: number // 重量 (kg) (例: 5)
  shape?: string // 形状 (例: RZ)
  material?: string // 材質名称 (例: 【ソフクラ】窓有り)
  unitPrice: number // 単価
  printingCost: number // 印刷代
  category: 'bag' | 'sticker' | 'other' | 'new_rice' // 商品カテゴリ
  imageUrl?: string
  description?: string
  status: 'active' | 'inactive'
  minStockAlert?: number // 在庫アラート閾値
}

export type Inventory = {
  productId: string
  quantity: number // 通常在庫（フリー在庫）
  updatedAt?: string
}

export type IncomingStock = {
  id: string
  productId: string
  elementId?: string // ユニークキー用
  expectedDate: string // YYYY-MM-DD
  quantity: number
  note?: string
}

export type SpecialEvent = {
  id: string
  clientId: string // 特定のクライアント向け
  name: string
  startDate: string
  endDate: string
  status: 'planning' | 'active' | 'closed'
  description?: string
}

export type EventStock = {
  eventId: string
  productId: string
  allocatedQuantity: number // 当初確保した数量
  currentQuantity: number // 現在の残数
}

export type OrderStatus = 'requested' | 'shipped' | 'cancelled'
export type OrderType = 'standard' | 'special_event'

export type OrderItem = {
  productId: string
  quantity: number
}

export type Order = {
  id: string
  clientId: string
  createdAt: string
  status: OrderStatus
  type: OrderType
  items: OrderItem[]
  eventId?: string // 特売発注の場合のイベントID
}

// API レスポンス型
export type ApiResponse<T> = {
  data: T | null
  error: string | null
}

// ページネーション型
export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}
