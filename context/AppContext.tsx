import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList, Reminder, Interaction, TraktProfile } from '../types';
import { getShowDetails, getSeasonDetails, getMovieDetails, getMovieReleaseDates, getListDetails, setApiToken } from '../services/tmdb';
import { get, set, del } from 'idb-keyval';
import { format, subYears, parseISO, isSameDay, subMinutes, addDays, subMonths, isBefore, startOfDay } from 'date-fns';
import LZString from 'lz-string';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getDeviceCode, pollToken, getWatchedHistory, getTraktProfile, getShowProgress, syncHistory } from '../services/trakt';

// --- TYPES & DEFAULTS ---

interface AppContextType {
  user: User | null;
  login: (username: string, apiKey: string) => void;
  loginCloud: (session: any) => Promise<void>;
  logout: () => void;
  updateUserKey: (apiKey: string) => void;
  
  // Data
  watchlist: TVShow[]; 
  subscribedLists: SubscribedList[];
  allTrackedShows: TVShow[]; 
  episodes: Record<string, Episode[]>; 
  reminders: Reminder[];
  interactions: Record<string, Interaction>; 
  
  // Actions
  addToWatchlist: (show: TVShow) => Promise<void>;
  removeFromWatchlist: (showId: number) => void;
  unhideShow: (showId: number) => void;
  batchAddShows: (shows: TVShow[]) => void; 
  batchSubscribe: (lists: SubscribedList[]) => void; 
  subscribeToList: (listId: string) => Promise<void>;
  unsubscribeFromList: (listId: string) => void;
  
  // Calendar & Sync
  loading: boolean; 
  isSyncing: boolean; 
  syncProgress: { current: number; total: number }; 
  refreshEpisodes: (force?: boolean) => Promise<void>;
  loadArchivedEvents: () => Promise<void>;
  fullSyncRequired: boolean;
  performFullSync: (config?: Partial<AppSettings>) => Promise<void>;
  hardRefreshCalendar: () => Promise<void>;
  reloadAccount: () => Promise<void>;
  
  // Interactions
  toggleWatched: (id: number, mediaType: 'tv' | 'movie') => Promise<void>;
  toggleEpisodeWatched: (showId: number, season: number, episode: number) => Promise<void>;
  markHistoryWatched: (showId: number, season: number, episode: number) => Promise<void>;
  setRating: (id: number, mediaType: 'tv' | 'movie', rating: number) => Promise<void>;

  // Reminders
  addReminder: (reminder: Reminder) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  reminderCandidate: TVShow | Episode | null;
  setReminderCandidate: (item: TVShow | Episode | null) => void;
  
  // UI State
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  isMobileWarningOpen: boolean;
  closeMobileWarning: (suppressFuture: boolean) => void;
  calendarScrollPos: number;
  setCalendarScrollPos: (pos: number) => void;
  calendarDate: Date;
  setCalendarDate: (date: Date) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  
  // Backup / Diagnostics
  importBackup: (data: any) => void;
  uploadBackupToCloud: (data: any) => Promise<void>;
  getSyncPayload: () => string;
  processSyncPayload: (payload: string) => void;
  testConnection: () => Promise<{ read: boolean; write: boolean; message: string }>;

  // Trakt
  traktAuth: (clientId: string, clientSecret: string) => Promise<any>;
  traktPoll: (deviceCode: string, clientId: string, clientSecret: string) => Promise<any>;
  saveTraktToken: (tokenData: any) => Promise<void>;
  disconnectTrakt: () => Promise<void>;
  syncTraktData: (background?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

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
  v2LibraryLayout: 'grid',
  autoSync: true
};

// --- HELPERS ---

const COUNTRY_TIMEZONES: Record<string, string> = {
    'US': 'America/New_York', 'CA': 'America/Toronto', 'GB': 'Europe/London', 'IE': 'Europe/Dublin',
    'JP': 'Asia/Tokyo', 'KR': 'Asia/Seoul', 'CN': 'Asia/Shanghai', 'AU': 'Australia/Sydney', 'NZ': 'Pacific/Auckland',
    'DE': 'Europe/Berlin', 'FR': 'Europe/Paris', 'ES': 'Europe/Madrid', 'IT': 'Europe/Rome', 'NL': 'Europe/Amsterdam',
    'BR': 'America/Sao_Paulo', 'MX': 'America/Mexico_City', 'AR': 'America/Argentina/Buenos_Aires',
    'IN': 'Asia/Kolkata', 'RU': 'Europe/Moscow', 'ZA': 'Africa/Johannesburg'
};

export const THEMES: Record<string, Record<string, string>> = {
    default: { '50': '238 242 255', '100': '224 231 255', '200': '199 210 254', '300': '165 180 252', '400': '129 140 248', '500': '99 102 241', '600': '79 70 229', '700': '67 56 202', '800': '55 48 163', '900': '49 46 129', '950': '30 27 75' },
    emerald: { '50': '236 253 245', '100': '209 250 229', '200': '167 243 208', '300': '110 231 183', '400': '52 211 153', '500': '16 185 129', '600': '5 150 105', '700': '4 120 87', '800': '6 95 70', '900': '6 78 59', '950': '2 44 34' },
    rose: { '50': '255 241 242', '100': '255 228 230', '200': '254 205 211', '300': '253 164 175', '400': '251 113 133', '500': '244 63 94', '600': '225 29 72', '700': '190 18 60', '800': '159 18 57', '900': '136 19 55', '950': '76 5 25' },
    amber: { '50': '255 251 235', '100': '254 243 199', '200': '253 230 138', '300': '252 211 77', '400': '251 191 36', '500': '245 158 11', '600': '217 119 6', '700': '180 83 9', '800': '146 64 14', '900': '120 53 15', '950': '69 26 3' },
    cyan: { '50': '236 254 255', '100': '207 250 254', '200': '165 243 252', '300': '103 232 249', '400': '34 211 238', '500': '6 182 212', '600': '8 145 178', '700': '14 116 144', '800': '21 94 117', '900': '22 78 99', '950': '8 51 68' },
    violet: { '50': '245 243 255', '100': '237 233 254', '200': '221 214 254', '300': '196 181 253', '400': '167 139 250', '500': '139 92 246', '600': '124 58 237', '700': '109 40 217', '800': '91 33 182', '900': '76 29 149', '950': '46 16 101' },
    zinc: { '50': '250 250 250', '100': '244 244 245', '200': '228 228 231', '300': '212 212 216', '400': '161 161 170', '500': '113 113 122', '600': '82 82 91', '700': '63 63 70', '800': '39 39 42', '900': '24 24 27', '950': '9 9 11' }
};

const hexToRgb = (hex: string) => { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 99, g: 102, b: 241 }; };
const mixColor = (color: {r: number, g: number, b: number}, mixColor: {r: number, g: number, b: number}, weight: number) => { const w = weight / 100; const w2 = 1 - w; return { r: Math.round(color.r * w2 + mixColor.r * w), g: Math.round(color.g * w2 + mixColor.g * w), b: Math.round(color.b * w2 + mixColor.b * w) }; };
const generatePaletteFromHex = (hex: string): Record<string, string> => { const base = hexToRgb(hex); const white = { r: 255, g: 255, b: 255 }; const black = { r: 0, g: 0, b: 0 }; const darkest = { r: 5, g: 5, b: 15 }; const palette: Record<string, string> = {}; const tints = [{ shade: '50', weight: 95 }, { shade: '100', weight: 90 }, { shade: '200', weight: 70 }, { shade: '300', weight: 50 }, { shade: '400', weight: 30 }]; tints.forEach(t => { const c = mixColor(base, white, t.weight); palette[t.shade] = `${c.r} ${c.g} ${c.b}`; }); palette['500'] = `${base.r} ${base.g} ${base.b}`; const shades = [{ shade: '600', weight: 10 }, { shade: '700', weight: 30 }, { shade: '800', weight: 50 }, { shade: '900', weight: 70 }]; shades.forEach(s => { const c = mixColor(base, black, s.weight); palette[s.shade] = `${c.r} ${c.g} ${c.b}`; }); const c950 = mixColor(base, darkest, 80); palette['950'] = `${c950.r} ${c950.g} ${c950.b}`; return palette; };

