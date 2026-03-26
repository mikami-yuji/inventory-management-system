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
export function isRollBag(shape: string | null | undefined, category?: string, metersPerRoll?: number | null): boolean {
  const s = shape || "";
  // 1巻あたりのメートル数が設定されている、または数値がある場合はロールとして扱う
  if (metersPerRoll && metersPerRoll > 0) {
    return true;
  }

  // カテゴリが明示的に「袋」や「新米」の場合は、たとえ形状が RZ/RA でも枚数管理（枚）とする
  if (category === 'bag' || category === 'new_rice') {
    return false;
  }
    // 形状に「巻」や「ロール」が含まれる場合はロール
    if (s.includes('巻') || s.includes('ロール')) return true;

    // 特定の形状コード (RZ/RA) を持つものは、上記カテゴリ以外であればロールとして扱う
    return s.includes('RZ') || s.includes('RA') || s.includes('RＺ') || s.includes('RＡ');
}

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

/**
 * 在庫切れ予測の計算
 * @param availableStock 実質在庫（メートルまたは枚数）
 * @param dailyRate 1日あたりの通常出荷数（枚数ベース）
 * @param leadDays 仕掛リードタイム（日間）
 * @param product 商品情報 (重量情報などのため)
 * @param saleItems 特売予定アイテムのリスト
 * @param wipItems 仕掛中アイテムのリスト
 * @param incomingItems 入荷予定アイテムのリスト
 * @param supplierStock メーカー在庫数
 */
export const calculateStockPrediction = (
    availableStock: number,
    dailyRate: number,
    leadDays: number,
    product: Product,
    saleItems: Array<{ dates: string[]; quantity: number }> = [],
    wipItems: Array<{ quantity: number; expectedDate: Date | null; termType?: string }> = [],
    incomingItems: Array<{ quantity: number; expectedDate: Date }> = [],
    supplierStock: number = 0
) => {
    // 初期在庫にメーカー在庫を加算（即時利用可能とみなす）
    let currentStock = availableStock + supplierStock;
    let unconfirmedWIPTotal = 0;

    if (currentStock <= 0 && wipItems.length === 0 && incomingItems.length === 0) {
        return { remainingDays: 0, estimatedDate: null, wipStartAlert: false, hasUnconfirmedWIP: false };
    }

    const isRoll = isRollBag(product.shape || "", product.category, product.metersPerRoll);
    let days = 0;
    const maxDays = 365; // 最大1年分計算
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 特売マップ: 日付キー (timestamp) -> 数量 (枚数)
    const saleMap = new Map<string, number>();
    saleItems.forEach(item => {
        const perDay = item.dates.length > 0 ? Math.floor(item.quantity / item.dates.length) : 0;
        item.dates.forEach(dateStr => {
            const date = new Date(dateStr);
            date.setHours(0, 0, 0, 0);
            const key = date.getTime().toString();
            saleMap.set(key, (saleMap.get(key) || 0) + perDay);
        });
    });

    // 入荷・仕掛マップ: 日付キー -> 数量（単位は商品に合わせる：m または 枚）
    const arrivalMap = new Map<string, number>();
    incomingItems.forEach(item => {
        const date = new Date(item.expectedDate);
        date.setHours(0, 0, 0, 0);
        const key = date.getTime().toString();
        arrivalMap.set(key, (arrivalMap.get(key) || 0) + item.quantity);
    });
    wipItems.forEach(item => {
        if (!item.expectedDate) return;
        
        // specific 以外（上中下旬）は予測計算の在庫加算には入れない
        // 代わりに合計数量を記録しておく
        if (item.termType && item.termType !== 'specific') {
            unconfirmedWIPTotal += item.quantity;
            return;
        }

        const date = new Date(item.expectedDate);
        date.setHours(0, 0, 0, 0);
        const key = date.getTime().toString();
        arrivalMap.set(key, (arrivalMap.get(key) || 0) + item.quantity);
    });

    // 日ごとのシミュレーション
    // Day 0 (本日) の入荷・仕掛完了を加算
    const todayKey = today.getTime().toString();
    currentStock += arrivalMap.get(todayKey) || 0;

    while (days < maxDays) {
        days++;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + days);
        const key = targetDate.getTime().toString();

        // 1. その日に到着する在庫を加算
        const arrivals = arrivalMap.get(key) || 0;
        currentStock += arrivals;

        // 2. その日の消費量を減算
        const dailySaleQty = saleMap.get(key) || 0;
        const totalDailyOutQty = dailyRate + dailySaleQty;

        // 在庫消費量の算出
        const consumption = isRoll 
            ? bagsToMeters(totalDailyOutQty, product.weight || 5)
            : totalDailyOutQty;

        currentStock -= consumption;

        // 在庫が切れたら終了
        if (currentStock <= 0) break;
    }

    const estimatedDate = new Date(today);
    estimatedDate.setDate(today.getDate() + days);

    // 仕掛開始アラート: 残り日数 <= (リードタイム + 7日) かつ 在庫がある場合
    // ※在庫が既に切れている（days=0）場合はアラート不要（欠品扱い）
    const wipStartAlert = days <= (leadDays + 7) && days > 0 && leadDays > 0;

    // 納期確定警告: 在庫切れが予測される場合のみ、かつ未確定仕掛品が入れば在庫が持つ可能性がある場合
    // 条件: (1) 未確定仕掛品がある (2) 在庫切れが予測範囲内 (3) 未確定分を含めれば在庫が改善しうる
    const hasUnconfirmedWIP = unconfirmedWIPTotal > 0 && days < maxDays;

    return {
        remainingDays: days,
        estimatedDate: days < maxDays ? estimatedDate : null,
        wipStartAlert,
        hasUnconfirmedWIP
    };
};
