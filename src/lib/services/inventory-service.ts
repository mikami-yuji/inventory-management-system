/**
 * 在庫サービス
 * 商品・在庫・入荷予定に関するビジネスロジック
 */

import { dataSource } from './data-source';
import type { Product, Inventory, IncomingStock, StockHistory } from '@/types';

// ロール袋のピッチ計算 (mm)
export const getPitch = (weight: number): number => {
    if (weight >= 10) return 570;
    if (weight >= 5) return 470;
    if (weight >= 3) return 400;
    if (weight >= 2) return 350;
    return 250; // 1kg以下
};

// ロール袋かどうか判定
export const isRollBag = (shape: string): boolean => {
    if (!shape) return false;
    return shape.includes('RZ') || shape.includes('RA') || shape.includes('RＺ') || shape.includes('RＡ');
};

// 1ロールあたりの長さ (mm) - 300m
const ROLL_LENGTH_MM = 300 * 1000;

// 1ロールあたりの概算枚数を計算
export const getApproxBagCount = (weight: number): number => {
    const pitch = getPitch(weight);
    return Math.floor(ROLL_LENGTH_MM / pitch);
};

/**
 * 在庫サービス
 */
export const inventoryService = {
    /**
     * 商品一覧を取得
     */
    getProducts: (): Product[] => {
        return dataSource.getProducts();
    },

    /**
     * カテゴリで絞り込んだ商品一覧を取得
     */
    getProductsByCategory: (category: string | 'all'): Product[] => {
        const products = dataSource.getProducts();
        if (category === 'all') return products;
        return products.filter(p => p.category === category);
    },

    /**
     * 商品IDで商品を取得
     */
    getProductById: (productId: string): Product | undefined => {
        return dataSource.getProducts().find(p => p.id === productId);
    },

    /**
     * 商品名を取得
     */
    getProductName: (productId: string): string => {
        const product = dataSource.getProducts().find(p => p.id === productId);
        return product?.name || productId;
    },

    /**
     * 在庫一覧を取得
     */
    getInventory: (): Inventory[] => {
        return dataSource.getInventory();
    },

    /**
     * 特定商品の在庫数を取得
     */
    getInventoryCount: (productId: string): number => {
        const inventory = dataSource.getInventory().find(i => i.productId === productId);
        return inventory?.quantity || 0;
    },

    /**
     * 入荷予定一覧を取得
     */
    getIncomingStock: (): IncomingStock[] => {
        return dataSource.getIncomingStock();
    },

    /**
     * 特定商品の入荷情報を取得
     */
    getIncomingInfo: (productId: string): string | null => {
        const incoming = dataSource.getIncomingStock().filter(i => i.productId === productId);
        if (incoming.length === 0) return null;
        // 直近の入荷を表示
        const next = incoming[0];
        return `次回: ${next.expectedDate}に${next.quantity}個`;
    },

    /**
     * 特定商品の入荷予定一覧を取得
     */
    getIncomingStockByProduct: (productId: string): IncomingStock[] => {
        return dataSource.getIncomingStock().filter(i => i.productId === productId);
    },

    /**
     * 在庫数を更新
     * @param productId 商品ID
     * @param newQuantity 新しい在庫数
     * @param type 更新タイプ ('check' | 'incoming' | 'adjustment' | 'order')
     * @param note 備考
     */
    updateStock: (productId: string, newQuantity: number, type: StockHistory['type'], note?: string): void => {
        const inventoryList = dataSource.getInventory();
        const targetIndex = inventoryList.findIndex(i => i.productId === productId);

        // 現在の在庫数を取得（存在しない場合は0）
        const currentQty = targetIndex >= 0 ? inventoryList[targetIndex].quantity : 0;

        // 変動数を計算
        const changeAmount = newQuantity - currentQty;

        // 在庫データを更新
        if (targetIndex >= 0) {
            inventoryList[targetIndex].quantity = newQuantity;
            inventoryList[targetIndex].updatedAt = new Date().toISOString();
        } else {
            // 新規在庫データ作成
            inventoryList.push({
                productId,
                quantity: newQuantity,
                updatedAt: new Date().toISOString()
            });
        }

        // 履歴を記録
        // 循環参照を避けるため、動的インポートまたは直接データソース操作... 
        // ここではサービス層の結合度を下げるため、在庫サービスが履歴作成の責任を持つ形にします
        // ただしstockHistoryServiceを使いたいのでインポートが必要ですが、循環参照の恐れあり。
        // 一旦data-source経由でpushするか、stockHistoryServiceの関数をここで使うか。
        // stockHistoryService.addStockHistory を使いたい。
        // ファイル上部で import { stockHistoryService } from './stock-history-service'; を追加する必要があります。

        // 注: このファイル内での変更では import を追加できないため、
        // 呼び出し元でやるか、またはここで data-source を直接操作して履歴を追加します。
        // 整合性を保つため data-source を操作します。

        dataSource.getStockHistory().push({
            id: Math.random().toString(36).substr(2, 9),
            productId,
            date: new Date().toISOString(),
            quantity: newQuantity, // その時点の在庫数
            type,
            changeAmount,
            note
        });
    },
};
