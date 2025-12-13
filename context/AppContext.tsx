import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList } from '../types';
import { getShowDetails, getSeasonDetails, getMovieDetails, getMovieReleaseDates, getListDetails } from '../services/tmdb';

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
  refreshEpisodes: () => Promise<void>;
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
};

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
             // Removed window.location.reload() to prevent "Location.assign" errors in sandboxed environments
             // Instead, we just re-fetch episodes with the new key
             setTimeout(() => refreshEpisodes(), 100);
          } catch (e) {
             console.warn('Failed to save user to localStorage', e);
          }
      }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('tv_calendar_user');
    } catch (e) {
      console.warn('Failed to remove user from localStorage', e);
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
      
      // Add manual watchlist
      watchlist.forEach(show => map.set(show.id, show));
      
      // Add subscribed lists
      subscribedLists.forEach(list => {
          list.items.forEach(show => {
              if (!map.has(show.id)) {
                  map.set(show.id, show);
              }
          });
      });
      
      return Array.from(map.values());
  }, [watchlist, subscribedLists]);

  const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
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
      if (seasonCount > 1) {
        seasonsToFetch.push(seasonCount - 1);
      }

      const newEpisodes: Record<string, Episode[]> = {};

      for (const seasonNum of seasonsToFetch) {
        try {
          const seasonData = await getSeasonDetails(show.id, seasonNum);
          if (seasonData && seasonData.episodes) {
            seasonData.episodes.forEach((ep) => {
              if (ep.air_date) {
                const dateKey = ep.air_date; // YYYY-MM-DD
                if (!newEpisodes[dateKey]) {
                  newEpisodes[dateKey] = [];
                }
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
        } catch (e) {
          // Silent fail for individual seasons is okay
        }
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
           if (!newEpisodes[rd.date]) {
               newEpisodes[rd.date] = [];
           }
           
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
        console.error(`Error fetching details for movie ${show.name}`, error);
        return {};
    }
  };

  const refreshEpisodes = async () => {
    if (!user || !user.tmdbKey) {
        setEpisodes({});
        return;
    }

    if (allTrackedShows.length === 0) {
      setEpisodes({});
      setSyncProgress({ current: 0, total: 0 });
      return;
    }
    
    setLoading(true);
    setSyncProgress({ current: 0, total: allTrackedShows.length });
    
    const allEpisodes: Record<string, Episode[]> = {};
    
    // BATCHING IMPLEMENTATION
    const BATCH_SIZE = 4;
    
    for (let i = 0; i < allTrackedShows.length; i += BATCH_SIZE) {
        const batch = allTrackedShows.slice(i, i + BATCH_SIZE);
        
        const promises = batch.map(show => {
            if (show.media_type === 'movie') {
                return fetchEpisodesForMovie(show).catch(() => ({}));
            } else {
                return fetchEpisodesForTV(show).catch(() => ({}));
            }
        });

        const results = await Promise.all(promises);

        // Merge batch results into main object
        results.forEach((showEpisodes) => {
            Object.entries(showEpisodes).forEach(([date, eps]) => {
                if (!allEpisodes[date]) {
                    allEpisodes[date] = [];
                }
                const episodeList = eps as Episode[];
                allEpisodes[date] = [...allEpisodes[date], ...episodeList];
            });
        });

        // Update progress
        setSyncProgress(prev => ({ 
            ...prev, 
            current: Math.min(prev.total, i + batch.length) 
        }));

        // Add a small delay between batches
        if (i + BATCH_SIZE < allTrackedShows.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    setEpisodes(allEpisodes);
    setLoading(false);
    // Reset progress after a short delay so UI can show 100% briefly
    setTimeout(() => setSyncProgress({ current: 0, total: 0 }), 1000);
  };

  // Initial fetch on load and whenever total tracking changes
  useEffect(() => {
    refreshEpisodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTrackedShows, user]); 

  const addToWatchlist = async (show: TVShow) => {
    if (watchlist.find(s => s.id === show.id)) return;
    const updated = [...watchlist, show];
    setWatchlist(updated);
  };

  const removeFromWatchlist = (showId: number) => {
    setWatchlist(prev => prev.filter(s => s.id !== showId));
  };

  const subscribeToList = async (listId: string) => {
      // Check if already subscribed
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
      // Case 1: Legacy Backup (Array of shows)
      if (Array.isArray(data)) {
          setWatchlist(data);
      } 
      // Case 2: Structured Backup (Object)
      else if (typeof data === 'object' && data !== null) {
          
          // Restore User
          if (data.user) {
              const restoredUser = data.user;
              if (restoredUser.username && restoredUser.tmdbKey) {
                  setUser({ ...restoredUser, isAuthenticated: true });
                  localStorage.setItem('tv_calendar_user', JSON.stringify({ ...restoredUser, isAuthenticated: true }));
              }
          }

          // Restore Settings
          if (data.settings) {
              updateSettings(data.settings);
          }

          // Restore Subscribed Lists FIRST (so useEffect doesn't fire double fetches unnecessarily if we set Watchlist second)
          // Actually, React batching might handle it, but let's be safe.
          if (data.subscribedLists) {
              setSubscribedLists(data.subscribedLists);
          }

          // Restore Watchlist
          if (data.watchlist && Array.isArray(data.watchlist)) {
              setWatchlist(data.watchlist);
          }
      } else {
          throw new Error('Invalid file format');
      }
      
      // We do NOT reload the page anymore. 
      // The state updates (setWatchlist/setSubscribedLists) will trigger the `useEffect` on `allTrackedShows`.
      // The `refreshEpisodes` function will be called automatically, and `syncProgress` will update.
  };

  // --- Notifications ---
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