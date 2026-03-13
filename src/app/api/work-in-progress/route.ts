import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendWIPNotificationEmail } from '@/lib/mail'
import type { ApiResponse } from '@/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'

// 仕掛中アイテムの型
type WorkInProgress = {
    id: string
    productId: string
    productName?: string
    productSku?: string
    quantity: number
    startedAt: string
    expectedCompletion: string | null
    completedAt: string | null
    note: string | null
    status: 'in_progress' | 'completed' | 'cancelled'
    termType?: string
    confirmationStatus?: string
    createdAt: string
}

// WIPRecord is removed

// GET: 仕掛中一覧を取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<WorkInProgress[]>>> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'in_progress'
        const productId = searchParams.get('productId')

        let query = supabase
            .from('work_in_progress')
            .select(`
                id,
                product_id,
                quantity,
                started_at,
                expected_completion,
                completed_at,
                note,
                status,
                term_type,
                confirmation_status,
                created_at,
                products (
                    id,
                    name,
                    sku
                )
            `)
            .order('started_at', { ascending: true })

        if (status !== 'all') {
            query = query.eq('status', status)
        }

        if (productId) {
            query = query.eq('product_id', productId)
        }

        const { data, error } = await query

        if (error) {
            // テーブルが存在しない場合は空配列を返す
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                return NextResponse.json({ data: [], error: null })
            }
            console.error('仕掛中取得エラー:', error)
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        const items: WorkInProgress[] = (data || []).map((i: unknown) => {
            const item = i as Record<string, unknown>;
            const products = item.products;
            const product = Array.isArray(products) ? products[0] : products;
            const productRef = product as Record<string, unknown> | undefined;
            return {
                id: item.id as string,
                productId: item.product_id as string,
                productName: productRef?.name as string || '',
                productSku: productRef?.sku as string || '',
                quantity: item.quantity as number,
                startedAt: item.started_at as string,
                expectedCompletion: item.expected_completion as string | null,
                completedAt: item.completed_at as string | null,
                note: item.note as string | null,
                status: item.status as WorkInProgress['status'],
                termType: (item.term_type as string) || undefined,
                confirmationStatus: (item.confirmation_status as string) || undefined,
                createdAt: item.created_at as string
            };
        });

        return NextResponse.json({ data: items, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

const createWipSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    startedAt: z.string().min(1),
    expectedCompletion: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    termType: z.string().optional()
})

