
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList, Reminder, Interaction, TraktProfile, V2SidebarMode } from '../types';
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

  // Calendar Persistence
  calendarScrollPos: number;
  setCalendarScrollPos: (pos: number) => void;
  calendarDate: Date;
  setCalendarDate: (date: Date) => void;

  // Trakt
  traktAuth: (clientId: string, clientSecret: string) => Promise<any>;
  traktPoll: (deviceCode: string, clientId: string, clientSecret: string) => Promise<any>;
  saveTraktToken: (tokenData: any) => Promise<void>;
  disconnectTrakt: () => Promise<void>;
  syncTraktData: (background?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

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
  v2SidebarMode: 'fixed'
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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => { try { return localStorage.getItem('tv_calendar_user') ? JSON.parse(localStorage.getItem('tv_calendar_user')!) : null; } catch { return null; } });
  useEffect(() => { if (user?.tmdbKey) setApiToken(user.tmdbKey); }, [user]);
  
  const [calendarScrollPos, setCalendarScrollPos] = useState(0);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const manualOverridesRef = useRef<Record<string, boolean>>({});

  const [settings, setSettings] = useState<AppSettings>(() => { 
      try { 
          const savedSynced = localStorage.getItem('tv_calendar_settings');
          const synced = savedSynced ? JSON.parse(savedSynced) : DEFAULT_SETTINGS;
          
          if (!synced.spoilerConfig) synced.spoilerConfig = DEFAULT_SETTINGS.spoilerConfig;
          if (synced.spoilerConfig.includeMovies === undefined) synced.spoilerConfig.includeMovies = false;
          if (synced.spoilerConfig.replacementMode === undefined) synced.spoilerConfig.replacementMode = 'blur';
          if (!synced.baseTheme) synced.baseTheme = 'cosmic';
          if (!synced.appFont) synced.appFont = 'inter';
          if (!synced.v2SidebarMode) synced.v2SidebarMode = 'fixed';
          if (!synced.hiddenItems) synced.hiddenItems = [];

          const local = getLocalPrefs();
          return { ...DEFAULT_SETTINGS, ...synced, ...local }; 
      } catch { 
          return DEFAULT_SETTINGS; 
      } 
  });
  
  useEffect(() => { 
      const themeKey = settings.theme || 'default'; 
      let themeColors = themeKey === 'custom' && settings.customThemeColor ? generatePaletteFromHex(settings.customThemeColor) : (THEMES[themeKey] || THEMES.default); 
      Object.entries(themeColors).forEach(([shade, value]) => { document.documentElement.style.setProperty(`--theme-${shade}`, value); }); 
      let activeTheme = settings.baseTheme || 'cosmic';
      if (activeTheme === 'auto') activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'cosmic' : 'light';
      document.body.setAttribute('data-base-theme', activeTheme);
      document.body.setAttribute('data-font', settings.appFont || 'inter');
  }, [settings.theme, settings.customThemeColor, settings.baseTheme, settings.appFont]);

  const [watchlist, setWatchlist] = useState<TVShow[]>(() => { try { const saved = localStorage.getItem('tv_calendar_watchlist'); return saved ? JSON.parse(saved) : []; } catch { return []; } });
  const [subscribedLists, setSubscribedLists] = useState<SubscribedList[]>(() => { try { const saved = localStorage.getItem('tv_calendar_subscribed_lists'); return saved ? JSON.parse(saved) : []; } catch { return []; } });
  const [reminders, setReminders] = useState<Reminder[]>(() => { try { const saved = localStorage.getItem('tv_calendar_reminders'); return saved ? JSON.parse(saved) : []; } catch { return []; } });
  const [interactions, setInteractions] = useState<Record<string, Interaction>>(() => { try { return JSON.parse(localStorage.getItem('tv_calendar_interactions') || '{}'); } catch { return {}; } });

  const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileWarningOpen, setIsMobileWarningOpen] = useState(false);
  const [reminderCandidate, setReminderCandidate] = useState<TVShow | Episode | null>(null);
  const [fullSyncRequired, setFullSyncRequired] = useState(false);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allTrackedShows = useMemo(() => {
      const map = new Map<number, TVShow>();
      watchlist.forEach(show => map.set(show.id, show));
      subscribedLists.forEach(list => { list.items.forEach(show => { if (!map.has(show.id)) map.set(show.id, show); }); });
      return Array.from(map.values());
  }, [watchlist, subscribedLists]);

  useEffect(() => {
    if (user && !user.isCloud) {
        localStorage.setItem('tv_calendar_watchlist', JSON.stringify(watchlist));
        localStorage.setItem('tv_calendar_subscribed_lists', JSON.stringify(subscribedLists));
        localStorage.setItem('tv_calendar_settings', JSON.stringify(settings)); 
        localStorage.setItem('tv_calendar_reminders', JSON.stringify(reminders));
        localStorage.setItem('tv_calendar_interactions', JSON.stringify(interactions));
        localStorage.setItem('tv_calendar_user', JSON.stringify(user)); 
    }
  }, [watchlist, subscribedLists, settings, user, reminders, interactions]);

  const traktAuth = async (clientId: string) => await getDeviceCode(clientId);
  const traktPoll = async (deviceCode: string, clientId: string, clientSecret: string) => await pollToken(deviceCode, clientId, clientSecret);
  const saveTraktToken = async (tokenData: any) => { if (!user) return; try { const profile = await getTraktProfile(tokenData.access_token); const updatedUser: User = { ...user, traktToken: { ...tokenData, created_at: Date.now() / 1000 }, traktProfile: profile }; setUser(updatedUser); if (user.isCloud && supabase) await supabase.from('profiles').update({ trakt_token: updatedUser.traktToken, trakt_profile: profile }).eq('id', user.id); else localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser)); } catch (e) { console.error(e); } };
  const disconnectTrakt = async () => { if (!user) return; const updatedUser = { ...user, traktToken: undefined, traktProfile: undefined }; setUser(updatedUser); if (user.isCloud && supabase) await supabase.from('profiles').update({ trakt_token: null, trakt_profile: null }).eq('id', user.id); else localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser)); };
  
  const saveRatingToCloud = async (interaction: Interaction) => {
      if (!user?.isCloud || !supabase || !user?.id) return;
      try {
          const payload = { user_id: user.id, tmdb_id: interaction.tmdb_id, media_type: interaction.media_type, is_watched: interaction.is_watched, rating: interaction.rating, season_number: interaction.season_number ?? -1, episode_number: interaction.episode_number ?? -1, watched_at: interaction.watched_at, updated_at: new Date().toISOString() };
          await supabase.from('interactions').upsert(payload, { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' });
      } catch (e) {}
  };

  const saveManualWatchedStatus = async (interaction: Interaction) => {
      if (!user?.isCloud || !supabase || !user?.id) return;
      try {
          const payload = { user_id: user.id, tmdb_id: interaction.tmdb_id, media_type: interaction.media_type, is_watched: interaction.is_watched, season_number: interaction.season_number ?? -1, episode_number: interaction.episode_number ?? -1, watched_at: interaction.watched_at || new Date().toISOString(), updated_at: new Date().toISOString() };
          await supabase.from('watched_items').upsert(payload, { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' });
      } catch (e) {}
  };

  const syncTraktData = async (background = false) => {
      if (!user?.traktToken) return;
      if (!background) setLoading(true);
      setIsSyncing(true);
      try {
          const token = user.traktToken.access_token;
          const [movieHistory, showHistory] = await Promise.all([getWatchedHistory(token, 'movies'), getWatchedHistory(token, 'shows')]);
          let newShowsToAdd: TVShow[] = [];
          const currentShowIds = new Set(allTrackedShows.map(s => s.id));
          const hiddenIds = new Set((settings.hiddenItems || []).map(i => i.id));
          const traktMovies: Record<string, any> = {};
          const traktEpisodes: Record<string, any> = {};
          for (const item of movieHistory) { 
              const tmdbId = item.movie.ids.tmdb; 
              if (!tmdbId || hiddenIds.has(tmdbId)) continue; 
              traktMovies[`movie-${tmdbId}`] = item;
              if (!currentShowIds.has(tmdbId)) { try { const details = await getMovieDetails(tmdbId); newShowsToAdd.push(details); currentShowIds.add(tmdbId); } catch (e) {} } 
          }
          const recentShows = showHistory.sort((a: any, b: any) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime()).slice(0, 20); 
          for (const item of recentShows) { 
              const tmdbId = item.show.ids.tmdb; 
              if (!tmdbId || hiddenIds.has(tmdbId)) continue; 
              if (!currentShowIds.has(tmdbId)) { try { const details = await getShowDetails(tmdbId); newShowsToAdd.push(details); currentShowIds.add(tmdbId); } catch (e) {} } 
              try { 
                  const progress = await getShowProgress(token, item.show.ids.trakt); 
                  if (progress?.seasons) progress.seasons.forEach((s: any) => s.episodes.forEach((e: any) => { if (e.completed) traktEpisodes[`episode-${tmdbId}-${s.number}-${e.number}`] = e; }));
              } catch (e) {} 
          }
          setInteractions(current => {
              const next = { ...current };
              const manual = manualOverridesRef.current;
              Object.keys(traktMovies).forEach(key => { const existing = next[key]; const t = traktMovies[key]; next[key] = { tmdb_id: t.movie.ids.tmdb, media_type: 'movie', is_watched: true, rating: existing?.rating || 0, watched_at: t.last_watched_at }; });
              Object.keys(traktEpisodes).forEach(key => { const existing = next[key]; const t = traktEpisodes[key]; const [_, tmdbId, s, e] = key.split('-'); next[key] = { tmdb_id: parseInt(tmdbId), media_type: 'episode', is_watched: true, season_number: parseInt(s), episode_number: parseInt(e), rating: existing?.rating || 0, watched_at: t.last_watched_at }; });
              Object.keys(manual).forEach(key => { if (next[key]) next[key].is_watched = manual[key]; else { const parts = key.split('-'); if (parts[0] === 'movie') next[key] = { tmdb_id: parseInt(parts[1]), media_type: 'movie', is_watched: manual[key], rating: 0 }; else next[key] = { tmdb_id: parseInt(parts[1]), media_type: 'episode', season_number: parseInt(parts[2]), episode_number: parseInt(parts[3]), is_watched: manual[key], rating: 0 }; } });
              return next;
          });
          if (newShowsToAdd.length > 0) await batchAddShows(newShowsToAdd);
      } catch (e) {} finally { if (!background) setLoading(false); setIsSyncing(false); }
  };

  const toggleWatched = async (id: number, mediaType: 'tv' | 'movie') => {
    const key = `${mediaType}-${id}`;
    const current = interactions[key] || { tmdb_id: id, media_type: mediaType, is_watched: false, rating: 0 };
    const newIsWatched = !current.is_watched;
    const updated: Interaction = { ...current, is_watched: newIsWatched, watched_at: newIsWatched ? new Date().toISOString() : undefined };
    manualOverridesRef.current[key] = newIsWatched;
    setInteractions(prev => ({ ...prev, [key]: updated }));
    if (user?.traktToken) { const payload = mediaType === 'movie' ? { movies: [{ ids: { tmdb: id } }] } : { shows: [{ ids: { tmdb: id } }] }; syncHistory(user.traktToken.access_token, payload, updated.is_watched ? 'add' : 'remove').catch(console.error); }
    await saveManualWatchedStatus(updated);
  };

  const toggleEpisodeWatched = async (showId: number, season: number, episode: number) => { 
      const key = `episode-${showId}-${season}-${episode}`; 
      const current = interactions[key] || { tmdb_id: showId, media_type: 'episode', is_watched: false, rating: 0, season_number: season, episode_number: episode }; 
      const newIsWatched = !current.is_watched;
      const updated: Interaction = { ...current, is_watched: newIsWatched, watched_at: newIsWatched ? new Date().toISOString() : undefined }; 
      manualOverridesRef.current[key] = newIsWatched;
      setInteractions(prev => ({ ...prev, [key]: updated }));
      if (user?.traktToken) { const payload = { shows: [{ ids: { tmdb: showId }, seasons: [{ number: season, episodes: [{ number: episode }] }] }] }; syncHistory(user.traktToken.access_token, payload, updated.is_watched ? 'add' : 'remove').catch(console.error); }
      await saveManualWatchedStatus(updated);
  };

  const setRating = async (id: number, mediaType: 'tv' | 'movie', rating: number) => { 
      const key = `${mediaType}-${id}`; 
      let updated: Interaction | null = null;
      setInteractions(prev => { const current = prev[key] || { tmdb_id: id, media_type: mediaType, is_watched: false, rating: 0 }; updated = { ...current, rating: rating }; return { ...prev, [key]: updated }; });
      if(updated) await saveRatingToCloud(updated);
  };

  const markHistoryWatched = async (showId: number, targetSeason: number, targetEpisode: number) => {
      setIsSyncing(true);
      try {
          const show = await getShowDetails(showId);
          const epsToMark: Interaction[] = [];
          const sortedSeasons = (show.seasons || []).filter(s => targetSeason === 0 ? s.season_number === 0 : s.season_number > 0 && s.season_number <= targetSeason);
          for (let i = 0; i < sortedSeasons.length; i += 3) {
              const batch = sortedSeasons.slice(i, i + 3);
              const results = await Promise.all(batch.map(s => getSeasonDetails(showId, s.season_number)));
              results.forEach(seasonData => seasonData.episodes.forEach((ep: any) => { if (ep.season_number < targetSeason || (ep.season_number === targetSeason && ep.episode_number <= targetEpisode)) { epsToMark.push({ tmdb_id: showId, media_type: 'episode', season_number: ep.season_number, episode_number: ep.episode_number, is_watched: true, rating: 0, watched_at: new Date().toISOString() }); } }));
          }
          setInteractions(prev => {
              const next = { ...prev };
              epsToMark.forEach(item => { const key = `episode-${showId}-${item.season_number}-${item.episode_number}`; if (!next[key]?.is_watched) { next[key] = item; manualOverridesRef.current[key] = true; } });
              return next;
          });
          if (user?.isCloud && supabase) {
                for (let i = 0; i < epsToMark.length; i += 100) { 
                    const batch = epsToMark.slice(i, i + 100).map(item => ({ user_id: user.id, tmdb_id: item.tmdb_id, media_type: item.media_type, season_number: item.season_number, episode_number: item.episode_number, is_watched: item.is_watched, watched_at: item.watched_at, updated_at: new Date().toISOString() })); 
                    await supabase.from('watched_items').upsert(batch, { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' }); 
                }
          }
      } catch (e) {} finally { setIsSyncing(false); }
  };

  const mapDbToEpisode = (row: any): Episode => ({ id: row.id, show_id: row.tmdb_id, show_name: row.title, name: row.episode_name || row.title, overview: row.overview || '', vote_average: row.vote_average || 0, air_date: row.air_date, episode_number: row.episode_number, season_number: row.season_number, still_path: row.backdrop_path, poster_path: row.poster_path, is_movie: row.media_type === 'movie', release_type: row.release_type as any });
  const loadCloudCalendar = async (userId: string) => { if (!supabase) return; try { const oneYearAgo = subYears(new Date(), 1).toISOString(); const { data, error } = await supabase.from('user_calendar_events').select('*').eq('user_id', userId).gte('air_date', oneYearAgo); if (!error && data) { const newEpisodes: Record<string, Episode[]> = {}; data.forEach((row: any) => { const dateKey = row.air_date; if (!dateKey) return; if (!newEpisodes[dateKey]) newEpisodes[dateKey] = []; newEpisodes[dateKey].push(mapDbToEpisode(row)); }); setEpisodes(prev => { const merged = { ...prev, ...newEpisodes }; set(DB_KEY_EPISODES, merged); return merged; }); } } catch (e) {} };
  const loadArchivedEvents = async () => { if (!user?.isCloud || !supabase || !user.id) return; setLoading(true); try { const oneYearAgo = subYears(new Date(), 1).toISOString(); const { data, error } = await supabase.from('user_calendar_events').select('*').eq('user_id', user.id).lt('air_date', oneYearAgo); if (!error && data) setEpisodes(prev => { const next = { ...prev }; data.forEach((row: any) => { const dateKey = row.air_date; if (!dateKey) return; if (!next[dateKey]) next[dateKey] = []; if (!next[dateKey].some(e => e.show_id === row.tmdb_id && e.season_number === row.season_number && e.episode_number === row.episode_number)) next[dateKey].push(mapDbToEpisode(row)); }); return next; }); } catch (e) {} finally { setLoading(false); } };
  const saveToCloudCalendar = async (list: Episode[], userId: string) => { if (!supabase || list.length === 0) return; const rows = list.map(ep => ({ user_id: userId, tmdb_id: ep.show_id || ep.id, media_type: ep.is_movie ? 'movie' : 'tv', season_number: ep.season_number ?? -1, episode_number: ep.episode_number ?? -1, title: ep.show_name || ep.name || '', episode_name: ep.name || '', overview: ep.overview || '', air_date: ep.air_date, poster_path: ep.poster_path || null, backdrop_path: ep.still_path || null, vote_average: ep.vote_average || 0, release_type: ep.release_type || null })); for (let i = 0; i < rows.length; i += 100) await supabase.from('user_calendar_events').upsert(rows.slice(i, i + 100), { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' }); };
  // Fixed performFullSync by adding explicit TVShow type to uniqueItems and map callback
  const performFullSync = async () => { if (!user?.isCloud || !supabase || !user.id) return; setIsSyncing(true); setLoading(true); try { const uniqueItems: TVShow[] = [...allTrackedShows]; setSyncProgress({ current: 0, total: uniqueItems.length }); await supabase.from('user_calendar_events').delete().eq('user_id', user.id); let fullEpisodeList: Episode[] = []; for (let i = 0; i < uniqueItems.length; i += 3) { const batch: TVShow[] = uniqueItems.slice(i, i + 3); const batchEpisodes: Episode[] = []; await Promise.all(batch.map(async (item: TVShow) => { try { if (item.media_type === 'movie') { (await getMovieReleaseDates(item.id)).forEach(rel => { batchEpisodes.push({ id: item.id * 1000 + (rel.type === 'theatrical' ? 1 : 2), name: item.name, overview: item.overview, vote_average: item.vote_average, air_date: rel.date, episode_number: 1, season_number: 1, still_path: item.backdrop_path, show_backdrop_path: item.backdrop_path, poster_path: item.poster_path, season1_poster_path: item.poster_path ? item.poster_path : undefined, show_id: item.id, show_name: item.name, is_movie: true, release_type: rel.type }); }); } else { const details = await getShowDetails(item.id); for (const sMeta of (details.seasons || [])) { try { (await getSeasonDetails(item.id, sMeta.season_number)).episodes?.forEach(ep => { if (ep.air_date) batchEpisodes.push({ ...ep, show_id: item.id, show_name: item.name, poster_path: item.poster_path, season1_poster_path: details.poster_path, show_backdrop_path: details.backdrop_path, is_movie: false }); }); } catch (e) {} } } } catch (err) {} })); if (batchEpisodes.length > 0) { fullEpisodeList = [...fullEpisodeList, ...batchEpisodes]; await saveToCloudCalendar(batchEpisodes, user.id); } setSyncProgress(prev => ({ ...prev, current: prev.current + batch.length })); } await supabase.from('profiles').update({ full_sync_completed: true, last_full_sync: new Date().toISOString() }).eq('id', user.id); const map: Record<string, Episode[]> = {}; fullEpisodeList.forEach(ep => { if(!ep.air_date) return; if(!map[ep.air_date]) map[ep.air_date] = []; map[ep.air_date].push(ep); }); await set(DB_KEY_EPISODES, map); setEpisodes(map); setFullSyncRequired(false); } catch (e) {} finally { setIsSyncing(false); setLoading(false); } };
  
  const getAdjustedDate = (airDate: string, originCountries?: string[]): string => {
      if (!settings.timeShift || !originCountries || originCountries.length === 0 || !settings.timezone) return airDate;
      const originTz = COUNTRY_TIMEZONES[originCountries[0]];
      if (!originTz) return airDate;
      const diff = getTimezoneOffsetMinutes(settings.timezone) - getTimezoneOffsetMinutes(originTz);
      const adjusted = 1200 + diff;
      if (adjusted >= 1440) return format(addDays(parseISO(airDate), 1), 'yyyy-MM-dd');
      else if (adjusted < 0) return format(addDays(parseISO(airDate), -1), 'yyyy-MM-dd');
      return airDate;
  };

  // Fixed refreshEpisodes by adding explicit TVShow type to uniqueItems and map callbacks
  const refreshEpisodes = useCallback(async (force = false) => { 
      if (fullSyncRequired || !user || (!user.tmdbKey && !user.isCloud)) { if(!fullSyncRequired) setLoading(false); return; } 
      const lastUpdate = await get<number>(DB_KEY_META); 
      if (!user.isCloud && !force && lastUpdate && (Date.now() - lastUpdate < CACHE_DURATION)) { 
          const cached = await get<Record<string, Episode[]>>(DB_KEY_EPISODES); 
          if (cached && Object.keys(cached).length > 0) { setEpisodes(cached); setLoading(false); return; } 
      } 
      const uniqueItems: TVShow[] = Array.from(new Map(allTrackedShows.map((item: TVShow) => [item.id, item])).values());
      if (uniqueItems.length === 0) { setEpisodes({}); setLoading(false); return; } 
      if (Object.keys(episodes).length === 0) setLoading(true); 
      setIsSyncing(true); 
      try { 
          setSyncProgress({ current: 0, total: uniqueItems.length }); 
          const merge = (newEps: Episode[], countries?: string[]) => { setEpisodes(prev => { const next = { ...prev }; newEps.forEach(ep => { if (!ep.air_date) return; const dateKey = getAdjustedDate(ep.air_date, countries); const existing = next[dateKey] || []; next[dateKey] = [...existing.filter(e => !(e.show_id === ep.show_id && e.episode_number === ep.episode_number && e.season_number === ep.season_number)), ep]; }); return next; }); }; 
          let count = 0; const oneYearAgo = subYears(new Date(), 1); 
          while (count < uniqueItems.length) { 
              const batch: TVShow[] = uniqueItems.slice(count, count + 5); 
              await Promise.all(batch.map(async (item: TVShow) => { 
                  try { 
                      const batchEps: Episode[] = [];
                      if (item.media_type === 'movie') { (await getMovieReleaseDates(item.id)).forEach(rel => batchEps.push({ id: item.id * 1000 + (rel.type === 'theatrical' ? 1 : 2), name: item.name, overview: item.overview, vote_average: item.vote_average, air_date: rel.date, episode_number: 1, season_number: 1, still_path: item.backdrop_path, show_backdrop_path: item.backdrop_path, poster_path: item.poster_path, season1_poster_path: item.poster_path ? item.poster_path : undefined, show_id: item.id, show_name: item.name, is_movie: true, release_type: rel.type })); } 
                      else { 
                          const details = !item.origin_country ? (await getShowDetails(item.id)) : item;
                          const sortedSeasons = [...(details.seasons || [])].sort((a, b) => b.season_number - a.season_number); 
                          for (const sMeta of sortedSeasons) { 
                              const sData = await getSeasonDetails(item.id, sMeta.season_number); 
                              if (sData.episodes?.length > 0) { 
                                  sData.episodes.forEach(ep => { if (ep.air_date) batchEps.push({ ...ep, show_id: item.id, show_name: item.name, poster_path: item.poster_path, season1_poster_path: details.poster_path, show_backdrop_path: details.backdrop_path, is_movie: false }); }); 
                                  if (sData.episodes[sData.episodes.length - 1].air_date && parseISO(sData.episodes[sData.episodes.length - 1].air_date) < oneYearAgo) break; 
                              } 
                          } 
                      } 
                      merge(batchEps, item.origin_country); 
                  } catch (error) {} 
              })); 
              count += 5; setSyncProgress(prev => ({ ...prev, current: Math.min(count, uniqueItems.length) })); 
          } 
          setEpisodes(current => { set(DB_KEY_EPISODES, current); return current; }); 
          await set(DB_KEY_META, Date.now()); 
      } catch (e) {} finally { setLoading(false); setIsSyncing(false); } 
  }, [user, allTrackedShows, fullSyncRequired, settings.timeShift, settings.timezone]);

  const login = (u: string, k: string) => { const user: User = { username: u, tmdbKey: k, isAuthenticated: true, isCloud: false }; setUser(user); setApiToken(k); localStorage.setItem('tv_calendar_user', JSON.stringify(user)); };
  
  const loginCloud = async (session: any) => { if (!supabase) return; const { user: authUser } = session; const { data: p } = await supabase.from('profiles').select('*').eq('id', authUser.id).single(); if (p) { const user: User = { id: authUser.id, username: p.username || authUser.email, email: authUser.email, tmdbKey: p.tmdb_key || '', isAuthenticated: true, isCloud: true, traktToken: p.trakt_token, traktProfile: p.trakt_profile, fullSyncCompleted: p.full_sync_completed }; if (user && user.id && user.id !== authUser.id) { await del(DB_KEY_EPISODES); await del(DB_KEY_META); setEpisodes({}); } setUser(user); setApiToken(user.tmdbKey); if (p.settings) { const merged = { ...DEFAULT_SETTINGS, ...p.settings, ...getLocalPrefs() }; if (merged.spoilerConfig.replacementMode === undefined) merged.spoilerConfig.replacementMode = 'blur'; setSettings(merged); } const { data: w } = await supabase.from('watchlist').select('*'); if (w) setWatchlist(w.map((item: any) => ({ id: item.tmdb_id, name: item.name, poster_path: item.poster_path, backdrop_path: item.backdrop_path, overview: item.overview, first_air_date: item.first_air_date, vote_average: item.vote_average, media_type: item.media_type, number_of_seasons: item.number_of_seasons })) as TVShow[]); const { data: s } = await supabase.from('subscriptions').select('*'); if (s) { const lists: SubscribedList[] = []; for (const sub of s) { try { const d = await getListDetails(sub.list_id); lists.push({ id: sub.list_id, name: d.name, items: d.items, item_count: d.items.length }); } catch (e) {} } setSubscribedLists(lists); } const { data: ri } = await supabase.from('interactions').select('*'); const { data: rm } = await supabase.from('watched_items').select('*'); const intMap: Record<string, Interaction> = {}; const manualMap: Record<string, boolean> = {}; if (ri) ri.forEach((i: any) => { const key = i.media_type === 'episode' ? `episode-${i.tmdb_id}-${i.season_number}-${i.episode_number}` : `${i.media_type}-${i.tmdb_id}`; intMap[key] = { tmdb_id: i.tmdb_id, media_type: i.media_type, is_watched: i.is_watched, rating: i.rating, season_number: i.season_number, episode_number: i.episode_number, watched_at: i.watched_at }; }); if (rm) rm.forEach((m: any) => { const key = m.media_type === 'episode' ? `episode-${m.tmdb_id}-${m.season_number}-${m.episode_number}` : `${m.media_type}-${m.tmdb_id}`; manualMap[key] = m.is_watched; if (intMap[key]) intMap[key].is_watched = m.is_watched; else intMap[key] = { tmdb_id: m.tmdb_id, media_type: m.media_type, is_watched: m.is_watched, rating: 0, season_number: m.season_number, episode_number: m.episode_number, watched_at: m.watched_at }; }); setInteractions(intMap); manualOverridesRef.current = manualMap; const { data: r } = await supabase.from('reminders').select('*'); if (r) setReminders(r.map((row: any) => ({ id: row.id, tmdb_id: row.tmdb_id, media_type: row.media_type, show_name: row.show_name || 'Unknown', scope: row.scope, episode_season: row.episode_season, episode_number: row.episode_number, offset_minutes: row.offset_minutes }))); if (!p.full_sync_completed) { setFullSyncRequired(true); setLoading(false); } else { setLoading(true); if (user.id) { const cached = await get<Record<string, Episode[]>>(DB_KEY_EPISODES); if (cached) setEpisodes(cached); await loadCloudCalendar(user.id); } setLoading(false); } } };
  
  const reloadAccount = async () => { if (isSyncing) return; setLoading(true); try { await del(DB_KEY_EPISODES); await del(DB_KEY_META); setEpisodes({}); if (user?.isCloud && supabase) { const { data: { session } } = await supabase.auth.getSession(); if (session) await loginCloud(session); else logout(); } else await refreshEpisodes(true); } catch (e) { setLoading(false); } };
  const updateUserKey = async (k: string) => { if (user) { const updated = { ...user, tmdbKey: k }; setUser(updated); setApiToken(k); if (user.isCloud && supabase) await supabase.from('profiles').update({ tmdb_key: k }).eq('id', user.id); else localStorage.setItem('tv_calendar_user', JSON.stringify(updated)); } };
  const updateSettings = async (s: Partial<AppSettings>) => { setSettings(prev => { const updated = { ...prev, ...s, compactCalendar: true }; const localKeys = ['viewMode', 'mobileNavLayout']; const local = getLocalPrefs(); const prefs: any = { ...local }; let hasChanges = false; localKeys.forEach(k => { if (k in s) { prefs[k] = (s as any)[k]; hasChanges = true; } }); if (hasChanges) localStorage.setItem('tv_calendar_local_prefs', JSON.stringify(prefs)); const toSync = { ...updated }; localKeys.forEach(k => delete (toSync as any)[k]); if (user?.isCloud && supabase) supabase.from('profiles').update({ settings: toSync }).eq('id', user.id).then(); localStorage.setItem('tv_calendar_settings', JSON.stringify(toSync)); return updated; }); };
  const logout = async () => { if (user?.isCloud && supabase) await supabase.auth.signOut(); setUser(null); localStorage.removeItem('tv_calendar_user'); del(DB_KEY_EPISODES); del(DB_KEY_META); setWatchlist([]); setSubscribedLists([]); setEpisodes({}); setReminders([]); setInteractions({}); localStorage.removeItem('tv_calendar_interactions'); };
  const addReminder = async (r: Reminder) => { const n = { ...r, id: r.id || crypto.randomUUID() }; setReminders(prev => [...prev, n]); if (user?.isCloud && supabase) await supabase.from('reminders').insert({ user_id: user.id, tmdb_id: n.tmdb_id, media_type: n.media_type, show_name: n.show_name, scope: n.scope, episode_season: n.episode_season, episode_number: n.episode_number, offset_minutes: n.offset_minutes }); await requestNotificationPermission(); };
  const removeReminder = async (id: string) => { setReminders(prev => prev.filter(r => r.id !== id)); if (user?.isCloud && supabase) await supabase.from('reminders').delete().eq('id', id); };
  const requestNotificationPermission = async () => { if (!('Notification' in window)) return false; if (Notification.permission === 'granted') return true; return (await Notification.requestPermission()) === 'granted'; };
  
  const addToWatchlist = async (show: TVShow) => { 
      if (watchlist.find(s => s.id === show.id)) return; 
      const currentHidden = settings.hiddenItems || [];
      if (currentHidden.some(i => i.id === show.id)) updateSettings({ hiddenItems: currentHidden.filter(i => i.id !== show.id) });
      setWatchlist(prev => [...prev, show]); 
      if (user?.isCloud && supabase) await supabase.from('watchlist').upsert({ user_id: user.id, tmdb_id: show.id, media_type: show.media_type, name: show.name, poster_path: show.poster_path, backdrop_path: show.backdrop_path, overview: show.overview, first_air_date: show.first_air_date, vote_average: show.vote_average }, { onConflict: 'user_id, tmdb_id' }); 
      if (settings.reminderStrategy === 'ask') setReminderCandidate(show);
      else if (settings.reminderStrategy === 'always') await addReminder({ tmdb_id: show.id, media_type: show.media_type, show_name: show.name, scope: show.media_type === 'movie' ? 'movie_digital' : 'all', offset_minutes: 0 });
      if (window.innerWidth < 768 && !settings.suppressMobileAddWarning) setIsMobileWarningOpen(true); 
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); 
      updateTimeoutRef.current = setTimeout(() => refreshEpisodes(true), 2000); 
  };
  
  const removeFromWatchlist = async (id: number) => {
    const show = allTrackedShows.find(s => s.id === id);
    const currentHidden = settings.hiddenItems || [];
    if (!currentHidden.some(i => i.id === id)) updateSettings({ hiddenItems: [...currentHidden, { id, name: show?.name || 'Unknown' }] });
    setWatchlist(prev => prev.filter(s => s.id !== id));
    if (!subscribedLists.some(list => list.items.some(i => i.id === id))) {
        setEpisodes(prev => { const next = { ...prev }; Object.keys(next).forEach(k => { next[k] = next[k].filter(ep => ep.show_id !== id); if (next[k].length === 0) delete next[k]; }); return next; });
        if (user?.isCloud && supabase) { supabase.from('watchlist').delete().match({ user_id: user.id, tmdb_id: id }).then(); supabase.from('user_calendar_events').delete().match({ user_id: user.id, tmdb_id: id }).then(); }
    } else if (user?.isCloud && supabase) supabase.from('watchlist').delete().match({ user_id: user.id, tmdb_id: id }).then();
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => refreshEpisodes(true), 2000);
  };

  const unhideShow = (id: number) => { updateSettings({ hiddenItems: (settings.hiddenItems || []).filter(i => i.id !== id) }); if (user?.traktToken) syncTraktData(true); };
  const batchAddShows = async (shows: TVShow[]) => { const current = new Set(watchlist.map(s => s.id)); const hidden = new Set((settings.hiddenItems || []).map(i => i.id)); const filtered = shows.filter(s => !current.has(s.id) && !hidden.has(s.id)); if (filtered.length === 0) return; setWatchlist(prev => [...prev, ...filtered]); if (user?.isCloud && supabase) { const rows = filtered.map(s => ({ user_id: user.id, tmdb_id: s.id, media_type: s.media_type, name: s.name, poster_path: s.poster_path, backdrop_path: s.backdrop_path, overview: s.overview, first_air_date: s.first_air_date, vote_average: s.vote_average })); await supabase.from('watchlist').upsert(rows, { onConflict: 'user_id, tmdb_id' }); } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => refreshEpisodes(true), 2000); };
  const subscribeToList = async (listId: string) => { if (subscribedLists.some(l => l.id === listId)) return; try { const d = await getListDetails(listId); const n: SubscribedList = { id: listId, name: d.name, items: d.items, item_count: d.items.length }; setSubscribedLists(prev => [...prev, n]); if (user?.isCloud && supabase) await supabase.from('subscriptions').upsert({ user_id: user.id, list_id: listId, name: d.name, item_count: d.items.length }, { onConflict: 'user_id, list_id' }); if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => refreshEpisodes(true), 2000); } catch (e) { throw e; } };
  const unsubscribeFromList = async (id: string) => { const list = subscribedLists.find(l => l.id === id); const next = subscribedLists.filter(l => l.id !== id); setSubscribedLists(next); if (list) { const purge = list.items.filter(s => !watchlist.some(w => w.id === s.id) && !next.some(l => l.items.some(i => i.id === s.id))).map(s => s.id); if (purge.length > 0) { setEpisodes(prev => { const n = { ...prev }; Object.keys(n).forEach(k => { n[k] = n[k].filter(e => !e.show_id || !purge.includes(e.show_id)); if (n[k].length === 0) delete n[k]; }); return n; }); if (user?.isCloud && supabase) supabase.from('user_calendar_events').delete().in('tmdb_id', purge).eq('id', user.id).then(); } } if (user?.isCloud && supabase) await supabase.from('subscriptions').delete().match({ user_id: user.id, list_id: id }); if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => refreshEpisodes(true), 2000); };
  const batchSubscribe = async (lists: SubscribedList[]) => { const current = new Set(subscribedLists.map(l => l.id)); const fresh = lists.filter(l => !current.has(l.id)); if (fresh.length === 0) return; setSubscribedLists(prev => [...prev, ...fresh]); if (user?.isCloud && supabase) { const rows = fresh.map(l => ({ user_id: user.id, list_id: l.id, name: l.name, item_count: l.item_count })); await supabase.from('subscriptions').upsert(rows, { onConflict: 'user_id, list_id' }); } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => refreshEpisodes(true), 2000); };
  const importBackup = (d: any) => { if (user?.isCloud) { uploadBackupToCloud(d); return; } if (Array.isArray(d)) setWatchlist(d); else if (typeof d === 'object' && d !== null) { if (d.user?.username && d.user?.tmdbKey) setUser({ ...d.user, isAuthenticated: true, isCloud: false }); if (d.settings) updateSettings(d.settings); if (d.subscribedLists) setSubscribedLists(d.subscribedLists); if (d.watchlist) setWatchlist(d.watchlist); if (d.reminders) setReminders(d.reminders); if (d.interactions) setInteractions(d.interactions); } };
  const uploadBackupToCloud = async (d: any) => { if (!user?.isCloud || !supabase) return; setLoading(true); try { let k = user.tmdbKey; let s = settings; if (d.user?.tmdbKey) k = d.user.tmdbKey; if (d.settings) s = { ...settings, ...d.settings }; await supabase.from('profiles').update({ tmdb_key: k, settings: s }).eq('id', user.id); setUser(prev => prev ? ({ ...prev, tmdbKey: k }) : null); setApiToken(k); setSettings(s); let items = Array.isArray(d) ? d : (d.watchlist || []); if (items.length > 0) await batchAddShows(items); if (d.subscribedLists) await batchSubscribe(d.subscribedLists); } catch (e) {} finally { setLoading(false); } };
  const getSyncPayload = useCallback(() => LZString.compressToEncodedURIComponent(JSON.stringify({ user: { username: user?.username, tmdbKey: user?.tmdbKey, isCloud: user?.isCloud }, watchlist: watchlist.map(i => ({ id: i.id, type: i.media_type })), lists: subscribedLists.map(l => l.id), settings: { ...settings }, interactions })), [user, watchlist, subscribedLists, settings, interactions]);
  const processSyncPayload = useCallback(async (p: string) => { try { const json = LZString.decompressFromEncodedURIComponent(p); if (!json) throw new Error(); const data = JSON.parse(json); if (data.user) { const n: User = { ...data.user, isAuthenticated: true }; setUser(n); setApiToken(n.tmdbKey); if (!n.isCloud) localStorage.setItem('tv_calendar_user', JSON.stringify(n)); } if (data.settings) updateSettings(data.settings); if (data.interactions) { setInteractions(data.interactions); if (!data.user?.isCloud) localStorage.setItem('tv_calendar_interactions', JSON.stringify(data.interactions)); } if (data.watchlist) { setLoading(true); const shows: TVShow[] = []; for (const item of data.watchlist) try { shows.push(item.type === 'movie' ? await getMovieDetails(item.id) : await getShowDetails(item.id)); } catch (e) {} await batchAddShows(shows); } if (data.lists) for (const lid of data.lists) await subscribeToList(lid); setTimeout(() => window.location.reload(), 500); } catch (e) { setLoading(false); } }, [batchAddShows, subscribeToList, updateSettings]);
  const closeMobileWarning = (s: boolean) => { setIsMobileWarningOpen(false); if (s) updateSettings({ suppressMobileAddWarning: true }); };

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
      fullSyncRequired, performFullSync
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
