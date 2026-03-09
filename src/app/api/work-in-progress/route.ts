import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendWIPNotificationEmail } from '@/lib/mail'
import type { ApiResponse } from '@/types'

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

// GET: 仕掛中一覧を取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<WorkInProgress[]>>> {
    try {
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

        // レスポンス形式に変換
        const items: WorkInProgress[] = (data || []).map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            productName: item.products?.name || '',
            productSku: item.products?.sku || '',
            quantity: item.quantity,
            startedAt: item.started_at,
            expectedCompletion: item.expected_completion,
            completedAt: item.completed_at,
            note: item.note,
            status: item.status as WorkInProgress['status'],
            termType: item.term_type || undefined,
            confirmationStatus: item.confirmation_status || undefined,
            createdAt: item.created_at
        }))

        return NextResponse.json({ data: items, error: null })
    } catch (error) {
        console.error('サーバーエラー:', error)
        return NextResponse.json(
            { data: null, error: 'サーバーエラーが発生しました' },
            { status: 500 }
        )
    }
}

// POST: 仕掛中を登録
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<WorkInProgress>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { productId, quantity, startedAt, expectedCompletion, note } = body as {
            productId: string
            quantity: number
            startedAt: string
            expectedCompletion?: string
            note?: string
        }

        // バリデーション
        if (!productId || !quantity || !startedAt) {
            return NextResponse.json(
                { data: null, error: '必須項目が不足しています' },
                { status: 400 }
            )
        }

        const { data, error } = await (supabase
            .from('work_in_progress') as any)
            .insert({
                product_id: productId,
                quantity,
                started_at: startedAt,
                expected_completion: expectedCompletion || null,
                note: note || null,
                status: 'in_progress',
                term_type: (body as any).termType || 'specific'
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

// PATCH: 仕掛中を更新（完了など）
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
    try {
        const supabase = createServerClient()
        const body = await request.json()

        const { id, action, data: updateData, confirmedDate, quantity, supplierStock, expectedDate } = body as {
            id: string
            action: 'to_incoming' | 'to_supplier' | 'cancel' | 'update' | 'confirm' | 'arrange_shipping'
            data?: Record<string, unknown>
            confirmedDate?: string
            quantity?: number
            supplierStock?: number
            expectedDate?: string
        }

        if (action === 'to_incoming') {
            // 仕掛品を入荷予定へ移動（複数スケジュール・部分移動対応）
            const { schedules } = body as { schedules: { expectedDate: string, quantity: number, note?: string }[] }

            if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
                return NextResponse.json({ data: null, error: '入荷予定のスケジュールが必要です' }, { status: 400 })
            }

            const { data: wipItem } = await supabase
                .from('work_in_progress')
                .select('product_id, products(name, unit)')
                .eq('id', id)
                .single<any>()

            if (wipItem) {
                const insertData = schedules.map(s => ({
                    product_id: wipItem.product_id,
                    expected_date: s.expectedDate,
                    quantity: s.quantity,
                    note: s.note || '仕掛品からの予定'
                }))

                const { error: insertError } = await supabase
                    .from('incoming_stock')
                    .insert(insertData as any)

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

                    const toAddresses = (admins || []).map((a: any) => a.email).filter(Boolean);

                    if (toAddresses.length > 0) {
                        await sendWIPNotificationEmail({
                            userName,
                            toAddresses,
                            items: schedules.map(s => ({
                                productName: wipItem.products?.name || '不明な商品',
                                quantity: s.quantity,
                                unit: wipItem.products?.unit || '個',
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
                .single<any>()

            if (wipItem) {
                // supplier_stock_lotsテーブルにロットとして追加
                await supabase
                    .from('supplier_stock_lots')
                    .insert({
                        product_id: wipItem.product_id,
                        stock_date: new Date().toISOString().split('T')[0],
                        quantity: quantity,
                        note: '仕掛品からの移動'
                    } as any)

                // メール通知用のデータ収集
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const userName = user?.user_metadata?.name || user?.email || 'システム利用ユーザー';

                    const { data: admins } = await supabase
                        .from('users')
                        .select('email')
                        .eq('receives_order_emails', true);

                    const toAddresses = (admins || []).map((a: any) => a.email).filter(Boolean);

                    if (toAddresses.length > 0) {
                        await sendWIPNotificationEmail({
                            userName,
                            toAddresses,
                            items: [{
                                productName: wipItem.products?.name || '不明な商品',
                                quantity: quantity,
                                unit: wipItem.products?.unit || '個',
                                destination: 'メーカー在庫',
                                note: '仕掛品からの移動'
                            }]
                        });
                    }
                } catch (emailError) {
                    console.error('WIP通知メール送信失敗:', emailError);
                }

                // WIPレコードは削除しない（フロントエンドで残数管理）
            }
        } else if (action === 'confirm') {
            // 納期確定処理
            if (!confirmedDate || !quantity) {
                return NextResponse.json({ data: null, error: '日付と数量は必須です' }, { status: 400 })
            }

            // 1. 仕掛中データの更新
            const { data: wipItem, error: updateError } = await (supabase
                .from('work_in_progress') as any)
                .update({
                    quantity: quantity,
                    expected_completion: confirmedDate, // 具体的な日付で上書き
                    term_type: 'specific', // specificに変更
                    confirmation_status: 'confirmed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select('product_id')
                .single()

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
                } as any)

            // 3. メーカー在庫の更新 (指定がある場合)
            if (typeof supplierStock === 'number') {
                await supabase
                    .from('products')
                    // @ts-ignore
                    .update({
                        supplier_stock: supplierStock,
                        supplier_stock_updated_at: new Date().toISOString()
                    })
                    .eq('id', wipItem.product_id)
            }

        } else if (action === 'cancel') {
            await (supabase
                .from('work_in_progress') as any)
                // @ts-ignore
                .update({ status: 'cancelled' })
                .eq('id', id)
        } else if (action === 'arrange_shipping') {
            // 出荷手配（完了扱いとして履歴に残す）
            await (supabase
                .from('work_in_progress') as any)
                // @ts-ignore
                .update({
                    status: 'completed',
                    confirmation_status: 'shipping_arranged',
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
        } else if (action === 'update' && updateData) {
            await (supabase
                .from('work_in_progress') as any)
                // @ts-ignore
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
        const supabase = createServerClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ data: null, error: 'IDが必要です' }, { status: 400 })
        }

        const { error } = await (supabase
            .from('work_in_progress') as any)
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
