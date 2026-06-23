import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const createFallbackQuery = () => {
  const query: any = {
    select: async () => ({ data: [], error: null }),
    eq: () => query,
    order: () => query,
    insert: async () => ({ data: [], error: null }),
    update: async () => ({ data: [], error: null }),
    delete: async () => ({ data: [], error: null }),
    upsert: async () => ({ data: [], error: null }),
  };
  return query;
};

const createFallbackChannel = () => {
  const channel: any = {
    on: () => channel,
    subscribe: () => channel,
  };
  return channel;
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : {
      auth: {
        getSessionFromUrl: async () => ({ data: { session: null } }),
        getSession: async () => ({ data: { session: null } }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithOAuth: async () => ({ error: { message: "Supabase 환경변수가 없습니다." } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: createFallbackQuery,
      channel: createFallbackChannel,
      removeChannel: () => {},
    };
