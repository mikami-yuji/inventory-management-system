const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Environment variables missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking database schema...');

    // productsテーブルの列情報を取得（1行だけ取得してキーを確認）
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No products found, cannot verify columns strictly via select.');
        return;
    }

    const columns = Object.keys(data[0]);
    const requiredColumns = [
        'product_code',
        'product_type',
        'prefix',
        'origin',
        'variety',
        'suffix'
    ];

    console.log('\n--- Verification Results ---');
    let allExist = true;

    requiredColumns.forEach(col => {
        const exists = columns.includes(col);
        console.log(`${col}: ${exists ? '✅ Exists' : '❌ MISSING'}`);
        if (!exists) allExist = false;
    });

    if (allExist) {
        console.log('\nResult: Database is up to date! 🎉');
    } else {
        console.log('\nResult: Some columns are missing. Migration is required.');
    }
}

checkSchema();
