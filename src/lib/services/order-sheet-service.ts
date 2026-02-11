
import * as XLSX from 'xlsx';
import { Product } from '@/types';
import { format } from 'date-fns';

export const orderSheetService = {
    generateExcel: (products: Product[], quantities: Map<string, number>, supplierMap?: Map<string, string>) => {
        // データ作成
        const data = products.map(product => {
            const qty = quantities.get(product.id) || 0;
            if (qty <= 0) return null;

            return {
                '商品名': product.name,
                '品番': product.productCode || '',
                'JANコード': product.janCode || '',
                'メーカー': (product.supplierId && supplierMap?.get(product.supplierId)) || '',
                '発注数': qty,
                '単位': product.category === 'bag' ? '枚' : '個', // Simplification
                '備考': ''
            };
        }).filter(Boolean);

        if (data.length === 0) {
            alert('発注対象の商品がありません');
            return;
        }

        // ワークブック作成
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // カラム幅設定
        const wscols = [
            { wch: 30 }, // 商品名
            { wch: 15 }, // 品番
            { wch: 15 }, // JAN
            { wch: 20 }, // メーカー
            { wch: 10 }, // 発注数
            { wch: 5 }, // 単位
            { wch: 20 }, // 備考
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "発注書");

        // ファイル保存
        const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
        XLSX.writeFile(wb, `発注書_${dateStr}.xlsx`);
    }
};
