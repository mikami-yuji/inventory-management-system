import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import * as XLSX from 'xlsx';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const effectiveDate = formData.get('effectiveDate') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'ファイルがアップロードされていません' }, { status: 400 });
        }

        if (!effectiveDate) {
            return NextResponse.json({ error: '改定日（有効開始日）が指定されていません' }, { status: 400 });
        }

        // ファイルの読み込みと解析
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // ヘッダーを1行目としてJSON化
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        if (rawData.length === 0) {
            return NextResponse.json({ error: 'ファイルにデータが含まれていません' }, { status: 400 });
        }

        const supabase = createServerClient();

        // データベースからすべての製品（sku）を取得してマッピング用の辞書を作成
        const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('id, sku');

        if (productsError) {
            throw new Error('製品データの取得に失敗しました');
        }

        const skuToProductIdMap = new Map<string, string>();
        productsData?.forEach(p => {
            if (p.sku) {
                // 空白や全角半角の違いを吸収するために少し正規化しても良いが、ここでは単純なTrim
                skuToProductIdMap.set(p.sku.trim(), p.id);
            }
        });

        const revisionsToUpsert: any[] = [];
        const errors: string[] = [];
        let successCount = 0;

        for (const [index, row] of rawData.entries()) {
            const rowNum = index + 2; // Excel行番号 (ヘッダー1行 + 0-indexed offset 1)
            
            // Excelのカラム名。揺らぎに対応するため、いくつか候補を探す
            const sku = row['受注№'] || row['受注番号'] || row['SKU'] || row['sku'];
            let unitPrice = row['単価'] || row['価格'] || row['unit_price'];
            let printingCost = row['印刷代'] || row['printing_cost'];

            if (!sku) {
                continue; // 受注№がない行は無視（空行など）
            }

            const productId = skuToProductIdMap.get(String(sku).trim());
            if (!productId) {
                errors.push(`${rowNum}行目: 受注№ [${sku}] に該当する商品が見つかりませんでした。`);
                continue;
            }

            // 価格のパースとバリデーション
            const parsedUnitPrice = Number(unitPrice);
            if (isNaN(parsedUnitPrice)) {
                errors.push(`${rowNum}行目: 単価が無効な数値です（受注№ ${sku}）。`);
                continue;
            }

            const parsedPrintingCost = printingCost ? Number(printingCost) : 0;
            if (isNaN(parsedPrintingCost)) {
                errors.push(`${rowNum}行目: 印刷代が無効な数値です（受注№ ${sku}）。`);
                continue;
            }

            revisionsToUpsert.push({
                product_id: productId,
                unit_price: parsedUnitPrice,
                printing_cost: parsedPrintingCost,
                effective_date: effectiveDate
            });
            successCount++;
        }

        if (revisionsToUpsert.length > 0) {
            // upsert を使用して既存の同じ商品・同じ改定日のレコードがあれば上書きする
            const { error: upsertError } = await supabase
                .from('price_revisions')
                .upsert(revisionsToUpsert, { onConflict: 'product_id, effective_date' });

            if (upsertError) {
                console.error('Upsert error:', upsertError);
                throw new Error('価格改定データの保存に失敗しました');
            }
        }

        return NextResponse.json({ 
            message: `${successCount}件の価格改定スケジュールを登録しました。`,
            successCount,
            errors
        });

    } catch (error) {
        await logError({
            route: '/api/prices/import',
            method: 'POST',
            error,
        });
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました。ファイルの形式を確認してください。' }, 
            { status: 500 }
        );
    }
}
