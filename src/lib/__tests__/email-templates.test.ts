import { generateOrderNotificationText, generateWIPMoveNotificationText } from '../email-templates';

describe('email-templates', () => {
    describe('generateOrderNotificationText', () => {
        it('メーカー出荷依頼のテキストを正しく生成すること', () => {
            const result = generateOrderNotificationText({
                clientName: 'クライアントA',
                supplierName: 'テスト製袋株式会社',
                shipmentSource: 'supplier',
                items: [
                    {
                        productName: 'あきたこまち 5kg',
                        quantity: 1000,
                        unit: '枚',
                        weight: 5,
                        shape: 'ガゼット',
                        sku: 'BAG-001',
                    },
                ],
                deliveryName: '佐藤 太郎',
                deliveryPostalCode: '100-0001',
                deliveryAddress: '東京都千代田区千代田1-1',
                deliveryPhone: '03-1234-5678',
                preferredShape: 'パレット納品',
            });

            expect(result).toContain('テスト製袋株式会社 御中');
            expect(result).toContain('■出荷元: メーカー在庫出荷');
            expect(result).toContain('BAG-001 あきたこまち 5kg (5kg / ガゼット): 1,000枚');
            expect(result).toContain('お名前: 佐藤 太郎 様');
            expect(result).toContain('〒100-0001 東京都千代田区千代田1-1');
            expect(result).toContain('03-1234-5678');
            expect(result).toContain('パレット納品');
        });

        it('仕掛出荷やデフォルト名称、未指定の納品先情報が適切にフォールバックされること', () => {
            const resultWip = generateOrderNotificationText({
                clientName: 'クライアントB',
                shipmentSource: 'wip',
                items: [
                    {
                        productName: 'コシヒカリ 10kg',
                        quantity: 500,
                        unit: '袋',
                    },
                ],
            });
            expect(resultWip).toContain('朝日パピルス株式会社 御中');
            expect(resultWip).toContain('■出荷元: 仕掛仕上がり後出荷');
            expect(resultWip).toContain('・コシヒカリ 10kg: 500袋');
            expect(resultWip).toContain('お名前: - 様');

            const resultRequest = generateOrderNotificationText({
                clientName: 'クライアントC',
                shipmentSource: 'wip-request',
                items: [],
            });
            expect(resultRequest).toContain('■出荷元: 仕掛依頼');

            const resultOther = generateOrderNotificationText({
                clientName: 'クライアントD',
                shipmentSource: 'other',
                items: [],
            });
            expect(resultOther).toContain('■出荷元: 不明');
        });
    });

    describe('generateWIPMoveNotificationText', () => {
        it('仕掛移動通知テキストを正しく生成すること', () => {
            const result = generateWIPMoveNotificationText({
                userName: '担当者A',
                items: [
                    {
                        productName: 'ゆめぴりか 2kg',
                        quantity: 300,
                        unit: 'ロール',
                        destination: '印刷工場第2',
                        note: '特急対応',
                    },
                ],
            });

            expect(result).toContain('関係各位');
            expect(result).toContain('ゆめぴりか 2kg: 300ロール');
            expect(result).toContain('移動先: 印刷工場第2 / 備考: 特急対応');
        });
    });
});
