import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, TraktProfile } from '../../types';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { setApiToken } from '../../services/tmdb';
import { del } from 'idb-keyval';
import { useSettings } from './SettingsContext';

interface AuthContextType {
    user: User | null;
    login: (username: string, apiKey: string) => void;
    logout: () => void;
    loginCloud: (session: any) => Promise<void>;
    updateUserKey: (apiKey: string) => void;
    isAuthenticated: boolean;
    authLoading: boolean;
    traktAuth: (clientId: string, clientSecret: string) => Promise<any>;
    traktPoll: (deviceCode: string, clientId: string, clientSecret: string) => Promise<any>;
    saveTraktToken: (tokenData: any) => Promise<void>;
    disconnectTrakt: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to parse settings from DB
const parseSettings = (input: any) => {
    if (!input) return {};
    let parsed = input;
    if (typeof input === 'string') {
        try {
            parsed = input.startsWith('"') && input.endsWith('"') ? JSON.parse(JSON.parse(input)) : JSON.parse(input);
        } catch (e) { return {}; }
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => { 
        try { return localStorage.getItem('tv_calendar_user') ? JSON.parse(localStorage.getItem('tv_calendar_user')!) : null; } catch { return null; } 
    });
    const [loading, setLoading] = useState(true);
    const { updateSettings } = useSettings();

    // Init Auth
    useEffect(() => {
        const init = async () => {
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    await loginCloud(session);
                } else {
                    if (!user) setLoading(false);
                    else setLoading(false); // Local user exists
                }

                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (event === 'SIGNED_IN' && session) await loginCloud(session);
                    else if (event === 'SIGNED_OUT') logout();
                });
                return () => subscription.unsubscribe();
            } else {
                setLoading(false);
            }
        };
        init();
    }, []);

    const loginCloud = async (session: any) => {
        if (!supabase) return;
        
        const { user: authUser } = session;

        // Optimization: If we already have this user loaded, do not re-fetch/re-render.
        // This prevents the "Loading..." screen from flashing when switching tabs/focusing window.
        if (user && user.id === authUser.id) {
            if (loading) setLoading(false);
            return;
        }

        setLoading(true);
        
        try {
            let { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
            if (!profile) {
                const { data: newProfile } = await supabase.from('profiles').insert([{ id: authUser.id, username: authUser.user_metadata?.username || 'User' }]).select().single();
                profile = newProfile;
            }

            if (profile) {
                if (profile.settings) updateSettings(parseSettings(profile.settings));

                const newUser: User = {
                    id: authUser.id,
                    username: profile.username || authUser.email,
                    email: authUser.email,
                    tmdbKey: profile.tmdb_key || '',
                    isAuthenticated: true,
                    isCloud: true,
                    traktToken: profile.trakt_token,
                    traktProfile: profile.trakt_profile,
                    fullSyncCompleted: profile.full_sync_completed
                };

                // Clear cache if switching users
                if (user && user.id && user.id !== authUser.id) {
                    await del('tv_calendar_episodes_v2');
                    await del('tv_calendar_meta_v2');
                }

                setApiToken(newUser.tmdbKey);
                setUser(newUser);
            }
        } catch (e) {
            console.error("Cloud Login Error", e);
        } finally {
            setLoading(false);
        }
    };

    const login = (username: string, apiKey: string) => {
        const newUser: User = { username, tmdbKey: apiKey, isAuthenticated: true, isCloud: false };
        setUser(newUser);
        setApiToken(apiKey);
        localStorage.setItem('tv_calendar_user', JSON.stringify(newUser));
    };

    const logout = async () => {
        if (user?.isCloud && supabase) await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('tv_calendar_user');
        del('tv_calendar_episodes_v2');
        del('tv_calendar_meta_v2');
        // Note: Data clearing is handled by DataContext watching user state or explicit call
    };

    const updateUserKey = async (apiKey: string) => {
        if (user) {
            const updated = { ...user, tmdbKey: apiKey };
            setUser(updated);
            setApiToken(apiKey);
            if (user.isCloud && supabase) {
                await supabase.from('profiles').update({ tmdb_key: apiKey }).eq('id', user.id);
            } else {
                localStorage.setItem('tv_calendar_user', JSON.stringify(updated));
            }
        }
    };
    
    // Trakt Logic
    const traktAuth = async (clientId: string, clientSecret: string) => {
        // Implementation from original service
        const TRAKT_API_URL = 'https://api.trakt.tv';
        const res = await fetch(`${TRAKT_API_URL}/oauth/device/code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: clientId })
        });
        if (!res.ok) throw new Error('Failed to reach Trakt');
        return res.json();
    };

    const traktPoll = async (deviceCode: string, clientId: string, clientSecret: string) => {
        const TRAKT_API_URL = 'https://api.trakt.tv';
        const res = await fetch(`${TRAKT_API_URL}/oauth/device/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: deviceCode, client_id: clientId, client_secret: clientSecret })
        });
        return { status: res.status, data: await res.json().catch(() => ({})) }; 
    };

    const saveTraktToken = async (tokenData: any) => {
        if (!user) return;
        // Fetch Profile
        const res = await fetch('https://api.trakt.tv/users/me?extended=full', {
            headers: { 
                'Content-Type': 'application/json', 
                'trakt-api-version': '2', 
                'trakt-api-key': localStorage.getItem('trakt_client_id') || 'e577265a0729792679263900976f75567793575975259727529',
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });
        const profile = await res.json();
        const updated = { ...user, traktToken: { ...tokenData, created_at: Date.now() / 1000 }, traktProfile: profile };
        setUser(updated);
        
        if (user.isCloud && supabase) {
            await supabase.from('profiles').update({ trakt_token: updated.traktToken, trakt_profile: profile }).eq('id', user.id);
        } else {
            localStorage.setItem('tv_calendar_user', JSON.stringify(updated));
        }
    };

    const disconnectTrakt = async () => {
        if (!user) return;
        const updated = { ...user, traktToken: undefined, traktProfile: undefined };
        setUser(updated);
        if (user.isCloud && supabase) {
            await supabase.from('profiles').update({ trakt_token: null, trakt_profile: null }).eq('id', user.id);
        } else {
            localStorage.setItem('tv_calendar_user', JSON.stringify(updated));
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loginCloud, updateUserKey, isAuthenticated: !!user, authLoading: loading, traktAuth, traktPoll, saveTraktToken, disconnectTrakt }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};