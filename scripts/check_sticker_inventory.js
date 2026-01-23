const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStickerInventory() {
    console.log('=== シール商品の在庫状況 ===\n');

    // シール商品を取得
    const { data: stickerProducts, error: productError } = await supabase
        .from('products')
        .select('id, name, sku, category')
        .eq('category', 'sticker');

    if (productError) {
        console.error('Error fetching sticker products:', productError);
        return;
    }

    console.log(`シール商品数: ${stickerProducts.length}件\n`);

    // 各シール商品の在庫を確認
    for (const product of stickerProducts) {
        const { data: inventory } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('product_id', product.id)
            .single();

        const qty = inventory?.quantity ?? 'なし';
        console.log(`${product.name} (${product.sku}): ${qty}`);
    }
}

checkStickerInventory();
