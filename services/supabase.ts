
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
     return (import.meta as any).env[key];
  }
  return undefined;
};

const isValidUrl = (urlString: string) => {
    try { return Boolean(new URL(urlString)); } catch(e){ return false; }
}

let supabaseUrl = getEnv('VITE_SUPABASE_URL');
let supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

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

export const supabase = (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;

export const configureSupabase = (url: string, key: string) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.match(/^https?:\/\//)) cleanUrl = `https://${cleanUrl}`;
    if (!isValidUrl(cleanUrl)) throw new Error(`Invalid URL: ${cleanUrl}`);
    if (!key) throw new Error("API Key is missing");
    localStorage.setItem('tv_calendar_supabase_config', JSON.stringify({ url: cleanUrl, key: key.trim() }));
    window.location.reload();
};

export const clearSupabaseConfig = () => {
    localStorage.removeItem('tv_calendar_supabase_config');
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
