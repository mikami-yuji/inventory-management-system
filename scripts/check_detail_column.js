const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    console.log('Checking for supplier_stock_detail column...');

    // データがあるかに関わらず、カラム指定でselectしてみる
    const { data, error } = await supabase
        .from('products')
        .select('supplier_stock_detail')
        .limit(1);

    if (error) {
        console.log('❌ Column NOT found (or other error):', error.message);
    } else {
        console.log('✅ Column exists!');
    }
}

checkColumn();
