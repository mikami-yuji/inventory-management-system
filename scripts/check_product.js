import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProduct() {
  const { data, error } = await supabase.from('products').select('*').eq('id', '1118986').single()
  if (error) {
    console.error('Product check error:', error)
  } else {
    console.log('Product 1118986:', {
        name: data.name,
        shape: data.shape,
        category: data.category,
        metersPerRoll: data.meters_per_roll
    })
  }
}

checkProduct()
