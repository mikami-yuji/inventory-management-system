import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 環境変数からSupabase接続情報を取得（未設定時はビルドエラーを防ぐためのフォールバック）
const getSupabaseUrl = (): string => process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const getSupabaseAnonKey = (): string => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// クライアント用Supabaseクライアント
export const supabase: SupabaseClient = createClient(
  getSupabaseUrl(),
  getSupabaseAnonKey()
)

// サーバー用Supabaseクライアント（Service Role Key使用）
export const createServerClient = (): SupabaseClient => {
  const supabaseUrl = getSupabaseUrl()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getSupabaseAnonKey()
  return createClient(supabaseUrl, serviceRoleKey)
}

