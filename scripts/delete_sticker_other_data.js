const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteData() {
    const categoriesToDelete = ['sticker', 'other'];

    console.log(`Deleting products with categories: ${categoriesToDelete.join(', ')}`);

    // 1. 対象のProduct IDを取得
    const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, name, category')
        .in('category', categoriesToDelete);

    if (fetchError) {
        console.error('Error fetching products:', fetchError);
        return;
    }

    if (!products || products.length === 0) {
        console.log('No products found to delete.');
        return;
    }

    console.log(`Found ${products.length} products to delete.`);
    const productIds = products.map(p => p.id);

    // 2. 関連テーブルのデータ削除 (FK制約がCASCADEでない場合のため念のため)
    // inventory
    const { error: invError } = await supabase
        .from('inventory')
        .delete()
        .in('product_id', productIds);
    if (invError) console.error('Error deleting inventory:', invError);
    else console.log('Deleted related inventory records.');

    // incoming_stock
    const { error: incError } = await supabase
        .from('incoming_stock')
        .delete()
        .in('product_id', productIds);
    if (incError) console.error('Error deleting incoming_stock:', incError);
    else console.log('Deleted related incoming_stock records.');

    // 3. Products削除
    const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .in('id', productIds);

    if (deleteError) {
        console.error('Error deleting products:', deleteError);
    } else {
        console.log(`Successfully deleted ${products.length} products.`);
    }
}

deleteData();
