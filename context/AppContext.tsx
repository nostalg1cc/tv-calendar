import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList, Reminder, Interaction } from '../types';
import { getShowDetails, getSeasonDetails, getMovieDetails, getMovieReleaseDates, getListDetails, setApiToken } from '../services/tmdb';
import { get, set, del } from 'idb-keyval';
import { format, subWeeks, addWeeks, parseISO, isSameDay, subMinutes } from 'date-fns';
import LZString from 'lz-string';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AppContextType {
  user: User | null;
  login: (username: string, apiKey: string) => void;
  loginCloud: (session: any) => Promise<void>;
  logout: () => void;
  updateUserKey: (apiKey: string) => void;
  watchlist: TVShow[]; 
  subscribedLists: SubscribedList[];
  allTrackedShows: TVShow[]; 
  addToWatchlist: (show: TVShow) => Promise<void>;
  removeFromWatchlist: (showId: number) => void;
  batchAddShows: (shows: TVShow[]) => void; 
  batchSubscribe: (lists: SubscribedList[]) => void; 
  subscribeToList: (listId: string) => Promise<void>;
  unsubscribeFromList: (listId: string) => void;
  episodes: Record<string, Episode[]>; 
  loading: boolean; // Blocking load (no data)
  isSyncing: boolean; // Background sync (has data, updating)
  syncProgress: { current: number; total: number }; 
  refreshEpisodes: (force?: boolean) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  
  // Reminders
  reminders: Reminder[];
  addReminder: (reminder: Reminder) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  
  // Interactions (Watched / Rated)
  interactions: Record<string, Interaction>; // Key: "{mediaType}-{id}"
  toggleWatched: (id: number, mediaType: 'tv' | 'movie') => Promise<void>;
  setRating: (id: number, mediaType: 'tv' | 'movie', rating: number) => Promise<void>;

  // Reminder UI State
  reminderCandidate: TVShow | Episode | null;
  setReminderCandidate: (item: TVShow | Episode | null) => void;
  
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  importBackup: (data: any) => void;
  uploadBackupToCloud: (data: any) => Promise<void>;
  getSyncPayload: () => string;
  processSyncPayload: (payload: string) => void;
  isMobileWarningOpen: boolean;
  closeMobileWarning: (suppressFuture: boolean) => void;
  reloadAccount: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  hideSpoilers: false,
  hideTheatrical: false,
  recommendationsEnabled: true,
  recommendationMethod: 'banner',
  compactCalendar: true, // Forced default
  viewMode: 'grid', 
  suppressMobileAddWarning: false,
  calendarPosterFillMode: 'cover',
  useSeason1Art: false,
  cleanGrid: false,
};

const CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 hours
const DB_KEY_EPISODES = 'tv_calendar_episodes_v2'; 
const DB_KEY_META = 'tv_calendar_meta_v2';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('tv_calendar_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Ensure TMDB service has token if user is loaded from storage
  useEffect(() => {
      if (user?.tmdbKey) {
          setApiToken(user.tmdbKey);
      }
  }, [user]);

  // --- Settings State ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('tv_calendar_settings');
      const loaded = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...loaded, compactCalendar: true };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // --- Data State ---
  const [watchlist, setWatchlist] = useState<TVShow[]>(() => {
    try {
      const saved = localStorage.getItem('tv_calendar_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [subscribedLists, setSubscribedLists] = useState<SubscribedList[]>(() => {
    try {
      const saved = localStorage.getItem('tv_calendar_subscribed_lists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [reminders, setReminders] = useState<Reminder[]>(() => {
      try {
          const saved = localStorage.getItem('tv_calendar_reminders');
          return saved ? JSON.parse(saved) : [];
      } catch {
          return [];
      }
  });

  const [interactions, setInteractions] = useState<Record<string, Interaction>>(() => {
      try {
          const saved = localStorage.getItem('tv_calendar_interactions');
          return saved ? JSON.parse(saved) : {};
      } catch {
          return {};
      }
  });

  // Episodes State
  const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileWarningOpen, setIsMobileWarningOpen] = useState(false);
  
  // Reminder Candidate State (Global)
  const [reminderCandidate, setReminderCandidate] = useState<TVShow | Episode | null>(null);

  // Sync Debounce Ref - Using ReturnType for cross-platform compatibility
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Derived State ---
  const allTrackedShows = useMemo(() => {
      const map = new Map<number, TVShow>();
      watchlist.forEach(show => map.set(show.id, show));
      subscribedLists.forEach(list => {
          list.items.forEach(show => {
              if (!map.has(show.id)) map.set(show.id, show);
          });
      });
      return Array.from(map.values());
  }, [watchlist, subscribedLists]);

  // --- Initialization / Session Check ---
  useEffect(() => {
      // Check for Supabase session if configured
      if (isSupabaseConfigured() && supabase) {
          supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                  loginCloud(session);
              }
          });

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
              if (session && (!user || !user.isCloud)) {
                  loginCloud(session);
              } else if (!session && user?.isCloud) {
                  logout();
              }
          });

          return () => subscription.unsubscribe();
      }
  }, []);

  // --- Persistence Logic (Effect) ---
  useEffect(() => {
    if (user && !user.isCloud) {
        // Local Mode: Persist to LocalStorage
        localStorage.setItem('tv_calendar_watchlist', JSON.stringify(watchlist));
        localStorage.setItem('tv_calendar_subscribed_lists', JSON.stringify(subscribedLists));
        localStorage.setItem('tv_calendar_settings', JSON.stringify(settings));
        localStorage.setItem('tv_calendar_reminders', JSON.stringify(reminders));
        localStorage.setItem('tv_calendar_interactions', JSON.stringify(interactions));
    }
  }, [watchlist, subscribedLists, settings, user, reminders, interactions]);

  // --- Interaction Logic (Watched/Rate) ---
  const toggleWatched = async (id: number, mediaType: 'tv' | 'movie') => {
      const key = `${mediaType}-${id}`;
      const current = interactions[key] || { tmdb_id: id, media_type: mediaType, is_watched: false, rating: 0 };
      const updated = { ...current, is_watched: !current.is_watched };
      
      setInteractions(prev => ({ ...prev, [key]: updated }));

      if (user?.isCloud && supabase) {
          await supabase.from('interactions').upsert({
              user_id: user.id,
              tmdb_id: id,
              media_type: mediaType,
              is_watched: updated.is_watched,
              rating: updated.rating,
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, tmdb_id, media_type' });
      }
  };

  const setRating = async (id: number, mediaType: 'tv' | 'movie', rating: number) => {
      const key = `${mediaType}-${id}`;
      const current = interactions[key] || { tmdb_id: id, media_type: mediaType, is_watched: false, rating: 0 };
      const updated = { ...current, rating: rating };
      
      setInteractions(prev => ({ ...prev, [key]: updated }));

      if (user?.isCloud && supabase) {
          await supabase.from('interactions').upsert({
              user_id: user.id,
              tmdb_id: id,
              media_type: mediaType,
              is_watched: updated.is_watched,
              rating: updated.rating,
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, tmdb_id, media_type' });
      }
  };


  // --- Refresh Episodes Logic ---
  const refreshEpisodes = useCallback(async (force = false) => {
      if (!user || (!user.tmdbKey && !user.isCloud)) {
          setLoading(false);
          return;
      }
      
      const lastUpdate = await get<number>(DB_KEY_META);
      const now = Date.now();
      
      // Determine items to process from current state
      const itemsToProcess = [...allTrackedShows];
      
      // --- Cache Validation Strategy ---
      // If NOT forced, and cache is fresh, and we have data... skip fetch
      if (!force && lastUpdate && (now - lastUpdate < CACHE_DURATION)) {
           // Double check IDB if state is empty
           if (Object.keys(episodes).length === 0) {
               const cachedEps = await get<Record<string, Episode[]>>(DB_KEY_EPISODES);
               if (cachedEps && Object.keys(cachedEps).length > 0) {
                   setEpisodes(cachedEps);
                   setLoading(false);
                   return;
               }
           } else {
               // State has data, cache is fresh, don't re-sync everything just because
               setLoading(false);
               return; 
           }
      }

      // If we have no items to track, clear calendar and stop
      if (itemsToProcess.length === 0) {
          setEpisodes({});
          setLoading(false);
          return;
      }

      // --- Fetching Strategy ---
      // If we have NO data in state, block UI with Loading.
      if (Object.keys(episodes).length === 0 && !force) {
          setLoading(true);
      }
      setIsSyncing(true);
      
      try {
          // Accumulator for new data
          // We start empty to ensure we don't keep deleted shows, 
          // BUT we will update the main state incrementally.
          const newEpisodes: Record<string, Episode[]> = {};
          const processedIds = new Set<number>();
          
          // Deduplicate items just in case
          const uniqueItems: TVShow[] = [];
          itemsToProcess.forEach(item => {
              if (!processedIds.has(item.id)) {
                  processedIds.add(item.id);
                  uniqueItems.push(item);
              }
          });
          
          setSyncProgress({ current: 0, total: uniqueItems.length });
          
          // Flag to check if we updated any metadata (season counts)
          let metadataUpdated = false;
          const updatedWatchlistMap = new Map<number, TVShow>();
          watchlist.forEach(w => updatedWatchlistMap.set(w.id, w));

          // Process loop
          let processedCount = 0;
          
          // Variable Batch Size Strategy:
          // Start small (2) to get *something* on screen immediately.
          // Then increase to (5) for throughput.
          while (processedCount < uniqueItems.length) {
              const currentBatchSize = processedCount === 0 ? 2 : 5;
              const batch = uniqueItems.slice(processedCount, processedCount + currentBatchSize);
              
              await Promise.all(batch.map(async (item) => {
                  try {
                      if (item.media_type === 'movie') {
                          const releaseDates = await getMovieReleaseDates(item.id);
                          releaseDates.forEach(rel => {
                              const dateKey = rel.date;
                              if (!newEpisodes[dateKey]) newEpisodes[dateKey] = [];
                              newEpisodes[dateKey].push({
                                  id: item.id * 1000 + (rel.type === 'theatrical' ? 1 : 2), 
                                  name: item.name,
                                  overview: item.overview,
                                  vote_average: item.vote_average,
                                  air_date: rel.date,
                                  episode_number: 1,
                                  season_number: 1,
                                  still_path: item.backdrop_path, 
                                  poster_path: item.poster_path,
                                  season1_poster_path: item.poster_path ? item.poster_path : undefined, 
                                  show_id: item.id,
                                  show_name: item.name,
                                  is_movie: true,
                                  release_type: rel.type
                              });
                          });
                      } else {
                          // TV Show Logic
                          let seasonCount = item.number_of_seasons;
                          
                          // If metadata is missing, fetch details to get accurate season count
                          // This is critical for new imports or cloud restores
                          if (!seasonCount) {
                              try {
                                  const details = await getShowDetails(item.id);
                                  seasonCount = details.number_of_seasons;
                                  
                                  // Update local map to save later
                                  if (updatedWatchlistMap.has(item.id)) {
                                      const existing = updatedWatchlistMap.get(item.id)!;
                                      updatedWatchlistMap.set(item.id, { ...existing, number_of_seasons: seasonCount });
                                      metadataUpdated = true;
                                  }
                              } catch { seasonCount = 1; }
                          }
                          
                          // Rate Limit Protection: Fetch seasons sequentially with small delay
                          const seasons = [];
                          for (let s = 1; s <= (seasonCount || 1); s++) {
                              try {
                                  const seasonData = await getSeasonDetails(item.id, s);
                                  seasons.push(seasonData);
                                  // Small delay between season fetches
                                  await new Promise(r => setTimeout(r, 20)); 
                              } catch (e) {
                                  // Ignore missing seasons
                              }
                          }
                          
                          // --- ANTI-SPOILER ART LOGIC ---
                          const season1 = seasons.find(s => s && s.season_number === 1);
                          let s1Poster = season1?.poster_path;

                          if (!s1Poster && item.seasons) {
                             const s1 = item.seasons.find(s => s.season_number === 1);
                             if (s1) s1Poster = s1.poster_path;
                          }

                          if (!s1Poster && Object.keys(episodes).length > 0) {
                               for (const dateKey in episodes) {
                                   const found = episodes[dateKey].find(e => e.show_id === item.id);
                                   if (found?.season1_poster_path) {
                                       s1Poster = found.season1_poster_path;
                                       break;
                                   }
                               }
                          }

                          if (!s1Poster) s1Poster = item.poster_path;

                          seasons.forEach(season => {
                              if (!season || !season.episodes) return;
                              season.episodes.forEach(ep => {
                                  if (!ep.air_date) return;
                                  
                                  const dateKey = ep.air_date;
                                  if (!newEpisodes[dateKey]) newEpisodes[dateKey] = [];
                                  newEpisodes[dateKey].push({
                                      ...ep,
                                      show_id: item.id,
                                      show_name: item.name,
                                      poster_path: item.poster_path,
                                      season1_poster_path: s1Poster ? s1Poster : undefined, 
                                      is_movie: false
                                  });
                              });
                          });
                      }
                  } catch (error) {
                      console.error(`Error processing ${item.name}`, error);
                  }
              }));
              
              // --- INCREMENTAL RENDER & SAVE LOGIC ---
              
              // 1. Immediately update UI state so user sees data appearing
              setEpisodes(prev => ({ ...newEpisodes }));
              
              // 2. Unblock the "Loading" screen as soon as we have ANY data
              setLoading(prev => {
                  if (prev) return false;
                  return prev;
              });
              
              processedCount += currentBatchSize;
              setSyncProgress(prev => ({ ...prev, current: Math.min(processedCount, uniqueItems.length) }));

              // 3. Intermediate Save to IDB (Every ~20 items to avoid IO thrashing)
              // Saves progress in case of crash/refresh
              if (processedCount % 20 === 0) {
                   await set(DB_KEY_EPISODES, newEpisodes);
              }
          }
          
          // Final State Set & Save
          setEpisodes(newEpisodes);
          await set(DB_KEY_EPISODES, newEpisodes);
          await set(DB_KEY_META, Date.now());

          // Save improved metadata back to storage/cloud
          if (metadataUpdated) {
              const newWatchlist = Array.from(updatedWatchlistMap.values());
              setWatchlist(newWatchlist); // Update state
              
              if (user?.isCloud && supabase) {
                  const rows = newWatchlist.map(show => ({
                        user_id: user.id,
                        tmdb_id: show.id,
                        media_type: show.media_type,
                        name: show.name,
                        poster_path: show.poster_path,
                        backdrop_path: show.backdrop_path,
                        overview: show.overview,
                        first_air_date: show.first_air_date,
                        vote_average: show.vote_average,
                        number_of_seasons: show.number_of_seasons // Important to save this!
                  }));
                  await supabase.from('watchlist').upsert(rows, { onConflict: 'user_id, tmdb_id' });
              }
          }
      } catch (e) {
          console.error("Refresh failed", e);
      } finally {
          setLoading(false);
          setIsSyncing(false);
      }
  }, [user, allTrackedShows, watchlist, episodes]);

  // --- Initialization Effect (Runs ONCE on mount/login) ---
  useEffect(() => {
      let isMounted = true;
      
      const initialize = async () => {
          if (!user) {
              setLoading(false);
              return;
          }

          // 1. Try Fast Load from IDB
          try {
              const [cachedEps, lastUpdate] = await Promise.all([
                  get<Record<string, Episode[]>>(DB_KEY_EPISODES),
                  get<number>(DB_KEY_META)
              ]);

              if (isMounted && cachedEps && Object.keys(cachedEps).length > 0) {
                  console.log("Loaded from cache");
                  setEpisodes(cachedEps);
                  setLoading(false); // Immediate UI unblock
                  
                  // Check if background sync is needed
                  const now = Date.now();
                  if (!lastUpdate || (now - lastUpdate > CACHE_DURATION)) {
                      console.log("Cache expired, syncing in background...");
                      refreshEpisodes();
                  }
                  return;
              }
          } catch (e) {
              console.warn("Cache load failed", e);
          }

          // 2. If no cache, block UI and sync
          if (isMounted) {
              console.log("No cache, full sync...");
              setLoading(true);
              refreshEpisodes();
          }
      };

      initialize();
      return () => { isMounted = false; };
  }, [user?.username]); // Only run when user changes (Login/Logout)

  // --- Update Effect (Runs when watchlist changes) ---
  useEffect(() => {
      if (!user) return;
      
      // If we are already syncing or just mounted, skip
      if (loading) return;

      // Debounce updates to prevent spamming when adding multiple items quickly
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      
      updateTimeoutRef.current = setTimeout(() => {
          // Only force refresh if we really need to.
          // For now, let's trust manual refreshes or the "add" buttons triggering focused refreshes.
      }, 2000);

      return () => {
          if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      };
  }, [allTrackedShows.length]);


  // --- Auth Handlers ---
  
  const login = (username: string, apiKey: string) => {
    const newUser: User = { username, tmdbKey: apiKey, isAuthenticated: true, isCloud: false };
    setUser(newUser);
    setApiToken(apiKey);
    localStorage.setItem('tv_calendar_user', JSON.stringify(newUser));
  };

  const loginCloud = async (session: any) => {
      if (!supabase) return;

      const { user: authUser } = session;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, tmdb_key, settings')
        .eq('id', authUser.id)
        .single();
      
      if (profile) {
          const newUser: User = { 
              id: authUser.id,
              username: profile.username || authUser.email,
              email: authUser.email,
              tmdbKey: profile.tmdb_key || '',
              isAuthenticated: true,
              isCloud: true
          };
          
          // CRITICAL FIX: Do NOT wipe cache here on reload.
          // Only wipe if the user ID has changed (switching accounts).
          // We rely on 'logout' to clear data when user explicitly signs out.
          if (user && user.id && user.id !== authUser.id) {
               await del(DB_KEY_EPISODES);
               await del(DB_KEY_META);
               setEpisodes({}); 
          }

          setUser(newUser);
          setApiToken(newUser.tmdbKey);
          if (profile.settings) setSettings(profile.settings);

          // Fetch Data & Set State
          // Note: We intentionally do NOT set loading(true) if we already have data in episodes state
          // This prevents the "flash" of empty state on reload.
          if (Object.keys(episodes).length === 0) {
             setLoading(true);
          }
          
          const { data: remoteWatchlist } = await supabase.from('watchlist').select('*');
          if (remoteWatchlist) {
              const loadedWatchlist = remoteWatchlist.map((item: any) => ({
                  id: item.tmdb_id,
                  name: item.name,
                  poster_path: item.poster_path,
                  backdrop_path: item.backdrop_path,
                  overview: item.overview,
                  first_air_date: item.first_air_date,
                  vote_average: item.vote_average,
                  media_type: item.media_type,
                  number_of_seasons: item.number_of_seasons // Restore cached metadata
              })) as TVShow[];
              setWatchlist(loadedWatchlist);
          }

          const { data: remoteSubs } = await supabase.from('subscriptions').select('*');
          if (remoteSubs) {
               const loadedLists: SubscribedList[] = [];
               for (const sub of remoteSubs) {
                   try {
                       const listDetails = await getListDetails(sub.list_id);
                       loadedLists.push({
                           id: sub.list_id,
                           name: listDetails.name,
                           items: listDetails.items,
                           item_count: listDetails.items.length
                       });
                   } catch (e) { console.error(e); }
               }
               setSubscribedLists(loadedLists);
          }

          const { data: remoteReminders } = await supabase.from('reminders').select('*');
          if (remoteReminders) {
              setReminders(remoteReminders.map((r: any) => ({
                  id: r.id,
                  tmdb_id: r.tmdb_id,
                  media_type: r.media_type,
                  scope: r.scope,
                  episode_season: r.episode_season,
                  episode_number: r.episode_number,
                  offset_minutes: r.offset_minutes
              })));
          }

          const { data: remoteInteractions } = await supabase.from('interactions').select('*');
          if (remoteInteractions) {
              const intMap: Record<string, Interaction> = {};
              remoteInteractions.forEach((i: any) => {
                  intMap[`${i.media_type}-${i.tmdb_id}`] = {
                      tmdb_id: i.tmdb_id,
                      media_type: i.media_type,
                      is_watched: i.is_watched,
                      rating: i.rating
                  };
              });
              setInteractions(intMap);
          }
          
          // If we had blocked UI, unblock it now if we aren't going to sync
          // If initialize() determines we need sync, it will set loading/syncing
          if (Object.keys(episodes).length > 0) {
              setLoading(false);
          }
      }
  };

  // --- Account Reload ---
  const reloadAccount = async () => {
    if (isSyncing) return;
    setLoading(true);
    
    try {
        // Nuke Cache
        await del(DB_KEY_EPISODES);
        await del(DB_KEY_META);
        setEpisodes({}); // Clear Visuals
        
        if (user?.isCloud && supabase) {
            // Re-fetch User Data from Source
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await loginCloud(session); 
            } else {
                logout();
            }
        } else {
            // Local Mode: Just force refresh TMDB logic
            await refreshEpisodes(true);
        }
    } catch (e) {
        console.error("Reload failed", e);
        setLoading(false);
    }
  };

  const updateUserKey = async (apiKey: string) => {
      if (user) {
          const updatedUser = { ...user, tmdbKey: apiKey };
          setUser(updatedUser);
          setApiToken(apiKey);
          
          if (user.isCloud && supabase) {
              await supabase.from('profiles').update({ tmdb_key: apiKey }).eq('id', user.id);
          } else {
              localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser));
          }
      }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings, compactCalendar: true };
      if (user?.isCloud && supabase) {
           supabase.from('profiles').update({ settings: updated }).eq('id', user.id).then();
      }
      return updated;
    });
  };

  const logout = async () => {
    if (user?.isCloud && supabase) {
        await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('tv_calendar_user');
    del(DB_KEY_EPISODES);
    del(DB_KEY_META);
    setWatchlist([]);
    setSubscribedLists([]);
    setEpisodes({});
    setReminders([]);
    setInteractions({});
    localStorage.removeItem('tv_calendar_interactions');
  };

  // --- Reminders Logic ---
  const addReminder = async (reminder: Reminder) => {
      const newReminder = { ...reminder, id: reminder.id || crypto.randomUUID() };
      setReminders(prev => [...prev, newReminder]);
      if (user?.isCloud && supabase) {
          await supabase.from('reminders').insert({
              user_id: user.id,
              tmdb_id: reminder.tmdb_id,
              media_type: reminder.media_type,
              scope: reminder.scope,
              episode_season: reminder.episode_season,
              episode_number: reminder.episode_number,
              offset_minutes: reminder.offset_minutes
          });
      }
      await requestNotificationPermission();
  };

  const removeReminder = async (id: string) => {
      setReminders(prev => prev.filter(r => r.id !== id));
      if (user?.isCloud && supabase) {
          await supabase.from('reminders').delete().eq('id', id);
      }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  useEffect(() => {
      if (!user) return;
      const checkReminders = () => {
          if (Notification.permission !== 'granted') return;
          const now = new Date();
          const notifiedKey = 'tv_calendar_notified_events';
          const notifiedEvents = JSON.parse(localStorage.getItem(notifiedKey) || '{}');
          const allEpisodes = Object.values(episodes).flat() as Episode[];
          
          reminders.forEach(rule => {
              let candidates: Episode[] = [];
              if (rule.scope === 'all') {
                   candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.air_date);
              } else if (rule.scope === 'episode') {
                  candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.season_number === rule.episode_season && e.episode_number === rule.episode_number);
              } else if (rule.scope.startsWith('movie')) {
                  candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.is_movie);
                  if (rule.scope === 'movie_theatrical') candidates = candidates.filter(e => e.release_type === 'theatrical');
                  else if (rule.scope === 'movie_digital') candidates = candidates.filter(e => e.release_type === 'digital');
              }

              candidates.forEach(ep => {
                  if (!ep.air_date) return;
                  const releaseDate = parseISO(ep.air_date);
                  if (rule.offset_minutes === 0) {
                      if (isSameDay(now, releaseDate)) triggerNotification(ep, rule, notifiedEvents);
                  } else {
                      const triggerDate = subMinutes(releaseDate, rule.offset_minutes);
                      if (isSameDay(now, triggerDate)) triggerNotification(ep, rule, notifiedEvents);
                  }
              });
          });
          localStorage.setItem(notifiedKey, JSON.stringify(notifiedEvents));
      };

      const triggerNotification = (ep: Episode, rule: Reminder, history: any) => {
          const key = `${rule.id}-${ep.id}-${new Date().toDateString()}`;
          if (history[key]) return;
          const title = ep.is_movie ? ep.name : ep.show_name;
          const body = ep.is_movie 
            ? `${ep.release_type === 'theatrical' ? 'In Theaters' : 'Digital Release'} today!`
            : `S${ep.season_number}E${ep.episode_number} "${ep.name}" is airing!`;
          new Notification(title || 'TV Calendar', { body, icon: '/vite.svg', tag: key });
          history[key] = Date.now();
      };

      const interval = setInterval(checkReminders, 60000);
      checkReminders();
      return () => clearInterval(interval);
  }, [reminders, episodes, user]);

  // --- Data Logic (Watchlist, Subs, Import etc) ---

  const addToWatchlist = async (show: TVShow) => {
    if (watchlist.find(s => s.id === show.id)) return;
    
    // Construct new state first
    const newWatchlist = [...watchlist, show];
    setWatchlist(newWatchlist);
    
    if (user?.isCloud && supabase) {
        await supabase.from('watchlist').upsert({
            user_id: user.id,
            tmdb_id: show.id,
            media_type: show.media_type,
            name: show.name,
            poster_path: show.poster_path,
            backdrop_path: show.backdrop_path,
            overview: show.overview,
            first_air_date: show.first_air_date,
            vote_average: show.vote_average
        }, { onConflict: 'user_id, tmdb_id' });
    }
    if (window.innerWidth < 768 && !settings.suppressMobileAddWarning) {
        setIsMobileWarningOpen(true);
    }
    // Effect will trigger refresh
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
        refreshEpisodes(true); // Force refresh for new item
    }, 2000);
  };

  const removeFromWatchlist = async (showId: number) => {
    const newWatchlist = watchlist.filter(s => s.id !== showId);
    setWatchlist(newWatchlist);
    
    if (user?.isCloud && supabase) {
        await supabase.from('watchlist').delete().match({ user_id: user.id, tmdb_id: showId });
    }
    // Effect will trigger refresh
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
        refreshEpisodes(true); // Force refresh to remove items
    }, 2000);
  };

  const batchAddShows = async (shows: TVShow[]) => {
      const currentIds = new Set(watchlist.map(s => s.id));
      const newShows = shows.filter(s => !currentIds.has(s.id));
      
      if (newShows.length === 0) return;
      
      const newWatchlist = [...watchlist, ...newShows];
      setWatchlist(newWatchlist);
      
      if (user?.isCloud && supabase) {
          const rows = newShows.map(show => ({
            user_id: user.id,
            tmdb_id: show.id,
            media_type: show.media_type,
            name: show.name,
            poster_path: show.poster_path,
            backdrop_path: show.backdrop_path,
            overview: show.overview,
            first_air_date: show.first_air_date,
            vote_average: show.vote_average
          }));
          if (rows.length > 0) {
              await supabase.from('watchlist').upsert(rows, { onConflict: 'user_id, tmdb_id' });
          }
      }
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
         refreshEpisodes(true);
      }, 2000);
  };

  const subscribeToList = async (listId: string) => {
      if (subscribedLists.some(l => l.id === listId)) return;
      try {
          const listDetails = await getListDetails(listId);
          const newList: SubscribedList = {
              id: listId,
              name: listDetails.name,
              items: listDetails.items,
              item_count: listDetails.items.length
          };
          
          const newLists = [...subscribedLists, newList];
          setSubscribedLists(newLists);
          
          if (user?.isCloud && supabase) {
              await supabase.from('subscriptions').upsert({
                  user_id: user.id,
                  list_id: listId,
                  name: listDetails.name,
                  item_count: listDetails.items.length
              }, { onConflict: 'user_id, list_id' });
          }
          if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = setTimeout(() => {
             refreshEpisodes(true);
          }, 2000);
      } catch (error) {
          throw error;
      }
  };

  const unsubscribeFromList = async (listId: string) => {
      const newLists = subscribedLists.filter(l => l.id !== listId);
      setSubscribedLists(newLists);
      
      if (user?.isCloud && supabase) {
          await supabase.from('subscriptions').delete().match({ user_id: user.id, list_id: listId });
      }
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
         refreshEpisodes(true);
      }, 2000);
  };

  const batchSubscribe = async (lists: SubscribedList[]) => {
      const currentIds = new Set(subscribedLists.map(l => l.id));
      const freshLists = lists.filter(l => !currentIds.has(l.id));
      
      if (freshLists.length === 0) return;
      
      const newLists = [...subscribedLists, ...freshLists];
      setSubscribedLists(newLists);
      
      if (user?.isCloud && supabase) {
          const rows = freshLists.map(l => ({
              user_id: user.id,
              list_id: l.id,
              name: l.name,
              item_count: l.item_count
          }));
          if (rows.length > 0) {
              await supabase.from('subscriptions').upsert(rows, { onConflict: 'user_id, list_id' });
          }
      }
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
         refreshEpisodes(true);
      }, 2000);
  };

  const importBackup = (data: any) => {
      if (user?.isCloud) {
          uploadBackupToCloud(data);
          return;
      }
      // Local import
      if (Array.isArray(data)) {
          setWatchlist(data);
      } 
      else if (typeof data === 'object' && data !== null) {
          if (data.user && data.user.username && data.user.tmdbKey) {
              setUser({ ...data.user, isAuthenticated: true, isCloud: false });
          }
          if (data.settings) updateSettings(data.settings);
          if (data.subscribedLists) {
              setSubscribedLists(data.subscribedLists);
          }
          if (data.watchlist) {
              setWatchlist(data.watchlist);
          }
          if (data.reminders) setReminders(data.reminders);
          if (data.interactions) setInteractions(data.interactions);
      }
  };

  const uploadBackupToCloud = async (data: any) => {
      if (!user?.isCloud || !supabase) return;
      setLoading(true);
      try {
          let keyToSet = user.tmdbKey;
          let settingsToSet = settings;
          if (data.user?.tmdbKey) keyToSet = data.user.tmdbKey;
          if (data.settings) settingsToSet = { ...settings, ...data.settings };

          await supabase.from('profiles').update({
              tmdb_key: keyToSet,
              settings: settingsToSet
          }).eq('id', user.id);

          // Update user state which triggers effect
          setUser(prev => prev ? ({ ...prev, tmdbKey: keyToSet }) : null);
          setApiToken(keyToSet);
          setSettings(settingsToSet);

          let items: TVShow[] = [];
          if (Array.isArray(data)) items = data;
          else if (data.watchlist) items = data.watchlist;
          
          if (items.length > 0) await batchAddShows(items);
          if (data.subscribedLists) await batchSubscribe(data.subscribedLists);
          
      } catch (e) {
          console.error("Cloud upload failed", e);
          alert("Failed to upload backup to cloud.");
      } finally {
          setLoading(false);
      }
  };

  const getSyncPayload = useCallback(() => {
      const simpleWatchlist = watchlist.map(item => ({ id: item.id, type: item.media_type }));
      const simpleLists = subscribedLists.map(list => list.id);
      
      const payload = {
          user: { 
              username: user?.username, 
              tmdbKey: user?.tmdbKey, 
              isCloud: user?.isCloud 
          },
          watchlist: simpleWatchlist,
          lists: simpleLists,
          settings,
          interactions // Include in sync
      };
      return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  }, [user, watchlist, subscribedLists, settings, interactions]);

  const processSyncPayload = useCallback(async (encodedPayload: string) => {
      try {
          const json = LZString.decompressFromEncodedURIComponent(encodedPayload);
          if (!json) throw new Error("Invalid payload");
          const data = JSON.parse(json);
          
          if (data.user) {
              const newUser: User = {
                  ...data.user,
                  isAuthenticated: true
              };
              setUser(newUser);
              setApiToken(newUser.tmdbKey);
              if (!newUser.isCloud) {
                  localStorage.setItem('tv_calendar_user', JSON.stringify(newUser));
              }
          }

          if (data.settings) {
              updateSettings(data.settings);
          }

          if (data.interactions) {
              setInteractions(data.interactions);
              if (!data.user?.isCloud) {
                  localStorage.setItem('tv_calendar_interactions', JSON.stringify(data.interactions));
              }
          }

          if (data.watchlist && Array.isArray(data.watchlist)) {
              setLoading(true);
              const shows: TVShow[] = [];
              for (const item of data.watchlist) {
                  try {
                       if (item.type === 'movie') {
                           const details = await getMovieDetails(item.id);
                           shows.push(details);
                       } else {
                           const details = await getShowDetails(item.id);
                           shows.push(details);
                       }
                  } catch (e) { console.error(e); }
              }
              await batchAddShows(shows);
          }

          if (data.lists && Array.isArray(data.lists)) {
               for (const listId of data.lists) {
                   await subscribeToList(listId);
               }
          }
          
          setTimeout(() => window.location.reload(), 500);

      } catch (e) {
          console.error("Sync failed", e);
          alert("Failed to process sync data.");
          setLoading(false);
      }
  }, [batchAddShows, subscribeToList, updateSettings]);

  const closeMobileWarning = (suppressFuture: boolean) => {
      setIsMobileWarningOpen(false);
      if (suppressFuture) {
          updateSettings({ suppressMobileAddWarning: true });
      }
  };

  return (
    <AppContext.Provider value={{
      user, login, loginCloud, logout, updateUserKey,
      watchlist, addToWatchlist, removeFromWatchlist, batchAddShows, batchSubscribe,
      subscribedLists, subscribeToList, unsubscribeFromList, allTrackedShows,
      episodes, loading, isSyncing, syncProgress, refreshEpisodes,
      requestNotificationPermission,
      isSearchOpen, setIsSearchOpen,
      settings, updateSettings,
      importBackup, uploadBackupToCloud,
      getSyncPayload, processSyncPayload,
      isMobileWarningOpen, closeMobileWarning,
      reminders, addReminder, removeReminder,
      reminderCandidate, setReminderCandidate,
      reloadAccount,
      interactions, toggleWatched, setRating
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};