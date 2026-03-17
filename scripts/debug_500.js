import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugQueries() {
  console.log('Testing orders select...')
  const { data: o, error: oe } = await supabase.from('orders').select('*').limit(1)
  if (oe) console.error('Orders select error:', oe)
  else console.log('Orders select success')

  console.log('Testing products category select...')
  const { data: p, error: pe } = await supabase.from('products').select('id, category').limit(1)
  if (pe) console.error('Products category select error:', pe)
  else console.log('Products category select success')

  console.log('Testing items join...')
  const { data: i, error: ie } = await supabase.from('order_items').select('id, products(id, category)').limit(1)
  if (ie) console.error('Items join error:', ie)
  else console.log('Items join success')
}

debugQueries()
