import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAddresses() {
  const { data, error } = await supabase.from('delivery_addresses').select('*').limit(5)
  if (error) {
    console.error('Address check error:', error)
  } else {
    console.log('Delivery Addresses:', data.map(a => ({
        id: a.id,
        name: a.name,
        postalCode: a.postal_code,
        address: a.address
    })))
  }
}

checkAddresses()
