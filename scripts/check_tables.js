const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
    console.log('=== テーブル存在確認 ===\n');

    // sale_eventsテーブル確認
    const { data: data1, error: error1 } = await supabase
        .from('sale_events')
        .select('id')
        .limit(1);

    if (error1) {
        console.log('❌ sale_events:', error1.message);
    } else {
        console.log('✅ sale_events テーブル: 存在します');
    }

    // sale_event_itemsテーブル確認
    const { data: data2, error: error2 } = await supabase
        .from('sale_event_items')
        .select('id')
        .limit(1);

    if (error2) {
        console.log('❌ sale_event_items:', error2.message);
    } else {
        console.log('✅ sale_event_items テーブル: 存在します');
    }

    console.log('\n確認完了');
}

checkTables();
