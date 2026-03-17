const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// ローカルのSupabaseコンテナに接続するための文字列
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({ connectionString });

async function migrate() {
    await client.connect();
    try {
        console.log('Attempting to add delivery_postal_code column to orders table...');
        await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_postal_code TEXT;');
        console.log('Successfully applied migration.');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}
migrate();
