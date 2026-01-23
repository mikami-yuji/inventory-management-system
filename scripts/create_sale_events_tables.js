const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSaleEventsTables() {
    console.log('=== 特売イベントテーブルを作成 ===\n');

    // 特売イベントテーブルを作成
    const { error: error1 } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS sale_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_name TEXT NOT NULL,
                schedule_type TEXT NOT NULL DEFAULT 'single',
                dates DATE[] NOT NULL,
                status TEXT NOT NULL DEFAULT 'upcoming',
                description TEXT,
                created_by UUID,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    });

    if (error1) {
        console.log('RPCが使えません。直接SQLを実行します...');

        // テーブルが存在するか確認
        const { data: tables, error: checkError } = await supabase
            .from('sale_events')
            .select('id')
            .limit(1);

        if (checkError && checkError.code === '42P01') {
            console.log('sale_eventsテーブルが存在しません。');
            console.log('\n以下のSQLをSupabaseのSQL Editorで実行してください：\n');
            console.log(`
-- 特売イベントテーブル
CREATE TABLE IF NOT EXISTS sale_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    schedule_type TEXT NOT NULL DEFAULT 'single',
    dates DATE[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    description TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 特売イベント商品テーブル
CREATE TABLE IF NOT EXISTS sale_event_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES sale_events(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    planned_quantity INTEGER NOT NULL DEFAULT 0,
    allocated_quantity INTEGER NOT NULL DEFAULT 0,
    actual_quantity INTEGER,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, product_id)
);

-- RLSを有効化
ALTER TABLE sale_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_event_items ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがアクセス可能なポリシー
CREATE POLICY "Allow all for sale_events" ON sale_events FOR ALL USING (true);
CREATE POLICY "Allow all for sale_event_items" ON sale_event_items FOR ALL USING (true);
            `);
        } else if (!checkError) {
            console.log('✅ sale_eventsテーブルは既に存在します');

            // sale_event_itemsも確認
            const { error: checkError2 } = await supabase
                .from('sale_event_items')
                .select('id')
                .limit(1);

            if (checkError2 && checkError2.code === '42P01') {
                console.log('sale_event_itemsテーブルが存在しません。');
            } else if (!checkError2) {
                console.log('✅ sale_event_itemsテーブルは既に存在します');
                console.log('\n両方のテーブルが存在します。準備完了！');
            }
        }
    } else {
        console.log('✅ テーブル作成完了');
    }
}

createSaleEventsTables();
