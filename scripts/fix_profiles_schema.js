const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const client = new Client({ connectionString });

async function migrate() {
    await client.connect();
    try {
        await client.query('ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "receives_order_emails" boolean DEFAULT false;');
        console.log('Successfully added receives_order_emails column to profiles.');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}
migrate();
