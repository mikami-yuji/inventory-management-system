/**
 * 発注サービス
 * 発注に関するビジネスロジック
 */

import { dataSource } from './data-source';
import type { Order, OrderItem } from '@/types';

/**
 * 発注サービス
 */
export const orderService = {
    /**
     * 発注一覧を取得
     */
    getOrders: (): Order[] => {
        return dataSource.getOrders();
    },

    /**
     * 発注IDで発注を取得
     */
    getOrderById: (orderId: string): Order | undefined => {
        return dataSource.getOrders().find(o => o.id === orderId);
    },

    /**
     * クライアントIDで発注一覧を取得
     */
    getOrdersByClient: (clientId: string): Order[] => {
        return dataSource.getOrders().filter(o => o.clientId === clientId);
    },

    /**
     * 商品名を取得（在庫サービスから取得するのが本来だが、循環依存を避けるため独自実装）
     */
    getProductName: (productId: string): string => {
        const product = dataSource.getProducts().find(p => p.id === productId);
        return product?.name || productId;
    },

    /**
     * 新規発注を作成（モック）
     * 将来的にはAPIに送信
     */
    createOrder: async (order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> => {
        // モック実装: 1秒待機してダミーデータを返す
        await new Promise(resolve => setTimeout(resolve, 1000));

        const newOrder: Order = {
            ...order,
            id: `order-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };

        // 実際にはここでデータソースに追加する
        console.log('Created order (mock):', newOrder);

        return newOrder;
    },
};
