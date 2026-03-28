
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
  const { data, error } = await supabase
    .from('sale_event_items')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching sale_event_items:', error);
  } else {
    console.log('Sample data:', data);
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('No data found in sale_event_items');
        // Try to get column info via RPC or just a safer query
        const { error: colError } = await supabase
            .from('sale_event_items')
            .select('is_produced')
            .limit(1);
        if (colError) {
            console.error('is_produced column likely missing:', colError.message);
        } else {
            console.log('is_produced column exists');
        }
    }
  }
}

checkColumn();
