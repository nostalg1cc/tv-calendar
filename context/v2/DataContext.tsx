import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { TVShow, SubscribedList, Reminder, Interaction, Episode, AppSettings } from '../../types';
import { supabase } from '../../services/supabase';
import { getListDetails, getMovieDetails, getShowDetails, getSeasonDetails, getMovieReleaseDates } from '../../services/tmdb';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { getWatchedHistory, syncHistory } from '../../services/trakt';
import { subMonths, parseISO } from 'date-fns';
import { del, set } from 'idb-keyval';

interface DataExport {
    version: string;
    timestamp: string;
    watchlist: TVShow[];
    subscribedLists: SubscribedList[];
    interactions: Record<string, Interaction>;
    reminders: Reminder[];
    settings: AppSettings;
}

interface DataContextType {
    watchlist: TVShow[];
    subscribedLists: SubscribedList[];
    reminders: Reminder[];
    interactions: Record<string, Interaction>;
    
    addToWatchlist: (show: TVShow) => Promise<void>;
    removeFromWatchlist: (showId: number) => void;
    batchAddShows: (shows: TVShow[]) => void;
    subscribeToList: (listId: string) => Promise<void>;
    unsubscribeFromList: (listId: string) => void;
    batchSubscribe: (lists: SubscribedList[]) => void;
    
    addReminder: (reminder: Reminder) => Promise<void>;
    removeReminder: (id: string) => Promise<void>;
    
    toggleWatched: (id: number, mediaType: 'tv' | 'movie') => Promise<void>;
    toggleEpisodeWatched: (showId: number, season: number, episode: number) => Promise<void>;
    markHistoryWatched: (showId: number, season: number, episode: number) => Promise<void>;
    setRating: (id: number, mediaType: 'tv' | 'movie', rating: number) => Promise<void>;
    
    syncTraktData: (background?: boolean) => Promise<void>;
    performFullSync: (allTrackedShows: TVShow[]) => Promise<void>;
    saveToCloudCalendar: (episodes: Episode[]) => Promise<void>;
    
    // New Data Management
    exportData: () => DataExport;
    importData: (data: DataExport) => Promise<void>;
    clearAccountData: () => Promise<void>;

    isSyncing: boolean;
    dataLoading: boolean;
    setDataLoading: (v: boolean) => void;
    loadingStatus: string;
    setLoadingStatus: (v: string) => void;
    syncProgress: { current: number; total: number };
    fullSyncRequired: boolean;
    setFullSyncRequired: (val: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, disconnectTrakt } = useAuth();
    const { settings, updateSettings } = useSettings();
    