const getTimezoneOffsetMinutes = (timeZone: string): number => {
    try {
        const now = new Date();
        const str = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).format(now);
        const match = str.match(/GMT([+-])(\d{2}):(\d{2})/);
        if (match) {
            const sign = match[1] === '+' ? 1 : -1;
            const hours = parseInt(match[2]);
            const minutes = parseInt(match[3]);
            return sign * (hours * 60 + minutes);
        }
    } catch (e) {}
    return 0; 
};

// Safe parser for settings column which might be Text or JSONB
const parseSettings = (input: any): Partial<AppSettings> => {
    if (!input) return {};
    let parsed = input;
    
    // If it's a string, try parsing it as JSON
    if (typeof input === 'string') {
        try {
            // Handle double-escaped strings if they exist
            if (input.startsWith('"') && input.endsWith('"')) {
                 parsed = JSON.parse(JSON.parse(input));
            } else {
                 parsed = JSON.parse(input);
            }
        } catch (e) {
            console.warn("Failed to parse settings string:", e);
            return {};
        }
    }
    
    return parsed && typeof parsed === 'object' ? parsed : {};
};

// --- CONTEXT ---

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [user, setUser] = useState<User | null>(() => { try { return localStorage.getItem('tv_calendar_user') ? JSON.parse(localStorage.getItem('tv_calendar_user')!) : null; } catch { return null; } });
  
  // Core Data
  const [watchlist, setWatchlist] = useState<TVShow[]>([]);
  const [subscribedLists, setSubscribedLists] = useState<SubscribedList[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [interactions, setInteractions] = useState<Record<string, Interaction>>({});
  const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
  
  // Settings with Local Fallback for NON-Cloud users
  const [settings, setSettings] = useState<AppSettings>(() => {
     try {
         const local = localStorage.getItem('tv_calendar_settings');
         const parsed = local ? JSON.parse(local) : {};
         return { ...DEFAULT_SETTINGS, ...parsed };
     } catch {
         return DEFAULT_SETTINGS;
     }
  });

  // UI State
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileWarningOpen, setIsMobileWarningOpen] = useState(false);
  const [reminderCandidate, setReminderCandidate] = useState<TVShow | Episode | null>(null);
  const [fullSyncRequired, setFullSyncRequired] = useState(false);
  const [calendarScrollPos, setCalendarScrollPos] = useState(0);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const manualOverridesRef = useRef<Record<string, boolean>>({});
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- DERIVED DATA ---
  const allTrackedShows = useMemo(() => {
      const map = new Map<number, TVShow>();
      watchlist.forEach(show => map.set(show.id, show));
      subscribedLists.forEach(list => { list.items.forEach(show => { if (!map.has(show.id)) map.set(show.id, show); }); });
      return Array.from(map.values());
  }, [watchlist, subscribedLists]);

  // --- THEME EFFECT ---
  useEffect(() => { 
      const themeKey = settings.theme || 'default'; 
      let themeColors: Record<string, string>; 
      if (themeKey === 'custom' && settings.customThemeColor) { 
          themeColors = generatePaletteFromHex(settings.customThemeColor); 
      } else { 
          themeColors = THEMES[themeKey] || THEMES.default; 
      } 
      const root = document.documentElement; 
      Object.entries(themeColors).forEach(([shade, value]) => { 
          root.style.setProperty(`--theme-${shade}`, value); 
      }); 

      let activeTheme = settings.baseTheme || 'cosmic';
      if (activeTheme === 'auto') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          activeTheme = prefersDark ? 'cosmic' : 'light';
      }

      document.body.setAttribute('data-base-theme', activeTheme);
      document.body.setAttribute('data-font', settings.appFont || 'inter');
  }, [settings.theme, settings.customThemeColor, settings.appDesign, settings.baseTheme, settings.appFont]);

  // --- DATA PERSISTENCE (LOCAL) ---
  useEffect(() => {
    // Only save to local storage if NOT a cloud user to avoid conflicts
    if (user && !user.isCloud) {
        localStorage.setItem('tv_calendar_watchlist', JSON.stringify(watchlist));
        localStorage.setItem('tv_calendar_subscribed_lists', JSON.stringify(subscribedLists));
        localStorage.setItem('tv_calendar_settings', JSON.stringify(settings)); 
        localStorage.setItem('tv_calendar_reminders', JSON.stringify(reminders));
        localStorage.setItem('tv_calendar_interactions', JSON.stringify(interactions));
        localStorage.setItem('tv_calendar_user', JSON.stringify(user)); 
    }
  }, [watchlist, subscribedLists, settings, user, reminders, interactions]);

  // --- TIME SHIFT LOGIC ---
  const getAdjustedDate = useCallback((airDate: string, originCountries?: string[]): string => {
      if (!settings.timeShift || !settings.timezone) return airDate;
      if (!originCountries || originCountries.length === 0) return airDate; 
      
      const originCountry = originCountries[0];
      const originTz = COUNTRY_TIMEZONES[originCountry];
      if (!originTz) return airDate;
      
      try {
          const originOffset = getTimezoneOffsetMinutes(originTz);
          const userOffset = getTimezoneOffsetMinutes(settings.timezone);
          
          // Assume Prime Time Air (20:00) in origin
          const airTimeMinutes = 20 * 60; 
          const diffMinutes = userOffset - originOffset;
          const adjustedTimeMinutes = airTimeMinutes + diffMinutes;
          
          if (adjustedTimeMinutes >= 24 * 60) { 
              return format(addDays(parseISO(airDate), 1), 'yyyy-MM-dd'); 
          } else if (adjustedTimeMinutes < 0) { 
              return format(addDays(parseISO(airDate), -1), 'yyyy-MM-dd'); 
          }
      } catch (e) {}
      
      return airDate;
  }, [settings.timeShift, settings.timezone]);

  // Re-bucket episodes when time settings change
  useEffect(() => {
      setEpisodes(prevEpisodes => {
          const allEps = Object.values(prevEpisodes).flat();
          if (allEps.length === 0) return prevEpisodes;

          const newMap: Record<string, Episode[]> = {};
          
          allEps.forEach(ep => {
              if (!ep.air_date) return;
              const dateKey = getAdjustedDate(ep.air_date, ep.origin_country);
              
              if (!newMap[dateKey]) newMap[dateKey] = [];
              if (!newMap[dateKey].some(e => e.id === ep.id)) {
                  newMap[dateKey].push(ep);
              }
          });
          
          // Persist re-bucketed episodes to IDB
          set('tv_calendar_episodes_v2', newMap);
          return newMap;
      });
  }, [settings.timeShift, settings.timezone, getAdjustedDate]);


  // --- ACTIONS ---

  const updateSettings = async (newSettings: Partial<AppSettings>) => { 
      setSettings(prev => { 
          const updated = { ...prev, ...newSettings }; 
          
          // Explicitly save to Supabase if Cloud User
          if (user?.isCloud && supabase && user.id) {
              const payload = JSON.stringify(updated); 
              supabase.from('profiles').update({ settings: payload, updated_at: new Date().toISOString() })
                  .eq('id', user.id)
                  .then(({ error }) => { 
                      if(error) console.error("Failed to sync settings:", error); 
                  }); 
          }
          return updated; 
      }); 
  };

  const refreshEpisodes = useCallback(async (force = false) => { 
      if (fullSyncRequired) return; 
      if (!user || (!user.tmdbKey && !user.isCloud)) { setLoading(false); return; } 
      
      const shouldSync = settings.autoSync || force;
      const lastUpdate = await get<number>('tv_calendar_meta_v2'); 
      const now = Date.now(); 

      // Load cache if available
      const cachedEps = await get<Record<string, Episode[]>>('tv_calendar_episodes_v2'); 
      if (cachedEps) setEpisodes(cachedEps);

      // Check if we need to sync
      if (!shouldSync || (!user.isCloud && !force && lastUpdate && (now - lastUpdate < (1000 * 60 * 60 * 6)))) { 
          if (cachedEps) { setLoading(false); return; }
          if (allTrackedShows.length === 0) { setLoading(false); return; }
      } 
      
      const itemsToProcess = [...allTrackedShows]; 
      if (itemsToProcess.length === 0) { setEpisodes({}); setLoading(false); return; } 
      
      if (!cachedEps) setLoading(true);
      setIsSyncing(true); 
      
      try { 
          const processedIds = new Set<number>(); 
          const uniqueItems: TVShow[] = []; 
          itemsToProcess.forEach(item => { if (!processedIds.has(item.id)) { processedIds.add(item.id); uniqueItems.push(item); } }); 
          setSyncProgress({ current: 0, total: uniqueItems.length }); 
          
          const finalEpisodesMap: Record<string, Episode[]> = force ? {} : { ...(cachedEps || {}) };
          
          let processedCount = 0; 
          const sixMonthsAgo = subMonths(new Date(), 6);

          while (processedCount < uniqueItems.length) { 
              const currentBatchSize = 10; 
              const batch = uniqueItems.slice(processedCount, processedCount + currentBatchSize); 
              
              await Promise.all(batch.map(async (item) => { 
                  try { 
                      const batchEpisodes: Episode[] = [];
                      let origin = item.origin_country;
                      let details = item;

                      if (item.media_type === 'movie') { 
                          if (!origin) {
                               const fullMovie = await getMovieDetails(item.id);
                               origin = fullMovie.origin_country;
                          }
                          const releaseDates = await getMovieReleaseDates(item.id); 
                          releaseDates.forEach(rel => { 
                              batchEpisodes.push({ id: item.id * 1000 + (rel.type === 'theatrical' ? 1 : 2), name: item.name, overview: item.overview, vote_average: item.vote_average, air_date: rel.date, episode_number: 1, season_number: 1, still_path: item.backdrop_path, show_backdrop_path: item.backdrop_path, poster_path: item.poster_path, season1_poster_path: item.poster_path ? item.poster_path : undefined, show_id: item.id, show_name: item.name, is_movie: true, release_type: rel.type, origin_country: origin }); 
                          }); 
                      } else { 
                          try { 
                              details = await getShowDetails(item.id); 
                              origin = details.origin_country;
                          } catch(e) {}
                          
                          const seasonsMeta = details.seasons || []; 
                          const seasonsToFetch = seasonsMeta.filter((s, index) => {
                              if (s.season_number === 0) return !settings.ignoreSpecials;
                              if (!s.air_date) return true; 
                              const sDate = parseISO(s.air_date);
                              return sDate >= sixMonthsAgo || index === seasonsMeta.length - 1;
                          });

                          for (const sMeta of seasonsToFetch) { 
                              try { 
                                  const sData = await getSeasonDetails(item.id, sMeta.season_number); 
                                  if (sData.episodes) { 
                                      sData.episodes.forEach(ep => { 
                                          if (ep.air_date) batchEpisodes.push({ ...ep, show_id: item.id, show_name: item.name, poster_path: item.poster_path, season1_poster_path: details.poster_path, show_backdrop_path: details.backdrop_path, is_movie: false, origin_country: origin }); 
                                      }); 
                                  } 
                              } catch (e) {} 
                          } 
                      } 
                      
                      batchEpisodes.forEach(ep => {
                           if(!ep.air_date) return;
                           const dateKey = getAdjustedDate(ep.air_date, ep.origin_country);
                           if (!finalEpisodesMap[dateKey]) finalEpisodesMap[dateKey] = [];
                           finalEpisodesMap[dateKey] = finalEpisodesMap[dateKey].filter(e => !(e.show_id === ep.show_id && e.season_number === ep.season_number && e.episode_number === ep.episode_number));
                           finalEpisodesMap[dateKey].push(ep);
                      });

                  } catch (error) {} 
              })); 
              processedCount += currentBatchSize; 
              setSyncProgress(prev => ({ ...prev, current: Math.min(processedCount, uniqueItems.length) })); 
          } 
          
          setEpisodes(finalEpisodesMap);
          await set('tv_calendar_episodes_v2', finalEpisodesMap); 
          await set('tv_calendar_meta_v2', Date.now()); 
      } catch (e) { console.error("Refresh Episodes Error", e); } finally { setLoading(false); setIsSyncing(false); } 
  }, [user, allTrackedShows, fullSyncRequired, settings.timeShift, settings.timezone, settings.autoSync, settings.ignoreSpecials, getAdjustedDate]);


  // --- CLOUD LOGIN ---

  const loginCloud = async (session: any) => { 
      if (!supabase) return; 
      setLoading(true);
      const { user: authUser } = session; 
      
      try {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single(); 
          
          if (profile) { 
              let mergedSettings = { ...DEFAULT_SETTINGS };
              if (profile.settings) { 
                  const cloudSettings = parseSettings(profile.settings);
                  mergedSettings = { ...DEFAULT_SETTINGS, ...cloudSettings };
              }
              setSettings(mergedSettings);

              const newUser: User = { 
                  id: authUser.id, 
                  username: profile.username || authUser.email, 
                  email: authUser.email, 
                  tmdbKey: profile.tmdb_key || '', 
                  isAuthenticated: true, 
                  isCloud: true, 
                  traktToken: profile.trakt_token, 
                  traktProfile: profile.trakt_profile, 
                  fullSyncCompleted: profile.full_sync_completed 
              }; 
              
              if (user && user.id && user.id !== authUser.id) { 
                  await del('tv_calendar_episodes_v2'); 
                  await del('tv_calendar_meta_v2'); 
                  setEpisodes({}); 
              } 
              
              setApiToken(newUser.tmdbKey); 

              const [
                  { data: remoteWatchlist },
                  { data: remoteSubs },
                  { data: remoteInteractions },
                  { data: remoteReminders }
              ] = await Promise.all([
                  supabase.from('watchlist').select('*'),
                  supabase.from('subscriptions').select('*'),
                  supabase.from('interactions').select('*'),
                  supabase.from('reminders').select('*')
              ]);

              if (remoteWatchlist) { 
                  const loadedWatchlist = remoteWatchlist.map((item: any) => ({ 
                      id: item.tmdb_id, 
                      name: item.name, 
                      poster_path: item.poster_path, 
                      backdrop_path: item.backdrop_path, 
                      overview: item.overview, 
                      first_air_date: item.first_air_date, 
                      vote_average: item.vote_average, 
                      media_type: item.media_type 
                  })) as TVShow[]; 
                  setWatchlist(loadedWatchlist); 
              } 

              if (remoteSubs) { 
                  const loadedLists: SubscribedList[] = []; 
                  for (const sub of remoteSubs) { 
                      try { 
                          const listDetails = await getListDetails(sub.list_id); 
                          loadedLists.push({ id: sub.list_id, name: listDetails.name, items: listDetails.items, item_count: listDetails.items.length }); 
                      } catch (e) {} 
                  } 
                  setSubscribedLists(loadedLists); 
              } 
              
              const intMap: Record<string, Interaction> = {}; 
              if (remoteInteractions) { 
                  (remoteInteractions as any[]).forEach((i) => { 
                      let key;
                      if (i.media_type === 'episode') {
                          key = `episode-${i.tmdb_id}-${i.season_number}-${i.episode_number}`;
                      } else {
                          key = `${i.media_type}-${i.tmdb_id}`;
                      }
                      intMap[key] = { tmdb_id: i.tmdb_id, media_type: i.media_type, is_watched: i.is_watched, rating: i.rating, season_number: i.season_number, episode_number: i.episode_number, watched_at: i.watched_at }; 
                  }); 
              } 
              setInteractions(intMap); 
              
              if (remoteReminders) { 
                  setReminders(remoteReminders.map((r: any) => ({ id: r.id, tmdb_id: r.tmdb_id, media_type: r.media_type, scope: r.scope, episode_season: r.episode_season, episode_number: r.episode_number, offset_minutes: r.offset_minutes }))); 
              } 
              
              if (!profile.full_sync_completed) { 
                  setFullSyncRequired(true); 
              } else { 
                  if (newUser.id) { 
                      const cached = await get<Record<string, Episode[]>>('tv_calendar_episodes_v2'); 
                      if (cached) setEpisodes(cached); 
                      await loadCloudCalendar(newUser.id); 
                  } 
              } 

              setUser(newUser); 
          }
      } catch(e) {
          console.error("Login Cloud Error", e);
      } finally {
          setLoading(false); 
      }
  };
  
  const login = (username: string, apiKey: string) => { 
      const newUser: User = { username, tmdbKey: apiKey, isAuthenticated: true, isCloud: false }; 
      setUser(newUser); 
      setApiToken(apiKey); 
      localStorage.setItem('tv_calendar_user', JSON.stringify(newUser)); 
  };

  const logout = async () => { 
      if (user?.isCloud && supabase) await supabase.auth.signOut(); 
      setUser(null); 
      localStorage.removeItem('tv_calendar_user'); 
      del('tv_calendar_episodes_v2'); 
      del('tv_calendar_meta_v2'); 
      setWatchlist([]); 
      setSubscribedLists([]); 
      setEpisodes({}); 
      setReminders([]); 
      setInteractions({}); 
      localStorage.removeItem('tv_calendar_interactions'); 
  };
  
  // --- CLOUD OPS ---
  const mapDbToEpisode = (row: any): Episode => ({ id: row.id, show_id: row.tmdb_id, show_name: row.title, name: row.episode_name || row.title, overview: row.overview || '', vote_average: row.vote_average || 0, air_date: row.air_date, episode_number: row.episode_number, season_number: row.season_number, still_path: row.backdrop_path, poster_path: row.poster_path, is_movie: row.media_type === 'movie', release_type: row.release_type as any, });
  const loadCloudCalendar = async (userId: string) => { if (!supabase) return; try { const oneYearAgo = subYears(new Date(), 1).toISOString(); const { data, error } = await supabase.from('user_calendar_events').select('*').eq('user_id', userId).gte('air_date', oneYearAgo); if (error) throw error; if (data && data.length > 0) { const newEpisodes: Record<string, Episode[]> = {}; data.forEach((row: any) => { const dateKey = row.air_date; if (!dateKey) return; if (!newEpisodes[dateKey]) newEpisodes[dateKey] = []; newEpisodes[dateKey].push(mapDbToEpisode(row)); }); setEpisodes(prev => { const merged = { ...prev, ...newEpisodes }; set('tv_calendar_episodes_v2', merged); return merged; }); } } catch (e) { console.error("Failed to load cloud calendar", e); } };
  const loadArchivedEvents = async () => { if (!user?.isCloud || !supabase || !user.id) return; setLoading(true); try { const oneYearAgo = subYears(new Date(), 1).toISOString(); const { data, error } = await supabase.from('user_calendar_events').select('*').eq('user_id', user.id).lt('air_date', oneYearAgo); if (error) throw error; if (data && data.length > 0) { setEpisodes(prev => { const next = { ...prev }; data.forEach((row: any) => { const dateKey = row.air_date; if (!dateKey) return; if (!next[dateKey]) next[dateKey] = []; const exists = next[dateKey].some(e => e.show_id === row.tmdb_id && e.season_number === row.season_number && e.episode_number === row.episode_number); if (!exists) { next[dateKey].push(mapDbToEpisode(row)); } }); return next; }); } } catch (e) { console.error("Archive load failed", e); } finally { setLoading(false); } };
  const saveToCloudCalendar = async (episodesList: Episode[], userId: string) => { if (!supabase || episodesList.length === 0) return; const rows = episodesList.map(ep => ({ user_id: userId, tmdb_id: ep.show_id || ep.id, media_type: ep.is_movie ? 'movie' : 'tv', season_number: ep.season_number ?? -1, episode_number: ep.episode_number ?? -1, title: ep.show_name || ep.name || '', episode_name: ep.name || '', overview: ep.overview || '', air_date: ep.air_date, poster_path: ep.poster_path || null, backdrop_path: ep.still_path || null, vote_average: ep.vote_average || 0, release_type: ep.release_type || null })); const batchSize = 100; for (let i = 0; i < rows.length; i += batchSize) { const batch = rows.slice(i, i + batchSize); const { error } = await supabase.from('user_calendar_events').upsert(batch, { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' }); if (error) console.error('Supabase Upsert Failed:', error.message); } };
  const performFullSync = async (config?: Partial<AppSettings>) => { if (!user?.isCloud || !supabase || !user.id) return; setIsSyncing(true); setLoading(true); try { if (config) { const merged = { ...settings, ...config }; setSettings(merged); await supabase.from('profiles').update({ settings: JSON.stringify(merged) }).eq('id', user.id); } await del('tv_calendar_episodes_v2'); await del('tv_calendar_meta_v2'); setEpisodes({}); await supabase.from('user_calendar_events').delete().eq('user_id', user.id); const uniqueItems = [...allTrackedShows]; setSyncProgress({ current: 0, total: uniqueItems.length }); let processedCount = 0; const batchSize = 3; let fullEpisodeList: Episode[] = []; for (let i = 0; i < uniqueItems.length; i += batchSize) { const batch = uniqueItems.slice(i, i + batchSize); const batchEpisodes: Episode[] = []; await Promise.all(batch.map(async (item) => { try { let origin = item.origin_country; let details = item; if (item.media_type === 'movie') { if (!origin) { const fullMovie = await getMovieDetails(item.id); origin = fullMovie.origin_country; } const releaseDates = await getMovieReleaseDates(item.id); releaseDates.forEach(rel => { batchEpisodes.push({ id: item.id * 1000 + (rel.type === 'theatrical' ? 1 : 2), name: item.name, overview: item.overview, vote_average: item.vote_average, air_date: rel.date, episode_number: 1, season_number: 1, still_path: item.backdrop_path, show_backdrop_path: item.backdrop_path, poster_path: item.poster_path, season1_poster_path: item.poster_path ? item.poster_path : undefined, show_id: item.id, show_name: item.name, is_movie: true, release_type: rel.type, origin_country: origin }); }); } else { try { details = await getShowDetails(item.id); origin = details.origin_country; } catch(e) {} const seasonsMeta = details.seasons || []; for (const sMeta of seasonsMeta) { try { const sData = await getSeasonDetails(item.id, sMeta.season_number); if (sData.episodes) { sData.episodes.forEach(ep => { if (ep.air_date) batchEpisodes.push({ ...ep, show_id: item.id, show_name: item.name, poster_path: item.poster_path, season1_poster_path: details.poster_path, show_backdrop_path: details.backdrop_path, is_movie: false, origin_country: origin }); }); } } catch (e) {} } } } catch (err) {} })); if (batchEpisodes.length > 0) { fullEpisodeList = [...fullEpisodeList, ...batchEpisodes]; await saveToCloudCalendar(batchEpisodes, user.id); } processedCount += batch.length; setSyncProgress(prev => ({ ...prev, current: processedCount })); } await supabase.from('profiles').update({ full_sync_completed: true, last_full_sync: new Date().toISOString() }).eq('id', user.id); const newEpisodesMap: Record<string, Episode[]> = {}; fullEpisodeList.forEach(ep => { if(!ep.air_date) return; const dateKey = getAdjustedDate(ep.air_date, ep.origin_country); if(!newEpisodesMap[dateKey]) newEpisodesMap[dateKey] = []; newEpisodesMap[dateKey].push(ep); }); await set('tv_calendar_episodes_v2', newEpisodesMap); setEpisodes(newEpisodesMap); setUser(prev => prev ? ({ ...prev, fullSyncCompleted: true }) : null); setFullSyncRequired(false); } catch (e) { alert("Sync failed. Please try again."); } finally { setIsSyncing(false); setLoading(false); } };
  const reloadAccount = async () => { if (isSyncing) return; setLoading(true); try { await del('tv_calendar_episodes_v2'); await del('tv_calendar_meta_v2'); setEpisodes({}); if (user?.isCloud && supabase) { const { data: { session } } = await supabase.auth.getSession(); if (session) await loginCloud(session); else logout(); } else { await refreshEpisodes(true); } } catch (e) { setLoading(false); } };
  const hardRefreshCalendar = async () => { await del('tv_calendar_episodes_v2'); await del('tv_calendar_meta_v2'); setEpisodes({}); await refreshEpisodes(true); };
  const updateUserKey = async (apiKey: string) => { if (user) { const updatedUser = { ...user, tmdbKey: apiKey }; setUser(updatedUser); setApiToken(apiKey); if (user.isCloud && supabase) { await supabase.from('profiles').update({ tmdb_key: apiKey }).eq('id', user.id); } else { localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser)); } } };
  const saveInteraction = async (interaction: Interaction) => { if (!user?.isCloud || !supabase || !user?.id) return; try { const payload = { user_id: user.id, tmdb_id: interaction.tmdb_id, media_type: interaction.media_type, is_watched: interaction.is_watched, rating: interaction.rating, season_number: interaction.season_number ?? -1, episode_number: interaction.episode_number ?? -1, watched_at: interaction.watched_at, updated_at: new Date().toISOString() }; const { error } = await supabase.from('interactions').upsert(payload, { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' }); if (error) console.error("Interaction save failed", error); } catch (e: any) { console.error("Interaction save error", e); } };
  const toggleWatched = async (id: number, mediaType: 'tv' | 'movie') => { const key = `${mediaType}-${id}`; const current = interactions[key] || { tmdb_id: id, media_type: mediaType, is_watched: false, rating: 0 }; const newIsWatched = !current.is_watched; const updated: Interaction = { ...current, is_watched: newIsWatched, watched_at: newIsWatched ? new Date().toISOString() : undefined }; manualOverridesRef.current[key] = newIsWatched; setInteractions(prev => ({ ...prev, [key]: updated })); if (user?.traktToken) { const action = updated.is_watched ? 'add' : 'remove'; const payload = mediaType === 'movie' ? { movies: [{ ids: { tmdb: id } }] } : { shows: [{ ids: { tmdb: id } }] }; syncHistory(user.traktToken.access_token, payload, action).catch(console.error); } await saveInteraction(updated); };
  const toggleEpisodeWatched = async (showId: number, season: number, episode: number) => { const key = `episode-${showId}-${season}-${episode}`; const current = interactions[key] || { tmdb_id: showId, media_type: 'episode', is_watched: false, rating: 0, season_number: season, episode_number: episode }; const newIsWatched = !current.is_watched; const updated: Interaction = { ...current, is_watched: newIsWatched, watched_at: newIsWatched ? new Date().toISOString() : undefined }; manualOverridesRef.current[key] = newIsWatched; setInteractions(prev => ({ ...prev, [key]: updated })); if (user?.traktToken) { const action = updated.is_watched ? 'add' : 'remove'; const payload = { shows: [{ ids: { tmdb: showId }, seasons: [{ number: season, episodes: [{ number: episode }] }] }] }; syncHistory(user.traktToken.access_token, payload, action).catch(console.error); } await saveInteraction(updated); };
  const markHistoryWatched = async (showId: number, targetSeason: number, targetEpisode: number) => { setIsSyncing(true); try { const show = await getShowDetails(showId); const seasons = show.seasons || []; const epsToMark: Interaction[] = []; const traktEpisodesPayload: any[] = []; const sortedSeasons = seasons.filter(s => { if (targetSeason === 0) return s.season_number === 0; return s.season_number > 0 && s.season_number <= targetSeason; }); const batchSize = 3; for (let i = 0; i < sortedSeasons.length; i += batchSize) { const batch = sortedSeasons.slice(i, i + batchSize); const results = await Promise.all(batch.map(s => getSeasonDetails(showId, s.season_number))); results.forEach(seasonData => { seasonData.episodes.forEach((ep: any) => { if (ep.season_number < targetSeason || (ep.season_number === targetSeason && ep.episode_number <= targetEpisode)) { epsToMark.push({ tmdb_id: showId, media_type: 'episode', season_number: ep.season_number, episode_number: ep.episode_number, is_watched: true, rating: 0, watched_at: new Date().toISOString() }); if (ep.id) { traktEpisodesPayload.push({ ids: { tmdb: ep.id } }); } } }); }); } setInteractions(prev => { const next = { ...prev }; epsToMark.forEach(item => { const key = `episode-${showId}-${item.season_number}-${item.episode_number}`; if (!next[key]?.is_watched) { next[key] = item; manualOverridesRef.current[key] = true; } }); return next; }); if (user?.traktToken && traktEpisodesPayload.length > 0) { syncHistory(user.traktToken.access_token, { episodes: traktEpisodesPayload }, 'add').catch(console.error); } if (user?.isCloud && supabase) { const dbBatchSize = 100; for (let i = 0; i < epsToMark.length; i += dbBatchSize) { const batch = epsToMark.slice(i, i + dbBatchSize).map(item => ({ user_id: user.id, tmdb_id: item.tmdb_id, media_type: item.media_type, season_number: item.season_number, episode_number: item.episode_number, is_watched: item.is_watched, watched_at: item.watched_at, updated_at: new Date().toISOString() })); await supabase.from('interactions').upsert(batch, { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' }); } } } catch (e) { console.error("Failed to mark history", e); } finally { setIsSyncing(false); } };
  const setRating = async (id: number, mediaType: 'tv' | 'movie', rating: number) => { const key = `${mediaType}-${id}`; let updated: Interaction | null = null; setInteractions(prev => { const current = prev[key] || { tmdb_id: id, media_type: mediaType, is_watched: false, rating: 0 }; updated = { ...current, rating: rating }; return { ...prev, [key]: updated }; }); if(updated) await saveInteraction(updated); };
  const addToWatchlist = async (show: TVShow) => { if (watchlist.find(s => s.id === show.id)) return; const currentHidden = settings.hiddenItems || []; if (currentHidden.some(i => i.id === show.id)) { const newHidden = currentHidden.filter(i => i.id !== show.id); updateSettings({ hiddenItems: newHidden }); } const newWatchlist = [...watchlist, show]; setWatchlist(newWatchlist); if (user?.isCloud && supabase) { await supabase.from('watchlist').upsert({ user_id: user.id, tmdb_id: show.id, media_type: show.media_type, name: show.name, poster_path: show.poster_path, backdrop_path: show.backdrop_path, overview: show.overview, first_air_date: show.first_air_date, vote_average: show.vote_average }, { onConflict: 'user_id, tmdb_id' }); } if (settings.reminderStrategy === 'ask') setReminderCandidate(show); else if (settings.reminderStrategy === 'always') { const isMovie = show.media_type === 'movie'; await addReminder({ tmdb_id: show.id, media_type: show.media_type, show_name: show.name, scope: isMovie ? 'movie_digital' : 'all', offset_minutes: 0 }); } if (window.innerWidth < 768 && !settings.suppressMobileAddWarning) setIsMobileWarningOpen(true); if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); };
  const removeFromWatchlist = async (showId: number) => { const currentHidden = settings.hiddenItems || []; const show = allTrackedShows.find(s => s.id === showId); const name = show?.name || 'Unknown Show'; if (!currentHidden.some(i => i.id === showId)) updateSettings({ hiddenItems: [...currentHidden, { id: showId, name }] }); const isTrackedInLists = subscribedLists.some(list => list.items.some(i => i.id === showId)); const newWatchlist = watchlist.filter(s => s.id !== showId); setWatchlist(newWatchlist); if (!isTrackedInLists) { setEpisodes(prev => { const next = { ...prev }; Object.keys(next).forEach(dateKey => { next[dateKey] = next[dateKey].filter(ep => ep.show_id !== showId); if (next[dateKey].length === 0) delete next[dateKey]; }); set('tv_calendar_episodes_v2', next); return next; }); if (user?.isCloud && supabase) { Promise.all([ supabase.from('watchlist').delete().match({ user_id: user.id, tmdb_id: showId }), supabase.from('user_calendar_events').delete().match({ user_id: user.id, tmdb_id: showId }) ]).catch(console.error); } } else { if (user?.isCloud && supabase) await supabase.from('watchlist').delete().match({ user_id: user.id, tmdb_id: showId }); } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); };
  const batchAddShows = async (shows: TVShow[]) => { const currentIds = new Set(watchlist.map(s => s.id)); const hiddenIds = new Set((settings.hiddenItems || []).map(i => i.id)); const newShows = shows.filter(s => !currentIds.has(s.id) && !hiddenIds.has(s.id)); if (newShows.length === 0) return; const newWatchlist = [...watchlist, ...newShows]; setWatchlist(newWatchlist); if (user?.isCloud && supabase) { const rows = newShows.map(show => ({ user_id: user.id, tmdb_id: show.id, media_type: show.media_type, name: show.name, poster_path: show.poster_path, backdrop_path: show.backdrop_path, overview: show.overview, first_air_date: show.first_air_date, vote_average: show.vote_average })); if (rows.length > 0) await supabase.from('watchlist').upsert(rows, { onConflict: 'user_id, tmdb_id' }); } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); };
  const subscribeToList = async (listId: string) => { if (subscribedLists.some(l => l.id === listId)) return; try { const listDetails = await getListDetails(listId); const newList: SubscribedList = { id: listId, name: listDetails.name, items: listDetails.items, item_count: listDetails.items.length }; const newLists = [...subscribedLists, newList]; setSubscribedLists(newLists); if (user?.isCloud && supabase) await supabase.from('subscriptions').upsert({ user_id: user.id, list_id: listId, name: listDetails.name, item_count: listDetails.items.length }, { onConflict: 'user_id, list_id' }); if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); } catch (error) { throw error; } };
  const unsubscribeFromList = async (listId: string) => { const listToRemove = subscribedLists.find(l => l.id === listId); const newLists = subscribedLists.filter(l => l.id !== listId); setSubscribedLists(newLists); if (listToRemove) { const showsToPurge: number[] = []; listToRemove.items.forEach(show => { const inWatchlist = watchlist.some(w => w.id === show.id); const inOtherLists = newLists.some(l => l.items.some(i => i.id === show.id)); if (!inWatchlist && !inOtherLists) showsToPurge.push(show.id); }); if (showsToPurge.length > 0) { setEpisodes(prev => { const next = { ...prev }; Object.keys(next).forEach(dateKey => { next[dateKey] = next[dateKey].filter(ep => !ep.show_id || !showsToPurge.includes(ep.show_id)); if (next[dateKey].length === 0) delete next[dateKey]; }); set('tv_calendar_episodes_v2', next); return next; }); if (user?.isCloud && supabase) supabase.from('user_calendar_events').delete().in('tmdb_id', showsToPurge).eq('user_id', user.id).then(); } } if (user?.isCloud && supabase) await supabase.from('subscriptions').delete().match({ user_id: user.id, list_id: listId }); if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); };
  const batchSubscribe = async (lists: SubscribedList[]) => { const currentIds = new Set(subscribedLists.map(l => l.id)); const freshLists = lists.filter(l => !currentIds.has(l.id)); if (freshLists.length === 0) return; const newLists = [...subscribedLists, ...freshLists]; setSubscribedLists(newLists); if (user?.isCloud && supabase) { const rows = freshLists.map(l => ({ user_id: user.id, list_id: l.id, name: l.name, item_count: l.item_count })); if (rows.length > 0) await supabase.from('subscriptions').upsert(rows, { onConflict: 'user_id, list_id' }); } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); };
  const closeMobileWarning = (suppressFuture: boolean) => { setIsMobileWarningOpen(false); if (suppressFuture) updateSettings({ suppressMobileAddWarning: true }); };
  const syncTraktData = async (background = false) => { if (!user?.traktToken) return; if (!background) setLoading(true); setIsSyncing(true); try { const token = user.traktToken.access_token; const [movieHistory, showHistory] = await Promise.all([getWatchedHistory(token, 'movies'), getWatchedHistory(token, 'shows')]); let newShowsToAdd: TVShow[] = []; const currentShowIds = new Set(allTrackedShows.map(s => s.id)); const hiddenIds = new Set((settings.hiddenItems || []).map(i => i.id)); const traktMovies: Record<string, any> = {}; const traktEpisodes: Record<string, any> = {}; for (const item of movieHistory) { const tmdbId = item.movie.ids.tmdb; if (!tmdbId || hiddenIds.has(tmdbId)) continue; traktMovies[`movie-${tmdbId}`] = item; if (!currentShowIds.has(tmdbId)) { try { const details = await getMovieDetails(tmdbId); newShowsToAdd.push(details); currentShowIds.add(tmdbId); } catch (e) {} } } const sortedShows = showHistory.sort((a: any, b: any) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime()); const recentShows = sortedShows.slice(0, 20); for (const item of recentShows) { const tmdbId = item.show.ids.tmdb; if (!tmdbId || hiddenIds.has(tmdbId)) continue; if (!currentShowIds.has(tmdbId)) { try { const details = await getShowDetails(tmdbId); newShowsToAdd.push(details); currentShowIds.add(tmdbId); } catch (e) {} } try { const progress = await getShowProgress(token, item.show.ids.trakt); if (progress && progress.seasons) { progress.seasons.forEach((season: any) => { season.episodes.forEach((ep: any) => { if (ep.completed) { traktEpisodes[`episode-${tmdbId}-${season.number}-${ep.number}`] = ep; } }); }); } } catch (e) {} } setInteractions(currentInteractions => { const nextInteractions = { ...currentInteractions }; const manual = manualOverridesRef.current; Object.keys(traktMovies).forEach(key => { const existing = nextInteractions[key]; const traktItem = traktMovies[key]; nextInteractions[key] = { tmdb_id: traktItem.movie.ids.tmdb, media_type: 'movie', is_watched: true, rating: existing?.rating || 0, watched_at: traktItem.last_watched_at }; }); Object.keys(traktEpisodes).forEach(key => { const existing = nextInteractions[key]; const traktEp = traktEpisodes[key]; const [_, tmdbIdStr, sStr, eStr] = key.split('-'); nextInteractions[key] = { tmdb_id: parseInt(tmdbIdStr), media_type: 'episode', is_watched: true, season_number: parseInt(sStr), episode_number: parseInt(eStr), rating: existing?.rating || 0, watched_at: traktEp.last_watched_at }; }); Object.keys(manual).forEach(key => { if (nextInteractions[key]) { nextInteractions[key].is_watched = manual[key]; } else { const parts = key.split('-'); if (parts[0] === 'movie') { nextInteractions[key] = { tmdb_id: parseInt(parts[1]), media_type: 'movie', is_watched: manual[key], rating: 0 }; } else { nextInteractions[key] = { tmdb_id: parseInt(parts[1]), media_type: 'episode', season_number: parseInt(parts[2]), episode_number: parseInt(parts[3]), is_watched: manual[key], rating: 0 }; } } }); return nextInteractions; }); if (user.isCloud && supabase) { const batchToUpsert: any[] = []; Object.keys(traktMovies).forEach(key => { const t = traktMovies[key]; batchToUpsert.push({ user_id: user.id, tmdb_id: t.movie.ids.tmdb, media_type: 'movie', is_watched: true, rating: 0, season_number: -1, episode_number: -1, watched_at: t.last_watched_at }); }); Object.keys(traktEpisodes).forEach(key => { const [_, tmdbId, season, episode] = key.split('-'); const t = traktEpisodes[key]; batchToUpsert.push({ user_id: user.id, tmdb_id: parseInt(tmdbId), media_type: 'episode', is_watched: true, rating: 0, season_number: parseInt(season), episode_number: parseInt(episode), watched_at: t.last_watched_at }); }); if (batchToUpsert.length > 0) { for (let i = 0; i < batchToUpsert.length; i += 100) { const batch = batchToUpsert.slice(i, i + 100); await supabase.from('interactions').upsert(batch, { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' }); } } } if (newShowsToAdd.length > 0) { await batchAddShows(newShowsToAdd); } if (!background) alert(`Sync Complete!`); } catch (e) { console.error("Trakt Sync Error", e); } finally { if (!background) setLoading(false); setIsSyncing(false); } };
  const traktAuth = async (clientId: string, clientSecret: string) => { return await getDeviceCode(clientId); };
  const traktPoll = async (deviceCode: string, clientId: string, clientSecret: string) => { return await pollToken(deviceCode, clientId, clientSecret); };
  const saveTraktToken = async (tokenData: any) => { if (!user) return; try { const profile = await getTraktProfile(tokenData.access_token); const updatedUser: User = { ...user, traktToken: { ...tokenData, created_at: Date.now() / 1000 }, traktProfile: profile }; setUser(updatedUser); if (user.isCloud && supabase) { await supabase.from('profiles').update({ trakt_token: updatedUser.traktToken, trakt_profile: profile }).eq('id', user.id); } else { localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser)); } } catch (e) { console.error("Failed to fetch Trakt profile", e); } };
  const disconnectTrakt = async () => { if (!user) return; const updatedUser = { ...user, traktToken: undefined, traktProfile: undefined }; setUser(updatedUser); if (user.isCloud && supabase) { await supabase.from('profiles').update({ trakt_token: null, trakt_profile: null }).eq('id', user.id); } else { localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser)); } };
  const addReminder = async (reminder: Reminder) => { const newReminder = { ...reminder, id: reminder.id || crypto.randomUUID() }; setReminders(prev => [...prev, newReminder]); if (user?.isCloud && supabase) { await supabase.from('reminders').insert({ user_id: user.id, tmdb_id: reminder.tmdb_id, media_type: reminder.media_type, scope: reminder.scope, episode_season: reminder.episode_season, episode_number: reminder.episode_number, offset_minutes: reminder.offset_minutes }); } await requestNotificationPermission(); };
  const removeReminder = async (id: string) => { setReminders(prev => prev.filter(r => r.id !== id)); if (user?.isCloud && supabase) await supabase.from('reminders').delete().eq('id', id); };
  const requestNotificationPermission = async () => { if (!('Notification' in window)) return false; if (Notification.permission === 'granted') return true; const permission = await Notification.requestPermission(); return permission === 'granted'; };
  const importBackup = (data: any) => { if (user?.isCloud) { uploadBackupToCloud(data); return; } if (Array.isArray(data)) setWatchlist(data); else if (typeof data === 'object' && data !== null) { if (data.user && data.user.username && data.user.tmdbKey) setUser({ ...data.user, isAuthenticated: true, isCloud: false }); if (data.settings) updateSettings(data.settings); if (data.subscribedLists) setSubscribedLists(data.subscribedLists); if (data.watchlist) setWatchlist(data.watchlist); if (data.reminders) setReminders(data.reminders); if (data.interactions) setInteractions(data.interactions); } };
  const uploadBackupToCloud = async (data: any) => { if (!user?.isCloud || !supabase) return; setLoading(true); try { let keyToSet = user.tmdbKey; let settingsToSet = settings; if (data.user?.tmdbKey) keyToSet = data.user.tmdbKey; if (data.settings) settingsToSet = { ...settings, ...data.settings }; await supabase.from('profiles').update({ tmdb_key: keyToSet, settings: settingsToSet }).eq('id', user.id); setUser(prev => prev ? ({ ...prev, tmdbKey: keyToSet }) : null); setApiToken(keyToSet); setSettings(settingsToSet); let items: TVShow[] = []; if (Array.isArray(data)) items = data; else if (data.watchlist) items = data.watchlist; if (items.length > 0) await batchAddShows(items); if (data.subscribedLists) await batchSubscribe(data.subscribedLists); } catch (e) { alert("Failed to upload backup."); } finally { setLoading(false); } };
  const getSyncPayload = useCallback(() => { const simpleWatchlist = watchlist.map(item => ({ id: item.id, type: item.media_type })); const simpleLists = subscribedLists.map(list => list.id); const settingsToExport = { ...settings }; delete (settingsToExport as any).viewMode; delete (settingsToExport as any).mobileNavLayout; const payload = { user: { username: user?.username, tmdbKey: user?.tmdbKey, isCloud: user?.isCloud }, watchlist: simpleWatchlist, lists: simpleLists, settings: settingsToExport, interactions }; return LZString.compressToEncodedURIComponent(JSON.stringify(payload)); }, [user, watchlist, subscribedLists, settings, interactions]);
  const processSyncPayload = useCallback(async (encodedPayload: string) => { try { const json = LZString.decompressFromEncodedURIComponent(encodedPayload); if (!json) throw new Error("Invalid payload"); const data = JSON.parse(json); if (data.user) { const newUser: User = { ...data.user, isAuthenticated: true }; setUser(newUser); setApiToken(newUser.tmdbKey); if (!newUser.isCloud) localStorage.setItem('tv_calendar_user', JSON.stringify(newUser)); } if (data.settings) updateSettings(data.settings); if (data.interactions) { setInteractions(data.interactions); if (!data.user?.isCloud) localStorage.setItem('tv_calendar_interactions', JSON.stringify(data.interactions)); } if (data.watchlist && Array.isArray(data.watchlist)) { setLoading(true); const shows: TVShow[] = []; for (const item of data.watchlist) { try { const details = item.type === 'movie' ? await getMovieDetails(item.id) : await getShowDetails(item.id); shows.push(details); } catch (e) {} } await batchAddShows(shows); } if (data.lists && Array.isArray(data.lists)) { for (const listId of data.lists) await subscribeToList(listId); } setTimeout(() => window.location.reload(), 500); } catch (e) { alert("Failed to process sync data."); setLoading(false); } }, [batchAddShows, subscribeToList, updateSettings]);
  const unhideShow = (showId: number) => { const currentHidden = settings.hiddenItems || []; const newHidden = currentHidden.filter(i => i.id !== showId); updateSettings({ hiddenItems: newHidden }); if (user?.traktToken) syncTraktData(true); };
  const testConnection = async (): Promise<{ read: boolean; write: boolean; message: string }> => { if (!isSupabaseConfigured() || !supabase) return { read: false, write: false, message: 'Supabase client not initialized.' }; if (!user?.isCloud || !user.id) return { read: false, write: false, message: 'Not logged into a cloud account.' }; let readSuccess = false; let writeSuccess = false; const details = []; try { const { data, error: readError } = await supabase.from('profiles').select('id, settings').eq('id', user.id).single(); if (readError) { details.push(`Read Failed: ${readError.message}`); } else if (!data) { details.push('Read Failed: Profile not found'); } else { readSuccess = true; } const { error: writeError } = await supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', user.id); if (writeError) { details.push(`Write Failed: ${writeError.message}`); } else { writeSuccess = true; } if (readSuccess && writeSuccess) { return { read: true, write: true, message: 'Connection Healthy.' }; } return { read: readSuccess, write: writeSuccess, message: details.join('. ') }; } catch (e: any) { console.error("Connection Test Failed", e); return { read: false, write: false, message: `System Error: ${e.message || 'Unknown'}` }; } };

  // --- INIT & AUTH LISTENER ---
  useEffect(() => {
    const initAuth = async () => {
        if (supabase) {
            // Check for existing session first
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await loginCloud(session);
            } else {
                // If local user exists, loading handles itself, else stop loading
                if (!user) setLoading(false);
            }

            // Listen for changes (Login Page triggers this)
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    await loginCloud(session);
                } else if (event === 'SIGNED_OUT') {
                    logout();
                }
            });

            return () => {
                subscription.unsubscribe();
            };
        } else {
            // Local Mode Fallback
            if (!user) setLoading(false);
        }
    };
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      if (!user) {
          // handled by initAuth now
      } else {
          refreshEpisodes();
      }
  }, [user, refreshEpisodes]);

  useEffect(() => { if (!user) return; const checkReminders = () => { if (Notification.permission !== 'granted') return; const now = new Date(); const notifiedKey = 'tv_calendar_notified_events'; const notifiedEvents = JSON.parse(localStorage.getItem(notifiedKey) || '{}'); const allEpisodes = Object.values(episodes).flat() as Episode[]; reminders.forEach(rule => { let candidates: Episode[] = []; if (rule.scope === 'all') candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.air_date); else if (rule.scope === 'episode') candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.season_number === rule.episode_season && e.episode_number === rule.episode_number); else if (rule.scope.startsWith('movie')) { candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.is_movie); if (rule.scope === 'movie_theatrical') candidates = candidates.filter(e => e.release_type === 'theatrical'); else if (rule.scope === 'movie_digital') candidates = candidates.filter(e => e.release_type === 'digital'); } candidates.forEach(ep => { if (!ep.air_date) return; const releaseDate = parseISO(ep.air_date); if (rule.offset_minutes === 0) { if (isSameDay(now, releaseDate)) triggerNotification(ep, rule, notifiedEvents); } else { const triggerDate = subMinutes(releaseDate, rule.offset_minutes); if (isSameDay(now, triggerDate)) triggerNotification(ep, rule, notifiedEvents); } }); }); localStorage.setItem(notifiedKey, JSON.stringify(notifiedEvents)); }; const triggerNotification = (ep: Episode, rule: Reminder, history: any) => { const key = `${rule.id}-${ep.id}-${new Date().toDateString()}`; if (history[key]) return; const title = ep.is_movie ? ep.name : ep.show_name; const body = ep.is_movie ? `${ep.release_type === 'theatrical' ? 'In Theaters' : 'Digital Release'} today!` : `S${ep.season_number}E${ep.episode_number} "${ep.name}" is airing!`; new Notification(title || 'TV Calendar', { body, icon: '/vite.svg', tag: key }); history[key] = Date.now(); }; const interval = setInterval(checkReminders, 60000); checkReminders(); return () => clearInterval(interval); }, [reminders, episodes, user]);

  return (
    <AppContext.Provider value={{
      user, login, loginCloud, logout, updateUserKey,
      watchlist, addToWatchlist, removeFromWatchlist, unhideShow, batchAddShows, batchSubscribe,
      subscribedLists, subscribeToList, unsubscribeFromList, allTrackedShows,
      episodes, loading, isSyncing, syncProgress, refreshEpisodes, loadArchivedEvents,
      requestNotificationPermission,
      isSearchOpen, setIsSearchOpen,
      settings, updateSettings,
      importBackup, uploadBackupToCloud,
      getSyncPayload, processSyncPayload,
      isMobileWarningOpen, closeMobileWarning,
      reminders, addReminder, removeReminder,
      reminderCandidate, setReminderCandidate,
      reloadAccount,
      calendarScrollPos, setCalendarScrollPos,
      calendarDate, setCalendarDate,
      interactions, toggleWatched, toggleEpisodeWatched, markHistoryWatched, setRating,
      traktAuth, traktPoll, saveTraktToken, disconnectTrakt, syncTraktData,
      fullSyncRequired, performFullSync,
      hardRefreshCalendar,
      testConnection
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