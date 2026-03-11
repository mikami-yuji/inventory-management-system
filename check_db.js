/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, key)

async function check() {
    console.log("Checking User: b007d7d0-1735-492e-bd65-396d03ecde7d")
    const { data: user, error: userError } = await supabase.auth.admin.getUserById('b007d7d0-1735-492e-bd65-396d03ecde7d')
    console.log("Auth User Data:", JSON.stringify(user, null, 2))
    if (userError) console.error("Auth User Error:", userError)

    const { data: dbUser, error: dbError } = await supabase.from('users').select('*').eq('id', 'b007d7d0-1735-492e-bd65-396d03ecde7d')
    console.log("Public Users Table Data:", JSON.stringify(dbUser, null, 2))
    if (dbError) console.error("DB Error:", dbError)
}

check()
