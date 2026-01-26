const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImages() {
    const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('image_url', 'is', null);

    if (error) console.error(error);
    else console.log(`Products with images: ${count}`);
}

checkImages();
