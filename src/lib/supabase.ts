import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase 환경변수가 없습니다.");
}

if (!supabaseUrl.startsWith("https://") || !supabaseUrl.endsWith(".supabase.co")) {
  throw new Error("VITE_SUPABASE_URL은 https://<project-ref>.supabase.co 형식이어야 합니다.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: false,
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
  },
});
