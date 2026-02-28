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

// ロール袋かどうか判定
export const isRollBag = (shape: string): boolean => {
    if (!shape) return false;
    return shape.includes('RZ') || shape.includes('RA') || shape.includes('RＺ') || shape.includes('RＡ');
};

// デフォルトの在庫アラート閾値を取得
// ロールは1500m、単袋・その他は3000枚
export const getDefaultMinStockAlert = (shape?: string | null): number => {
    return isRollBag(shape || "") ? 1500 : 3000;
};

// 1ロールあたりの長さ (mm) - 300m
const ROLL_LENGTH_MM = 300 * 1000;

// 1ロールあたりの概算枚数を計算
export const getApproxBagCount = (weight: number): number => {
    const pitch = getPitch(weight);
    return Math.floor(ROLL_LENGTH_MM / pitch);
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

