import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance = null;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    console.warn('Supabase URL or Anon Key is missing. Cloud sync is disabled.');
  }
} catch (e) {
  console.error('Supabase initialization failed:', e);
}

export const supabase = supabaseInstance;
export const isSupabaseConfigured = !!supabaseInstance;
