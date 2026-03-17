const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkErrorLogs() {
  const { data: logs, error } = await supabase
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log('--- Recent Error Logs ---');
  logs.forEach(log => {
    console.log(`[${log.created_at}] ${log.method} ${log.route}: ${log.error_message}`);
  });
}

async function checkNotificationUsers() {
  const { data: users, error } = await supabase
    .from('users')
    .select('name, email, receives_order_emails')
    .eq('receives_order_emails', true);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('\n--- Users with receives_order_emails=true ---');
  users.forEach(user => {
    console.log(`${user.name} (${user.email})`);
  });
}

(async () => {
  await checkErrorLogs();
  await checkNotificationUsers();
})();
