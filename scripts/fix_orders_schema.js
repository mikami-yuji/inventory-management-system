const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// ローカルのSupabaseコンテナに接続するための文字列
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({ connectionString });

async function migrate() {
    await client.connect();
    try {
        await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferred_shape TEXT;');
        console.log('Successfully added preferred_shape column.');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}
migrate();
