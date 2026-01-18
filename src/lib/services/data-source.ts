/**
 * データソース抽象化モジュール
 * 現在はモックデータを使用、将来的にAPIに切り替え可能
 */

import {
    MOCK_USERS,
    MOCK_PRODUCTS,
    MOCK_INVENTORY,
    MOCK_INCOMING_STOCK,
    MOCK_ORDERS,
    MOCK_EVENTS,
    MOCK_EVENT_STOCK,
    MOCK_DATA
} from "@/lib/mock-data";

import type {
    Product,
    Inventory,
    IncomingStock,
    Order,
    SpecialEvent,
    EventStock,
    User,
    StockHistory,
} from '@/types';

// データソースタイプ
export type DataSourceType = 'mock' | 'api';

// 現在使用中のデータソース
const CURRENT_DATA_SOURCE: DataSourceType = 'mock';

/**
 * データソースを取得
 * 将来的にAPIに切り替える際はここを変更
 */
export const getDataSource = (): DataSourceType => {
    return CURRENT_DATA_SOURCE;
};

// 各データへのアクセサ
export const dataSource = {
    // 商品データ
    getProducts: (): Product[] => {
        return MOCK_PRODUCTS;
    },

    // 在庫データ
    getInventory: (): Inventory[] => {
        return MOCK_INVENTORY;
    },

    // 入荷予定データ
    getIncomingStock: (): IncomingStock[] => {
        return MOCK_INCOMING_STOCK;
    },

    // 発注データ
    getOrders: (): Order[] => {
        return MOCK_ORDERS;
    },

    // イベントデータ
    getEvents: (): SpecialEvent[] => {
        return MOCK_EVENTS;
    },

    // イベント在庫データ
    getEventStock: (): EventStock[] => {
        return MOCK_EVENT_STOCK;
    },

    // 在庫履歴データ
    getStockHistory: (): StockHistory[] => {
        return MOCK_DATA.stockHistory;
    },

    // ユーザーデータ
    getUsers: (): User[] => {
        return MOCK_USERS;
    },
};
