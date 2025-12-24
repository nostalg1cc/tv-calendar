
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppSettings, DEFAULT_SETTINGS, TVShow, User, WatchedItem, Reminder } from '../types';
import { supabase } from '../services/supabase';
import { setApiToken } from '../services/tmdb';

interface State {
    user: User | null;
    
    settings: AppSettings;
    watchlist: TVShow[]; 
    history: Record<string, WatchedItem>; 
    
    reminders: Reminder[];
    calendarDate: Date;
    calendarScrollPos: number;
    isSearchOpen: boolean;
    reminderCandidate: TVShow | null;

    // Added for compatibility
    subscribedLists: any[];
    isMobileWarningOpen: boolean;
    closeMobileWarning: (forever: boolean) => void;
    importBackup: (data: any) => void;
    processSyncPayload: (payload: string) => void;

    login: (user: User) => void;
    logout: () => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    
    addToWatchlist: (show: TVShow) => void;
    removeFromWatchlist: (id: number) => void;
    toggleWatched: (item: Partial<WatchedItem> & { tmdb_id: number; media_type: 'tv' | 'movie' | 'episode' }) => void;
    markManyWatched: (items: WatchedItem[]) => void;
    setRating: (id: number, mediaType: 'tv' | 'movie' | 'episode', rating: number) => void;
    setCustomPoster: (showId: number, posterPath: string | null) => void;
    
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
    
    // Alias for legacy support if needed
    allTrackedShows?: TVShow[];
}

export const useStore = create<State>()(
    persist(
        (set, get) => ({
            user: null,
            settings: DEFAULT_SETTINGS,
            watchlist: [],
            history: {},
            reminders: [],
            isSyncing: false,
            
            // UI State
            calendarDate: new Date(),
            calendarScrollPos: 0,
            isSearchOpen: false,
            reminderCandidate: null,
            
            // Compatibility State
            subscribedLists: [],
            isMobileWarningOpen: true,
            closeMobileWarning: (forever) => set({ isMobileWarningOpen: false }),
            importBackup: (data) => console.log("Import not implemented", data),
            processSyncPayload: (payload) => console.log("Sync not implemented", payload),

            login: (newUser) => {
                set((state) => {
                    // Safety check: Prevent overwriting the API key if the incoming user object (e.g. from session)
                    // doesn't have it, but we already do in local state for the same user.
                    let finalUser = newUser;
                    if (state.user && state.user.id === newUser.id) {
                         if (!finalUser.tmdb_key && state.user.tmdb_key) {
                             finalUser = { ...finalUser, tmdb_key: state.user.tmdb_key };
                         }
                    }

                    // Set token in memory immediately for API calls
                    if (finalUser.tmdb_key) setApiToken(finalUser.tmdb_key);
                    
                    // Trigger background sync if cloud user
                    if (finalUser.is_cloud) {
                        // We use a timeout to let the state update settle before triggering the async sync
                        setTimeout(() => get().triggerCloudSync(), 0);
                    }

                    return { user: finalUser };
                });
            },

            logout: () => {
                set({ user: null, watchlist: [], history: {}, reminders: [] });
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

            markManyWatched: (items) => {
                 set((state) => {
                    const nextHistory = { ...state.history };
                    const now = new Date().toISOString();
                    const cloudUpserts: any[] = [];
                    
                    items.forEach(item => {
                        const key = item.media_type === 'episode'
                            ? `episode-${item.tmdb_id}-${item.season_number}-${item.episode_number}`
                            : `${item.media_type}-${item.tmdb_id}`;
                        
                        // Only update if not already watched
                        if (!nextHistory[key]?.is_watched) {
                             const newItem = { ...item, is_watched: true, watched_at: now };
                             nextHistory[key] = newItem;
                             
                             if (state.user?.is_cloud) {
                                 cloudUpserts.push({
                                    user_id: state.user.id,
                                    tmdb_id: item.tmdb_id,
                                    media_type: item.media_type,
                                    season_number: item.season_number ?? -1,
                                    episode_number: item.episode_number ?? -1,
                                    is_watched: true,
                                    watched_at: now,
                                    updated_at: now
                                 });
                             }
                        }
                    });

                    if (cloudUpserts.length > 0) {
                         supabase?.from('interactions').upsert(cloudUpserts, { onConflict: 'user_id,tmdb_id,media_type,season_number,episode_number' }).then();
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

            setCustomPoster: (showId, posterPath) => {
                set((state) => {
                    const nextWatchlist = state.watchlist.map(show => {
                        if (show.id === showId) {
                            return { ...show, custom_poster_path: posterPath };
                        }
                        return show;
                    });
                    
                    // Note: This only persists locally in watchlist state.
                    // For full cloud sync of custom posters, we'd need a schema change or jsonb field.
                    // Assuming local-first for customization as per current request scope.
                    // However, we can try to update 'poster_path' in cloud if desired, but 'custom_poster_path' is safer to avoid drift.
                    
                    return { watchlist: nextWatchlist };
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
                    if (profile) {
                         // Hydrate Settings
                        if (profile.settings) {
                            set(s => ({ settings: { ...s.settings, ...profile.settings } }));
                        }
                        
                        // Hydrate TMDB Key - CRITICAL for persistence
                        if (profile.tmdb_key) {
                            set(s => ({ user: { ...s.user!, tmdb_key: profile.tmdb_key } }));
                            setApiToken(profile.tmdb_key);
                        }
                    }

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
            onRehydrateStorage: () => (state) => {
                if (state?.user?.tmdb_key) {
                    setApiToken(state.user.tmdb_key);
                }
            }
        }
    )
);
