import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import * as XLSX from 'xlsx';
import { logError } from '@/lib/logger';
import { parseNumericValue } from '@/lib/utils/price-calculator';

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
        const rawData = XLSX.utils.sheet_to_json<Record<string, string | number | undefined>>(worksheet);

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

        const revisionsToUpsert: Array<{
            product_id: string;
            unit_price: number;
            printing_cost: number;
            effective_date: string;
        }> = [];
        const errors: string[] = [];
        let successCount = 0;

        for (const [index, row] of rawData.entries()) {
            const rowNum = index + 2; // Excel行番号 (ヘッダー1行 + 0-indexed offset 1)
            
            // Excelのカラム名。揺らぎに対応するため、いくつか候補を探す
            const sku = row['受注№'] || row['受注番号'] || row['SKU'] || row['sku'];
            const unitPrice = row['単価'] || row['価格'] || row['unit_price'] || row['新単価'] || row['改定単価'] || row['改定後単価'];
            const printingCost = row['印刷代'] || row['printing_cost'] || row['改定印刷代'] || row['新印刷代'] || row['改定印刷代単価'];

            if (!sku) {
                continue; // 受注№がない行は無視（空行など）
            }

            const productId = skuToProductIdMap.get(String(sku).trim());
            if (!productId) {
                errors.push(`${rowNum}行目: 受注№ [${sku}] に該当する商品が見つかりませんでした。`);
                continue;
            }

            // 価格のパースとバリデーション
            const parsedUnitPrice = parseNumericValue(unitPrice);
            if (isNaN(parsedUnitPrice)) {
                errors.push(`${rowNum}行目: 単価が無効な数値です（受注№ ${sku}）。`);
                continue;
            }

            const parsedPrintingCost = printingCost ? parseNumericValue(printingCost) : 0;
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

            // タイムゾーン（日本時間 JST = UTC+9）を考慮して本日以前の適用日（すでに適用済み）であるかを正確に判定する
            // サーバーの環境やOSタイムゾーン設定に影響されない、最も確実な文字列日付比較
            const getJstTodayStr = (): string => {
                const now = new Date();
                // UTC時間に9時間を足して、JSTの日付をISO形式で取得
                const jstTime = now.getTime() + (9 * 60 * 60 * 1000);
                const jstDate = new Date(jstTime);
                return jstDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
            };

            const todayJstStr = getJstTodayStr();
            // スラッシュをハイフンに変換し、前後の空白を除去して YYYY-MM-DD 形式に揃える
            const effectiveDateJstStr = effectiveDate.replace(/\//g, '-').trim();

            // "YYYY-MM-DD" の文字列比較（同じ長さであれば、文字列比較は絶対的に正確）
            const shouldUpdateImmediately = effectiveDateJstStr <= todayJstStr;

            if (shouldUpdateImmediately) {
                for (const revision of revisionsToUpsert) {
                    const productId = revision.product_id;

                    // 1. 商品マスタ（products）情報を取得
                    const { data: prodData, error: prodError } = await supabase
                        .from('products')
                        .select('unit_price, printing_cost, old_unit_price, old_printing_cost, price_increase_effective_date')
                        .eq('id', productId)
                        .single();

                    if (!prodError && prodData) {
                        const isSameEffectiveDate = prodData.price_increase_effective_date === effectiveDate;
                        const isAlreadyUpdated = 
                            prodData.unit_price === revision.unit_price && 
                            prodData.printing_cost === revision.printing_cost;

                        // 同一の適用日での再実行、またはすでに新価格が適用されている場合は
                        // 在庫ロック（old_price_quantity の更新）をスキップする
                        if (!isSameEffectiveDate) {
                            // 既存在庫を「旧価格在庫 (old_price_quantity)」としてロック
                            const { data: invData, error: invError } = await supabase
                                .from('inventory')
                                .select('quantity, old_price_quantity')
                                .eq('product_id', productId)
                                .single();

                            if (!invError && invData) {
                                const currentTotal = invData.quantity || 0;
                                await supabase
                                    .from('inventory')
                                    .update({
                                        old_price_quantity: currentTotal, // 現在の全在庫を旧価格在庫に
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('product_id', productId);
                            }
                        }

                        // 商品マスタの更新用ペイロードを組み立てる
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const updatePayload: Record<string, any> = {
                            unit_price: revision.unit_price,
                            printing_cost: revision.printing_cost,
                            price_increase_effective_date: effectiveDate
                        };

                        // 同一の改定日での上書き、またはすでに新価格に更新されている場合は旧価格を上書きしない
                        if (!isSameEffectiveDate && !isAlreadyUpdated) {
                            updatePayload.old_unit_price = prodData.unit_price;
                            updatePayload.old_printing_cost = prodData.printing_cost;
                        }

                        await supabase
                            .from('products')
                            .update(updatePayload)
                            .eq('id', productId);
                    }
                }
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
