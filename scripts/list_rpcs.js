import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listRPCs() {
  const { data, error } = await supabase.rpc('get_functions', {}) // Some people add a 'get_functions' helper
  if (error) {
    // If get_functions doesn't exist, try querying the information_schema via a trick
    // Wait, without an RPC we can't query the schema.
    console.error('RPC listing failed:', error.message)
    
    // Attempting a common hack: querying a system view via a table that might exist
    const { data: d, error: e } = await supabase.from('users').select('count', { count: 'exact', head: true })
    console.log('Users table exists:', !e)
  } else {
    console.log('Available RPCs:', data)
  }
}

listRPCs()
