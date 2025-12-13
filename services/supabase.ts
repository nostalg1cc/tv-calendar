import { createClient } from '@supabase/supabase-js';

// Access environment variables safely
// Cast to any to handle environments where import.meta.env might be undefined
const env = (import.meta as any).env;
const supabaseUrl = env?.VITE_SUPABASE_URL;
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY;

// Only create the client if keys exist to prevent runtime crash on local-only setups without env
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;