import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

/**
 * Lazy-initialized Supabase client.
 * This prevents the app from crashing on startup if environment variables are missing.
 * It will throw a clear error only when accessed for the first time.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    if (!_supabase) {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error(
          'Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the app settings.'
        );
      }
      _supabase = createClient(url, key);
    }
    return Reflect.get(_supabase, prop, receiver);
  },
});