    const [watchlist, setWatchlist] = useState<TVShow[]>([]);
    const [subscribedLists, setSubscribedLists] = useState<SubscribedList[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [interactions, setInteractions] = useState<Record<string, Interaction>>({});
    
    const [isSyncing, setIsSyncing] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState("Initializing...");
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    const [fullSyncRequired, setFullSyncRequired] = useState(false);
    
    const manualOverridesRef = useRef<Record<string, boolean>>({});

    // Load Data on User Change
    useEffect(() => {
        if (!user) {
            setWatchlist([]);
            setSubscribedLists([]);
            setInteractions({});
            setReminders([]);
            setDataLoading(false);
            return;
        }

        const loadData = async () => {
            setDataLoading(true);
            setLoadingStatus("Connecting to cloud...");
            
            try {
                if (user.isCloud && supabase) {
                    // 1. Fetch Interactions & Reminders (Fast, database only)
                    setLoadingStatus("Syncing history & reminders...");
                    const [iRes, rRes] = await Promise.all([
                        supabase.from('interactions').select('*'),
                        supabase.from('reminders').select('*')
                    ]);

                    if (iRes.data) {
                        const map: Record<string, Interaction> = {};
                        iRes.data.forEach((i: any) => {
                            let key = i.media_type === 'episode' ? `episode-${i.tmdb_id}-${i.season_number}-${i.episode_number}` : `${i.media_type}-${i.tmdb_id}`;
                            map[key] = { tmdb_id: i.tmdb_id, media_type: i.media_type, is_watched: i.is_watched, rating: i.rating, season_number: i.season_number, episode_number: i.episode_number, watched_at: i.watched_at };
                        });
                        setInteractions(map);
                    }

                    if (rRes.data) {
                        setReminders(rRes.data.map((r: any) => ({ id: r.id, tmdb_id: r.tmdb_id, media_type: r.media_type, scope: r.scope, episode_season: r.episode_season, episode_number: r.episode_number, offset_minutes: r.offset_minutes })));
                    }

                    // 2. Fetch Watchlist (Database only, no external API yet)
                    setLoadingStatus("Loading library...");
                    const wRes = await supabase.from('watchlist').select('*');
                    if (wRes.data) {
                         setWatchlist(wRes.data.map((item: any) => ({
                            id: item.tmdb_id, name: item.name, poster_path: item.poster_path, backdrop_path: item.backdrop_path, overview: item.overview, first_air_date: item.first_air_date, vote_average: item.vote_average, media_type: item.media_type
                        })));
                    }

                    // 3. Fetch Subscriptions (Heavy External API calls)
                    setLoadingStatus("Fetching lists...");
                    const sRes = await supabase.from('subscriptions').select('*');
                    
                    if (sRes.data && sRes.data.length > 0) {
                        setSyncProgress({ current: 0, total: sRes.data.length });
                        
                        const fetchedLists: SubscribedList[] = [];
                        
                        // We fetch these sequentially or in small batches to update the UI progress
                        // and to avoid obliterating the TMDB rate limit immediately
                        for (let i = 0; i < sRes.data.length; i++) {
                            const sub = sRes.data[i];
                            setLoadingStatus(`Syncing list: ${sub.name || 'Unknown'}...`);
                            try {
                                const listDetails = await getListDetails(sub.list_id);
                                fetchedLists.push({ id: sub.list_id, name: listDetails.name, items: listDetails.items, item_count: listDetails.items.length });
                            } catch (e) {
                                console.warn(`Failed to fetch list ${sub.list_id}`, e);
                            }
                            setSyncProgress({ current: i + 1, total: sRes.data.length });
                        }
                        setSubscribedLists(fetchedLists);
                    }

                    if (!user.fullSyncCompleted) setFullSyncRequired(true);

                } else {
                    // Local Load
                    setLoadingStatus("Loading local storage...");
                    try {
                        setWatchlist(JSON.parse(localStorage.getItem('tv_calendar_watchlist') || '[]'));
                        setSubscribedLists(JSON.parse(localStorage.getItem('tv_calendar_subscribed_lists') || '[]'));
                        setReminders(JSON.parse(localStorage.getItem('tv_calendar_reminders') || '[]'));
                        setInteractions(JSON.parse(localStorage.getItem('tv_calendar_interactions') || '{}'));
                    } catch {}
                }
            } catch (e) {
                console.error("Data Load Error", e);
                setLoadingStatus("Error loading data.");
            } finally {
                setLoadingStatus("Ready");
                setDataLoading(false);
            }
        };
        loadData();
    }, [user]);

    // Local Persistence
    useEffect(() => {
        if (user && !user.isCloud) {
            localStorage.setItem('tv_calendar_watchlist', JSON.stringify(watchlist));
            localStorage.setItem('tv_calendar_subscribed_lists', JSON.stringify(subscribedLists));
            localStorage.setItem('tv_calendar_reminders', JSON.stringify(reminders));
            localStorage.setItem('tv_calendar_interactions', JSON.stringify(interactions));
        }
    }, [watchlist, subscribedLists, reminders, interactions, user]);

    // --- Actions ---

    const addToWatchlist = async (show: TVShow) => {
        if (watchlist.find(s => s.id === show.id)) return;
        
        // Invalidate cache immediately so calendar refreshes next view
        await set('tv_calendar_meta_v2', 0);
        
        setWatchlist(prev => [...prev, show]);
        if (user?.isCloud && supabase) {
             await supabase.from('watchlist').upsert({ user_id: user.id, tmdb_id: show.id, media_type: show.media_type, name: show.name, poster_path: show.poster_path, backdrop_path: show.backdrop_path, overview: show.overview, first_air_date: show.first_air_date, vote_average: show.vote_average }, { onConflict: 'user_id, tmdb_id' });
        }
    };

    const removeFromWatchlist = async (showId: number) => {
        await set('tv_calendar_meta_v2', 0); // Invalidate cache
        setWatchlist(prev => prev.filter(s => s.id !== showId));
        if (user?.isCloud && supabase) {
            await Promise.all([
                supabase.from('watchlist').delete().match({ user_id: user.id, tmdb_id: showId }),
                supabase.from('user_calendar_events').delete().match({ user_id: user.id, tmdb_id: showId })
            ]);
        }
        // Update hidden items setting
        const show = watchlist.find(s => s.id === showId);
        if (show && !settings.hiddenItems.some(i => i.id === showId)) {
            updateSettings({ hiddenItems: [...settings.hiddenItems, { id: showId, name: show.name }] });
        }
    };
    
    const batchAddShows = async (shows: TVShow[]) => {
        const currentIds = new Set(watchlist.map(s => s.id));
        const newShows = shows.filter(s => !currentIds.has(s.id));
        if (newShows.length === 0) return;
        
        await set('tv_calendar_meta_v2', 0); // Invalidate cache
        
        setWatchlist(prev => [...prev, ...newShows]);
        if (user?.isCloud && supabase) {
            const rows = newShows.map(show => ({ user_id: user.id, tmdb_id: show.id, media_type: show.media_type, name: show.name, poster_path: show.poster_path, backdrop_path: show.backdrop_path, overview: show.overview, first_air_date: show.first_air_date, vote_average: show.vote_average }));
            await supabase.from('watchlist').upsert(rows, { onConflict: 'user_id, tmdb_id' });
        }
    };

    const subscribeToList = async (listId: string) => {
        if (subscribedLists.some(l => l.id === listId)) return;
        setIsSyncing(true);
        setLoadingStatus("Fetching list details...");
        try {
            const details = await getListDetails(listId);
            const newList = { id: listId, name: details.name, items: details.items, item_count: details.items.length };
            setSubscribedLists(prev => [...prev, newList]);
            if (user?.isCloud && supabase) {
                await supabase.from('subscriptions').upsert({ user_id: user.id, list_id: listId, name: details.name, item_count: details.items.length }, { onConflict: 'user_id, list_id' });
            }
            await set('tv_calendar_meta_v2', 0); // Invalidate cache
        } finally {
            setIsSyncing(false);
            setLoadingStatus("Ready");
        }
    };

    const unsubscribeFromList = async (listId: string) => {
        const list = subscribedLists.find(l => l.id === listId);
        setSubscribedLists(prev => prev.filter(l => l.id !== listId));
        if (list && user?.isCloud && supabase) {
            // Cleanup events for items only in this list
            const showsToPurge: number[] = [];
            list.items.forEach(show => {
                const inWatchlist = watchlist.some(w => w.id === show.id);
                const inOtherLists = subscribedLists.filter(l => l.id !== listId).some(l => l.items.some(i => i.id === show.id));
                if (!inWatchlist && !inOtherLists) showsToPurge.push(show.id);
            });
            if (showsToPurge.length > 0) {
                 await supabase.from('user_calendar_events').delete().in('tmdb_id', showsToPurge).eq('user_id', user.id);
            }
            await supabase.from('subscriptions').delete().match({ user_id: user.id, list_id: listId });
        }
        await set('tv_calendar_meta_v2', 0); // Invalidate cache
    };

    const batchSubscribe = async (lists: SubscribedList[]) => {
        const currentIds = new Set(subscribedLists.map(l => l.id));
        const newLists = lists.filter(l => !currentIds.has(l.id));
        if (newLists.length === 0) return;
        setSubscribedLists(prev => [...prev, ...newLists]);
        if (user?.isCloud && supabase) {
            const rows = newLists.map(l => ({ user_id: user.id, list_id: l.id, name: l.name, item_count: l.item_count }));
            await supabase.from('subscriptions').upsert(rows, { onConflict: 'user_id, list_id' });
        }
        await set('tv_calendar_meta_v2', 0); // Invalidate cache
    };

    const addReminder = async (reminder: Reminder) => {
        const newRem = { ...reminder, id: reminder.id || crypto.randomUUID() };
        setReminders(prev => [...prev, newRem]);
        if (user?.isCloud && supabase) {
            await supabase.from('reminders').insert({ user_id: user.id, tmdb_id: reminder.tmdb_id, media_type: reminder.media_type, scope: reminder.scope, episode_season: reminder.episode_season, episode_number: reminder.episode_number, offset_minutes: reminder.offset_minutes });
        }
    };

    const removeReminder = async (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
        if (user?.isCloud && supabase) await supabase.from('reminders').delete().eq('id', id);
    };

    // --- Interactions ---

    const saveInteraction = async (interaction: Interaction) => {
        if (!user?.isCloud || !supabase) return;
        try {
            const payload = {
                user_id: user.id,
                tmdb_id: interaction.tmdb_id,
                media_type: interaction.media_type,
                is_watched: !!interaction.is_watched,
                rating: interaction.rating,
                season_number: interaction.season_number ?? -1,
                episode_number: interaction.episode_number ?? -1,
                watched_at: interaction.watched_at,
                updated_at: new Date().toISOString()
            };
            // Clean conflict string
            await supabase.from('interactions').upsert(payload, { onConflict: 'user_id,tmdb_id,media_type,season_number,episode_number' });
        } catch (e) { console.error(e); }
    };

    const toggleWatched = async (id: number, mediaType: 'tv' | 'movie') => {
        const key = `${mediaType}-${id}`;
        const current = interactions[key] || { tmdb_id: id, media_type: mediaType, is_watched: false, rating: 0 };
        const newIsWatched = !current.is_watched;
        const updated = { ...current, is_watched: newIsWatched, watched_at: newIsWatched ? new Date().toISOString() : undefined, season_number: -1, episode_number: -1 };
        manualOverridesRef.current[key] = newIsWatched;
        setInteractions(prev => ({ ...prev, [key]: updated }));
        
        if (user?.traktToken) {
            const action = updated.is_watched ? 'add' : 'remove';
            const payload = mediaType === 'movie' ? { movies: [{ ids: { tmdb: id } }] } : { shows: [{ ids: { tmdb: id } }] };
            syncHistory(user.traktToken.access_token, payload, action).catch(console.error);
        }
        await saveInteraction(updated);
    };

    const toggleEpisodeWatched = async (showId: number, season: number, episode: number) => {
        const key = `episode-${showId}-${season}-${episode}`;
        const current = interactions[key] || { tmdb_id: showId, media_type: 'episode', is_watched: false, rating: 0, season_number: season, episode_number: episode };
        const newIsWatched = !current.is_watched;
        const updated = { ...current, is_watched: newIsWatched, watched_at: newIsWatched ? new Date().toISOString() : undefined };
        manualOverridesRef.current[key] = newIsWatched;
        setInteractions(prev => ({ ...prev, [key]: updated }));
        
        if (user?.traktToken) {
            const action = updated.is_watched ? 'add' : 'remove';
            const payload = { shows: [{ ids: { tmdb: showId }, seasons: [{ number: season, episodes: [{ number: episode }] }] }] };
            syncHistory(user.traktToken.access_token, payload, action).catch(console.error);
        }
        await saveInteraction(updated);
    };

    const markHistoryWatched = async (showId: number, targetSeason: number, targetEpisode: number) => {
        setIsSyncing(true);
        setLoadingStatus("Updating history...");
        try {
            const show = await getShowDetails(showId);
            const seasons = show.seasons || [];
            const epsToMark: Interaction[] = [];
            const sortedSeasons = seasons.filter(s => { if (targetSeason === 0) return s.season_number === 0; return s.season_number > 0 && s.season_number <= targetSeason; });
            
            for (let i = 0; i < sortedSeasons.length; i += 3) {
                 const batch = sortedSeasons.slice(i, i + 3);
                 const results = await Promise.all(batch.map(s => getSeasonDetails(showId, s.season_number)));
                 results.forEach(sData => {
                     sData.episodes.forEach(ep => {
                         if (ep.season_number < targetSeason || (ep.season_number === targetSeason && ep.episode_number <= targetEpisode)) {
                             epsToMark.push({ tmdb_id: showId, media_type: 'episode', season_number: ep.season_number, episode_number: ep.episode_number, is_watched: true, rating: 0, watched_at: new Date().toISOString() });
                         }
                     });
                 });
            }
            
            setInteractions(prev => {
                const next = { ...prev };
                epsToMark.forEach(item => {
                    const key = `episode-${showId}-${item.season_number}-${item.episode_number}`;
                    if (!next[key]?.is_watched) { next[key] = item; manualOverridesRef.current[key] = true; }
                });
                return next;
            });
            
            if (user?.isCloud && supabase) {
                const dbBatch = epsToMark.map(item => ({ user_id: user.id, tmdb_id: item.tmdb_id, media_type: item.media_type, season_number: item.season_number, episode_number: item.episode_number, is_watched: true, watched_at: item.watched_at, updated_at: new Date().toISOString() }));
                for(let i=0; i<dbBatch.length; i+=100) await supabase.from('interactions').upsert(dbBatch.slice(i, i+100), { onConflict: 'user_id,tmdb_id,media_type,season_number,episode_number' });
            }
        } catch (e) { console.error(e); } finally { 
            setIsSyncing(false); 
            setLoadingStatus("Ready");
        }
    };

    const setRating = async (id: number, mediaType: 'tv' | 'movie', rating: number) => {
        const key = `${mediaType}-${id}`;
        let updated: Interaction | null = null;
        setInteractions(prev => {
            const current = prev[key] || { tmdb_id: id, media_type: mediaType, is_watched: false, rating: 0 };
            updated = { ...current, rating };
            return { ...prev, [key]: updated };
        });
        if (updated) await saveInteraction(updated);
    };

    // --- Sync Logic ---

    const saveToCloudCalendar = async (episodesList: Episode[]) => {
        if (!supabase || !user?.isCloud || episodesList.length === 0) return;
        const uniqueMap = new Map<string, any>();
        
        episodesList.forEach(ep => {
            const tmdbId = ep.show_id || ep.id;
            const mediaType = ep.is_movie ? 'movie' : 'tv';
            let season = ep.season_number ?? -1;
            let episode = ep.episode_number ?? -1;
            
            if (mediaType === 'movie' && ep.release_type === 'digital') episode = 2; // Conflict Avoidance
            
            const key = `${user.id}-${tmdbId}-${mediaType}-${season}-${episode}`;
            uniqueMap.set(key, {
                user_id: user.id, tmdb_id: tmdbId, media_type: mediaType, season_number: season, episode_number: episode,
                title: ep.show_name || ep.name || '', overview: ep.overview || '', air_date: ep.air_date,
                poster_path: ep.poster_path || null, backdrop_path: ep.still_path || null, vote_average: ep.vote_average || 0,
                release_type: ep.release_type || null
            });
        });

        const rows = Array.from(uniqueMap.values());
        for (let i = 0; i < rows.length; i += 100) {
            const batch = rows.slice(i, i + 100);
            await supabase.from('user_calendar_events').upsert(batch, { onConflict: 'user_id,tmdb_id,media_type,season_number,episode_number' });
        }
    };

    const performFullSync = async (allTrackedShows: TVShow[]) => {
        if (!user?.isCloud || !supabase) return;
        setIsSyncing(true);
        setDataLoading(true); // Triggers the global loading screen
        try {
            setLoadingStatus("Cleaning old calendar data...");
            await del('tv_calendar_episodes_v2'); 
            await del('tv_calendar_meta_v2'); 
            await supabase.from('user_calendar_events').delete().eq('user_id', user.id);
            
            setSyncProgress({ current: 0, total: allTrackedShows.length });
            let processed = 0;
            const batchSize = 5;
            
            setLoadingStatus("Building new calendar cache...");
            for (let i = 0; i < allTrackedShows.length; i += batchSize) {
                const batch = allTrackedShows.slice(i, i + batchSize);
                const batchEpisodes: Episode[] = [];
                
                await Promise.all(batch.map(async (item) => {
                    try {
                        if (item.media_type === 'movie') {
                             let origin = item.origin_country;
                             if (!origin) { const d = await getMovieDetails(item.id); origin = d.origin_country; }
                             const releases = await getMovieReleaseDates(item.id);
                             releases.forEach(rel => {
                                 batchEpisodes.push({ id: item.id * 1000 + (rel.type === 'theatrical' ? 1 : 2), name: item.name, overview: item.overview, vote_average: item.vote_average, air_date: rel.date, episode_number: rel.type === 'theatrical' ? 1 : 2, season_number: 1, still_path: item.backdrop_path, show_backdrop_path: item.backdrop_path, poster_path: item.poster_path, show_id: item.id, show_name: item.name, is_movie: true, release_type: rel.type, origin_country: origin });
                             });
                        } else {
                             const details = await getShowDetails(item.id);
                             const seasons = details.seasons || [];
                             // Filter for recent seasons to save bandwidth
                             const recentSeasons = seasons.filter(s => s.season_number > 0);
                             
                             for (const s of recentSeasons) {
                                 const sData = await getSeasonDetails(item.id, s.season_number);
                                 if (sData.episodes) sData.episodes.forEach(ep => { if (ep.air_date) batchEpisodes.push({ ...ep, show_id: item.id, show_name: item.name, poster_path: item.poster_path, season1_poster_path: details.poster_path, show_backdrop_path: details.backdrop_path, is_movie: false, origin_country: details.origin_country }); });
                             }
                        }
                    } catch {}
                }));
                
                if (batchEpisodes.length > 0) await saveToCloudCalendar(batchEpisodes);
                processed += batch.length;
                setSyncProgress({ current: processed, total: allTrackedShows.length });
                setLoadingStatus(`Processed ${processed} of ${allTrackedShows.length} items...`);
            }
            
            await supabase.from('profiles').update({ full_sync_completed: true, last_full_sync: new Date().toISOString() }).eq('id', user.id);
            setFullSyncRequired(false);
            await set('tv_calendar_meta_v2', 0); // Expire cache
        } catch (e) {
            console.error(e);
            alert("Sync failed. Please try again.");
        } finally {
            setIsSyncing(false);
            setDataLoading(false);
            setLoadingStatus("Ready");
        }
    };
    
    const syncTraktData = async (background = false) => {
        if (!user?.traktToken) return;
        if (!background) {
            setIsSyncing(true);
            setLoadingStatus("Syncing Trakt...");
        }
        try {
            const token = user.traktToken.access_token;
            await Promise.all([getWatchedHistory(token, 'movies'), getWatchedHistory(token, 'shows')]);
            // Placeholder for future Trakt 2-way sync
        } catch (e) { console.error(e); } finally { 
            if (!background) {
                setIsSyncing(false);
                setLoadingStatus("Ready");
            }
        }
    };

    // --- Data Management ---

    const exportData = (): DataExport => {
        return {
            version: '2.5',
            timestamp: new Date().toISOString(),
            watchlist,
            subscribedLists,
            interactions,
            reminders,
            settings
        };
    };

    const importData = async (data: DataExport) => {
        setIsSyncing(true);
        setLoadingStatus("Importing data...");
        try {
            if (data.watchlist) await batchAddShows(data.watchlist);
            if (data.subscribedLists) await batchSubscribe(data.subscribedLists);
            if (data.reminders) {
                 for (const rem of data.reminders) await addReminder(rem);
            }
            if (data.interactions) {
                const newInteractions = { ...interactions, ...data.interactions };
                setInteractions(newInteractions);
                // Background sync interaction to cloud
                if (user?.isCloud && supabase) {
                    const rows = Object.values(data.interactions).map(i => ({
                         user_id: user.id,
                         tmdb_id: i.tmdb_id,
                         media_type: i.media_type,
                         is_watched: i.is_watched,
                         rating: i.rating,
                         season_number: i.season_number ?? -1,
                         episode_number: i.episode_number ?? -1,
                         watched_at: i.watched_at,
                         updated_at: new Date().toISOString()
                    }));
                    
                    // Upsert in chunks
                    for (let i = 0; i < rows.length; i += 50) {
                         await supabase.from('interactions').upsert(rows.slice(i, i+50), { onConflict: 'user_id,tmdb_id,media_type,season_number,episode_number' });
                    }
                }
            }
            if (data.settings) {
                updateSettings(data.settings);
            }
        } catch (e) {
            console.error("Import failed", e);
            throw e;
        } finally {
            setIsSyncing(false);
            setLoadingStatus("Ready");
        }
    };

    const clearAccountData = async () => {
        setDataLoading(true);
        setLoadingStatus("Factory resetting account...");
        try {
            if (user?.isCloud && supabase) {
                // Try to use RPC function if available (Faster)
                const { error } = await supabase.rpc('delete_user_data');
                
                if (error) {
                    console.warn("RPC delete failed, falling back to manual deletes", error);
                    // Fallback to manual table deletes
                    await Promise.all([
                        supabase.from('watchlist').delete().eq('user_id', user.id),
                        supabase.from('subscriptions').delete().eq('user_id', user.id),
                        supabase.from('interactions').delete().eq('user_id', user.id),
                        supabase.from('reminders').delete().eq('user_id', user.id),
                        supabase.from('user_calendar_events').delete().eq('user_id', user.id),
                        supabase.from('profiles').update({ 
                            full_sync_completed: false, 
                            trakt_token: null, 
                            trakt_profile: null 
                        }).eq('id', user.id)
                    ]);
                }
                
                // Disconnect local trakt state via Auth context helper
                await disconnectTrakt();
            }

            // Clear Local State
            setWatchlist([]);
            setSubscribedLists([]);
            setInteractions({});
            setReminders([]);
            setFullSyncRequired(false);
            
            // Clear local storage / IDB caches
            localStorage.removeItem('tv_calendar_watchlist');
            localStorage.removeItem('tv_calendar_subscribed_lists');
            localStorage.removeItem('tv_calendar_reminders');
            localStorage.removeItem('tv_calendar_interactions');
            await del('tv_calendar_episodes_v2');
            await del('tv_calendar_meta_v2');

        } catch (e) {
            console.error("Reset failed", e);
            alert("Failed to fully reset account. Please try again.");
        } finally {
            setDataLoading(false);
            setLoadingStatus("Ready");
        }
    };

    return (
        <DataContext.Provider value={{
            watchlist, subscribedLists, reminders, interactions,
            addToWatchlist, removeFromWatchlist, batchAddShows,
            subscribeToList, unsubscribeFromList, batchSubscribe,
            addReminder, removeReminder,
            toggleWatched, toggleEpisodeWatched, markHistoryWatched, setRating,
            syncTraktData, performFullSync, saveToCloudCalendar,
            exportData, importData, clearAccountData,
            isSyncing, dataLoading, setDataLoading, loadingStatus, setLoadingStatus, syncProgress, fullSyncRequired, setFullSyncRequired
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};