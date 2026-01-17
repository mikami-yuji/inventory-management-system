import { createClient } from '@supabase/supabase-js'

// 環境変数からSupabase接続情報を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// クライアント用Supabaseクライアント
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// サーバー用Supabaseクライアント（Service Role Key使用）
export const createServerClient = (): ReturnType<typeof createClient> => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey)
}
