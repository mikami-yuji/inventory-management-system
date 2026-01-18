/**
 * Supabaseデータソース
 * Supabaseデータベースからデータを取得・更新するサービス
 */

import { supabase } from '@/lib/supabase';
import type {
    Product,
    Inventory,
    IncomingStock,
    Order,
    SpecialEvent,
    EventStock,
    User,
    StockHistory,
} from '@/types';

// 商品データを取得
export const getProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name');

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }

    return data.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        janCode: item.jan_code,
        weight: item.weight ? Number(item.weight) : undefined,
        shape: item.shape,
        material: item.material,
        unitPrice: Number(item.unit_price),
        printingCost: Number(item.printing_cost),
        category: item.category as Product['category'],
        imageUrl: item.image_url,
        description: item.description,
        status: item.status as 'active' | 'inactive',
        minStockAlert: item.min_stock_alert,
    }));
};

// 在庫データを取得
export const getInventory = async (): Promise<Inventory[]> => {
    const { data, error } = await supabase
        .from('inventory')
        .select('*');

    if (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }

    return data.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        updatedAt: item.updated_at,
    }));
};

// 入荷予定データを取得
export const getIncomingStock = async (): Promise<IncomingStock[]> => {
    const { data, error } = await supabase
        .from('incoming_stock')
        .select('*')
        .order('expected_date');

    if (error) {
        console.error('Error fetching incoming stock:', error);
        return [];
    }

    return data.map(item => ({
        id: item.id,
        productId: item.product_id,
        expectedDate: item.expected_date,
        quantity: item.quantity,
        note: item.note,
    }));
};

// 発注データを取得
export const getOrders = async (): Promise<Order[]> => {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (
                id,
                product_id,
                quantity
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }

    return data.map(item => ({
        id: item.id,
        clientId: item.client_id,
        status: item.status as Order['status'],
        type: item.type as Order['type'],
        eventId: item.event_id,
        createdAt: item.created_at,
        items: item.order_items.map((oi: { product_id: string; quantity: number }) => ({
            productId: oi.product_id,
            quantity: oi.quantity,
        })),
    }));
};

// イベントデータを取得
export const getEvents = async (): Promise<SpecialEvent[]> => {
    const { data, error } = await supabase
        .from('special_events')
        .select('*')
        .order('start_date', { ascending: false });

    if (error) {
        console.error('Error fetching events:', error);
        return [];
    }

    return data.map(item => ({
        id: item.id,
        clientId: item.client_id,
        name: item.name,
        startDate: item.start_date,
        endDate: item.end_date,
        status: item.status as SpecialEvent['status'],
        description: item.description,
    }));
};

// イベント在庫データを取得
export const getEventStock = async (): Promise<EventStock[]> => {
    const { data, error } = await supabase
        .from('event_stocks')
        .select('*');

    if (error) {
        console.error('Error fetching event stock:', error);
        return [];
    }

    return data.map(item => ({
        eventId: item.event_id,
        productId: item.product_id,
        allocatedQuantity: item.allocated_quantity,
        currentQuantity: item.current_quantity,
    }));
};

// 在庫履歴データを取得
export const getStockHistory = async (): Promise<StockHistory[]> => {
    const { data, error } = await supabase
        .from('stock_history')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching stock history:', error);
        return [];
    }

    return data.map(item => ({
        id: item.id,
        productId: item.product_id,
        date: item.created_at,
        quantity: item.quantity,
        type: item.type as StockHistory['type'],
        changeAmount: item.quantity,
        note: item.note,
    }));
};

// ユーザーデータを取得
export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*');

    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }

    return data.map(item => ({
        id: item.id,
        email: item.email,
        name: item.name,
        role: item.role as 'admin' | 'client',
    }));
};

// 在庫を更新
export const updateInventory = async (productId: string, quantity: number): Promise<boolean> => {
    const { error } = await supabase
        .from('inventory')
        .upsert({
            product_id: productId,
            quantity,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'product_id',
        });

    if (error) {
        console.error('Error updating inventory:', error);
        return false;
    }

    return true;
};

// 在庫履歴を追加
export const addStockHistory = async (
    productId: string,
    quantity: number,
    type: StockHistory['type'],
    note?: string
): Promise<boolean> => {
    const { error } = await supabase
        .from('stock_history')
        .insert({
            product_id: productId,
            quantity,
            type,
            note,
        });

    if (error) {
        console.error('Error adding stock history:', error);
        return false;
    }

    return true;
};

// Supabaseデータソースをエクスポート
export const supabaseDataSource = {
    getProducts,
    getInventory,
    getIncomingStock,
    getOrders,
    getEvents,
    getEventStock,
    getStockHistory,
    getUsers,
    updateInventory,
    addStockHistory,
};
