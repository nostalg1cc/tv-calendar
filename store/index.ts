
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppSettings, DEFAULT_SETTINGS, TVShow, User, WatchedItem, Reminder } from '../types';
import { supabase } from '../services/supabase';
import { setApiToken } from '../services/tmdb';
import { getWatchedHistory } from '../services/trakt';

const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const mix = (color1: number[], color2: number[], weight: number) => {
    const w1 = weight;
    const w2 = 1 - weight;
    return [
        Math.round(color1[0] * w1 + color2[0] * w2),
        Math.round(color1[1] * w1 + color2[1] * w2),
        Math.round(color1[2] * w1 + color2[2] * w2),
    ];
};

const applyTheme = (settings: AppSettings) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    body.setAttribute('data-font', settings.appFont);
    
    // Determine effective theme
    let themeToApply: string = settings.baseTheme === 'auto' ? 'cosmic' : settings.baseTheme;
    
    // STRICT PRIORITY: 
    // 1. If activeTheme is explicitly 'upside-down', use it.
    // 2. If activeTheme is explicitly 'standard', use baseTheme (IGNORE legacy flags).
    // 3. Fallback: If activeTheme is missing (legacy state), check legacy flag.
    
    if (settings.activeTheme === 'upside-down') {
        themeToApply = 'upside-down';
    } else if (settings.activeTheme === 'standard') {
        // Keep themeToApply as baseTheme
    } else if (settings.upsideDownMode) {
        themeToApply = 'upside-down';
    }

    body.setAttribute('data-base-theme', themeToApply);
    
    if (themeToApply === 'custom' && settings.customThemeColor) {
        const baseColor = hexToRgb(settings.customThemeColor);
        const white = [255, 255, 255];
        const black = [0, 0, 0];
        const palette = {
            50: mix(baseColor, white, 0.05),
            100: mix(baseColor, white, 0.1),
            200: mix(baseColor, white, 0.25),
            300: mix(baseColor, white, 0.45),
            400: mix(baseColor, white, 0.75),
            500: baseColor,
            600: mix(baseColor, black, 0.9),
            700: mix(baseColor, black, 0.75),
            800: mix(baseColor, black, 0.6),
            900: mix(baseColor, black, 0.45),
            950: mix(baseColor, black, 0.3),
        };
        Object.entries(palette).forEach(([key, rgb]) => {
            root.style.setProperty(`--theme-${key}`, `${rgb[0]} ${rgb[1]} ${rgb[2]}`);
        });
    } else {
        [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].forEach(key => {
            root.style.removeProperty(`--theme-${key}`);
        });
    }
};

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
    subscribedLists: any[];
    isMobileWarningOpen: boolean;
    traktToken?: string;
    traktProfile?: any;
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
    setTraktToken: (token: string | undefined) => void;
    setTraktProfile: (profile: any) => void;
    isSyncing: boolean;
    triggerCloudSync: () => Promise<void>;
    syncFromDB: () => Promise<void>;
    fullSyncRequired?: boolean;
    performFullSync?: (settings?: Partial<AppSettings>) => void;
    syncProgress?: { current: number, total: number };
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
            calendarDate: new Date(),
            calendarScrollPos: 0,
            isSearchOpen: false,
            reminderCandidate: null,
            subscribedLists: [],
            isMobileWarningOpen: true,
            closeMobileWarning: (forever) => set({ isMobileWarningOpen: false }),
            importBackup: (data) => console.log("Import not implemented", data),
            processSyncPayload: (payload) => console.log("Sync not implemented", payload),

            login: (newUser) => {
                set((state) => {
                    let finalUser = newUser;
                    if (state.user && state.user.id === newUser.id) {
                         if (!finalUser.tmdb_key && state.user.tmdb_key) {
                             finalUser = { ...finalUser, tmdb_key: state.user.tmdb_key };
                         }
                    }
                    if (finalUser.tmdb_key) setApiToken(finalUser.tmdb_key);
                    if (finalUser.is_cloud) {
                        setTimeout(() => get().triggerCloudSync(), 0);
                    }
                    return { user: finalUser };
                });
            },

            logout: () => {
                set({ user: null, watchlist: [], history: {}, reminders: [], traktToken: undefined, traktProfile: undefined });
                if (supabase) supabase.auth.signOut();
            },

            updateSettings: (newSettings) => {
                set((state) => {
                    const merged = { ...state.settings, ...newSettings };
                    applyTheme(merged);
                    
                    // Sync Trakt credentials to localStorage for service usage
                    if (merged.traktClient) {
                        localStorage.setItem('trakt_client_id', merged.traktClient.id);
                        localStorage.setItem('trakt_client_secret', merged.traktClient.secret);
                    }

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
                    const nextCustomPosters = { ...state.settings.customPosters };
                    if (posterPath) nextCustomPosters[showId] = posterPath;
                    else delete nextCustomPosters[showId];
                    
                    const nextSettings = { ...state.settings, customPosters: nextCustomPosters };
                    if (state.user?.is_cloud) {
                         supabase?.from('profiles').update({ settings: nextSettings }).eq('id', state.user.id).then();
                    }
                    return { watchlist: nextWatchlist, settings: nextSettings };
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
            
            setTraktToken: (token) => {
                set({ traktToken: token });
                if (get().user?.is_cloud) {
                    supabase?.from('profiles').update({ trakt_token: token }).eq('id', get().user!.id).then();
                }
            },
            
            setTraktProfile: (profile) => {
                set({ traktProfile: profile });
                if (get().user?.is_cloud) {
                    supabase?.from('profiles').update({ trakt_profile: profile }).eq('id', get().user!.id).then();
                }
            },

            syncFromDB: async () => {
                const { user, history } = get();
                if (!user?.is_cloud || !supabase) return;

                const { data } = await supabase.from('interactions').select('*').eq('user_id', user.id);
                if (!data) return;

                let hasChanges = false;
                const newHistory = { ...history };

                data.forEach((row: any) => {
                    const key = row.media_type === 'episode' 
                        ? `episode-${row.tmdb_id}-${row.season_number}-${row.episode_number}`
                        : `${row.media_type}-${row.tmdb_id}`;
                    
                    const existing = newHistory[key];
                    if (row.is_watched && (!existing || !existing.is_watched)) {
                        newHistory[key] = {
                            tmdb_id: row.tmdb_id,
                            media_type: row.media_type,
                            season_number: row.season_number,
                            episode_number: row.episode_number,
                            is_watched: true,
                            rating: row.rating,
                            watched_at: row.watched_at
                        };
                        hasChanges = true;
                    }
                });
                
                if (hasChanges) {
                    set({ history: newHistory });
                }
            },

            triggerCloudSync: async () => {
                const { user } = get();
                if (!user || !user.is_cloud || !supabase) return;
                
                set({ isSyncing: true });
                try {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                    if (profile) {
                        if (profile.settings) {
                            // Ensure migration during sync
                            const settings = profile.settings;
                            if (!settings.activeTheme) {
                                settings.activeTheme = settings.upsideDownMode ? 'upside-down' : 'standard';
                            }

                            const newSettings = { ...get().settings, ...settings };
                            if (!newSettings.country) newSettings.country = 'US';
                            if (newSettings.traktClient) {
                                localStorage.setItem('trakt_client_id', newSettings.traktClient.id);
                                localStorage.setItem('trakt_client_secret', newSettings.traktClient.secret);
                            }
                            set({ settings: newSettings });
                            applyTheme(newSettings);
                        }
                        if (profile.tmdb_key) {
                            set(s => ({ user: { ...s.user!, tmdb_key: profile.tmdb_key } }));
                            setApiToken(profile.tmdb_key);
                        }
                        if (profile.trakt_token) set({ traktToken: profile.trakt_token });
                        if (profile.trakt_profile) set({ traktProfile: profile.trakt_profile });
                    }

                    const { data: watchlistData } = await supabase.from('watchlist').select('*');
                    if (watchlistData) {
                        const currentSettings = get().settings;
                        const mapped = watchlistData.map((w: any) => ({
                            id: w.tmdb_id,
                            name: w.name,
                            media_type: w.media_type,
                            poster_path: w.poster_path,
                            backdrop_path: w.backdrop_path,
                            overview: w.overview,
                            first_air_date: w.first_air_date,
                            vote_average: w.vote_average,
                            custom_poster_path: currentSettings.customPosters?.[w.tmdb_id] || null
                        }));
                        set({ watchlist: mapped });
                    }

                    const map: Record<string, WatchedItem> = {};
                    const { data: dbHistory } = await supabase.from('interactions').select('*');
                    if (dbHistory) {
                        dbHistory.forEach((h: any) => {
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
                    }

                    const currentTraktToken = get().traktToken;
                    if (currentTraktToken) {
                        try {
                            const [traktMovies, traktShows] = await Promise.all([
                                getWatchedHistory(currentTraktToken, 'movies'),
                                getWatchedHistory(currentTraktToken, 'shows')
                            ]);

                            if (Array.isArray(traktMovies)) {
                                traktMovies.forEach((m: any) => {
                                    if (m.movie?.ids?.tmdb) {
                                        const tmdbId = m.movie.ids.tmdb;
                                        const key = `movie-${tmdbId}`;
                                        const existing = map[key];
                                        map[key] = {
                                            tmdb_id: tmdbId,
                                            media_type: 'movie',
                                            is_watched: true,
                                            rating: existing?.rating,
                                            watched_at: m.last_watched_at || existing?.watched_at
                                        };
                                    }
                                });
                            }

                            if (Array.isArray(traktShows)) {
                                traktShows.forEach((s: any) => {
                                    const showTmdbId = s.show?.ids?.tmdb;
                                    if (showTmdbId && s.seasons) {
                                        s.seasons.forEach((season: any) => {
                                            if (season.episodes) {
                                                season.episodes.forEach((ep: any) => {
                                                    const key = `episode-${showTmdbId}-${season.number}-${ep.number}`;
                                                    const existing = map[key];
                                                    map[key] = {
                                                        tmdb_id: showTmdbId,
                                                        media_type: 'episode',
                                                        season_number: season.number,
                                                        episode_number: ep.number,
                                                        is_watched: true,
                                                        rating: existing?.rating,
                                                        watched_at: ep.last_watched_at || existing?.watched_at
                                                    };
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        } catch (e) {
                            console.error("Trakt sync failed inside cloud sync", e);
                        }
                    }

                    set({ history: map });

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
                reminders: state.reminders,
                traktToken: state.traktToken,
                traktProfile: state.traktProfile
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    if (state.settings) {
                        // MIGRATION: Ensure activeTheme is set if missing
                        if (!state.settings.activeTheme) {
                            state.settings.activeTheme = state.settings.upsideDownMode ? 'upside-down' : 'standard';
                        }
                        
                        applyTheme(state.settings);
                        if (state.settings.traktClient) {
                            localStorage.setItem('trakt_client_id', state.settings.traktClient.id);
                            localStorage.setItem('trakt_client_secret', state.settings.traktClient.secret);
                        }
                    }
                    if (state.user?.tmdb_key) setApiToken(state.user.tmdb_key);
                }
            }
        }
    )
);
