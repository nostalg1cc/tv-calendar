
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList, Reminder, Interaction, TraktProfile } from '../types';
import { getShowDetails, getSeasonDetails, getMovieDetails, getMovieReleaseDates, getListDetails, setApiToken } from '../services/tmdb';
import { get, set, del } from 'idb-keyval';
import { format, subYears, parseISO, isSameDay, subMinutes, addDays } from 'date-fns';
import LZString from 'lz-string';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getDeviceCode, pollToken, getWatchedHistory, getTraktProfile, getShowProgress, syncHistory } from '../services/trakt';

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
  unhideShow: (showId: number) => void;
  batchAddShows: (shows: TVShow[]) => void; 
  batchSubscribe: (lists: SubscribedList[]) => void; 
  subscribeToList: (listId: string) => Promise<void>;
  unsubscribeFromList: (listId: string) => void;
  episodes: Record<string, Episode[]>; 
  loading: boolean; 
  isSyncing: boolean; 
  syncProgress: { current: number; total: number }; 
  refreshEpisodes: (force?: boolean) => Promise<void>;
  loadArchivedEvents: () => Promise<void>;
  hardRefreshCalendar: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  
  // Full Sync State
  fullSyncRequired: boolean;
  performFullSync: () => Promise<void>;

  // Reminders
  reminders: Reminder[];
  addReminder: (reminder: Reminder) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  
  // Interactions
  interactions: Record<string, Interaction>; 
  toggleWatched: (id: number, mediaType: 'tv' | 'movie') => Promise<void>;
  toggleEpisodeWatched: (showId: number, season: number, episode: number) => Promise<void>;
  markHistoryWatched: (showId: number, season: number, episode: number) => Promise<void>;
  setRating: (id: number, mediaType: 'tv' | 'movie', rating: number) => Promise<void>;

  // Reminder UI State
  reminderCandidate: TVShow | Episode | null;
  setReminderCandidate: (item: TVShow | Episode | null) => void;

  // Trailer UI State (Global)
  trailerTarget: { showId: number; mediaType: 'tv' | 'movie'; episode?: Episode } | null;
  setTrailerTarget: (target: { showId: number; mediaType: 'tv' | 'movie'; episode?: Episode } | null) => void;
  
  // Calendar State
  calendarDate: Date;
  setCalendarDate: (date: Date) => void;

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

  // Calendar Scroll Persistence
  calendarScrollPos: number;
  setCalendarScrollPos: (pos: number) => void;

  // Trakt
  traktAuth: (clientId: string, clientSecret: string) => Promise<any>;
  traktPoll: (deviceCode: string, clientId: string, clientSecret: string) => Promise<any>;
  saveTraktToken: (tokenData: any) => Promise<void>;
  disconnectTrakt: () => Promise<void>;
  syncTraktData: (background?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Timezone map for major countries to use as origin estimation
const COUNTRY_TIMEZONES: Record<string, string> = {
    'US': 'America/New_York',
    'GB': 'Europe/London',
    'JP': 'Asia/Tokyo',
    'KR': 'Asia/Seoul',
    'CA': 'America/Toronto',
    'AU': 'Australia/Sydney',
    'DE': 'Europe/Berlin',
    'FR': 'Europe/Paris',
    'BR': 'America/Sao_Paulo',
    'IN': 'Asia/Kolkata',
};

const DEFAULT_SETTINGS: AppSettings = {
  spoilerConfig: { images: false, overview: false, title: false, includeMovies: false, replacementMode: 'blur' },
  hideTheatrical: false,
  ignoreSpecials: false,
  recommendationsEnabled: true,
  recommendationMethod: 'banner',
  compactCalendar: true, 
  viewMode: 'grid', 
  mobileNavLayout: 'standard',
  suppressMobileAddWarning: false,
  calendarPosterFillMode: 'cover',
  useSeason1Art: false,
  cleanGrid: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  timeShift: false, 
  theme: 'default',
  customThemeColor: '#6366f1',
  appDesign: 'default',
  baseTheme: 'cosmic', 
  appFont: 'inter',
  reminderStrategy: 'ask',
  hiddenItems: [],
  v2SidebarMode: 'fixed',
  autoSync: true
};

export const THEMES: Record<string, Record<string, string>> = {
    default: { '50': '238 242 255', '100': '224 231 255', '200': '199 210 254', '300': '165 180 252', '400': '129 140 248', '500': '99 102 241', '600': '79 70 229', '700': '67 56 202', '800': '55 48 163', '900': '49 46 129', '950': '30 27 75' },
    emerald: { '50': '236 253 245', '100': '209 250 229', '200': '167 243 208', '300': '110 231 183', '400': '52 211 153', '500': '16 185 129', '600': '5 150 105', '700': '4 120 87', '800': '6 95 70', '900': '6 78 59', '950': '2 44 34' },
    rose: { '50': '255 241 242', '100': '255 228 230', '200': '254 205 211', '300': '253 164 175', '400': '251 113 133', '500': '244 63 94', '600': '225 29 72', '700': '190 18 60', '800': '159 18 57', '900': '136 19 55', '950': '76 5 25' },
    amber: { '50': '255 251 235', '100': '254 243 199', '200': '253 230 138', '300': '252 211 77', '400': '251 191 36', '500': '245 158 11', '600': '217 119 6', '700': '180 83 9', '800': '146 64 14', '900': '120 53 15', '950': '69 26 3' },
    cyan: { '50': '236 254 255', '100': '207 250 254', '200': '165 243 252', '300': '103 232 249', '400': '34 211 238', '500': '6 182 212', '600': '8 145 178', '700': '14 116 144', '800': '21 94 117', '900': '22 78 99', '950': '8 51 68' },
    violet: { '50': '245 243 255', '100': '237 233 254', '200': '221 214 254', '300': '196 181 253', '400': '167 139 250', '500': '139 92 246', '600': '124 58 237', '700': '109 40 217', '800': '91 33 182', '900': '76 29 149', '950': '46 16 101' }
};

const hexToRgb = (hex: string) => { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 99, g: 102, b: 241 }; };
const mixColor = (color: {r: number, g: number, b: number}, mixColor: {r: number, g: number, b: number}, weight: number) => { const w = weight / 100; const w2 = 1 - w; return { r: Math.round(color.r * w2 + mixColor.r * w), g: Math.round(color.g * w2 + mixColor.g * w), b: Math.round(color.b * w2 + mixColor.b * w) }; };
const generatePaletteFromHex = (hex: string): Record<string, string> => { const base = hexToRgb(hex); const white = { r: 255, g: 255, b: 255 }; const black = { r: 0, g: 0, b: 0 }; const darkest = { r: 5, g: 5, b: 15 }; const palette: Record<string, string> = {}; const tints = [{ shade: '50', weight: 95 }, { shade: '100', weight: 90 }, { shade: '200', weight: 70 }, { shade: '300', weight: 50 }, { shade: '400', weight: 30 }]; tints.forEach(t => { const c = mixColor(base, white, t.weight); palette[t.shade] = `${c.r} ${c.g} ${c.b}`; }); palette['500'] = `${base.r} ${base.g} ${base.b}`; const shades = [{ shade: '600', weight: 10 }, { shade: '700', weight: 30 }, { shade: '800', weight: 50 }, { shade: '900', weight: 70 }]; shades.forEach(s => { const c = mixColor(base, black, s.weight); palette[s.shade] = `${c.r} ${c.g} ${c.b}`; }); const c950 = mixColor(base, darkest, 80); palette['950'] = `${c950.r} ${c950.g} ${c950.b}`; return palette; };

const CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 hours
const DB_KEY_EPISODES = 'tv_calendar_episodes_v2'; 
const DB_KEY_META = 'tv_calendar_meta_v2';

const getLocalPrefs = (): Partial<AppSettings> => {
  try {
    return JSON.parse(localStorage.getItem('tv_calendar_local_prefs') || '{}');
  } catch {
    return {};
  }
};

// Helper to get offset in minutes for a timezone
const getTimezoneOffsetMinutes = (timeZone: string): number => {
    try {
        const now = new Date();
        const str = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).format(now);
        // Extracts GMT-05:00 or GMT+01:00
        const match = str.match(/GMT([+-])(\d{2}):(\d{2})/);
        if (match) {
            const sign = match[1] === '+' ? 1 : -1;
            const hours = parseInt(match[2]);
            const minutes = parseInt(match[3]);
            return sign * (hours * 60 + minutes);
        }
        return 0;
    } catch {
        return 0;
    }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [watchlist, setWatchlist] = useState<TVShow[]>([]);
  const [subscribedLists, setSubscribedLists] = useState<SubscribedList[]>([]);
  const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [fullSyncRequired, setFullSyncRequired] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [interactions, setInteractions] = useState<Record<string, Interaction>>({});
  const [reminderCandidate, setReminderCandidate] = useState<TVShow | Episode | null>(null);
  const [trailerTarget, setTrailerTarget] = useState<{ showId: number; mediaType: 'tv' | 'movie'; episode?: Episode } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileWarningOpen, setIsMobileWarningOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...DEFAULT_SETTINGS, ...getLocalPrefs() }));
  
  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarScrollPos, setCalendarScrollPos] = useState(0);

  // Initialization
  useEffect(() => {
      const init = async () => {
          // Check for mobile warning suppression
          const suppressed = localStorage.getItem('mobile_warning_suppressed');
          if (!suppressed && /Mobi|Android/i.test(navigator.userAgent)) {
             setIsMobileWarningOpen(true);
          }

          // Apply Theme
          applyTheme(settings);

          // Auth Check
          const savedUser = localStorage.getItem('tv_calendar_user');
          if (savedUser) {
              const u = JSON.parse(savedUser);
              if (u.isAuthenticated) {
                  setUser(u);
                  setApiToken(u.tmdbKey);
                  loadLocalData();
                  
                  // Check cloud session if configured
                  if (isSupabaseConfigured()) {
                      const { data: { session } } = await supabase!.auth.getSession();
                      if (session) {
                          // Ensure we are in cloud mode
                          if (!u.isCloud) {
                              const cloudUser = { ...u, isCloud: true, id: session.user.id, email: session.user.email };
                              setUser(cloudUser);
                              localStorage.setItem('tv_calendar_user', JSON.stringify(cloudUser));
                          }
                      }
                  }
              }
          }
      };
      init();
  }, []);

  // Theme Applicator
  const applyTheme = (s: AppSettings) => {
      // Font
      document.body.setAttribute('data-font', s.appFont || 'inter');
      
      // Base Theme (Cosmic, OLED, etc)
      document.body.setAttribute('data-base-theme', s.baseTheme || 'cosmic');

      // Accent Color
      if (s.theme === 'custom' && s.customThemeColor) {
          const palette = generatePaletteFromHex(s.customThemeColor);
          Object.entries(palette).forEach(([shade, value]) => {
              document.documentElement.style.setProperty(`--theme-${shade}`, value);
          });
      } else if (s.theme && THEMES[s.theme]) {
          Object.entries(THEMES[s.theme]).forEach(([shade, value]) => {
              document.documentElement.style.setProperty(`--theme-${shade}`, value);
          });
      } else {
           // Default Indigo
           Object.entries(THEMES['default']).forEach(([shade, value]) => {
              document.documentElement.style.setProperty(`--theme-${shade}`, value);
          });
      }
  };

  useEffect(() => {
      applyTheme(settings);
      localStorage.setItem('tv_calendar_local_prefs', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
      setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const loadLocalData = async () => {
       try {
           const w = await get('watchlist') || [];
           const s = await get('subscribedLists') || [];
           const r = await get('reminders') || [];
           const i = await get('interactions') || [];
           const e = await get(DB_KEY_EPISODES) || {};
           
           setWatchlist(w);
           setSubscribedLists(s);
           setReminders(r);
           setInteractions(i);
           setEpisodes(e);
           
           // Background refresh if stale
           const meta = await get(DB_KEY_META);
           if (!meta || (Date.now() - meta.lastUpdated > CACHE_DURATION)) {
               refreshEpisodes();
           }
       } catch (e) {
           console.error("Load error", e);
       }
  };
  
  const saveLocalData = async (w: TVShow[], s: SubscribedList[], e: Record<string, Episode[]>, r: Reminder[], i: Record<string, Interaction>) => {
      await set('watchlist', w);
      await set('subscribedLists', s);
      await set('reminders', r);
      await set('interactions', i);
      await set(DB_KEY_EPISODES, e);
      await set(DB_KEY_META, { lastUpdated: Date.now() });
  };

  const allTrackedShows = useMemo(() => {
      const listShows = subscribedLists.flatMap(l => l.items);
      const unique = new Map();
      [...watchlist, ...listShows].forEach(s => unique.set(s.id, s));
      // Filter out hidden items
      if (settings.hiddenItems) {
          settings.hiddenItems.forEach(h => unique.delete(h.id));
      }
      return Array.from(unique.values());
  }, [watchlist, subscribedLists, settings.hiddenItems]);

  const refreshEpisodes = async (force = false) => {
      if (loading || isSyncing) return;
      setLoading(true);
      setIsSyncing(true);
      
      try {
          // Flatten all shows
          const shows = allTrackedShows;
          setSyncProgress({ current: 0, total: shows.length });
          
          const newEpisodes: Record<string, Episode[]> = {};
          let completed = 0;

          // Helper to process show
          const processShow = async (show: TVShow) => {
              try {
                  if (show.media_type === 'movie') {
                       // Movie Logic
                       const releaseDates = await getMovieReleaseDates(show.id);
                       
                       releaseDates.forEach(rd => {
                           // Apply timezone adjustment? 
                           // Movies usually have global release dates, but we can treat them as events.
                           const dateKey = rd.date;
                           if (!newEpisodes[dateKey]) newEpisodes[dateKey] = [];
                           
                           newEpisodes[dateKey].push({
                               id: show.id, // Movie ID
                               name: show.name,
                               overview: show.overview,
                               vote_average: show.vote_average,
                               air_date: rd.date,
                               episode_number: 0,
                               season_number: 0,
                               still_path: show.backdrop_path,
                               poster_path: show.poster_path,
                               show_id: show.id,
                               show_name: show.name,
                               show_backdrop_path: show.backdrop_path,
                               is_movie: true,
                               release_type: rd.type
                           });
                       });

                       // Fallback if no specific release dates found but we have a generic one
                       if (releaseDates.length === 0 && show.first_air_date) {
                           const dateKey = show.first_air_date;
                           if (!newEpisodes[dateKey]) newEpisodes[dateKey] = [];
                           newEpisodes[dateKey].push({
                                id: show.id,
                                name: show.name,
                                overview: show.overview,
                                vote_average: show.vote_average,
                                air_date: show.first_air_date,
                                episode_number: 0,
                                season_number: 0,
                                still_path: show.backdrop_path,
                                poster_path: show.poster_path,
                                show_id: show.id,
                                show_name: show.name,
                                show_backdrop_path: show.backdrop_path,
                                is_movie: true,
                                release_type: 'digital' // Assume digital/generic
                           });
                       }

                  } else {
                      // TV Logic
                      // We need full details including seasons
                      const fullShow = await getShowDetails(show.id);
                      
                      // Calculate offset if enabled
                      let offsetMinutes = 0;
                      if (settings.timeShift && fullShow.origin_country?.[0]) {
                          const originTz = COUNTRY_TIMEZONES[fullShow.origin_country[0]];
                          const localTz = settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                          if (originTz && localTz) {
                              const originOffset = getTimezoneOffsetMinutes(originTz);
                              const localOffset = getTimezoneOffsetMinutes(localTz);
                              if (localOffset - originOffset > 300) { // > 5 hours ahead
                                  offsetMinutes = 1440; // Add 1 day
                              }
                          }
                      }

                      const seasons = fullShow.seasons || [];
                      for (const season of seasons) {
                          if (season.season_number > 0 || !settings.ignoreSpecials) {
                              const seasonDetails = await getSeasonDetails(show.id, season.season_number);
                              seasonDetails.episodes.forEach(ep => {
                                  if (ep.air_date) {
                                      // Apply Shift
                                      let finalDate = ep.air_date;
                                      if (offsetMinutes > 0) {
                                          const d = parseISO(ep.air_date);
                                          finalDate = format(addDays(d, 1), 'yyyy-MM-dd');
                                      }

                                      if (!newEpisodes[finalDate]) newEpisodes[finalDate] = [];
                                      newEpisodes[finalDate].push({
                                          ...ep,
                                          show_id: show.id,
                                          show_name: show.name,
                                          show_backdrop_path: fullShow.backdrop_path,
                                          poster_path: fullShow.poster_path,
                                          season1_poster_path: seasons.find(s => s.season_number === 1)?.poster_path || fullShow.poster_path,
                                          is_movie: false
                                      });
                                  }
                              });
                          }
                      }
                  }
              } catch (e) {
                  console.warn(`Failed to process ${show.name}`, e);
              } finally {
                  completed++;
                  setSyncProgress(prev => ({ ...prev, current: completed }));
              }
          };

          // Process in batches
          const BATCH_SIZE = 5;
          for (let i = 0; i < shows.length; i += BATCH_SIZE) {
              await Promise.all(shows.slice(i, i + BATCH_SIZE).map(processShow));
          }
          
          setEpisodes(newEpisodes);
          await saveLocalData(watchlist, subscribedLists, newEpisodes, reminders, interactions);

      } catch (e) {
          console.error("Sync failed", e);
      } finally {
          setLoading(false);
          setIsSyncing(false);
      }
  };

  const login = (username: string, apiKey: string) => {
      const u: User = { username, tmdbKey: apiKey, isAuthenticated: true, isCloud: false };
      setUser(u);
      setApiToken(apiKey);
      localStorage.setItem('tv_calendar_user', JSON.stringify(u));
      loadLocalData();
  };

  const loginCloud = async (session: any) => {
      // Stub for cloud login structure
  };

  const logout = () => {
      setUser(null);
      localStorage.removeItem('tv_calendar_user');
      setWatchlist([]);
      setSubscribedLists([]);
      setEpisodes({});
      if (isSupabaseConfigured()) {
          supabase!.auth.signOut();
      }
  };
  
  const addToWatchlist = async (show: TVShow) => {
      const exists = watchlist.some(s => s.id === show.id);
      if (!exists) {
          const newList = [...watchlist, show];
          setWatchlist(newList);
          await saveLocalData(newList, subscribedLists, episodes, reminders, interactions);
          refreshEpisodes();
      }
  };

  const removeFromWatchlist = (id: number) => {
      const show = allTrackedShows.find(s => s.id === id);
      if (show) {
          const newHidden = [...(settings.hiddenItems || []), { id: show.id, name: show.name }];
          updateSettings({ hiddenItems: newHidden });
          
          // Also remove from manual watchlist if present
          const newWatchlist = watchlist.filter(s => s.id !== id);
          setWatchlist(newWatchlist);
          saveLocalData(newWatchlist, subscribedLists, episodes, reminders, interactions);
      }
  };

  const unhideShow = (id: number) => {
      const newHidden = (settings.hiddenItems || []).filter(h => h.id !== id);
      updateSettings({ hiddenItems: newHidden });
  };

  const toggleWatched = async (id: number, mediaType: 'tv' | 'movie') => {
      const key = `${mediaType}-${id}`;
      const currentInteraction = interactions[key];
      const current = currentInteraction?.is_watched || false;
      const newInteraction: Interaction = {
          rating: 0,
          ...currentInteraction,
          tmdb_id: id,
          media_type: mediaType,
          is_watched: !current,
          watched_at: !current ? new Date().toISOString() : undefined
      };
      
      const newInteractions = { ...interactions, [key]: newInteraction };
      setInteractions(newInteractions);
      await saveLocalData(watchlist, subscribedLists, episodes, reminders, newInteractions);
  };
  
  const toggleEpisodeWatched = async (showId: number, season: number, episode: number) => {
      const key = `episode-${showId}-${season}-${episode}`;
      const currentInteraction = interactions[key];
      const current = currentInteraction?.is_watched || false;
      const newInteraction: Interaction = {
          rating: 0,
          ...currentInteraction,
          tmdb_id: showId,
          media_type: 'episode',
          season_number: season,
          episode_number: episode,
          is_watched: !current,
          watched_at: !current ? new Date().toISOString() : undefined
      };
      const newInteractions = { ...interactions, [key]: newInteraction };
      setInteractions(newInteractions);
      await saveLocalData(watchlist, subscribedLists, episodes, reminders, newInteractions);
  };
  
  const markHistoryWatched = async (showId: number, season: number, episode: number) => {
      // Find all episodes before this one
      const allEps = Object.values(episodes).flat().filter(e => e.show_id === showId);
      const targetEps = allEps.filter(e => {
          if (e.season_number < season) return true;
          if (e.season_number === season && e.episode_number <= episode) return true;
          return false;
      });
      
      const newInteractions = { ...interactions };
      targetEps.forEach(e => {
          const key = `episode-${e.show_id}-${e.season_number}-${e.episode_number}`;
          const existing = newInteractions[key];
          newInteractions[key] = { 
              rating: 0,
              ...existing,
              tmdb_id: showId, 
              media_type: 'episode', 
              season_number: e.season_number, 
              episode_number: e.episode_number, 
              is_watched: true, 
              watched_at: existing?.watched_at || new Date().toISOString() 
          };
      });
      setInteractions(newInteractions);
      await saveLocalData(watchlist, subscribedLists, episodes, reminders, newInteractions);
  };
  
  const addReminder = async (r: Reminder) => {
      const newReminders = [...reminders, { ...r, id: crypto.randomUUID() }];
      setReminders(newReminders);
      await saveLocalData(watchlist, subscribedLists, episodes, newReminders, interactions);
  };
  
  const removeReminder = async (id: string) => {
      const newReminders = reminders.filter(r => r.id !== id);
      setReminders(newReminders);
      await saveLocalData(watchlist, subscribedLists, episodes, newReminders, interactions);
  };

  const updateUserKey = (key: string) => {
      if (user) {
          const u = { ...user, tmdbKey: key };
          setUser(u);
          setApiToken(key);
          localStorage.setItem('tv_calendar_user', JSON.stringify(u));
      }
  };

  // Mock implementations for missing features to prevent errors
  const batchAddShows = (shows: TVShow[]) => { /* ... */ };
  const batchSubscribe = (lists: SubscribedList[]) => { /* ... */ };
  const subscribeToList = async (listId: string) => { /* ... */ };
  const unsubscribeFromList = (listId: string) => { /* ... */ };
  const loadArchivedEvents = async () => { /* ... */ };
  const hardRefreshCalendar = async () => { setEpisodes({}); refreshEpisodes(true); };
  const requestNotificationPermission = async () => false;
  const performFullSync = async () => { /* ... */ };
  const setRating = async () => { /* ... */ };
  const importBackup = (data: any) => { /* ... */ };
  const uploadBackupToCloud = async () => { /* ... */ };
  const getSyncPayload = () => "";
  const processSyncPayload = () => {};
  const closeMobileWarning = () => setIsMobileWarningOpen(false);
  const reloadAccount = async () => { window.location.reload(); };
  const traktAuth = async () => ({});
  const traktPoll = async () => ({});
  const saveTraktToken = async () => {};
  const disconnectTrakt = async () => {};
  const syncTraktData = async () => {};

  return (
    <AppContext.Provider value={{
      user, login, loginCloud, logout, updateUserKey,
      watchlist, subscribedLists, allTrackedShows, episodes,
      loading, isSyncing, syncProgress, refreshEpisodes,
      addToWatchlist, removeFromWatchlist, unhideShow,
      reminders, addReminder, removeReminder,
      interactions, toggleWatched, toggleEpisodeWatched, markHistoryWatched, setRating,
      reminderCandidate, setReminderCandidate,
      trailerTarget, setTrailerTarget,
      calendarDate, setCalendarDate,
      isSearchOpen, setIsSearchOpen,
      settings, updateSettings,
      importBackup, uploadBackupToCloud, getSyncPayload, processSyncPayload,
      isMobileWarningOpen, closeMobileWarning, reloadAccount,
      calendarScrollPos, setCalendarScrollPos,
      batchAddShows, batchSubscribe, subscribeToList, unsubscribeFromList,
      loadArchivedEvents, hardRefreshCalendar, requestNotificationPermission,
      fullSyncRequired, performFullSync,
      traktAuth, traktPoll, saveTraktToken, disconnectTrakt, syncTraktData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
