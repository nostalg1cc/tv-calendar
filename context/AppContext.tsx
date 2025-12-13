import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList } from '../types';
import { getShowDetails, getSeasonDetails, getMovieDetails, getMovieReleaseDates, getListDetails } from '../services/tmdb';
import { get, set, del } from 'idb-keyval';
import { format, subWeeks, addWeeks } from 'date-fns';
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
  loading: boolean;
  syncProgress: { current: number; total: number }; 
  refreshEpisodes: (force?: boolean) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  scheduleNotification: (episode: Episode) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  hideSpoilers: false,
  hideTheatrical: false,
  recommendationsEnabled: true,
  recommendationMethod: 'banner',
  compactCalendar: true, 
  viewMode: 'grid', 
  suppressMobileAddWarning: false,
  calendarPosterFillMode: 'cover',
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

  // --- Settings State ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('tv_calendar_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
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

  // Episodes State
  const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileWarningOpen, setIsMobileWarningOpen] = useState(false);

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
    }
    // Cloud persistence is handled immediately in handlers
  }, [watchlist, subscribedLists, settings, user]);


  // --- Auth Handlers ---
  
  // Local Login
  const login = (username: string, apiKey: string) => {
    const newUser: User = { username, tmdbKey: apiKey, isAuthenticated: true, isCloud: false };
    setUser(newUser);
    localStorage.setItem('tv_calendar_user', JSON.stringify(newUser));
  };

  // Cloud Login
  const loginCloud = async (session: any) => {
      if (!supabase) return;

      const { user } = session;
      
      // Fetch Profile for API Key & Settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, tmdb_key, settings')
        .eq('id', user.id)
        .single();
      
      if (profile) {
          const newUser: User = { 
              id: user.id,
              username: profile.username || user.email,
              email: user.email,
              tmdbKey: profile.tmdb_key || '',
              isAuthenticated: true,
              isCloud: true
          };
          setUser(newUser);
          if (profile.settings) setSettings(profile.settings);

          // Fetch Data
          setLoading(true);
          
          // Watchlist
          const { data: remoteWatchlist } = await supabase
            .from('watchlist')
            .select('*');
            
          if (remoteWatchlist) {
              const mapped = remoteWatchlist.map((item: any) => ({
                  id: item.tmdb_id,
                  name: item.name,
                  poster_path: item.poster_path,
                  backdrop_path: item.backdrop_path,
                  overview: item.overview,
                  first_air_date: item.first_air_date,
                  vote_average: item.vote_average,
                  media_type: item.media_type
              })) as TVShow[];
              setWatchlist(mapped);
          }

          // Subscriptions (Requires refetching list contents from TMDB as we only store List ID)
          const { data: remoteSubs } = await supabase.from('subscriptions').select('*');
          if (remoteSubs) {
               // We only store metadata in DB, so we must fetch items from TMDB
               // This can be slow, so we do it in parallel
               const subList: SubscribedList[] = [];
               for (const sub of remoteSubs) {
                   try {
                       const listDetails = await getListDetails(sub.list_id);
                       subList.push({
                           id: sub.list_id,
                           name: listDetails.name,
                           items: listDetails.items,
                           item_count: listDetails.items.length
                       });
                   } catch (e) { console.error(e); }
               }
               setSubscribedLists(subList);
          }
          setLoading(false);
      }
  };

  const updateUserKey = async (apiKey: string) => {
      if (user) {
          const updatedUser = { ...user, tmdbKey: apiKey };
          setUser(updatedUser);
          
          if (user.isCloud && supabase) {
              await supabase.from('profiles').update({ tmdb_key: apiKey }).eq('id', user.id);
          } else {
              localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser));
          }
          setTimeout(() => refreshEpisodes(true), 100);
      }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
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
  };

  // --- Data Logic ---

  const addToWatchlist = async (show: TVShow) => {
    if (watchlist.find(s => s.id === show.id)) return;
    
    // Optimistic Update
    setWatchlist(prev => [...prev, show]);

    if (user?.isCloud && supabase) {
        // DB Insert
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

    // Mobile Check
    if (window.innerWidth < 768 && !settings.suppressMobileAddWarning) {
        setIsMobileWarningOpen(true);
    }
  };

  const removeFromWatchlist = async (showId: number) => {
    setWatchlist(prev => prev.filter(s => s.id !== showId));
    
    if (user?.isCloud && supabase) {
        await supabase.from('watchlist').delete().match({ user_id: user.id, tmdb_id: showId });
    }
  };

  const batchAddShows = async (shows: TVShow[]) => {
      setWatchlist(prev => {
          const currentIds = new Set(prev.map(s => s.id));
          const newShows = shows.filter(s => !currentIds.has(s.id));
          return [...prev, ...newShows];
      });

      if (user?.isCloud && supabase) {
          const rows = shows.map(show => ({
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
          setSubscribedLists(prev => [...prev, newList]);

          if (user?.isCloud && supabase) {
              await supabase.from('subscriptions').upsert({
                  user_id: user.id,
                  list_id: listId,
                  name: listDetails.name,
                  item_count: listDetails.items.length
              }, { onConflict: 'user_id, list_id' });
          }

      } catch (error) {
          throw error;
      }
  };

  const unsubscribeFromList = async (listId: string) => {
      setSubscribedLists(prev => prev.filter(l => l.id !== listId));
      if (user?.isCloud && supabase) {
          await supabase.from('subscriptions').delete().match({ user_id: user.id, list_id: listId });
      }
  };

  const batchSubscribe = async (lists: SubscribedList[]) => {
      setSubscribedLists(prev => {
          const currentIds = new Set(prev.map(l => l.id));
          const newLists = lists.filter(l => !currentIds.has(l.id));
          return [...prev, ...newLists];
      });

      if (user?.isCloud && supabase) {
          const rows = lists.map(l => ({
              user_id: user.id,
              list_id: l.id,
              name: l.name,
              item_count: l.item_count
          }));
          if (rows.length > 0) {
              await supabase.from('subscriptions').upsert(rows, { onConflict: 'user_id, list_id' });
          }
      }
  };

  // --- Import Logic ---

  const importBackup = (data: any) => {
      // If we are in Cloud mode, "Import" actually means "Migrate to Cloud"
      if (user?.isCloud) {
          uploadBackupToCloud(data);
          return;
      }

      // Local Mode Import (Existing Logic)
      if (Array.isArray(data)) {
          setWatchlist(data);
      } 
      else if (typeof data === 'object' && data !== null) {
          if (data.user) {
              const restoredUser = data.user;
              // Ensure we don't accidentally overwrite cloud state if user uploaded wrong file type
              if (restoredUser.username && restoredUser.tmdbKey) {
                  setUser({ ...restoredUser, isAuthenticated: true, isCloud: false });
                  localStorage.setItem('tv_calendar_user', JSON.stringify({ ...restoredUser, isAuthenticated: true, isCloud: false }));
              }
          }
          if (data.settings) updateSettings(data.settings);
          if (data.subscribedLists) setSubscribedLists(data.subscribedLists);
          if (data.watchlist && Array.isArray(data.watchlist)) setWatchlist(data.watchlist);
      } else {
          throw new Error('Invalid file format');
      }
  };

  const uploadBackupToCloud = async (data: any) => {
      if (!user?.isCloud || !supabase) return;
      setLoading(true);

      try {
          // 1. Update Profile (Key + Settings)
          let keyToSet = user.tmdbKey;
          let settingsToSet = settings;

          if (data.user?.tmdbKey) keyToSet = data.user.tmdbKey;
          if (data.settings) settingsToSet = { ...settings, ...data.settings };

          await supabase.from('profiles').update({
              tmdb_key: keyToSet,
              settings: settingsToSet
          }).eq('id', user.id);

          updateUserKey(keyToSet);
          setSettings(settingsToSet);

          // 2. Upload Watchlist
          let items: TVShow[] = [];
          if (Array.isArray(data)) items = data;
          else if (data.watchlist) items = data.watchlist;

          if (items.length > 0) {
              await batchAddShows(items);
          }

          // 3. Upload Lists
          if (data.subscribedLists && Array.isArray(data.subscribedLists)) {
             await batchSubscribe(data.subscribedLists);
          }

      } catch (e) {
          console.error("Cloud upload failed", e);
          alert("Failed to upload backup to cloud.");
      } finally {
          setLoading(false);
      }
  };

  // --- Episode Fetching (TMDB) - Unchanged Logic, just using current state ---
  const fetchEpisodesForTV = async (show: TVShow): Promise<Record<string, Episode[]>> => {
    try {
      const details = await getShowDetails(show.id);
      const seasonCount = details.number_of_seasons || 1;
      
      const seasonsToFetch = [seasonCount]; 
      if (seasonCount > 1) seasonsToFetch.push(seasonCount - 1);

      const newEpisodes: Record<string, Episode[]> = {};

      for (const seasonNum of seasonsToFetch) {
        try {
          const seasonData = await getSeasonDetails(show.id, seasonNum);
          if (seasonData && seasonData.episodes) {
            seasonData.episodes.forEach((ep) => {
              if (ep.air_date) {
                const dateKey = ep.air_date;
                if (!newEpisodes[dateKey]) newEpisodes[dateKey] = [];
                newEpisodes[dateKey].push({
                  ...ep,
                  show_id: show.id,
                  show_name: show.name,
                  poster_path: seasonData.poster_path || details.poster_path,
                  is_movie: false
                });
              }
            });
          }
        } catch (e) { /* silent fail */ }
      }
      return newEpisodes;
    } catch (error) {
      console.error(`Error fetching details for ${show.name}`, error);
      return {};
    }
  };

  const fetchEpisodesForMovie = async (show: TVShow): Promise<Record<string, Episode[]>> => {
    try {
       const releaseDates = await getMovieReleaseDates(show.id);
       if (releaseDates.length === 0 && show.first_air_date) {
         releaseDates.push({ date: show.first_air_date, type: 'theatrical' });
       }

       const newEpisodes: Record<string, Episode[]> = {};
       releaseDates.forEach(rd => {
           if (!newEpisodes[rd.date]) newEpisodes[rd.date] = [];
           const movieEp: Episode = {
               id: show.id * 1000 + (rd.type === 'digital' ? 2 : 1), 
               name: show.name,
               overview: show.overview,
               vote_average: show.vote_average,
               air_date: rd.date,
               episode_number: 0,
               season_number: 0,
               still_path: show.backdrop_path, 
               show_id: show.id,
               show_name: show.name,
               poster_path: show.poster_path,
               is_movie: true,
               release_type: rd.type
           };
           newEpisodes[rd.date].push(movieEp);
       });
       return newEpisodes;
    } catch (error) {
        return {};
    }
  };

  const refreshEpisodes = useCallback(async (force = false) => {
    if (!user || !user.tmdbKey) {
        setEpisodes({});
        setLoading(false);
        return;
    }

    if (allTrackedShows.length === 0) {
      setEpisodes({});
      setLoading(false);
      return;
    }
    
    setLoading(true);

    let currentEpisodes: Record<string, Episode[]> = {};
    let cachedShowIds: number[] = [];
    let isFresh = false;

    // 1. ATTEMPT LOAD FROM IDB (Optimistic)
    try {
        const cacheValues = await Promise.all([
            get(DB_KEY_EPISODES),
            get(DB_KEY_META)
        ]);
        
        const cachedEpData = cacheValues[0] as Record<string, Episode[]> | undefined;
        const cacheMetaData = cacheValues[1] as {timestamp: number, showIds: number[]} | undefined;

        if (cachedEpData && cacheMetaData) {
            currentEpisodes = cachedEpData;
            cachedShowIds = cacheMetaData.showIds || [];
            isFresh = (Date.now() - cacheMetaData.timestamp) < CACHE_DURATION;
            setEpisodes(currentEpisodes);
        }
    } catch (e) {
        console.warn('Error reading IDB cache', e);
    }

    // 2. DETERMINE WORK NEEDED
    const currentTrackedIds = allTrackedShows.map(s => s.id);
    const missingShowIds = currentTrackedIds.filter(id => !cachedShowIds.includes(id));
    const removedShowIds = cachedShowIds.filter(id => !currentTrackedIds.includes(id));
    
    const needsFullUpdate = force || (!isFresh && missingShowIds.length === 0 && removedShowIds.length === 0);
    const needsPartialUpdate = missingShowIds.length > 0;
    const needsCleanup = removedShowIds.length > 0;

    if (!needsFullUpdate && !needsPartialUpdate && !needsCleanup && Object.keys(currentEpisodes).length > 0) {
        setLoading(false);
        return;
    }

    // 3. PRIORITY SORTING FOR FETCH
    const showsToFetch = needsFullUpdate ? [...allTrackedShows] : allTrackedShows.filter(s => missingShowIds.includes(s.id));

    if (showsToFetch.length > 0) {
        const today = new Date();
        const startWindow = format(subWeeks(today, 2), 'yyyy-MM-dd');
        const endWindow = format(addWeeks(today, 3), 'yyyy-MM-dd');
        
        const priorityShowIds = new Set<number>();
        if (currentEpisodes) {
            Object.keys(currentEpisodes).forEach(date => {
                if (date >= startWindow && date <= endWindow) {
                    currentEpisodes[date].forEach(ep => {
                        if (ep.show_id) priorityShowIds.add(ep.show_id);
                    });
                }
            });
        }

        showsToFetch.sort((a, b) => {
            const aIsMissing = missingShowIds.includes(a.id);
            const bIsMissing = missingShowIds.includes(b.id);
            if (aIsMissing && !bIsMissing) return -1;
            if (!aIsMissing && bIsMissing) return 1;
            const aIsPriority = priorityShowIds.has(a.id);
            const bIsPriority = priorityShowIds.has(b.id);
            if (aIsPriority && !bIsPriority) return -1;
            if (!aIsPriority && bIsPriority) return 1;
            return 0;
        });

        setSyncProgress({ current: 0, total: showsToFetch.length });

        const BATCH_SIZE = 4;
        const newFetchedEpisodes: Record<string, Episode[]> = {};

        for (let i = 0; i < showsToFetch.length; i += BATCH_SIZE) {
            const batch = showsToFetch.slice(i, i + BATCH_SIZE);
            const promises = batch.map(show => {
                if (show.media_type === 'movie') {
                    return fetchEpisodesForMovie(show).catch(() => ({} as Record<string, Episode[]>));
                } else {
                    return fetchEpisodesForTV(show).catch(() => ({} as Record<string, Episode[]>));
                }
            });

            const results = await Promise.all(promises);

            results.forEach((showEpisodes) => {
                Object.entries(showEpisodes).forEach(([date, eps]) => {
                    if (!newFetchedEpisodes[date]) newFetchedEpisodes[date] = [];
                    newFetchedEpisodes[date] = [...newFetchedEpisodes[date], ...eps];
                });
            });

            setSyncProgress(prev => ({ 
                ...prev, 
                current: Math.min(prev.total, i + batch.length) 
            }));
            
            setEpisodes(prev => {
                const updated = { ...prev };
                Object.entries(newFetchedEpisodes).forEach(([date, eps]) => {
                    if (!updated[date]) updated[date] = [];
                    const existingIds = new Set(updated[date].map(e => e.id));
                    const uniqueNew = eps.filter(e => !existingIds.has(e.id));
                    updated[date] = [...updated[date], ...uniqueNew];
                });
                return updated;
            });

            if (i + BATCH_SIZE < showsToFetch.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        if (needsFullUpdate) {
            currentEpisodes = newFetchedEpisodes;
        } else {
            Object.entries(newFetchedEpisodes).forEach(([date, eps]) => {
                if (!currentEpisodes[date]) currentEpisodes[date] = [];
                currentEpisodes[date] = [...currentEpisodes[date], ...eps];
            });
        }
    }

    if (needsCleanup && !needsFullUpdate) {
        const trackedIdSet = new Set(currentTrackedIds);
        const cleanedEpisodes: Record<string, Episode[]> = {};
        Object.entries(currentEpisodes).forEach(([date, eps]) => {
            const filtered = eps.filter(ep => trackedIdSet.has(ep.show_id!));
            if (filtered.length > 0) cleanedEpisodes[date] = filtered;
        });
        currentEpisodes = cleanedEpisodes;
    }

    setEpisodes(currentEpisodes);
    
    try {
        await set(DB_KEY_EPISODES, currentEpisodes);
        await set(DB_KEY_META, {
            timestamp: Date.now(),
            showIds: currentTrackedIds
        });
    } catch (e) {
        console.error('Failed to save to IDB', e);
    }

    setLoading(false);
    setTimeout(() => setSyncProgress({ current: 0, total: 0 }), 1000);
  }, [allTrackedShows, user]);

  useEffect(() => {
    refreshEpisodes();
  }, [refreshEpisodes]); 

  const closeMobileWarning = (suppressFuture: boolean) => {
      setIsMobileWarningOpen(false);
      if (suppressFuture) {
          updateSettings({ suppressMobileAddWarning: true });
      }
  };
  
  // Mobile/QR logic helpers
  const getSyncPayload = () => {
    if (!user) return '';
    const payload = {
        k: user.tmdbKey,
        u: user.username,
        w: watchlist.map(s => ({ i: s.id, t: s.media_type === 'movie' ? 1 : 0 })),
        s: subscribedLists.map(l => l.id),
        c: {
            cc: settings.compactCalendar ? 1 : 0,
            ht: settings.hideTheatrical ? 1 : 0,
            hs: settings.hideSpoilers ? 1 : 0,
            pf: settings.calendarPosterFillMode === 'contain' ? 1 : 0
        }
    };
    const jsonStr = JSON.stringify(payload);
    return LZString.compressToEncodedURIComponent(jsonStr);
  };

  const processSyncPayload = async (payload: string) => {
      try {
          const jsonStr = LZString.decompressFromEncodedURIComponent(payload);
          if (!jsonStr) throw new Error("Decompression failed");
          
          const data = JSON.parse(jsonStr) as any;
          if (!data.k || !data.u) throw new Error("Invalid payload data");

          if (!user || user.username !== data.u) {
              login(data.u, data.k);
          } else if (user.tmdbKey !== data.k) {
              updateUserKey(data.k);
          }

          if (data.c) {
              updateSettings({
                  compactCalendar: data.c.cc === 1,
                  hideTheatrical: data.c.ht === 1,
                  hideSpoilers: data.c.hs === 1,
                  calendarPosterFillMode: data.c.pf === 1 ? 'contain' : 'cover'
              });
          }

          if (data.s && Array.isArray(data.s)) {
             const lists: SubscribedList[] = [];
             const listIds = data.s as string[];
             for (const listId of listIds) {
                 try {
                     const details = await getListDetails(listId);
                     lists.push({
                         id: listId,
                         name: details.name,
                         items: details.items,
                         item_count: details.items.length
                     });
                 } catch (e) { console.error(e); }
             }
             setSubscribedLists(lists);
          }

          if (data.w && Array.isArray(data.w)) {
              setLoading(true);
              const restoredWatchlist: TVShow[] = [];
              const batches: any[][] = [];
              const BATCH = 5;
              
              const watchItems = data.w as any[];
              for (let i = 0; i < watchItems.length; i += BATCH) {
                  batches.push(watchItems.slice(i, i + BATCH));
              }

              let current = 0;
              setSyncProgress({ current: 0, total: watchItems.length });

              for (const batch of batches) {
                  const promises = batch.map((item: any) => {
                      const id = item.i;
                      const type = item.t === 1 ? 'movie' : 'tv';
                      if (type === 'movie') return getMovieDetails(id).catch(() => null);
                      else return getShowDetails(id).catch(() => null);
                  });
                  
                  const results = await Promise.all(promises);
                  results.forEach(r => {
                      if (r) restoredWatchlist.push(r);
                  });
                  
                  current += batch.length;
                  setSyncProgress({ current, total: watchItems.length });
              }
              setWatchlist(restoredWatchlist);
          }

          setLoading(false);

      } catch (e) {
          console.error(e);
          alert("Failed to sync from QR Code. Data may be corrupted.");
          setLoading(false);
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

  const scheduleNotification = (episode: Episode) => {
    if (Notification.permission === 'granted') {
      const bodyText = episode.is_movie 
        ? `${episode.name} (${episode.release_type === 'digital' ? 'Home' : 'Theatrical'}) is releasing today!` 
        : `${episode.name} (S${episode.season_number}E${episode.episode_number}) is airing today!`;
        
      new Notification(`Reminder: ${episode.show_name}`, {
        body: bodyText,
        icon: '/vite.svg'
      });
      alert(`Reminder set for ${episode.show_name}!`);
    } else {
      requestNotificationPermission().then(granted => {
        if (granted) {
          scheduleNotification(episode);
        }
      });
    }
  };

  return (
    <AppContext.Provider value={{
      user, login, loginCloud, logout, updateUserKey,
      watchlist, addToWatchlist, removeFromWatchlist, batchAddShows, batchSubscribe,
      subscribedLists, subscribeToList, unsubscribeFromList, allTrackedShows,
      episodes, loading, syncProgress, refreshEpisodes,
      requestNotificationPermission, scheduleNotification,
      isSearchOpen, setIsSearchOpen,
      settings, updateSettings,
      importBackup, uploadBackupToCloud,
      getSyncPayload, processSyncPayload,
      isMobileWarningOpen, closeMobileWarning
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