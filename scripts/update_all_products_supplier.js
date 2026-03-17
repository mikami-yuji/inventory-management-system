
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSuppliers() {
  // 1. Find 株式会社アサヒパック
  const { data: supplier, error: sError } = await supabase
    .from('suppliers')
    .select('id')
    .ilike('name', '%アサヒパック%')
    .single();

  if (sError || !supplier) {
    console.error('Supplier "株式会社アサヒパック" not found:', sError);
    return;
  }

  console.log(`Found supplier ID: ${supplier.id}`);

  // 2. Update all products
  const { data: updated, error: pError, count } = await supabase
    .from('products')
    .update({ supplier_id: supplier.id })
    .neq('name', 'dummy_never_match') // Update all rows
    .select('id');

  if (pError) {
    console.error('Error updating products:', pError);
  } else {
    console.log(`Successfully updated ${updated.length} products to supplier: 株式会社アサヒパック`);
  }
}

updateSuppliers();
