import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260516_add_price_revisions.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('Applying migration...')
  const { error } = await supabase.rpc('exec_sql', { sql_string: sql })

  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
        console.log('exec_sql function missing. Trying direct query if possible...')
        // Since we can't run arbitrary SQL via the standard JS client without a function,
        // we might be stuck if the user hasn't set up the exec_sql function.
        // However, we can try to use the migration tool or ask the user.
        // But wait, many Supabase setups have a 'query' or similar.
        console.error('Error: exec_sql function does not exist in your Supabase project.')
    } else {
        console.error('Migration error:', error)
    }
  } else {
    console.log('Migration applied successfully!')
  }
}

applyMigration()
