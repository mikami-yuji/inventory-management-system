/**
 * イベントサービス
 * 特売イベントに関するビジネスロジック
 */

import { dataSource } from './data-source';
import type { SpecialEvent, EventStock } from '@/types';

/**
 * イベントサービス
 */
export const eventService = {
    /**
     * イベント一覧を取得
     */
    getEvents: (): SpecialEvent[] => {
        return dataSource.getEvents();
    },

    /**
     * イベントIDでイベントを取得
     */
    getEventById: (eventId: string): SpecialEvent | undefined => {
        return dataSource.getEvents().find(e => e.id === eventId);
    },

    /**
     * クライアントIDでイベント一覧を取得
     */
    getEventsByClient: (clientId: string): SpecialEvent[] => {
        return dataSource.getEvents().filter(e => e.clientId === clientId);
    },

    /**
     * ステータスでイベント一覧を取得
     */
    getEventsByStatus: (status: SpecialEvent['status']): SpecialEvent[] => {
        return dataSource.getEvents().filter(e => e.status === status);
    },

    /**
     * イベント在庫一覧を取得
     */
    getEventStocks: (eventId: string): EventStock[] => {
        return dataSource.getEventStock().filter(es => es.eventId === eventId);
    },

    /**
     * 商品名を取得
     */
    getProductName: (productId: string): string => {
        const product = dataSource.getProducts().find(p => p.id === productId);
        return product?.name || productId;
    },

    /**
     * 通常在庫を取得
     */
    getStandardInventory: (productId: string): number => {
        const inventory = dataSource.getInventory().find(i => i.productId === productId);
        return inventory?.quantity || 0;
    },

    /**
     * 新規イベントを作成（モック）
     */
    createEvent: async (event: Omit<SpecialEvent, 'id'>): Promise<SpecialEvent> => {
        // モック実装: 1秒待機してダミーデータを返す
        await new Promise(resolve => setTimeout(resolve, 1000));

        const newEvent: SpecialEvent = {
            ...event,
            id: `event-${Date.now()}`,
        };

        console.log('Created event (mock):', newEvent);

        return newEvent;
    },
};
