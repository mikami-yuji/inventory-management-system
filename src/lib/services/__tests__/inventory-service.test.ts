/**
 * 在庫サービスのユニットテスト
 */

import {
    getPitch,
    isRollBag,
    getApproxBagCount,
    calculateStockPrediction,
} from '../inventory-service';
import { Product } from '@/types';

// ... (existing tests)

describe('calculateStockPrediction', () => {
    // ロール袋ではない形状（H）を使用することでメートル換算を避け、枚数ベースのテストを実施
    const mockProduct: Product = {
        id: '1',
        name: 'Test Product',
        weight: 5,
        shape: 'H',
        category: 'bag',
        dailyShipmentRate: 100,
        productionLeadDays: 5,
        unitPrice: 100,
        printingCost: 50,
        status: 'active',
        sku: 'TEST-001'
    };

    test('通常出荷のみ：在庫切れ日の計算が正しいこと', () => {
        // 在庫1000枚, 1日100枚消費 -> 10日
        const result = calculateStockPrediction(1000, 100, 5, mockProduct);
        expect(result.remainingDays).toBe(10);
        expect(result.hasUnconfirmedWIP).toBe(false);
    });

    test('特売がある場合：消費が早まること', () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const saleItems = [
            { dates: [tomorrow.toISOString()], quantity: 500 }
        ];
        
        // 在庫1000枚, 常時100枚 + 明日500枚
        // Day 1: 100 + 500 = 600 (残り400)
        // Day 2: 100 (残り300)
        // Day 3: 100 (残り200)
        // Day 4: 100 (残り100)
        // Day 5: 100 (残り0)
        const result = calculateStockPrediction(1000, 100, 5, mockProduct, saleItems);
        expect(result.remainingDays).toBe(5);
    });

    test('仕掛品（確定納期）がある場合：在庫が加算されること', () => {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const wipItems = [
            { quantity: 1000, expectedDate: nextWeek, termType: 'specific' }
        ];
        
        // 在庫1000枚, 1日100枚消費
        // Day 7で在庫0になるが、1000枚追加される
        // さらに10日持つ -> 合計20日
        const result = calculateStockPrediction(1000, 100, 5, mockProduct, [], wipItems);
        expect(result.remainingDays).toBe(20);
    });

    test('不確定な仕掛品（上中下旬）：計算から除外されフラグが立つこと', () => {
        const today = new Date();
        const wipItems = [
            { quantity: 1000, expectedDate: today, termType: 'early' }
        ];
        
        // 在庫1000枚, 1日100枚消費
        // 上旬(early)は除外されるため、10日のまま
        const result = calculateStockPrediction(1000, 100, 5, mockProduct, [], wipItems);
        expect(result.remainingDays).toBe(10);
        expect(result.hasUnconfirmedWIP).toBe(true);
    });

    test('在庫切れかつリードタイム＋7日以内の場合：wipStartAlertが立つこと', () => {
        // 在庫500枚, 1日100枚 -> 5日
        // 5日 <= (リードタイム5 + 7) = 12日 なのでアラート対象
        const result = calculateStockPrediction(500, 100, 5, mockProduct);
        expect(result.remainingDays).toBe(5);
        expect(result.wipStartAlert).toBe(true);
    });
});

describe('getPitch', () => {
    test('10kg以上は570mmを返す', () => {
        expect(getPitch(10)).toBe(570);
        expect(getPitch(15)).toBe(570);
        expect(getPitch(30)).toBe(570);
    });

    test('8kg以上10kg未満は530mmを返す', () => {
        expect(getPitch(8)).toBe(530);
        expect(getPitch(9.9)).toBe(530);
    });

    test('5kg以上8kg未満は470mmを返す', () => {
        expect(getPitch(5)).toBe(470);
        expect(getPitch(7)).toBe(470);
        expect(getPitch(7.9)).toBe(470);
    });

    test('4kg以上5kg未満は450mmを返す', () => {
        expect(getPitch(4)).toBe(450);
        expect(getPitch(4.9)).toBe(450);
    });

    test('3kg以上4kg未満は400mmを返す', () => {
        expect(getPitch(3)).toBe(400);
        expect(getPitch(3.9)).toBe(400);
    });

    test('2kg以上3kg未満は350mmを返す', () => {
        expect(getPitch(2)).toBe(350);
        expect(getPitch(2.5)).toBe(350);
        expect(getPitch(2.9)).toBe(350);
    });

    test('2kg未満は280mmを返す', () => {
        expect(getPitch(1)).toBe(280);
        expect(getPitch(0.5)).toBe(280);
        expect(getPitch(1)).toBe(280);
    });
});

describe('isRollBag', () => {
    test('RZを含む形状はtrueを返す', () => {
        expect(isRollBag('RZ')).toBe(true);
        expect(isRollBag('10KG-RZ')).toBe(true);
        expect(isRollBag('RZ-300')).toBe(true);
    });

    test('RAを含む形状はtrueを返す', () => {
        expect(isRollBag('RA')).toBe(true);
        expect(isRollBag('5KG-RA')).toBe(true);
    });

    test('全角RＺを含む形状はtrueを返す', () => {
        expect(isRollBag('RＺ')).toBe(true);
    });

    test('全角RＡを含む形状はtrueを返す', () => {
        expect(isRollBag('RＡ')).toBe(true);
    });

    test('ロール袋でない形状はfalseを返す', () => {
        expect(isRollBag('単袋')).toBe(false);
        expect(isRollBag('KB')).toBe(false);
        expect(isRollBag('')).toBe(false);
    });

    test('undefinedやnullの場合はfalseを返す', () => {
        expect(isRollBag(undefined as unknown as string)).toBe(false);
        expect(isRollBag(null as unknown as string)).toBe(false);
    });
});

describe('getApproxBagCount', () => {
    // デフォルト: 1ロール = 400m = 400,000mm

    test('10kg (ピッチ570mm) デフォルト400mの場合約701枚を返す', () => {
        // 400000 / 570 = 701.75...
        expect(getApproxBagCount(10)).toBe(701);
    });

    test('5kg (ピッチ470mm) デフォルト400mの場合約851枚を返す', () => {
        // 400000 / 470 = 851.06...
        expect(getApproxBagCount(5)).toBe(851);
    });

    test('3kg (ピッチ400mm) デフォルト400mの場合1000枚を返す', () => {
        // 400000 / 400 = 1000
        expect(getApproxBagCount(3)).toBe(1000);
    });

    test('2kg (ピッチ350mm) デフォルト400mの場合約1142枚を返す', () => {
        // 400000 / 350 = 1142.85...
        expect(getApproxBagCount(2)).toBe(1142);
    });

    test('1kg (ピッチ280mm) デフォルト400mの場合約1428枚を返す', () => {
        // 400000 / 280 = 1428.57...
        expect(getApproxBagCount(1)).toBe(1428);
    });

    // 300m指定のテストケース
    test('10kg (ピッチ570mm) 300m指定の場合約526枚を返す', () => {
        // 300000 / 570 = 526.31...
        expect(getApproxBagCount(10, 300)).toBe(526);
    });

    test('5kg (ピッチ470mm) 300m指定の場合約638枚を返す', () => {
        // 300000 / 470 = 638.29...
        expect(getApproxBagCount(5, 300)).toBe(638);
    });

    test('3kg (ピッチ400mm) 300m指定の場合750枚を返す', () => {
        // 300000 / 400 = 750
        expect(getApproxBagCount(3, 300)).toBe(750);
    });
});
