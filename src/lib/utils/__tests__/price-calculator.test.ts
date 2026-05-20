import { calculateInventorySummary, groupPriceRevisions } from "../price-calculator";
import type { Product } from "@/types";
import type { InventoryWithProduct } from "@/hooks/use-inventory";

describe("price-calculator", (): void => {
  describe("calculateInventorySummary", (): void => {
    it("空の在庫リストに対して空の集計結果を返すこと", (): void => {
      const result = calculateInventorySummary([]);
      expect(result.oldPrice.productsCount).toBe(0);
      expect(result.oldPrice.stockCount).toBe(0);
      expect(result.oldPrice.amount).toBe(0);
      expect(result.newPrice.productsCount).toBe(0);
      expect(result.newPrice.stockCount).toBe(0);
      expect(result.newPrice.amount).toBe(0);
      expect(result.total.productsCount).toBe(0);
      expect(result.total.stockCount).toBe(0);
      expect(result.total.amount).toBe(0);
    });

    it("旧在庫のみが存在する場合に正しく集計されること", (): void => {
      const mockInventory: InventoryWithProduct[] = [
        {
          productId: "prod-1",
          quantity: 10,
          oldPriceQuantity: 10,
          updatedAt: "2026-05-20",
          product: {
            id: "prod-1",
            name: "商品A",
            sku: "SKU-A",
            unitPrice: 100,
            printingCost: 10,
            oldUnitPrice: 90,
            oldPrintingCost: 5,
            category: "bag",
            status: "active",
          },
        },
      ];

      const result = calculateInventorySummary(mockInventory);
      
      // 旧在庫: 10個 * (90 + 5) = 950円
      expect(result.oldPrice.productsCount).toBe(1);
      expect(result.oldPrice.stockCount).toBe(10);
      expect(result.oldPrice.amount).toBe(950);

      // 新在庫: 0個
      expect(result.newPrice.productsCount).toBe(0);
      expect(result.newPrice.stockCount).toBe(0);
      expect(result.newPrice.amount).toBe(0);

      // 合計
      expect(result.total.productsCount).toBe(1);
      expect(result.total.stockCount).toBe(10);
      expect(result.total.amount).toBe(950);
    });

    it("新在庫のみが存在する場合に正しく集計されること", (): void => {
      const mockInventory: InventoryWithProduct[] = [
        {
          productId: "prod-2",
          quantity: 5,
          oldPriceQuantity: 0,
          updatedAt: "2026-05-20",
          product: {
            id: "prod-2",
            name: "商品B",
            sku: "SKU-B",
            unitPrice: 200,
            printingCost: 20,
            category: "sticker",
            status: "active",
          },
        },
      ];

      const result = calculateInventorySummary(mockInventory);

      // 旧在庫: 0個
      expect(result.oldPrice.productsCount).toBe(0);
      expect(result.oldPrice.stockCount).toBe(0);
      expect(result.oldPrice.amount).toBe(0);

      // 新在庫: 5個 * (200 + 20) = 1100円
      expect(result.newPrice.productsCount).toBe(1);
      expect(result.newPrice.stockCount).toBe(5);
      expect(result.newPrice.amount).toBe(1100);

      // 合計
      expect(result.total.productsCount).toBe(1);
      expect(result.total.stockCount).toBe(5);
      expect(result.total.amount).toBe(1100);
    });

    it("新旧両方の在庫が混在する場合に正しく集計されること", (): void => {
      const mockInventory: InventoryWithProduct[] = [
        {
          productId: "prod-3",
          quantity: 15,
          oldPriceQuantity: 5, // 旧在庫が5個、新在庫が10個
          updatedAt: "2026-05-20",
          product: {
            id: "prod-3",
            name: "商品C",
            sku: "SKU-C",
            unitPrice: 150,
            printingCost: 15,
            oldUnitPrice: 120,
            oldPrintingCost: 10,
            category: "other",
            status: "active",
          },
        },
      ];

      const result = calculateInventorySummary(mockInventory);

      // 旧在庫: 5個 * (120 + 10) = 650円
      expect(result.oldPrice.productsCount).toBe(1);
      expect(result.oldPrice.stockCount).toBe(5);
      expect(result.oldPrice.amount).toBe(650);

      // 新在庫: 10個 * (150 + 15) = 1650円
      expect(result.newPrice.productsCount).toBe(1);
      expect(result.newPrice.stockCount).toBe(10);
      expect(result.newPrice.amount).toBe(1650);

      // 合計: 650 + 1650 = 2300円
      expect(result.total.productsCount).toBe(1);
      expect(result.total.stockCount).toBe(15);
      expect(result.total.amount).toBe(2300);
    });
  });

  describe("groupPriceRevisions", (): void => {
    it("価格改定情報がない場合は空のリストを返すこと", (): void => {
      const mockProducts: Product[] = [
        {
          id: "prod-1",
          name: "商品A",
          sku: "SKU-A",
          unitPrice: 100,
          printingCost: 10,
          category: "bag",
          status: "active",
        },
      ];

      const result = groupPriceRevisions(mockProducts);
      expect(result.length).toBe(0);
    });

    it("マスタ直近改定と予約スケジュールが正しく日付順にグループ化されること", (): void => {
      const mockProducts: Product[] = [
        {
          id: "prod-2",
          name: "商品B",
          sku: "SKU-B",
          unitPrice: 200,
          printingCost: 20,
          oldUnitPrice: 180,
          oldPrintingCost: 10,
          priceIncreaseEffectiveDate: "2026-05-01",
          category: "sticker",
          status: "active",
          priceRevisions: [
            {
              id: "rev-1",
              productId: "prod-2",
              unitPrice: 220,
              printingCost: 25,
              effectiveDate: "2026-06-01",
              createdAt: "2026-05-20T00:00:00Z",
            },
          ],
        },
      ];

      const result = groupPriceRevisions(mockProducts);

      // 降順ソートなので 2026-06-01 が先頭、次が 2026-05-01
      expect(result.length).toBe(2);
      expect(result[0].effectiveDate).toBe("2026-06-01");
      expect(result[0].revisions.length).toBe(1);
      expect(result[0].revisions[0].oldPrice).toBe(220); // 直前のマスタ価格 200 + 20 = 220
      expect(result[0].revisions[0].newPrice).toBe(245); // 改定価格 220 + 25 = 245
      expect(result[0].revisions[0].diff).toBe(25);
      expect(result[0].revisions[0].ratio).toBeCloseTo(11.36, 2);

      expect(result[1].effectiveDate).toBe("2026-05-01");
      expect(result[1].revisions.length).toBe(1);
      expect(result[1].revisions[0].oldPrice).toBe(190); // 旧価格 180 + 10 = 190
      expect(result[1].revisions[0].newPrice).toBe(220); // 適用マスタ価格 200 + 20 = 220
      expect(result[1].revisions[0].diff).toBe(30);
      expect(result[1].revisions[0].ratio).toBeCloseTo(15.79, 2);
    });
  });
});
