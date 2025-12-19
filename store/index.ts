

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppSettings, DEFAULT_SETTINGS, TVShow, User, WatchedItem, Reminder } from '../types';
import { supabase } from '../services/supabase';
import { setApiToken } from '../services/tmdb';

interface State {
    user: User | null;
    isAuthenticated: boolean;
    
    settings: AppSettings;
    watchlist: TVShow[]; 
    history: Record<string, WatchedItem>; 
    
    reminders: Reminder[];
    calendarDate: Date;
    calendarScrollPos: number;
    isSearchOpen: boolean;
    reminderCandidate: TVShow | null;

    login: (user: User) => void;
    logout: () => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    
    addToWatchlist: (show: TVShow) => void;
    removeFromWatchlist: (id: number) => void;
    toggleWatched: (item: Partial<WatchedItem> & { tmdb_id: number; media_type: 'tv' | 'movie' | 'episode' }) => void;
    setRating: (id: number, mediaType: 'tv' | 'movie' | 'episode', rating: number) => void;
    
    addReminder: (reminder: Reminder) => Promise<void>;
    removeReminder: (id: string) => Promise<void>;
    
    setCalendarDate: (date: Date) => void;
    setCalendarScrollPos: (pos: number) => void;
    setIsSearchOpen: (isOpen: boolean) => void;
    setReminderCandidate: (show: TVShow | null) => void;
    
    isSyncing: boolean;
    triggerCloudSync: () => Promise<void>;
    
    // Migration helpers
    fullSyncRequired?: boolean;
    performFullSync?: (settings?: Partial<AppSettings>) => void;
    syncProgress?: { current: number, total: number };
    
    // Alias for legacy support if needed, though we use watchlist in components
    allTrackedShows?: TVShow[];
}

