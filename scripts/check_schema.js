import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  const { data, error } = await supabase.from('orders').select('*').limit(1)
  if (error) {
    console.error('Schema check error:', error)
  } else {
    console.log('Columns in orders table:', Object.keys(data[0] || {}))
  }
}

checkSchema()
