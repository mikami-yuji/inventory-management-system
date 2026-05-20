const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// ローカルのSupabase（Docker）のデフォルト接続文字列、または環境変数
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function runMigration() {
    const client = new Client({ connectionString });
    
    try {
        await client.connect();
        console.log('データベースに接続しました。');

        const migrationPath = path.join(__dirname, '../supabase/migrations/20260516_add_price_revisions.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('SQLを実行中...');
        await client.query(sql);
        
        console.log('✅ スキーマ移行が完了しました！');
    } catch (err) {
        console.error('❌ 移行中にエラーが発生しました:', err.message);
        console.log('\nヒント: DATABASE_URL が設定されていないか、ローカルのSupabaseが起動していない可能性があります。');
        console.log('その場合は、supabase/migrations/20260516_add_price_revisions.sql の内容を、Supabase DashboardのSQL Editorに貼り付けて実行してください。');
    } finally {
        await client.end();
    }
}

runMigration();
