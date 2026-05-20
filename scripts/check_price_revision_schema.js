import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  console.log('--- 診断開始 ---')

  // 1. price_revisions テーブルの存在確認
  console.log('1. price_revisions テーブルの確認...')
  const { error: prError } = await supabase.from('price_revisions').select('id').limit(1)
  if (prError) {
    console.error('❌ price_revisions テーブルにアクセスできません:', prError.message)
  } else {
    console.log('✅ price_revisions テーブルは存在します')
  }

  // 2. order_items の新カラム確認
  console.log('\n2. order_items の unit_price, printing_cost カラムの確認...')
  const { error: oiError } = await supabase.from('order_items').select('unit_price, printing_cost').limit(1)
  if (oiError) {
    console.error('❌ order_items の新カラムにアクセスできません:', oiError.message)
  } else {
    console.log('✅ order_items の新カラムは存在します')
  }

  // 3. products の確認
  console.log('\n3. products テーブルの確認...')
  const { error: pError } = await supabase.from('products').select('id, unit_price').limit(1)
  if (pError) {
    console.error('❌ products テーブルにアクセスできません:', pError.message)
  } else {
    console.log('✅ products テーブルは正常です')
  }

  // 4. Join の確認
  console.log('\n4. Join クエリの確認...')
  const { error: jError } = await supabase.from('products').select('id, suppliers(name)').limit(1)
  if (jError) {
    console.error('❌ suppliers との Join に失敗しました:', jError.message)
  } else {
    console.log('✅ suppliers との Join は正常です')
  }

  const { error: prjError } = await supabase.from('products').select('id, price_revisions(*)').limit(1)
  if (prjError) {
    console.error('❌ price_revisions との Join に失敗しました:', prjError.message)
  } else {
    console.log('✅ price_revisions との Join は正常です')
  }

  console.log('\n--- 診断終了 ---')
}

checkSchema()
