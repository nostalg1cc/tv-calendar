import { createClient } from '@supabase/supabase-js';

// Robust environment variable accessor
const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
     return (import.meta as any).env[key];
  }
  try {
    if (typeof process !== 'undefined' && process.env) {
       return process.env[key];
    }
  } catch (e) {
    // Ignore
  }
  return undefined;
};

// Helper to check if a string is a valid URL
const isValidUrl = (urlString: string) => {
    try { 
        return Boolean(new URL(urlString)); 
    }
    catch(e){ 
        return false; 
    }
}

// 1. Try Environment Variables
let supabaseUrl = getEnv('VITE_SUPABASE_URL');
let supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// 2. Try LocalStorage (Runtime Config for GitHub Pages)
// We check if Env vars are missing OR invalid
if (!supabaseUrl || !isValidUrl(supabaseUrl)) {
    try {
        const stored = localStorage.getItem('tv_calendar_supabase_config');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.url && parsed.key) {
                supabaseUrl = parsed.url;
                supabaseAnonKey = parsed.key;
            }
        }
    } catch (e) {
        console.warn("Failed to load local supabase config", e);
    }
}

// Only create the client if keys exist AND URL is valid
export const supabase = (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;

// Helper to save manual configuration
export const configureSupabase = (url: string, key: string) => {
    let cleanUrl = url.trim();
    // Auto-prepend https if missing
    if (!cleanUrl.match(/^https?:\/\//)) {
        cleanUrl = `https://${cleanUrl}`;
    }

    if (!isValidUrl(cleanUrl)) throw new Error(`Invalid URL: ${cleanUrl}`);
    if (!key) throw new Error("API Key is missing");
    
    localStorage.setItem('tv_calendar_supabase_config', JSON.stringify({ url: cleanUrl, key: key.trim() }));
    
    // Force reload
    window.location.reload();
};

export const getStoredSupabaseConfig = () => {
    try {
        const stored = localStorage.getItem('tv_calendar_supabase_config');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

export const clearSupabaseConfig = () => {
    localStorage.removeItem('tv_calendar_supabase_config');
    window.location.reload();
};