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

      const isPlaceholder = !url || !key || url.includes('your-project') || key.includes('your-anon-key');

      if (isPlaceholder) {
        // If it's a placeholder, we return a dummy function for any method call
        // to prevent the app from crashing, but we log a warning.
        return (...args: any[]) => {
          console.warn(`Supabase method "${String(prop)}" called but Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`);
          return {
            on: () => ({ on: () => ({ subscribe: () => ({}) }) }),
            subscribe: () => ({}),
            channel: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }) }),
          };
        };
      }
      
      _supabase = createClient(url, key);
    }
    
    const value = Reflect.get(_supabase, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(_supabase);
    }
    return value;
  },
});
