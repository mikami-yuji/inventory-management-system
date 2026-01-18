/**
 * 在庫サービスのユニットテスト
 */

import {
    getPitch,
    isRollBag,
    getApproxBagCount,
    inventoryService,
} from '../inventory-service';

describe('getPitch', () => {
    test('10kg以上は570mmを返す', () => {
        expect(getPitch(10)).toBe(570);
        expect(getPitch(15)).toBe(570);
        expect(getPitch(30)).toBe(570);
    });

    test('5kg以上10kg未満は470mmを返す', () => {
        expect(getPitch(5)).toBe(470);
        expect(getPitch(7)).toBe(470);
        expect(getPitch(9.9)).toBe(470);
    });

    test('3kg以上5kg未満は400mmを返す', () => {
        expect(getPitch(3)).toBe(400);
        expect(getPitch(4)).toBe(400);
        expect(getPitch(4.9)).toBe(400);
    });

    test('2kg以上3kg未満は350mmを返す', () => {
        expect(getPitch(2)).toBe(350);
        expect(getPitch(2.5)).toBe(350);
        expect(getPitch(2.9)).toBe(350);
    });

    test('2kg未満は250mmを返す', () => {
        expect(getPitch(1)).toBe(250);
        expect(getPitch(0.5)).toBe(250);
        expect(getPitch(1.9)).toBe(250);
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
    // 1ロール = 300m = 300,000mm

    test('10kg (ピッチ570mm) の場合約526枚を返す', () => {
        // 300000 / 570 = 526.31...
        expect(getApproxBagCount(10)).toBe(526);
    });

    test('5kg (ピッチ470mm) の場合約638枚を返す', () => {
        // 300000 / 470 = 638.29...
        expect(getApproxBagCount(5)).toBe(638);
    });

    test('3kg (ピッチ400mm) の場合750枚を返す', () => {
        // 300000 / 400 = 750
        expect(getApproxBagCount(3)).toBe(750);
    });

    test('2kg (ピッチ350mm) の場合約857枚を返す', () => {
        // 300000 / 350 = 857.14...
        expect(getApproxBagCount(2)).toBe(857);
    });

    test('1kg (ピッチ250mm) の場合1200枚を返す', () => {
        // 300000 / 250 = 1200
        expect(getApproxBagCount(1)).toBe(1200);
    });
});

describe('inventoryService', () => {
    describe('getProducts', () => {
        test('商品一覧を取得できる', () => {
            const products = inventoryService.getProducts();
            expect(Array.isArray(products)).toBe(true);
            expect(products.length).toBeGreaterThan(0);
        });

        test('商品にはid, name, skuが含まれる', () => {
            const products = inventoryService.getProducts();
            const firstProduct = products[0];
            expect(firstProduct).toHaveProperty('id');
            expect(firstProduct).toHaveProperty('name');
            expect(firstProduct).toHaveProperty('sku');
        });
    });

    describe('getProductsByCategory', () => {
        test('allを指定すると全商品を取得できる', () => {
            const allProducts = inventoryService.getProducts();
            const filteredProducts = inventoryService.getProductsByCategory('all');
            expect(filteredProducts.length).toBe(allProducts.length);
        });

        test('カテゴリで絞り込みができる', () => {
            const bagProducts = inventoryService.getProductsByCategory('bag');
            bagProducts.forEach(product => {
                expect(product.category).toBe('bag');
            });
        });
    });

    describe('getProductById', () => {
        test('存在する商品IDで商品を取得できる', () => {
            const products = inventoryService.getProducts();
            const firstProduct = products[0];
            const found = inventoryService.getProductById(firstProduct.id);
            expect(found).toEqual(firstProduct);
        });

        test('存在しない商品IDはundefinedを返す', () => {
            const found = inventoryService.getProductById('non-existent-id');
            expect(found).toBeUndefined();
        });
    });

    describe('getProductName', () => {
        test('存在する商品IDで商品名を取得できる', () => {
            const products = inventoryService.getProducts();
            const firstProduct = products[0];
            const name = inventoryService.getProductName(firstProduct.id);
            expect(name).toBe(firstProduct.name);
        });

        test('存在しない商品IDはIDをそのまま返す', () => {
            const name = inventoryService.getProductName('unknown-id');
            expect(name).toBe('unknown-id');
        });
    });

    describe('getInventoryCount', () => {
        test('在庫数を取得できる', () => {
            const products = inventoryService.getProducts();
            const firstProduct = products[0];
            const count = inventoryService.getInventoryCount(firstProduct.id);
            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test('存在しない商品IDは0を返す', () => {
            const count = inventoryService.getInventoryCount('non-existent-id');
            expect(count).toBe(0);
        });
    });
});
