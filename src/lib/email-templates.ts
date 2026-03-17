import { format } from "date-fns";

type OrderItem = {
    productName: string;
    quantity: number;
    unit: string;
};

type OrderTemplateProps = {
    orderId?: string;
    clientName: string;
    items: OrderItem[];
    shipmentSource: string;
    deliveryName?: string;
    deliveryPostalCode?: string;
    deliveryAddress?: string;
    deliveryPhone?: string;
};

/**
 * 出荷依頼通知用のテキストを生成（メーカー/社内への依頼用）
 */
export function generateOrderNotificationText({
    items,
    shipmentSource,
    deliveryName,
    deliveryPostalCode,
    deliveryAddress,
    deliveryPhone,
}: OrderTemplateProps): string {
    const sourceText = 
        shipmentSource === 'supplier' ? 'メーカー直送' :
        shipmentSource === 'wip' ? '仕掛仕上がり分' :
        shipmentSource === 'wip-request' ? '新規手配依頼' : '不明';

    const itemsText = items
        .map(item => `・${item.productName}: ${item.quantity.toLocaleString()}${item.unit}`)
        .join('\n');

    const dateStr = format(new Date(), "yyyy年MM月dd日");

    const postalText = deliveryPostalCode ? `〒${deliveryPostalCode} ` : "";

    return `
朝日パピルス株式会社 担当者様
（または社内担当者 様）

いつもお世話になっております。

以下の通り、商品の出荷・手配を依頼いたします。
ご確認のほど、よろしくお願い申し上げます。

■依頼日: ${dateStr}
■出荷元: ${sourceText}

■依頼内容:
${itemsText}

■納品先情報:
お名前: ${deliveryName || '-'} 様
ご住所: ${postalText}${deliveryAddress || '-'}
お電話: ${deliveryPhone || '-'}

以上、よろしくお願いいたします。
`.trim();
}

type WIPMoveItem = {
    productName: string;
    quantity: number;
    unit: string;
    destination: string;
    note?: string;
};

type WIPMoveTemplateProps = {
    userName: string;
    items: WIPMoveItem[];
};

/**
 * 仕掛移動通知用のテキストを生成（社内・関係各所への共有用）
 */
export function generateWIPMoveNotificationText({
    items,
}: WIPMoveTemplateProps): string {
    const itemsText = items
        .map(item => `・${item.productName}: ${item.quantity.toLocaleString()}${item.unit}\n  （移動先: ${item.destination}${item.note ? ` / 備考: ${item.note}` : ''}）`)
        .join('\n\n');

    const dateStr = format(new Date(), "yyyy年MM月dd日");

    return `
関係各位

お疲れ様です。
商品の現在の加工状況（仕掛品）について、以下の通り更新がありました。

内容をご確認ください。

■更新日: ${dateStr}

■更新内容:
${itemsText}

以上、共有いたします。
`.trim();
}
