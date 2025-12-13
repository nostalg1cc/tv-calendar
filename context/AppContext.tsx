import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList } from '../types';
import { getShowDetails, getSeasonDetails, getMovieDetails, getMovieReleaseDates, getListDetails } from '../services/tmdb';
import { get, set, del } from 'idb-keyval';
import { format, subWeeks, addWeeks } from 'date-fns';

interface AppContextType {
  user: User | null;
  login: (username: string, apiKey: string) => void;
  logout: () => void;
  updateUserKey: (apiKey: string) => void;
  watchlist: TVShow[]; // Manually added shows
  subscribedLists: SubscribedList[];
  allTrackedShows: TVShow[]; // Combined watchlist + subscribed lists
  addToWatchlist: (show: TVShow) => Promise<void>;
  removeFromWatchlist: (showId: number) => void;
  subscribeToList: (listId: string) => Promise<void>;
  unsubscribeFromList: (listId: string) => void;
  episodes: Record<string, Episode[]>; // Key: "YYYY-MM-DD", Value: Episode[]
  loading: boolean;
  syncProgress: { current: number; total: number }; // New: Track batch progress
  refreshEpisodes: (force?: boolean) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  scheduleNotification: (episode: Episode) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  importBackup: (data: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  hideSpoilers: false,
  hideTheatrical: false,
  recommendationsEnabled: true,
  recommendationMethod: 'banner',
  compactCalendar: true, // Default to compact view
  viewMode: 'grid', // Default to grid view
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

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('tv_calendar_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save settings', e);
      }
      return updated;
    });
  };

  const login = (username: string, apiKey: string) => {
    const newUser: User = { username, tmdbKey: apiKey, isAuthenticated: true };
    setUser(newUser);
    try {
      localStorage.setItem('tv_calendar_user', JSON.stringify(newUser));
    } catch (e) {
      console.warn('Failed to save user to localStorage', e);
    }
  };

  const updateUserKey = (apiKey: string) => {
      if (user) {
          const updatedUser = { ...user, tmdbKey: apiKey };
          setUser(updatedUser);
          try {
             localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser));
             setTimeout(() => refreshEpisodes(true), 100);
          } catch (e) {
             console.warn('Failed to save user to localStorage', e);
          }
      }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('tv_calendar_user');
      del(DB_KEY_EPISODES);
      del(DB_KEY_META);
    } catch (e) {
      console.warn('Failed to remove user/data', e);
    }
    setWatchlist([]);
    setSubscribedLists([]);
    setEpisodes({});
  };

  // --- Watchlist State ---
  const [watchlist, setWatchlist] = useState<TVShow[]>(() => {
    try {
      const saved = localStorage.getItem('tv_calendar_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- Subscribed Lists State ---
  const [subscribedLists, setSubscribedLists] = useState<SubscribedList[]>(() => {
    try {
      const saved = localStorage.getItem('tv_calendar_subscribed_lists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Combined unique set of all shows to track
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

  // Episodes State
  const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Persist watchlist
  useEffect(() => {
    try {
      localStorage.setItem('tv_calendar_watchlist', JSON.stringify(watchlist));
    } catch (e) {
      console.warn('Failed to save watchlist to localStorage', e);
    }
  }, [watchlist]);

  // Persist subscribed lists
  useEffect(() => {
    try {
        localStorage.setItem('tv_calendar_subscribed_lists', JSON.stringify(subscribedLists));
    } catch (e) {
        console.warn('Failed to save subscribed lists to localStorage', e);
    }
  }, [subscribedLists]);

  // Helper to fetch episodes for a show (TV)
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

  // Helper to fetch data for a Movie
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
        const [cachedEpData, cacheMetaData] = await Promise.all([
            get(DB_KEY_EPISODES),
            get(DB_KEY_META)
        ]);

        if (cachedEpData && cacheMetaData) {
            const meta = cacheMetaData as any;
            currentEpisodes = cachedEpData;
            cachedShowIds = meta.showIds || [];
            isFresh = (Date.now() - meta.timestamp) < CACHE_DURATION;
            
            // OPTIMISTIC UPDATE: Show what we have instantly
            setEpisodes(currentEpisodes);
        }
    } catch (e) {
        console.warn('Error reading IDB cache', e);
    }

    // 2. DETERMINE WORK NEEDED
    const currentTrackedIds = allTrackedShows.map(s => s.id);
    const missingShowIds = currentTrackedIds.filter(id => !cachedShowIds.includes(id));
    const removedShowIds = cachedShowIds.filter(id => !currentTrackedIds.includes(id));
    
    // Logic: Full update if force requested, or if cache is stale AND we have no new/removed shows (just generic refresh)
    const needsFullUpdate = force || (!isFresh && missingShowIds.length === 0 && removedShowIds.length === 0);
    const needsPartialUpdate = missingShowIds.length > 0;
    const needsCleanup = removedShowIds.length > 0;

    if (!needsFullUpdate && !needsPartialUpdate && !needsCleanup && Object.keys(currentEpisodes).length > 0) {
        console.log('Cache is fresh and complete.');
        setLoading(false);
        return;
    }

    // 3. PRIORITY SORTING FOR FETCH
    const showsToFetch = needsFullUpdate ? [...allTrackedShows] : allTrackedShows.filter(s => missingShowIds.includes(s.id));

    if (showsToFetch.length > 0) {
        // Define "Current Window": 2 Weeks Back to 3 Weeks Forward for a slightly wider "safe" buffer
        const today = new Date();
        const startWindow = format(subWeeks(today, 2), 'yyyy-MM-dd');
        const endWindow = format(addWeeks(today, 3), 'yyyy-MM-dd');
        
        const priorityShowIds = new Set<number>();
        
        // Scan current cache (stale or not) to find what was airing recently
        if (currentEpisodes) {
            Object.keys(currentEpisodes).forEach(date => {
                if (date >= startWindow && date <= endWindow) {
                    currentEpisodes[date].forEach(ep => {
                        if (ep.show_id) priorityShowIds.add(ep.show_id);
                    });
                }
            });
        }

        // Sort Strategy: 
        // 1. Missing shows (User wants to see what they just added)
        // 2. Priority shows (Shows visible on current calendar view)
        // 3. Everything else
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
                    return fetchEpisodesForMovie(show).catch(() => ({}));
                } else {
                    return fetchEpisodesForTV(show).catch(() => ({}));
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
            
            // Incrementally merge into UI state
            // We use functional state update to ensure we don't clobber updates from previous loop if React batches oddly
            setEpisodes(prev => {
                const updated = { ...prev };
                // If this is a full update, we essentially want to overwrite eventually, 
                // but purely additive is safer for visual stability until the end.
                Object.entries(newFetchedEpisodes).forEach(([date, eps]) => {
                    // Simple merge: If we fetched new data for this date, assume it's "truer" than old data? 
                    // No, newFetchedEpisodes only contains specific shows. We must append to existing date key.
                    // BUT we must filter duplicates if we are "updating" existing shows.
                    // To keep it simple: We just add to the pile and rely on the final consolidation to be clean.
                    if (!updated[date]) updated[date] = [];
                    
                    // Add only unique IDs to avoid temporary duplicates in UI
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
        
        // Final Consolidation
        if (needsFullUpdate) {
            // If full update, the new fetch IS the truth. 
            // However, we fetched showsToFetch which IS allTrackedShows.
            // So newFetchedEpisodes is the complete new state.
            currentEpisodes = newFetchedEpisodes;
        } else {
            // Partial update: Merge new stuff into old stuff
            Object.entries(newFetchedEpisodes).forEach(([date, eps]) => {
                if (!currentEpisodes[date]) currentEpisodes[date] = [];
                currentEpisodes[date] = [...currentEpisodes[date], ...eps];
            });
        }
    }

    // 4. CLEANUP
    if (needsCleanup && !needsFullUpdate) {
        const trackedIdSet = new Set(currentTrackedIds);
        const cleanedEpisodes: Record<string, Episode[]> = {};
        Object.entries(currentEpisodes).forEach(([date, eps]) => {
            const filtered = eps.filter(ep => trackedIdSet.has(ep.show_id!));
            if (filtered.length > 0) cleanedEpisodes[date] = filtered;
        });
        currentEpisodes = cleanedEpisodes;
    }

    // 5. FINAL SAVE
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

  const addToWatchlist = async (show: TVShow) => {
    if (watchlist.find(s => s.id === show.id)) return;
    const updated = [...watchlist, show];
    setWatchlist(updated);
  };

  const removeFromWatchlist = (showId: number) => {
    setWatchlist(prev => prev.filter(s => s.id !== showId));
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
      } catch (error) {
          throw error;
      }
  };

  const unsubscribeFromList = (listId: string) => {
      setSubscribedLists(prev => prev.filter(l => l.id !== listId));
  };

  const importBackup = (data: any) => {
      if (Array.isArray(data)) {
          setWatchlist(data);
      } 
      else if (typeof data === 'object' && data !== null) {
          if (data.user) {
              const restoredUser = data.user;
              if (restoredUser.username && restoredUser.tmdbKey) {
                  setUser({ ...restoredUser, isAuthenticated: true });
                  localStorage.setItem('tv_calendar_user', JSON.stringify({ ...restoredUser, isAuthenticated: true }));
              }
          }
          if (data.settings) {
              updateSettings(data.settings);
          }
          if (data.subscribedLists) {
              setSubscribedLists(data.subscribedLists);
          }
          if (data.watchlist && Array.isArray(data.watchlist)) {
              setWatchlist(data.watchlist);
          }
      } else {
          throw new Error('Invalid file format');
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
      user, login, logout, updateUserKey,
      watchlist, addToWatchlist, removeFromWatchlist,
      subscribedLists, subscribeToList, unsubscribeFromList, allTrackedShows,
      episodes, loading, syncProgress, refreshEpisodes,
      requestNotificationPermission, scheduleNotification,
      isSearchOpen, setIsSearchOpen,
      settings, updateSettings,
      importBackup
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