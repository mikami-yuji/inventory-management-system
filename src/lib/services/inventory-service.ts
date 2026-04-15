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

// 日付を YYYY-MM-DD 形式の文字列に変換するヘルパー
// ローカル時刻ベースで変換する
const formatDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// YYYY-MM-DD 形式の文字列をローカル時刻の深夜0時に変換する
const parseLocalDate = (dateStr: string): Date => {
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d, 0, 0, 0, 0);
    }
    return new Date(dateStr);
};

// ロール袋（原反/フィルム巻）かどうか判定
export function isRollBag(shape: string | null | undefined, category?: string, metersPerRoll?: number | null): boolean {
  const s = shape || "";
    // 1巻あたりのメートル数が設定されている、または数値がある場合はロールとして扱う
    if (metersPerRoll && metersPerRoll > 0) {
        return true;
    }

    // 形状に「巻」や「ロール」が含まれる場合はロール
    if (s.includes('巻') || s.includes('ロール')) return true;

    // 特定の形状コード (RZ/RA) を持つものはロールとして扱う
    const normalized = s.replace(/\s+/g, '').toUpperCase();
    if (normalized.includes('RZ') || normalized.includes('RA') || normalized.includes('RＺ') || normalized.includes('RＡ')) {
        return true;
    }

    // カテゴリが明示的に「袋」や「新米」の場合は枚数管理（枚）とする
    if (category === 'bag' || category === 'new_rice') {
        return false;
    }

    return false;
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
/**
 * 在庫切れ予測の計算
 */
export const calculateStockPrediction = (
    availableStock: number,
    dailyRate: number,
    leadDays: number,
    product: Product,
    saleItems: Array<{ dates: string[]; quantity: number; eventName?: string }> = [],
    wipItems: Array<{ quantity: number; expectedDate: Date | null; termType?: string }> = [],
    incomingItems: Array<{ quantity: number; expectedDate: Date | null }> = [],
    supplierStock: number = 0,
    simulationArrivals: Array<{ quantity: number; expectedDate: Date }> = []
) => {
    // 初期在庫にメーカー在庫を加算（即時利用可能とみなす）
    let currentStock = availableStock + supplierStock;
    let unconfirmedWIPTotal = 0;
    
    // 納期確認中（TBD）の合計
    let pendingIncomingTotal = 0;

    const isRoll = isRollBag(product.shape || "", product.category, product.metersPerRoll);
    const maxDays = 365; // 最大1年分計算
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 特売マップ: 日付キー (YYYY-MM-DD) -> { quantity: 数量, names: 店名リスト }
    const saleMap = new Map<string, { quantity: number; names: string[] }>();
    saleItems.forEach(item => {
        const perDay = item.dates.length > 0 ? Math.floor(item.quantity / item.dates.length) : 0;
        item.dates.forEach(dateStr => {
            const date = parseLocalDate(dateStr);
            const key = formatDateKey(date);
            const existing = saleMap.get(key) || { quantity: 0, names: [] };
            
            const newNames = [...existing.names];
            if (item.eventName && !newNames.includes(item.eventName)) {
                newNames.push(item.eventName);
            }

            saleMap.set(key, { 
                quantity: existing.quantity + perDay,
                names: newNames
            });
        });
    });

    // 入荷・仕掛マップ: 日付キー -> 数量
    const arrivalMap = new Map<string, number>();
    
    const processItem = (quantity: number, expectedDate: Date | null, termType?: string) => {
        if (!expectedDate) {
            if (!termType || termType === 'specific') {
                pendingIncomingTotal += quantity;
            } else {
                unconfirmedWIPTotal += quantity;
            }
            return;
        }

        const date = new Date(expectedDate);
        if (isNaN(date.getTime())) return;
        
        // 仕掛の完成予定日＝発送日のため、在庫に反映されるのは翌日とする
        // 入荷予定（incoming）の場合は当日とする
        const arrivalDate = new Date(date);
        if (termType) { // wipItems have termType
            if (termType !== 'specific') {
                unconfirmedWIPTotal += quantity;
                return;
            }
            arrivalDate.setDate(arrivalDate.getDate() + 1);
        }

        const key = formatDateKey(arrivalDate);
        arrivalMap.set(key, (arrivalMap.get(key) || 0) + quantity);
    };

    incomingItems.forEach(item => processItem(item.quantity, item.expectedDate));
    wipItems.forEach(item => processItem(item.quantity, item.expectedDate, item.termType || 'specific'));
    simulationArrivals.forEach(item => processItem(item.quantity, item.expectedDate));

    const simulation = [];
    let stockoutDate: Date | null = null;
    let remainingDays = maxDays;
    
    // Day 0 (本日) の入荷・仕掛完了を加算
    const todayKey = formatDateKey(today);
    const todayArrivals = arrivalMap.get(todayKey) || 0;
    currentStock += todayArrivals;
    
    // 初期状態を記録
    simulation.push({
        date: new Date(today),
        stock: currentStock,
        arrivals: todayArrivals,
        out: 0,
        outNames: []
    });

    if (currentStock <= 0 && stockoutDate === null) {
        stockoutDate = new Date(today);
        remainingDays = 0;
    }

    let days = 0;
    while (days < maxDays) {
        days++;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + days);
        const key = formatDateKey(targetDate);

        // 1. その日に到着する在庫を加算
        const arrivals = arrivalMap.get(key) || 0;
        currentStock += arrivals;

        // 2. その日の消費量を減算
        const saleData = saleMap.get(key) || { quantity: 0, names: [] };
        const dailySaleQty = saleData.quantity;
        const totalDailyOutQty = dailyRate + dailySaleQty;

        const consumption = isRoll 
            ? bagsToMeters(totalDailyOutQty, product.weight || 5)
            : totalDailyOutQty;

        currentStock -= consumption;

        // 在庫切れ判定
        if (currentStock <= 0 && stockoutDate === null) {
            stockoutDate = new Date(targetDate);
            remainingDays = days;
        }

        // 履歴を記録
        simulation.push({
            date: targetDate,
            stock: currentStock, // マイナスも許容して記録
            arrivals: arrivals,
            out: consumption,
            outNames: saleData.names,
            // 到着時、すでに在庫が0以下だった場合は遅延フラグ
            isLate: arrivals > 0 && (currentStock - arrivals) <= 0
        });

        // 在庫が極端にマイナスになり、かつ今後の入荷もない場合は早めに切り上げる
        // (ただし、一応 maxDays までは計算を続けるのが安全)
    }

    // 仕掛開始アラート
    const wipStartAlert = remainingDays <= (leadDays + 7) && remainingDays > 0 && leadDays > 0;
    const hasUnconfirmedWIP = (unconfirmedWIPTotal > 0 || pendingIncomingTotal > 0) && remainingDays < maxDays;

    return {
        remainingDays,
        estimatedDate: stockoutDate,
        wipStartAlert,
        hasUnconfirmedWIP,
        simulation,
        analysis: {
            latestTBDDeadline: stockoutDate, // 在庫切れ日までに届けばOK
            pendingIncomingTotal,
            unconfirmedWIPTotal,
            alerts: simulation
                .filter(s => s.isLate)
                .map(s => ({
                    type: 'late_arrival' as const,
                    date: s.date,
                    quantity: s.arrivals
                }))
        }
    };
};
