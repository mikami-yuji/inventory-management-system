import type { Product } from "@/types";
import type { InventoryWithProduct } from "@/hooks/use-inventory";

// 在庫集計カードの型定義
export type InventorySummaryCard = {
  productsCount: number;
  stockCount: number;
  amount: number;
};

// 新旧在庫集計全体の型定義
export type PriceSummary = {
  oldPrice: InventorySummaryCard;
  newPrice: InventorySummaryCard;
  total: InventorySummaryCard;
};

// 改定履歴アイテムの型定義
export type PriceRevisionHistoryItem = {
  id: string;
  productName: string;
  sku: string;
  category: string;
  oldPrice: number;
  newPrice: number;
  diff: number;
  ratio: number;
};

// 改定予定・履歴グループの型定義
export type PriceRevisionGroup = {
  effectiveDate: string;
  revisions: PriceRevisionHistoryItem[];
};

/**
 * 新旧在庫の集計（商品数、在庫数、在庫金額）を計算します。
 * 旧在庫は `oldPriceQuantity`、単価は `oldUnitPrice + oldPrintingCost` を基準とします。
 * 新在庫は `quantity - oldPriceQuantity`、単価は `unitPrice + printingCost` を基準とします。
 * 
 * @param inventory 商品情報を含む在庫データの配列
 * @returns 新旧および合計の集計データ
 */
export function calculateInventorySummary(inventory: InventoryWithProduct[]): PriceSummary {
  const oldProducts = new Set<string>();
  let oldStock = 0;
  let oldAmount = 0;

  const newProducts = new Set<string>();
  let newStock = 0;
  let newAmount = 0;

  const totalProducts = new Set<string>();

  inventory.forEach((item) => {
    const product = item.product;
    if (!product) return;

    const quantity = item.quantity;
    const oldQty = item.oldPriceQuantity;
    const newQty = Math.max(0, quantity - oldQty);

    totalProducts.add(product.id);

    // 旧価格在庫の計算
    if (oldQty > 0) {
      oldProducts.add(product.id);
      oldStock += oldQty;
      const oldUnit = Number(product.oldUnitPrice ?? product.unitPrice) || 0;
      const oldPrint = Number(product.oldPrintingCost ?? product.printingCost) || 0;
      oldAmount += oldQty * (oldUnit + oldPrint);
    }

    // 新価格在庫の計算
    if (newQty > 0) {
      newProducts.add(product.id);
      newStock += newQty;
      const newUnit = Number(product.unitPrice) || 0;
      const newPrint = Number(product.printingCost) || 0;
      newAmount += newQty * (newUnit + newPrint);
    }
  });

  return {
    oldPrice: {
      productsCount: oldProducts.size,
      stockCount: oldStock,
      amount: oldAmount,
    },
    newPrice: {
      productsCount: newProducts.size,
      stockCount: newStock,
      amount: newAmount,
    },
    total: {
      productsCount: totalProducts.size,
      stockCount: oldStock + newStock,
      amount: oldAmount + newAmount,
    },
  };
}

// テンポラリ改定型の定義
type TempRevision = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  effectiveDate: string;
  oldPrice: number;
  newPrice: number;
};

/**
 * すべての商品から価格改定の履歴および予約スケジュールを抽出し、適用日ごとにグループ化します。
 * 日付の降順（新しい日付が上）でソートして返します。
 * 
 * @param products 商品データの配列
 * @returns 適用日ごとの価格改定グループ
 */
export function groupPriceRevisions(products: Product[]): PriceRevisionGroup[] {
  const allTempRevisions: TempRevision[] = [];

  products.forEach((product) => {
    type RevisionEvent = {
      id?: string;
      effectiveDate: string;
      unitPrice: number;
      printingCost: number;
    };

    const productRevisions: RevisionEvent[] = [];

    // 1. マスタデータ上の直近改定履歴 (oldUnitPrice ➔ unitPrice)
    if (product.priceIncreaseEffectiveDate && product.oldUnitPrice !== undefined) {
      productRevisions.push({
        id: `master-${product.id}`,
        effectiveDate: product.priceIncreaseEffectiveDate,
        unitPrice: product.unitPrice,
        printingCost: product.printingCost,
      });
    }

    // 2. 予約された未来または過去の改定スケジュール (priceRevisions)
    if (product.priceRevisions && product.priceRevisions.length > 0) {
      product.priceRevisions.forEach((rev) => {
        productRevisions.push({
          id: rev.id,
          effectiveDate: rev.effectiveDate,
          unitPrice: rev.unitPrice,
          printingCost: rev.printingCost,
        });
      });
    }

    if (productRevisions.length === 0) return;

    // 日付の昇順（古い日付順）にソートして、推移の履歴チェーンを構築する
    productRevisions.sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );

    productRevisions.forEach((rev, index) => {
      let prevPrice = 0;
      if (index > 0) {
        const prevRev = productRevisions[index - 1];
        prevPrice = prevRev.unitPrice + prevRev.printingCost;
      } else {
        const oldBase = product.oldUnitPrice ?? product.unitPrice;
        const oldPrint = product.oldPrintingCost ?? product.printingCost ?? 0;
        prevPrice = oldBase + oldPrint;
      }

      allTempRevisions.push({
        id: rev.id || `rev-${product.id}-${rev.effectiveDate}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku || "-",
        category: product.category,
        effectiveDate: rev.effectiveDate,
        oldPrice: prevPrice,
        newPrice: rev.unitPrice + rev.printingCost,
      });
    });
  });

  // 改定日ごとにグループ化
  const groups: Record<string, TempRevision[]> = {};
  allTempRevisions.forEach((rev) => {
    if (!groups[rev.effectiveDate]) {
      groups[rev.effectiveDate] = [];
    }
    // 同一改定日・同一商品であれば、重複排除
    const existingIndex = groups[rev.effectiveDate].findIndex(
      (r) => r.productId === rev.productId
    );
    if (existingIndex !== -1) {
      groups[rev.effectiveDate][existingIndex] = rev;
    } else {
      groups[rev.effectiveDate].push(rev);
    }
  });

  // 改定日の降順でグループをソート
  return Object.keys(groups)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map((date) => {
      const revisions = groups[date].map((r) => {
        const diff = r.newPrice - r.oldPrice;
        const ratio = r.oldPrice > 0 ? (diff / r.oldPrice) * 100 : 0;
        return {
          id: r.id,
          productName: r.productName,
          sku: r.sku,
          category: r.category,
          oldPrice: r.oldPrice,
          newPrice: r.newPrice,
          diff,
          ratio,
        };
      });

      return {
        effectiveDate: date,
        revisions,
      };
    });
}
