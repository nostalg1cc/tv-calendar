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
  
  // Reminder Candidate State (Global)
  const [reminderCandidate, setReminderCandidate] = useState<TVShow | Episode | null>(null);

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

  // --- Refresh Episodes Logic ---
  const refreshEpisodes = useCallback(async (force = false) => {
      if (!user || (!user.tmdbKey && !user.isCloud)) {
          setLoading(false);
          return;
      }
      
      const lastUpdate = await get<number>(DB_KEY_META);
      const now = Date.now();
      
      // Cache check (skip if force=true)
      if (!force && lastUpdate && (now - lastUpdate < CACHE_DURATION)) {
           const cachedEps = await get<Record<string, Episode[]>>(DB_KEY_EPISODES);
           if (cachedEps) {
               setEpisodes(cachedEps);
               setLoading(false);
               return;
           }
      }

      setLoading(true);
      const newEpisodes: Record<string, Episode[]> = {};
      const processedIds = new Set<number>();
      
      // Combine watchlist and lists
      let itemsToProcess: TVShow[] = [...watchlist];
      subscribedLists.forEach(list => itemsToProcess.push(...list.items));
      
      // Deduplicate
      const uniqueItems: TVShow[] = [];
      itemsToProcess.forEach(item => {
          if (!processedIds.has(item.id)) {
              processedIds.add(item.id);
              uniqueItems.push(item);
          }
      });
      
      setSyncProgress({ current: 0, total: uniqueItems.length });
      
      let count = 0;
      for (const item of uniqueItems) {
          count++;
          setSyncProgress({ current: count, total: uniqueItems.length });
          
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
                           show_id: item.id,
                           show_name: item.name,
                           is_movie: true,
                           release_type: rel.type
                       });
                  });
              } else {
                  // TV Show
                  // First ensure we know season count
                  let seasonCount = item.number_of_seasons;
                  if (!seasonCount) {
                       try {
                           const details = await getShowDetails(item.id);
                           seasonCount = details.number_of_seasons;
                       } catch { seasonCount = 1; }
                  }
                  
                  const seasonPromises = [];
                  for (let i = 1; i <= (seasonCount || 1); i++) {
                       seasonPromises.push(getSeasonDetails(item.id, i).catch(() => null));
                  }
                  
                  const seasons = await Promise.all(seasonPromises);
                  
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
                              is_movie: false
                          });
                      });
                  });
              }
          } catch (error) {
              console.error(`Error processing ${item.name}`, error);
          }
      }
      
      setEpisodes(newEpisodes);
      await set(DB_KEY_EPISODES, newEpisodes);
      await set(DB_KEY_META, Date.now());
      setLoading(false);
  }, [user, watchlist, subscribedLists]);

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
          refreshEpisodes(true);
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

  // --- Sync & Utility Functions ---

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
          settings
      };
      return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  }, [user, watchlist, subscribedLists, settings]);

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
              // We call setWatchlist manually here via batch logic but respecting local state logic
              // Since this function is inside AppProvider, it closes over the actions.
              // But batchAddShows is const defined above. It's fine.
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
      episodes, loading, syncProgress, refreshEpisodes,
      requestNotificationPermission,
      isSearchOpen, setIsSearchOpen,
      settings, updateSettings,
      importBackup, uploadBackupToCloud,
      getSyncPayload, processSyncPayload,
      isMobileWarningOpen, closeMobileWarning,
      reminders, addReminder, removeReminder,
      reminderCandidate, setReminderCandidate
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