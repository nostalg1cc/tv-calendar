import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList, Reminder } from '../types';
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
  loading: boolean;
  syncProgress: { current: number; total: number }; 
  refreshEpisodes: (force?: boolean) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  
  // Reminders
  reminders: Reminder[];
  addReminder: (reminder: Reminder) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  
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
  compactCalendar: true, // Forced default
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
        localStorage.setItem('tv_calendar_reminders', JSON.stringify(reminders));
    }
  }, [watchlist, subscribedLists, settings, user, reminders]);


  // --- Auth Handlers ---
  
  // Local Login
  const login = (username: string, apiKey: string) => {
    const newUser: User = { username, tmdbKey: apiKey, isAuthenticated: true, isCloud: false };
    setUser(newUser);
    setApiToken(apiKey);
    localStorage.setItem('tv_calendar_user', JSON.stringify(newUser));
  };

  // Cloud Login
  const loginCloud = async (session: any) => {
      if (!supabase) return;

      const { user } = session;
      
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
          setApiToken(newUser.tmdbKey);
          if (profile.settings) setSettings(profile.settings);

          // Fetch Data
          setLoading(true);
          
          const { data: remoteWatchlist } = await supabase.from('watchlist').select('*');
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

          const { data: remoteSubs } = await supabase.from('subscriptions').select('*');
          if (remoteSubs) {
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

          // Fetch Reminders
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
          setTimeout(() => refreshEpisodes(true), 100);
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
  };

  // --- Reminders Logic ---
  
  const addReminder = async (reminder: Reminder) => {
      // Local optimistic update
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

  // Polling for reminders
  useEffect(() => {
      if (!user) return;

      const checkReminders = () => {
          if (Notification.permission !== 'granted') return;

          const now = new Date();
          const notifiedKey = 'tv_calendar_notified_events';
          const notifiedEvents = JSON.parse(localStorage.getItem(notifiedKey) || '{}');
          
          // Flatten episodes for easier search
          const allEpisodes = Object.values(episodes).flat() as Episode[];
          
          reminders.forEach(rule => {
              // 1. Find matching event(s)
              let candidates: Episode[] = [];
              
              if (rule.scope === 'all') {
                  // All episodes for show
                   candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.air_date);
              } else if (rule.scope === 'episode') {
                  // Specific episode
                  candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.season_number === rule.episode_season && e.episode_number === rule.episode_number);
              } else if (rule.scope.startsWith('movie')) {
                  // Movie
                  candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.is_movie);
                  if (rule.scope === 'movie_theatrical') {
                      candidates = candidates.filter(e => e.release_type === 'theatrical');
                  } else if (rule.scope === 'movie_digital') {
                      candidates = candidates.filter(e => e.release_type === 'digital');
                  }
              }

              // 2. Check time
              candidates.forEach(ep => {
                  if (!ep.air_date) return;
                  const releaseDate = parseISO(ep.air_date);
                  // Since we only have date (YYYY-MM-DD), assume 9 AM local time for notification if offset is 0
                  // Or just use the date comparison
                  
                  // For "Day Of", we check if today is the day
                  if (rule.offset_minutes === 0) {
                      if (isSameDay(now, releaseDate)) {
                          triggerNotification(ep, rule, notifiedEvents);
                      }
                  } else {
                      // For offsets (e.g. 1 day before), subtract offset from release date and check if today is that day
                      // Note: releaseDate is midnight. 
                      // Simple logic: If (ReleaseDate - Offset) <= Now
                      // This might be tricky with just dates. Let's stick to Day granularity for now.
                      // If offset is 1440 (1 day), we notify if today == releaseDate - 1 day
                      const triggerDate = subMinutes(releaseDate, rule.offset_minutes);
                      if (isSameDay(now, triggerDate)) {
                          triggerNotification(ep, rule, notifiedEvents);
                      }
                  }
              });
          });

          localStorage.setItem(notifiedKey, JSON.stringify(notifiedEvents));
      };

      const triggerNotification = (ep: Episode, rule: Reminder, history: any) => {
          const key = `${rule.id}-${ep.id}-${new Date().toDateString()}`; // Unique per day
          if (history[key]) return; // Already notified today

          const title = ep.is_movie ? ep.name : ep.show_name;
          const body = ep.is_movie 
            ? `${ep.release_type === 'theatrical' ? 'In Theaters' : 'Digital Release'} today!`
            : `S${ep.season_number}E${ep.episode_number} "${ep.name}" is airing!`;

          new Notification(title || 'TV Calendar', {
              body,
              icon: '/vite.svg', // Replace with app icon
              tag: key // Prevent duplicate
          });
          
          history[key] = Date.now();
      };

      const interval = setInterval(checkReminders, 60000); // Check every minute
      checkReminders(); // Initial check

      return () => clearInterval(interval);
  }, [reminders, episodes, user]);

  // --- Data Logic (Watchlist, Subs, Import etc) ---
  // (Keeping existing implementations for brevity, just ensuring they are exported)

  const addToWatchlist = async (show: TVShow) => {
    if (watchlist.find(s => s.id === show.id)) return;
    setWatchlist(prev => [...prev, show]);
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

  const importBackup = (data: any) => {
      if (user?.isCloud) {
          uploadBackupToCloud(data);
          return;
      }
      if (Array.isArray(data)) {
          setWatchlist(data);
      } 
      else if (typeof data === 'object' && data !== null) {
          if (data.user && data.user.username && data.user.tmdbKey) {
              setUser({ ...data.user, isAuthenticated: true, isCloud: false });
          }
          if (data.settings) updateSettings(data.settings);
          if (data.subscribedLists) setSubscribedLists(data.subscribedLists);
          if (data.watchlist) setWatchlist(data.watchlist);
          if (data.reminders) setReminders(data.reminders);
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

          updateUserKey(keyToSet);
          setSettings(settingsToSet);

          let items: TVShow[] = [];
          if (Array.isArray(data)) items = data;
          else if (data.watchlist) items = data.watchlist;
          if (items.length > 0) await batchAddShows(items);
          if (data.subscribedLists) await batchSubscribe(data.subscribedLists);
          // Reminders sync could be added here
      } catch (e) {
          console.error("Cloud upload failed", e);
          alert("Failed to upload backup to cloud.");
      } finally {
          setLoading(false);
      }
  };

  // Episode fetching logic remains the same (omitted for brevity, assume refreshEpisodes etc are present)
  // ... (refreshEpisodes, fetchEpisodesForTV, fetchEpisodesForMovie) ...
  // Including the existing refreshEpisodes logic to ensure context completeness
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
        } catch (e) { }
      }
      return newEpisodes;
    } catch (error) { return {}; }
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
    } catch (error) { return {}; }
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

    try {
        const cacheValues = await Promise.all([get(DB_KEY_EPISODES), get(DB_KEY_META)]);
        const cachedEpData = cacheValues[0] as Record<string, Episode[]> | undefined;
        const cacheMetaData = cacheValues[1] as {timestamp: number, showIds: number[]} | undefined;

        if (cachedEpData && cacheMetaData) {
            currentEpisodes = cachedEpData;
            cachedShowIds = cacheMetaData.showIds || [];
            isFresh = (Date.now() - cacheMetaData.timestamp) < CACHE_DURATION;
            setEpisodes(currentEpisodes);
        }
    } catch (e) { }

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

    const showsToFetch = needsFullUpdate ? [...allTrackedShows] : allTrackedShows.filter(s => missingShowIds.includes(s.id));

    if (showsToFetch.length > 0) {
        setSyncProgress({ current: 0, total: showsToFetch.length });
        const BATCH_SIZE = 4;
        const newFetchedEpisodes: Record<string, Episode[]> = {};

        for (let i = 0; i < showsToFetch.length; i += BATCH_SIZE) {
            const batch = showsToFetch.slice(i, i + BATCH_SIZE);
            const promises = batch.map(show => {
                if (show.media_type === 'movie') return fetchEpisodesForMovie(show).catch(() => ({} as Record<string, Episode[]>));
                else return fetchEpisodesForTV(show).catch(() => ({} as Record<string, Episode[]>));
            });

            const results = await Promise.all(promises);
            results.forEach((showEpisodes) => {
                Object.entries(showEpisodes).forEach(([date, eps]) => {
                    if (!newFetchedEpisodes[date]) newFetchedEpisodes[date] = [];
                    const episodeList = eps as Episode[];
                    newFetchedEpisodes[date] = [...newFetchedEpisodes[date], ...episodeList];
                });
            });

            setSyncProgress(prev => ({ ...prev, current: Math.min(prev.total, i + batch.length) }));
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
            if (i + BATCH_SIZE < showsToFetch.length) await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        if (needsFullUpdate) currentEpisodes = newFetchedEpisodes;
        else {
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
        await set(DB_KEY_META, { timestamp: Date.now(), showIds: currentTrackedIds });
    } catch (e) {}

    setLoading(false);
    setTimeout(() => setSyncProgress({ current: 0, total: 0 }), 1000);
  }, [allTrackedShows, user]);

  useEffect(() => { refreshEpisodes(); }, [refreshEpisodes]); 

  const closeMobileWarning = (suppressFuture: boolean) => {
      setIsMobileWarningOpen(false);
      if (suppressFuture) updateSettings({ suppressMobileAddWarning: true });
  };
  
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
    return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  };

  const processSyncPayload = async (payload: string) => {
      try {
          const jsonStr = LZString.decompressFromEncodedURIComponent(payload);
          if (!jsonStr) throw new Error("Decompression failed");
          const data = JSON.parse(jsonStr) as any;
          if (!data.k || !data.u) throw new Error("Invalid payload data");

          if (!user || user.username !== data.u) login(data.u, data.k);
          else if (user.tmdbKey !== data.k) updateUserKey(data.k);

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
             for (const listId of data.s) {
                 try {
                     const details = await getListDetails(listId);
                     lists.push({ id: listId, name: details.name, items: details.items, item_count: details.items.length });
                 } catch (e) { }
             }
             setSubscribedLists(lists);
          }

          if (data.w && Array.isArray(data.w)) {
              setLoading(true);
              const restoredWatchlist: TVShow[] = [];
              const batches: any[][] = [];
              const BATCH = 5;
              const watchItems = data.w;
              for (let i = 0; i < watchItems.length; i += BATCH) batches.push(watchItems.slice(i, i + BATCH));
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
                  results.forEach(r => { if (r) restoredWatchlist.push(r); });
                  current += batch.length;
                  setSyncProgress({ current, total: watchItems.length });
              }
              setWatchlist(restoredWatchlist);
          }
          setLoading(false);
      } catch (e) {
          console.error(e);
          alert("Failed to sync. Data may be corrupted.");
          setLoading(false);
      }
  };

  // Deprecated simplified function kept for compatibility if needed, but logic is moved to reminders
  const scheduleNotification = (episode: Episode) => {
     alert('Please use the Bell icon to configure advanced reminders.');
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
      isMobileWarningOpen, closeMobileWarning,
      reminders, addReminder, removeReminder
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