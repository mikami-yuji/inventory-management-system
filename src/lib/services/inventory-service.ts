import { Product } from "@/types";

/**
 * 在庫サービス
 * 商品・在庫・入荷予定に関するビジネスロジック
 */

// ロール袋のピッチ計算 (mm)
// 重量ごとの正確なピッチ表
export const getPitch = (weight: number): number => {
    if (weight >= 10) return 570;
    if (weight >= 8) return 530;
    if (weight >= 5) return 470;
    if (weight >= 4) return 450;
    if (weight >= 3) return 400;
    if (weight >= 2) return 350;
    if (weight >= 1.4) return 320; // 1.4kg, 1.5kg
    return 280; // 1kg
};

// ロール袋（原反/フィルム巻）かどうか判定
export const isRollBag = (shape: string, category?: string): boolean => {
    if (!shape) return false;
    
    // 米袋や通常の袋カテゴリの場合は、形状に関わらず「枚」単位（ロールではない）
    if (category === 'new_rice' || category === 'bag') return false;

    // 形状に「巻」や「ロール」が含まれる場合はロール
    if (shape.includes('巻') || shape.includes('ロール')) return true;

    // 特定の形状コード (RZ/RA) を持つものは、上記カテゴリ以外であればロールとして扱う
    return shape.includes('RZ') || shape.includes('RA') || shape.includes('RＺ') || shape.includes('RＡ');
};

// デフォルトの在庫アラート閾値を取得
// ロールは1500m、単袋・その他は3000枚 (設定で上書き可能)
export const getDefaultMinStockAlert = (shape?: string | null, settings?: Record<string, unknown>): number => {
    const isRoll = isRollBag(shape || "");
    if (isRoll) {
        return settings?.default_min_stock_alert_roll !== undefined ? Number(settings.default_min_stock_alert_roll) : 1500;
    }
    return settings?.default_min_stock_alert_bag !== undefined ? Number(settings.default_min_stock_alert_bag) : 3000;
};

// 1ロールあたりのデフォルト長さ (m)
const DEFAULT_METERS_PER_ROLL = 400;

// 1ロールあたりの概算枚数を計算
// metersPerRoll: 1巻あたりのメートル数（商品ごとに異なる、デフォルト400m）
export const getApproxBagCount = (weight: number, metersPerRoll: number = DEFAULT_METERS_PER_ROLL): number => {
    const pitch = getPitch(weight);
    const rollLengthMm = metersPerRoll * 1000;
    return Math.floor(rollLengthMm / pitch);
};

// 枚数からメートルに変換
export const bagsToMeters = (bags: number, weight: number): number => {
    const pitch = getPitch(weight);
    return (bags * pitch) / 1000;
};

// メートルから枚数に変換
export const metersToBags = (meters: number, weight: number): number => {
    const pitch = getPitch(weight);
    return Math.floor((meters * 1000) / pitch);
};

// 在庫ステータスを計算
export const calculateStockStatus = (
    product: Product,
    currentStock: number,
    allocation: { bags: number; meters: number },
    settings?: Record<string, unknown>
) => {
    const isRoll = product.shape && isRollBag(product.shape);

    let availableStock: number;
    let currentBags: number;
    let availableBags: number;

    if (isRoll) {
        availableStock = currentStock - allocation.meters; // マイナスも許容
        currentBags = metersToBags(currentStock, product.weight || 5);
        availableBags = metersToBags(availableStock, product.weight || 5);
    } else {
        availableStock = currentStock - allocation.bags; // マイナスも許容
        currentBags = currentStock;
        availableBags = availableStock;
    }

    // ステータス判定 (手動上書きを優先)
    let isOutOfStock = false;
    let isLowStock = false;

    if (product.statusOverride === 'out_of_stock') {
        isOutOfStock = true;
    } else if (product.statusOverride === 'low_stock') {
        isLowStock = true;
    } else {
        // 自動判定 (直送先在庫、廃盤、落版、販売中断、スポットは除外)
        const shouldCheckStockStatus = !(
            product.status === 'direct_delivery' ||
            product.status === 'discontinued' ||
            product.status === 'plate_removed' ||
            product.status === 'on_sale_break' ||
            product.status === 'spot'
        );

        if (shouldCheckStockStatus) {
            isOutOfStock = availableStock <= 0;
            const alertThreshold = product.minStockAlert !== null && product.minStockAlert !== undefined
                ? product.minStockAlert
                : getDefaultMinStockAlert(product.shape, settings);
            isLowStock = availableStock > 0 && availableStock <= alertThreshold;
        }
    }

    return {
        availableStock,
        currentBags,
        availableBags,
        isOutOfStock,
        isLowStock,
        isRoll
    };
};