export const useStore = create<State>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            settings: DEFAULT_SETTINGS,
            watchlist: [],
            history: {},
            reminders: [],
            isSyncing: false,
            
            // UI State (non-persisted usually, but simplified here)
            calendarDate: new Date(),
            calendarScrollPos: 0,
            isSearchOpen: false,
            reminderCandidate: null,

            login: (user) => {
                set({ user, isAuthenticated: true });
                if (user.tmdb_key) setApiToken(user.tmdb_key);
                if (user.is_cloud) get().triggerCloudSync();
            },

            logout: () => {
                set({ user: null, isAuthenticated: false, watchlist: [], history: {}, reminders: [] });
                if (supabase) supabase.auth.signOut();
            },

            updateSettings: (newSettings) => {
                set((state) => {
                    const merged = { ...state.settings, ...newSettings };
                    document.body.setAttribute('data-base-theme', merged.baseTheme === 'auto' ? 'cosmic' : merged.baseTheme);
                    document.body.setAttribute('data-font', merged.appFont);
                    
                    if (state.user?.is_cloud) {
                        supabase?.from('profiles').update({ settings: merged }).eq('id', state.user.id).then();
                    }
                    return { settings: merged };
                });
            },

            addToWatchlist: (show) => {
                set((state) => {
                    if (state.watchlist.some(s => s.id === show.id)) return state;
                    const next = [...state.watchlist, show];
                    
                    if (state.user?.is_cloud) {
                        supabase?.from('watchlist').upsert({
                            user_id: state.user.id,
                            tmdb_id: show.id,
                            media_type: show.media_type,
                            name: show.name,
                            poster_path: show.poster_path,
                            backdrop_path: show.backdrop_path,
                            overview: show.overview,
                            first_air_date: show.first_air_date,
                            vote_average: show.vote_average
                        }).then();
                    }
                    return { watchlist: next };
                });
            },

            removeFromWatchlist: (id) => {
                set((state) => {
                    const next = state.watchlist.filter(s => s.id !== id);
                    if (state.user?.is_cloud) {
                        supabase?.from('watchlist').delete().match({ user_id: state.user.id, tmdb_id: id }).then();
                    }
                    return { watchlist: next };
                });
            },

            toggleWatched: (item) => {
                set((state) => {
                    const key = item.media_type === 'episode' 
                        ? `episode-${item.tmdb_id}-${item.season_number}-${item.episode_number}`
                        : `${item.media_type}-${item.tmdb_id}`;
                    
                    const exists = state.history[key];
                    const nextStatus = !exists?.is_watched;
                    
                    const newItem: WatchedItem = { 
                        tmdb_id: item.tmdb_id,
                        media_type: item.media_type,
                        season_number: item.season_number,
                        episode_number: item.episode_number,
                        is_watched: nextStatus, 
                        watched_at: nextStatus ? new Date().toISOString() : undefined,
                        rating: exists?.rating
                    };
                    
                    const nextHistory = { ...state.history, [key]: newItem };

                    if (state.user?.is_cloud) {
                        supabase?.from('interactions').upsert({
                            user_id: state.user.id,
                            tmdb_id: item.tmdb_id,
                            media_type: item.media_type,
                            season_number: item.season_number ?? -1,
                            episode_number: item.episode_number ?? -1,
                            is_watched: nextStatus,
                            watched_at: newItem.watched_at,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'user_id,tmdb_id,media_type,season_number,episode_number' }).then();
                    }
                    
                    return { history: nextHistory };
                });
            },

            setRating: (id, mediaType, rating) => {
                 set((state) => {
                    const key = `${mediaType}-${id}`;
                    const exists = state.history[key] || { tmdb_id: id, media_type: mediaType, is_watched: false };
                    const newItem = { ...exists, rating };
                    const nextHistory = { ...state.history, [key]: newItem };
                    
                    if (state.user?.is_cloud) {
                         supabase?.from('interactions').upsert({
                            user_id: state.user.id,
                            tmdb_id: id,
                            media_type: mediaType,
                            season_number: -1,
                            episode_number: -1,
                            rating: rating,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'user_id,tmdb_id,media_type,season_number,episode_number' }).then();
                    }
                    return { history: nextHistory };
                 });
            },

            addReminder: async (reminder) => {
                set(s => ({ reminders: [...s.reminders, { ...reminder, id: Math.random().toString() }] }));
            },
            
            removeReminder: async (id) => {
                set(s => ({ reminders: s.reminders.filter(r => r.id !== id) }));
            },

            setCalendarDate: (date) => set({ calendarDate: date }),
            setCalendarScrollPos: (pos) => set({ calendarScrollPos: pos }),
            setIsSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
            setReminderCandidate: (show) => set({ reminderCandidate: show }),

            triggerCloudSync: async () => {
                const { user } = get();
                if (!user || !user.is_cloud || !supabase) return;
                
                set({ isSyncing: true });
                try {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                    if (profile?.settings) set(s => ({ settings: { ...s.settings, ...profile.settings } }));

                    const { data: watchlist } = await supabase.from('watchlist').select('*');
                    if (watchlist) {
                        const mapped = watchlist.map((w: any) => ({
                            id: w.tmdb_id,
                            name: w.name,
                            media_type: w.media_type,
                            poster_path: w.poster_path,
                            backdrop_path: w.backdrop_path,
                            overview: w.overview,
                            first_air_date: w.first_air_date,
                            vote_average: w.vote_average
                        }));
                        set({ watchlist: mapped });
                    }

                    const { data: history } = await supabase.from('interactions').select('*');
                    if (history) {
                        const map: Record<string, WatchedItem> = {};
                        history.forEach((h: any) => {
                            const key = h.media_type === 'episode' 
                                ? `episode-${h.tmdb_id}-${h.season_number}-${h.episode_number}`
                                : `${h.media_type}-${h.tmdb_id}`;
                            map[key] = {
                                tmdb_id: h.tmdb_id,
                                media_type: h.media_type,
                                season_number: h.season_number,
                                episode_number: h.episode_number,
                                is_watched: h.is_watched,
                                rating: h.rating,
                                watched_at: h.watched_at
                            };
                        });
                        set({ history: map });
                    }
                } catch (e) {
                    console.error("Sync error", e);
                } finally {
                    set({ isSyncing: false });
                }
            }
        }),
        {
            name: 'tv_calendar_v2_store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ 
                user: state.user, 
                settings: state.settings,
                watchlist: state.watchlist,
                history: state.history,
                reminders: state.reminders 
            }), 
        }
    )
);