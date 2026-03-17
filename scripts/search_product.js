import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findProduct() {
  const { data, error } = await supabase.from('products')
    .select('*')
    .or('sku.eq.1118986,name.ilike.%1118986%')
    .limit(10)
    
  if (error) {
    console.error('Product search error:', error)
  } else {
    console.log('Search results:', data.map(d => ({
        id: d.id,
        name: d.name,
        sku: d.sku,
        shape: d.shape,
        category: d.category
    })))
  }
}

findProduct()
