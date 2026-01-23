const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetStickerInventory() {
    console.log('=== シール商品の在庫をリセット ===\n');

    // シール商品のIDを取得
    const { data: stickerProducts, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('category', 'sticker');

    if (productError) {
        console.error('Error fetching sticker products:', productError);
        return;
    }

    const stickerIds = stickerProducts.map(p => p.id);
    console.log(`対象シール商品数: ${stickerIds.length}件`);

    // シール商品の在庫レコードを削除
    const { error: deleteError, count } = await supabase
        .from('inventory')
        .delete()
        .in('product_id', stickerIds);

    if (deleteError) {
        console.error('Error deleting sticker inventory:', deleteError);
        return;
    }

    console.log(`削除完了: シール商品の在庫レコードを削除しました`);
    console.log('シール商品は在庫0として表示されます。');
}

resetStickerInventory();