// POST: 仕掛中を登録
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<WorkInProgress>>> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServerClient()
        const body = await request.json()

        const validated = createWipSchema.safeParse(body)
        if (!validated.success) {
            return NextResponse.json(
                { data: null, error: '入力内容が不正です。' },
                { status: 400 }
            )
        }
        
        const validData = validated.data;

        const { data, error } = await supabase
            .from('work_in_progress')
            .insert({
                product_id: validData.productId,
                quantity: validData.quantity,
                started_at: validData.startedAt,
                expected_completion: validData.expectedCompletion || null,
                note: validData.note || null,
                status: 'in_progress',
                term_type: validData.termType || 'specific'
            })
            .select()
            .single()

        if (error) {
            console.error('仕掛中登録エラー:', error)
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

const patchWipSchema = z.object({
    id: z.string().min(1),
    action: z.enum(['to_incoming', 'to_supplier', 'cancel', 'update', 'confirm', 'arrange_shipping']),
    data: z.record(z.string(), z.unknown()).optional(),
    confirmedDate: z.string().optional(),
    quantity: z.number().optional(),
    supplierStock: z.number().optional(),
    schedules: z.array(z.object({
        expectedDate: z.string(),
        quantity: z.number(),
        note: z.string().optional()
    })).optional()
})

// PATCH: 仕掛中を更新（完了など）
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServerClient()
        const body = await request.json()

        const validated = patchWipSchema.safeParse(body)
        if (!validated.success) {
            return NextResponse.json({ data: null, error: '入力内容が不正です。' }, { status: 400 })
        }
        
        const validData = validated.data;
        const { id, action, data: updateData, confirmedDate, quantity, supplierStock, schedules } = validData;

        if (action === 'to_incoming') {
            // 仕掛品を入荷予定へ移動（複数スケジュール・部分移動対応）
            if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
                return NextResponse.json({ data: null, error: '入荷予定のスケジュールが必要です' }, { status: 400 })
            }

            const { data: wipItem } = await supabase
                .from('work_in_progress')
                .select('product_id, products(name, unit)')
                .eq('id', id)
                .single<Record<string, unknown>>()

            if (wipItem) {
                const product = Array.isArray(wipItem.products) ? wipItem.products[0] : wipItem.products;
                const insertData = schedules.map(s => ({
                    product_id: (wipItem as Record<string, unknown>).product_id,
                    expected_date: s.expectedDate,
                    quantity: s.quantity,
                    note: s.note || '仕掛品からの予定'
                }))

                const { error: insertError } = await supabase
                    .from('incoming_stock')
                    .insert(insertData as Record<string, unknown>[])

                if (insertError) {
                    console.error('入荷予定登録エラー:', insertError)
                    return NextResponse.json({ data: null, error: insertError.message }, { status: 500 })
                }

                // メール通知用のデータ収集
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const userName = user?.user_metadata?.name || user?.email || 'システム利用ユーザー';

                    // 管理者（通知ON）の取得
                    const { data: admins } = await supabase
                        .from('users')
                        .select('email')
                        .eq('receives_order_emails', true);

                    const toAddresses = (admins || []).map((a: Record<string, unknown>) => a.email as string).filter(Boolean);

                    if (toAddresses.length > 0) {
                        await sendWIPNotificationEmail({
                            userName,
                            toAddresses,
                            items: schedules.map(s => ({
                                productName: (product as Record<string, unknown>)?.name as string || '不明な商品',
                                quantity: s.quantity,
                                unit: (product as Record<string, unknown>)?.unit as string || '個',
                                destination: `入荷予定 (${s.expectedDate})`,
                                note: s.note
                            }))
                        });
                    }
                } catch (emailError) {
                    console.error('WIP通知メール送信失敗:', emailError);
                }
            }
        } else if (action === 'to_supplier') {
            // 仕掛品をメーカー在庫へ移動（部分移動対応・WIPレコードは削除しない）
            if (!quantity) {
                return NextResponse.json({ data: null, error: '数量は必須です' }, { status: 400 })
            }
            const { data: wipItem } = await supabase
                .from('work_in_progress')
                .select('product_id, products(name, unit)')
                .eq('id', id)
                .single<Record<string, unknown>>()

            if (wipItem) {
                const product = Array.isArray(wipItem.products) ? wipItem.products[0] : wipItem.products;
                // supplier_stock_lotsテーブルにロットとして追加
                const { error: lotInsertError } = await supabase
                    .from('supplier_stock_lots')
                    .insert({
                        product_id: (wipItem as Record<string, unknown>).product_id,
                        stock_date: new Date().toISOString().split('T')[0],
                        quantity: quantity,
                        note: '仕掛品からの移動'
                    } as Record<string, unknown>)

                if (lotInsertError) {
                    console.error('ロット登録エラー:', lotInsertError)
                    return NextResponse.json({ data: null, error: 'ロット情報の登録に失敗しました' }, { status: 500 })
                }

                // productsテーブルの合計在庫(supplier_stock)を同期
                const productId = (wipItem as Record<string, unknown>).product_id as string;
                const { data: lotSum, error: sumError } = await supabase
                    .from('supplier_stock_lots')
                    .select('quantity')
                    .eq('product_id', productId);
                
                if (sumError) {
                    console.error('在庫集計エラー:', sumError)
                    return NextResponse.json({ data: null, error: '在庫の再計算に失敗しました' }, { status: 500 })
                }

                const total = (lotSum || []).reduce((sum, lot) => sum + (lot.quantity || 0), 0);

                const { error: productUpdateError } = await supabase
                    .from('products')
                    .update({ 
                        supplier_stock: total,
                        supplier_stock_updated_at: new Date().toISOString()
                    })
                    .eq('id', productId);

                if (productUpdateError) {
                    console.error('商品在庫更新エラー:', productUpdateError)
                    return NextResponse.json({ data: null, error: '商品情報の更新に失敗しました' }, { status: 500 })
                }

                // メール通知用のデータ収集
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const userName = user?.user_metadata?.name || user?.email || 'システム利用ユーザー';

                    const { data: admins } = await supabase
                        .from('users')
                        .select('email')
                        .eq('receives_order_emails', true);

                    const toAddresses = (admins || []).map((a: Record<string, unknown>) => a.email as string).filter(Boolean);

                    if (toAddresses.length > 0) {
                        await sendWIPNotificationEmail({
                            userName,
                            toAddresses,
                            items: [{
                                productName: (product as Record<string, unknown>)?.name as string || '不明な商品',
                                quantity: quantity,
                                unit: (product as Record<string, unknown>)?.unit as string || '個',
                                destination: 'メーカー在庫',
                                note: '仕掛品からの移動'
                            }]
                        });
                    }
                } catch (emailError) {
                    console.error('WIP通知メール送信失敗:', emailError);
                }

                // WIPレコードは削除しない（フロントエンドで残数管理）
            } else {
                return NextResponse.json({ data: null, error: '対象の仕掛品データが見つかりません' }, { status: 404 })
            }
        } else if (action === 'confirm') {
            // 納期確定処理
            if (!confirmedDate || !quantity) {
                return NextResponse.json({ data: null, error: '日付と数量は必須です' }, { status: 400 })
            }

            // 1. 仕掛中データの更新
            const { data: wipItem, error: updateError } = await supabase
                .from('work_in_progress')
                .update({
                    quantity: quantity,
                    expected_completion: confirmedDate, // 具体的な日付で上書き
                    term_type: 'specific', // specificに変更
                    confirmation_status: 'confirmed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select('product_id')
                .single<{ product_id: string }>()

            if (updateError) throw updateError;
            if (!wipItem) throw new Error("仕掛中データが見つかりません");

            // 2. 入荷予定(incoming_stock)に登録
            await supabase
                .from('incoming_stock')
                .insert({
                    product_id: wipItem.product_id,
                    expected_date: confirmedDate,
                    quantity: quantity,
                    note: '仕掛中からの自動登録'
                } as Record<string, unknown>)

            // 3. メーカー在庫の更新 (指定がある場合)
            if (typeof supplierStock === 'number') {
                await supabase
                    .from('products')
                    .update({
                        supplier_stock: supplierStock,
                        supplier_stock_updated_at: new Date().toISOString()
                    })
                    .eq('id', wipItem.product_id)
            }

        } else if (action === 'cancel') {
            await supabase
                .from('work_in_progress')
                .update({ status: 'cancelled' })
                .eq('id', id)
        } else if (action === 'arrange_shipping') {
            // 出荷手配（完了扱いとして履歴に残す）
            await supabase
                .from('work_in_progress')
                .update({
                    status: 'completed',
                    confirmation_status: 'shipping_arranged',
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
        } else if (action === 'update' && updateData) {
            await supabase
                .from('work_in_progress')
                .update(updateData)
                .eq('id', id)
        }

        return NextResponse.json({ data: { success: true }, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// DELETE: 仕掛中を削除
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ data: null, error: 'IDが必要です' }, { status: 400 })
        }

        const { error } = await supabase
            .from('work_in_progress')
            .delete()
            .eq('id', id)

        if (error) {
            return NextResponse.json({ data: null, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data: { success: true }, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}
