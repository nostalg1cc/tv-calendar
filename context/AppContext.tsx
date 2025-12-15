import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList, Reminder, Interaction, TraktProfile } from '../types';
import { getShowDetails, getSeasonDetails, getMovieDetails, getMovieReleaseDates, getListDetails, setApiToken } from '../services/tmdb';
import { get, set, del } from 'idb-keyval';
import { format, subYears, parseISO, isSameDay, subMinutes } from 'date-fns';
import LZString from 'lz-string';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getDeviceCode, pollToken, getWatchedHistory, getTraktProfile, getShowProgress } from '../services/trakt';

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
  isSyncing: boolean; 
  syncProgress: { current: number; total: number }; 
  refreshEpisodes: (force?: boolean) => Promise<void>;
  loadArchivedEvents: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  
  // Reminders
  reminders: Reminder[];
  addReminder: (reminder: Reminder) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  
  // Interactions
  interactions: Record<string, Interaction>; 
  toggleWatched: (id: number, mediaType: 'tv' | 'movie') => Promise<void>;
  toggleEpisodeWatched: (showId: number, season: number, episode: number) => Promise<void>;
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

  // Trakt
  traktAuth: (clientId: string, clientSecret: string) => Promise<any>;
  traktPoll: (deviceCode: string, clientId: string, clientSecret: string) => Promise<any>;
  saveTraktToken: (tokenData: any) => Promise<void>;
  disconnectTrakt: () => Promise<void>;
  syncTraktData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ... (DEFAULT_SETTINGS and THEMES remain unchanged)
const DEFAULT_SETTINGS: AppSettings = {
  hideSpoilers: false,
  hideTheatrical: false,
  recommendationsEnabled: true,
  recommendationMethod: 'banner',
  compactCalendar: true, 
  viewMode: 'grid', 
  suppressMobileAddWarning: false,
  calendarPosterFillMode: 'cover',
  useSeason1Art: false,
  cleanGrid: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  theme: 'default',
  customThemeColor: '#6366f1'
};

export const THEMES: Record<string, Record<string, string>> = {
    default: { '50': '238 242 255', '100': '224 231 255', '200': '199 210 254', '300': '165 180 252', '400': '129 140 248', '500': '99 102 241', '600': '79 70 229', '700': '67 56 202', '800': '55 48 163', '900': '49 46 129', '950': '30 27 75' },
    emerald: { '50': '236 253 245', '100': '209 250 229', '200': '167 243 208', '300': '110 231 183', '400': '52 211 153', '500': '16 185 129', '600': '5 150 105', '700': '4 120 87', '800': '6 95 70', '900': '6 78 59', '950': '2 44 34' },
    rose: { '50': '255 241 242', '100': '255 228 230', '200': '254 205 211', '300': '253 164 175', '400': '251 113 133', '500': '244 63 94', '600': '225 29 72', '700': '190 18 60', '800': '159 18 57', '900': '136 19 55', '950': '76 5 25' },
    amber: { '50': '255 251 235', '100': '254 243 199', '200': '253 230 138', '300': '252 211 77', '400': '251 191 36', '500': '245 158 11', '600': '217 119 6', '700': '180 83 9', '800': '146 64 14', '900': '120 53 15', '950': '69 26 3' },
    cyan: { '50': '236 254 255', '100': '207 250 254', '200': '165 243 252', '300': '103 232 249', '400': '34 211 238', '500': '6 182 212', '600': '8 145 178', '700': '14 116 144', '800': '21 94 117', '900': '22 78 99', '950': '8 51 68' },
    violet: { '50': '245 243 255', '100': '237 233 254', '200': '221 214 254', '300': '196 181 253', '400': '167 139 250', '500': '139 92 246', '600': '124 58 237', '700': '109 40 217', '800': '91 33 182', '900': '76 29 149', '950': '46 16 101' }
};

// ... (Color Utilities)
const hexToRgb = (hex: string) => { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 99, g: 102, b: 241 }; };
const mixColor = (color: {r: number, g: number, b: number}, mixColor: {r: number, g: number, b: number}, weight: number) => { const w = weight / 100; const w2 = 1 - w; return { r: Math.round(color.r * w2 + mixColor.r * w), g: Math.round(color.g * w2 + mixColor.g * w), b: Math.round(color.b * w2 + mixColor.b * w) }; };
const generatePaletteFromHex = (hex: string): Record<string, string> => { const base = hexToRgb(hex); const white = { r: 255, g: 255, b: 255 }; const black = { r: 0, g: 0, b: 0 }; const darkest = { r: 5, g: 5, b: 15 }; const palette: Record<string, string> = {}; const tints = [{ shade: '50', weight: 95 }, { shade: '100', weight: 90 }, { shade: '200', weight: 70 }, { shade: '300', weight: 50 }, { shade: '400', weight: 30 }]; tints.forEach(t => { const c = mixColor(base, white, t.weight); palette[t.shade] = `${c.r} ${c.g} ${c.b}`; }); palette['500'] = `${base.r} ${base.g} ${base.b}`; const shades = [{ shade: '600', weight: 10 }, { shade: '700', weight: 30 }, { shade: '800', weight: 50 }, { shade: '900', weight: 70 }]; shades.forEach(s => { const c = mixColor(base, black, s.weight); palette[s.shade] = `${c.r} ${c.g} ${c.b}`; }); const c950 = mixColor(base, darkest, 80); palette['950'] = `${c950.r} ${c950.g} ${c950.b}`; return palette; };

const CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 hours
const DB_KEY_EPISODES = 'tv_calendar_episodes_v2'; 
const DB_KEY_META = 'tv_calendar_meta_v2';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(() => { try { return localStorage.getItem('tv_calendar_user') ? JSON.parse(localStorage.getItem('tv_calendar_user')!) : null; } catch { return null; } });
  useEffect(() => { if (user?.tmdbKey) setApiToken(user.tmdbKey); }, [user]);
  
  // --- Settings State ---
  const [settings, setSettings] = useState<AppSettings>(() => { try { const saved = localStorage.getItem('tv_calendar_settings'); const loaded = saved ? JSON.parse(saved) : DEFAULT_SETTINGS; return { ...DEFAULT_SETTINGS, ...loaded, compactCalendar: true }; } catch { return DEFAULT_SETTINGS; } });
  
  // --- Theme Application ---
  useEffect(() => { const themeKey = settings.theme || 'default'; let themeColors: Record<string, string>; if (themeKey === 'custom' && settings.customThemeColor) { themeColors = generatePaletteFromHex(settings.customThemeColor); } else { themeColors = THEMES[themeKey] || THEMES.default; } const root = document.documentElement; Object.entries(themeColors).forEach(([shade, value]) => { root.style.setProperty(`--theme-${shade}`, value); }); }, [settings.theme, settings.customThemeColor]);

  // --- Data State ---
  const [watchlist, setWatchlist] = useState<TVShow[]>(() => { try { return JSON.parse(localStorage.getItem('tv_calendar_watchlist') || '[]'); } catch { return []; } });
  const [subscribedLists, setSubscribedLists] = useState<SubscribedList[]>(() => { try { return JSON.parse(localStorage.getItem('tv_calendar_subscribed_lists') || '[]'); } catch { return []; } });
  const [reminders, setReminders] = useState<Reminder[]>(() => { try { return JSON.parse(localStorage.getItem('tv_calendar_reminders') || '[]'); } catch { return []; } });
  const [interactions, setInteractions] = useState<Record<string, Interaction>>(() => { try { return JSON.parse(localStorage.getItem('tv_calendar_interactions') || '{}'); } catch { return {}; } });

  const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileWarningOpen, setIsMobileWarningOpen] = useState(false);
  const [reminderCandidate, setReminderCandidate] = useState<TVShow | Episode | null>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Derived State ---
  const allTrackedShows = useMemo(() => {
      const map = new Map<number, TVShow>();
      watchlist.forEach(show => map.set(show.id, show));
      subscribedLists.forEach(list => { list.items.forEach(show => { if (!map.has(show.id)) map.set(show.id, show); }); });
      return Array.from(map.values());
  }, [watchlist, subscribedLists]);

  // --- Effects ---
  useEffect(() => {
      if (isSupabaseConfigured() && supabase) {
          supabase.auth.getSession().then(({ data: { session } }) => { if (session) loginCloud(session); });
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
              if (session && (!user || !user.isCloud)) loginCloud(session); else if (!session && user?.isCloud) logout();
          });
          return () => subscription.unsubscribe();
      }
  }, []);

  useEffect(() => {
    if (user && !user.isCloud) {
        localStorage.setItem('tv_calendar_watchlist', JSON.stringify(watchlist));
        localStorage.setItem('tv_calendar_subscribed_lists', JSON.stringify(subscribedLists));
        localStorage.setItem('tv_calendar_settings', JSON.stringify(settings));
        localStorage.setItem('tv_calendar_reminders', JSON.stringify(reminders));
        localStorage.setItem('tv_calendar_interactions', JSON.stringify(interactions));
        localStorage.setItem('tv_calendar_user', JSON.stringify(user)); // Save Trakt tokens etc
    }
  }, [watchlist, subscribedLists, settings, user, reminders, interactions]);

  // --- TRAKT METHODS ---
  // ... (Existing Trakt Methods) ...
  const traktAuth = async (clientId: string, clientSecret: string) => { return await getDeviceCode(clientId); };
  const traktPoll = async (deviceCode: string, clientId: string, clientSecret: string) => { return await pollToken(deviceCode, clientId, clientSecret); };
  const saveTraktToken = async (tokenData: any) => { if (!user) return; try { const profile = await getTraktProfile(tokenData.access_token); const updatedUser: User = { ...user, traktToken: { ...tokenData, created_at: Date.now() / 1000 }, traktProfile: profile }; setUser(updatedUser); if (user.isCloud && supabase) { await supabase.from('profiles').update({ trakt_token: updatedUser.traktToken, trakt_profile: profile }).eq('id', user.id); } else { localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser)); } } catch (e) { console.error("Failed to fetch Trakt profile", e); } };
  const disconnectTrakt = async () => { if (!user) return; const updatedUser = { ...user, traktToken: undefined, traktProfile: undefined }; setUser(updatedUser); if (user.isCloud && supabase) { await supabase.from('profiles').update({ trakt_token: null, trakt_profile: null }).eq('id', user.id); } else { localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser)); } };
  const syncTraktData = async () => { /* ... existing logic ... */
      if (!user?.traktToken) return;
      setLoading(true);
      setIsSyncing(true);
      try {
          const token = user.traktToken.access_token;
          const [movieHistory, showHistory] = await Promise.all([getWatchedHistory(token, 'movies'), getWatchedHistory(token, 'shows')]);
          let newInteractions = { ...interactions };
          let newShowsToAdd: TVShow[] = [];
          const currentShowIds = new Set(allTrackedShows.map(s => s.id));
          for (const item of movieHistory) { const tmdbId = item.movie.ids.tmdb; if (!tmdbId) continue; newInteractions[`movie-${tmdbId}`] = { tmdb_id: tmdbId, media_type: 'movie', is_watched: true, rating: 0, watched_at: item.last_watched_at }; if (!currentShowIds.has(tmdbId)) { try { const details = await getMovieDetails(tmdbId); newShowsToAdd.push(details); currentShowIds.add(tmdbId); } catch (e) {} } }
          for (const item of showHistory) { const tmdbId = item.show.ids.tmdb; if (!tmdbId) continue; if (!currentShowIds.has(tmdbId)) { try { const details = await getShowDetails(tmdbId); newShowsToAdd.push(details); currentShowIds.add(tmdbId); } catch (e) {} } }
          const recentShows = showHistory.slice(0, 5); 
          for (const item of recentShows) { const tmdbId = item.show.ids.tmdb; if (!tmdbId) continue; try { const progress = await getShowProgress(token, item.show.ids.trakt); if (progress && progress.seasons) { progress.seasons.forEach((season: any) => { season.episodes.forEach((ep: any) => { if (ep.completed) { const key = `episode-${tmdbId}-${season.number}-${ep.number}`; newInteractions[key] = { tmdb_id: tmdbId, media_type: 'episode', is_watched: true, season_number: season.number, episode_number: ep.number, rating: 0, watched_at: ep.last_watched_at }; } }); }); } } catch (e) {} }
          setInteractions(newInteractions);
          if (user.isCloud && supabase) {
              const updates = Object.values(newInteractions).map(interaction => ({ user_id: user.id, tmdb_id: interaction.tmdb_id, media_type: interaction.media_type, is_watched: interaction.is_watched, rating: interaction.rating, season_number: interaction.season_number, episode_number: interaction.episode_number, watched_at: interaction.watched_at || new Date().toISOString() }));
              if (updates.length > 0) { for (let i = 0; i < updates.length; i += 100) { const batch = updates.slice(i, i + 100); await supabase.from('interactions').upsert(batch, { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' }); } }
          }
          if (newShowsToAdd.length > 0) { await batchAddShows(newShowsToAdd); }
          alert(`Sync Complete! Added ${newShowsToAdd.length} new items and updated watched status.`);
      } catch (e) { console.error("Trakt Sync Error", e); alert("Trakt sync encountered an error. Check console."); } finally { setLoading(false); setIsSyncing(false); }
  };

  const toggleWatched = async (id: number, mediaType: 'tv' | 'movie') => { const key = `${mediaType}-${id}`; const current = interactions[key] || { tmdb_id: id, media_type: mediaType, is_watched: false, rating: 0 }; const updated = { ...current, is_watched: !current.is_watched, watched_at: !current.is_watched ? new Date().toISOString() : undefined }; setInteractions(prev => ({ ...prev, [key]: updated })); if (user?.isCloud && supabase) { await supabase.from('interactions').upsert({ user_id: user.id, tmdb_id: id, media_type: mediaType, is_watched: updated.is_watched, rating: updated.rating, updated_at: new Date().toISOString() }, { onConflict: 'user_id, tmdb_id, media_type' }); } };
  const toggleEpisodeWatched = async (showId: number, season: number, episode: number) => { 
      const key = `episode-${showId}-${season}-${episode}`; 
      const current = interactions[key] || { tmdb_id: showId, media_type: 'episode', is_watched: false, rating: 0, season_number: season, episode_number: episode }; 
      const updated = { ...current, is_watched: !current.is_watched, watched_at: !current.is_watched ? new Date().toISOString() : undefined }; 
      setInteractions(prev => ({ ...prev, [key]: updated })); 
      if (user?.isCloud && supabase) {
          await supabase.from('interactions').upsert({
              user_id: user.id,
              tmdb_id: showId,
              media_type: 'episode',
              is_watched: updated.is_watched,
              rating: updated.rating,
              season_number: season,
              episode_number: episode,
              watched_at: updated.watched_at || new Date().toISOString()
          }, { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' });
      }
  };
  const setRating = async (id: number, mediaType: 'tv' | 'movie', rating: number) => { const key = `${mediaType}-${id}`; const current = interactions[key] || { tmdb_id: id, media_type: mediaType, is_watched: false, rating: 0 }; const updated = { ...current, rating: rating }; setInteractions(prev => ({ ...prev, [key]: updated })); if (user?.isCloud && supabase) { await supabase.from('interactions').upsert({ user_id: user.id, tmdb_id: id, media_type: mediaType, is_watched: updated.is_watched, rating: updated.rating, updated_at: new Date().toISOString() }, { onConflict: 'user_id, tmdb_id, media_type' }); } };

  // --- CLOUD CALENDAR HELPERS ---
  const mapDbToEpisode = (row: any): Episode => ({
      id: row.id,
      show_id: row.tmdb_id,
      show_name: row.title,
      name: row.episode_name || row.title, 
      overview: row.overview || '',
      vote_average: row.vote_average || 0,
      air_date: row.air_date,
      episode_number: row.episode_number,
      season_number: row.season_number,
      still_path: row.backdrop_path, 
      poster_path: row.poster_path,
      is_movie: row.media_type === 'movie',
      release_type: row.release_type as any
  });

  const loadCloudCalendar = async (userId: string) => {
      if (!supabase) return;
      try {
          const oneYearAgo = subYears(new Date(), 1).toISOString();
          
          // Load Future + Recent Past (1 Year Cap)
          const { data, error } = await supabase
            .from('user_calendar_events')
            .select('*')
            .eq('user_id', userId)
            .gte('air_date', oneYearAgo);

          if (error) throw error;
          
          if (data && data.length > 0) {
              const newEpisodes: Record<string, Episode[]> = {};
              data.forEach((row: any) => {
                  const dateKey = row.air_date;
                  if (!dateKey) return;
                  if (!newEpisodes[dateKey]) newEpisodes[dateKey] = [];
                  newEpisodes[dateKey].push(mapDbToEpisode(row));
              });
              setEpisodes(newEpisodes);
          }
      } catch (e) {
          console.error("Failed to load cloud calendar", e);
      }
  };

  // Manual trigger to load older data
  const loadArchivedEvents = async () => {
      if (!user?.isCloud || !supabase) return;
      setLoading(true);
      try {
          const oneYearAgo = subYears(new Date(), 1).toISOString();
          
          const { data, error } = await supabase
            .from('user_calendar_events')
            .select('*')
            .eq('user_id', user.id)
            .lt('air_date', oneYearAgo);

          if (error) throw error;

          if (data && data.length > 0) {
              setEpisodes(prev => {
                  const next = { ...prev };
                  data.forEach((row: any) => {
                      const dateKey = row.air_date;
                      if (!dateKey) return;
                      // Avoid dupes if already loaded
                      if (!next[dateKey]) next[dateKey] = [];
                      const exists = next[dateKey].some(e => e.show_id === row.tmdb_id && e.season_number === row.season_number && e.episode_number === row.episode_number);
                      if (!exists) {
                          next[dateKey].push(mapDbToEpisode(row));
                      }
                  });
                  return next;
              });
          }
      } catch (e) {
          console.error("Archive load failed", e);
      } finally {
          setLoading(false);
      }
  };

  const saveToCloudCalendar = async (episodesList: Episode[], userId: string) => {
      if (!supabase || episodesList.length === 0) return;
      
      const rows = episodesList.map(ep => ({
          user_id: userId,
          tmdb_id: ep.show_id || ep.id,
          media_type: ep.is_movie ? 'movie' : 'tv',
          season_number: ep.season_number || -1,
          episode_number: ep.episode_number || -1,
          title: ep.show_name || ep.name, // Show Name
          episode_name: ep.name, // Episode Name
          overview: ep.overview, 
          air_date: ep.air_date,
          poster_path: ep.poster_path,
          backdrop_path: ep.still_path, 
          vote_average: ep.vote_average,
          release_type: ep.release_type
      }));

      // Upsert in batches
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          await supabase.from('user_calendar_events').upsert(batch, { 
              onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' 
          });
      }
  };

  // --- Optimized RefreshEpisodes (Cloud & Local) ---
  const refreshEpisodes = useCallback(async (force = false) => { 
      if (!user || (!user.tmdbKey && !user.isCloud)) { setLoading(false); return; } 
      
      const lastUpdate = await get<number>(DB_KEY_META); 
      const now = Date.now(); 
      const itemsToProcess = [...allTrackedShows]; 
      
      if (itemsToProcess.length === 0) { 
          setEpisodes({}); 
          setLoading(false); 
          return; 
      } 
      
      // Cache Check (Local Mode Only)
      if (!user.isCloud && !force && lastUpdate && (now - lastUpdate < CACHE_DURATION)) { 
          const cachedEps = await get<Record<string, Episode[]>>(DB_KEY_EPISODES); 
          if (cachedEps && Object.keys(cachedEps).length > 0) { 
              setEpisodes(cachedEps); 
              setLoading(false); 
              return; 
          } 
      } 
      
      // Force Loading state for empty calendar
      if (Object.keys(episodes).length === 0) { setLoading(true); } 
      setIsSyncing(true); 
      
      try { 
          const processedIds = new Set<number>(); 
          const uniqueItems: TVShow[] = []; 
          itemsToProcess.forEach(item => { if (!processedIds.has(item.id)) { processedIds.add(item.id); uniqueItems.push(item); } }); 
          
          setSyncProgress({ current: 0, total: uniqueItems.length }); 
          
          let metadataUpdated = false; 
          const updatedWatchlistMap = new Map<number, TVShow>(); 
          watchlist.forEach(w => updatedWatchlistMap.set(w.id, w)); 
          
          // Helper to merge episodes incrementally
          const mergeNewEpisodes = (newEps: Episode[]) => {
               setEpisodes(prev => {
                   const next = { ...prev };
                   newEps.forEach(ep => {
                       if (!ep.air_date) return;
                       const dateKey = ep.air_date;
                       const existing = next[dateKey] || [];
                       const others = existing.filter(e => !(e.show_id === ep.show_id && e.episode_number === ep.episode_number && e.season_number === ep.season_number));
                       next[dateKey] = [...others, ep];
                   });
                   return next;
               });
          };

          let processedCount = 0; 
          const safetyTimeout = setTimeout(() => setLoading(false), 8000);
          const oneYearAgo = subYears(new Date(), 1);

          while (processedCount < uniqueItems.length) { 
              const currentBatchSize = processedCount === 0 ? 3 : 5; 
              const batch = uniqueItems.slice(processedCount, processedCount + currentBatchSize); 
              
              const batchEpisodes: Episode[] = [];

              await Promise.all(batch.map(async (item) => { 
                  try { 
                      if (item.media_type === 'movie') { 
                          const releaseDates = await getMovieReleaseDates(item.id); 
                          releaseDates.forEach(rel => { 
                              batchEpisodes.push({ id: item.id * 1000 + (rel.type === 'theatrical' ? 1 : 2), name: item.name, overview: item.overview, vote_average: item.vote_average, air_date: rel.date, episode_number: 1, season_number: 1, still_path: item.backdrop_path, poster_path: item.poster_path, season1_poster_path: item.poster_path ? item.poster_path : undefined, show_id: item.id, show_name: item.name, is_movie: true, release_type: rel.type }); 
                          }); 
                      } else { 
                          let seasonCount = item.number_of_seasons; 
                          let details = item;
                          
                          try { 
                              details = await getShowDetails(item.id); 
                              seasonCount = details.number_of_seasons; 
                              if (updatedWatchlistMap.has(item.id)) { 
                                  const existing = updatedWatchlistMap.get(item.id)!; 
                                  updatedWatchlistMap.set(item.id, { ...existing, number_of_seasons: seasonCount }); 
                                  metadataUpdated = true; 
                              } 
                          } catch { /* use cached */ } 
                          
                          let s1Poster = details.poster_path;
                          if (settings.useSeason1Art) {
                             const s1 = details.seasons?.find(s => s.season_number === 1);
                             if (s1?.poster_path) s1Poster = s1.poster_path;
                          }

                          const seasonsMeta = details.seasons || [];
                          // Sort descending (Latest First)
                          const sortedSeasons = [...seasonsMeta].sort((a, b) => b.season_number - a.season_number);
                          
                          // Smart Fetch Logic: Fetch Latest Seasons first.
                          // Stop fetching when we hit a season entirely in the deep past (> 1 year ago)
                          for (const sMeta of sortedSeasons) {
                              try {
                                  const sData = await getSeasonDetails(item.id, sMeta.season_number);
                                  if (sData.episodes && sData.episodes.length > 0) {
                                      // Check if this season is too old to care about for the sync
                                      // We check the LAST episode of the season. If it aired > 1 year ago, we stop traversing back.
                                      // NOTE: We still add it if it's the *only* season, or if we haven't hit the limit yet.
                                      const lastEpDate = sData.episodes[sData.episodes.length - 1].air_date;
                                      
                                      // Add episodes to batch
                                      sData.episodes.forEach(ep => {
                                          if (ep.air_date) batchEpisodes.push({ ...ep, show_id: item.id, show_name: item.name, poster_path: item.poster_path, season1_poster_path: s1Poster, is_movie: false }); 
                                      });

                                      // Optimization: Stop fetching older seasons if this season finished airing over a year ago.
                                      // Exception: If user manually requested "archive", we wouldn't be here (this is sync).
                                      if (lastEpDate && parseISO(lastEpDate) < oneYearAgo) {
                                          break; // Stop fetching earlier seasons for this show
                                      }
                                  }
                              } catch (e) {}
                          }
                      } 
                  } catch (error) { console.error(`Error processing ${item.name}`, error); } 
              })); 
              
              // Push this batch to UI immediately
              mergeNewEpisodes(batchEpisodes);
              
              // CLOUD SYNC: Save batch to Supabase
              if (user.isCloud && supabase) {
                  await saveToCloudCalendar(batchEpisodes, user.id);
              }

              if (processedCount === 0) {
                  setLoading(false);
                  clearTimeout(safetyTimeout);
              }
              
              processedCount += currentBatchSize; 
              setSyncProgress(prev => ({ ...prev, current: Math.min(processedCount, uniqueItems.length) })); 
          } 
          
          if (!user.isCloud) {
              setEpisodes(current => {
                  set(DB_KEY_EPISODES, current); 
                  return current;
              });
              await set(DB_KEY_META, Date.now()); 
          }
          
          if (metadataUpdated) { 
              const newWatchlist = Array.from(updatedWatchlistMap.values()); 
              setWatchlist(newWatchlist); 
              if (user?.isCloud && supabase) { 
                  const rows = newWatchlist.map(show => ({ user_id: user.id, tmdb_id: show.id, media_type: show.media_type, name: show.name, poster_path: show.poster_path, backdrop_path: show.backdrop_path, overview: show.overview, first_air_date: show.first_air_date, vote_average: show.vote_average, number_of_seasons: show.number_of_seasons })); 
                  await supabase.from('watchlist').upsert(rows, { onConflict: 'user_id, tmdb_id' }); 
              } 
          } 
      } catch (e) { 
          console.error("Refresh failed", e); 
      } finally { 
          setLoading(false); 
          setIsSyncing(false); 
      } 
  }, [user, allTrackedShows, watchlist, episodes, settings.useSeason1Art]);

  // --- Auto-Refresh Effect ---
  useEffect(() => {
      if (user?.isAuthenticated) {
          const timer = setTimeout(() => {
              refreshEpisodes();
          }, 100);
          return () => clearTimeout(timer);
      }
  }, [user?.isAuthenticated, user?.tmdbKey, user?.isCloud]);

  const login = (username: string, apiKey: string) => { const newUser: User = { username, tmdbKey: apiKey, isAuthenticated: true, isCloud: false }; setUser(newUser); setApiToken(apiKey); localStorage.setItem('tv_calendar_user', JSON.stringify(newUser)); };
  
  // MODIFIED LOGIN CLOUD
  const loginCloud = async (session: any) => { 
      if (!supabase) return; 
      const { user: authUser } = session; 
      
      const { data: profile } = await supabase.from('profiles').select('username, tmdb_key, settings, trakt_token, trakt_profile').eq('id', authUser.id).single(); 
      
      if (profile) { 
          const newUser: User = { id: authUser.id, username: profile.username || authUser.email, email: authUser.email, tmdbKey: profile.tmdb_key || '', isAuthenticated: true, isCloud: true, traktToken: profile.trakt_token, traktProfile: profile.trakt_profile }; 
          
          if (user && user.id && user.id !== authUser.id) { 
              await del(DB_KEY_EPISODES); 
              await del(DB_KEY_META); 
              setEpisodes({}); 
          } 
          
          setUser(newUser); 
          setApiToken(newUser.tmdbKey); 
          if (profile.settings) setSettings(profile.settings); 
          
          // 2. IMMEDIATE LOAD: Load Cached Calendar Events from DB
          setLoading(true);
          await loadCloudCalendar(newUser.id!);

          // 3. Load other data in background
          const { data: remoteWatchlist } = await supabase.from('watchlist').select('*'); 
          if (remoteWatchlist) { 
              const loadedWatchlist = remoteWatchlist.map((item: any) => ({ id: item.tmdb_id, name: item.name, poster_path: item.poster_path, backdrop_path: item.backdrop_path, overview: item.overview, first_air_date: item.first_air_date, vote_average: item.vote_average, media_type: item.media_type, number_of_seasons: item.number_of_seasons })) as TVShow[]; 
              setWatchlist(loadedWatchlist); 
          } 
          const { data: remoteSubs } = await supabase.from('subscriptions').select('*'); 
          if (remoteSubs) { 
              const loadedLists: SubscribedList[] = []; 
              for (const sub of remoteSubs) { try { const listDetails = await getListDetails(sub.list_id); loadedLists.push({ id: sub.list_id, name: listDetails.name, items: listDetails.items, item_count: listDetails.items.length }); } catch (e) { console.error(e); } } 
              setSubscribedLists(loadedLists); 
          } 
          const { data: remoteReminders } = await supabase.from('reminders').select('*'); 
          if (remoteReminders) { 
              setReminders(remoteReminders.map((r: any) => ({ id: r.id, tmdb_id: r.tmdb_id, media_type: r.media_type, scope: r.scope, episode_season: r.episode_season, episode_number: r.episode_number, offset_minutes: r.offset_minutes }))); 
          } 
          const { data: remoteInteractions } = await supabase.from('interactions').select('*'); 
          if (remoteInteractions) { 
              const intMap: Record<string, Interaction> = {}; 
              (remoteInteractions as any[]).forEach((i) => { 
                  if (i.media_type === 'episode') {
                      intMap[`episode-${i.tmdb_id}-${i.season_number}-${i.episode_number}`] = { tmdb_id: i.tmdb_id, media_type: 'episode', is_watched: i.is_watched, rating: i.rating, season_number: i.season_number, episode_number: i.episode_number, watched_at: i.watched_at };
                  } else {
                      intMap[`${i.media_type}-${i.tmdb_id}`] = { tmdb_id: i.tmdb_id, media_type: i.media_type, is_watched: i.is_watched, rating: i.rating, watched_at: i.watched_at }; 
                  }
              }); 
              setInteractions(intMap); 
          } 
          
          setLoading(false); 
      } 
  };

  const reloadAccount = async () => { if (isSyncing) return; setLoading(true); try { await del(DB_KEY_EPISODES); await del(DB_KEY_META); setEpisodes({}); if (user?.isCloud && supabase) { const { data: { session } } = await supabase.auth.getSession(); if (session) { await loginCloud(session); } else { logout(); } } else { await refreshEpisodes(true); } } catch (e) { console.error("Reload failed", e); setLoading(false); } };
  const updateUserKey = async (apiKey: string) => { if (user) { const updatedUser = { ...user, tmdbKey: apiKey }; setUser(updatedUser); setApiToken(apiKey); if (user.isCloud && supabase) { await supabase.from('profiles').update({ tmdb_key: apiKey }).eq('id', user.id); } else { localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser)); } } };
  const updateSettings = async (newSettings: Partial<AppSettings>) => { setSettings(prev => { const updated = { ...prev, ...newSettings, compactCalendar: true }; if (user?.isCloud && supabase) { supabase.from('profiles').update({ settings: updated }).eq('id', user.id).then(); } return updated; }); };
  const logout = async () => { if (user?.isCloud && supabase) { await supabase.auth.signOut(); } setUser(null); localStorage.removeItem('tv_calendar_user'); del(DB_KEY_EPISODES); del(DB_KEY_META); setWatchlist([]); setSubscribedLists([]); setEpisodes({}); setReminders([]); setInteractions({}); localStorage.removeItem('tv_calendar_interactions'); };
  const addReminder = async (reminder: Reminder) => { const newReminder = { ...reminder, id: reminder.id || crypto.randomUUID() }; setReminders(prev => [...prev, newReminder]); if (user?.isCloud && supabase) { await supabase.from('reminders').insert({ user_id: user.id, tmdb_id: reminder.tmdb_id, media_type: reminder.media_type, scope: reminder.scope, episode_season: reminder.episode_season, episode_number: reminder.episode_number, offset_minutes: reminder.offset_minutes }); } await requestNotificationPermission(); };
  const removeReminder = async (id: string) => { setReminders(prev => prev.filter(r => r.id !== id)); if (user?.isCloud && supabase) { await supabase.from('reminders').delete().eq('id', id); } };
  const requestNotificationPermission = async () => { if (!('Notification' in window)) { alert('This browser does not support desktop notifications'); return false; } if (Notification.permission === 'granted') return true; const permission = await Notification.requestPermission(); return permission === 'granted'; };
  // (Reminder Effect) ...
  useEffect(() => { if (!user) return; const checkReminders = () => { if (Notification.permission !== 'granted') return; const now = new Date(); const notifiedKey = 'tv_calendar_notified_events'; const notifiedEvents = JSON.parse(localStorage.getItem(notifiedKey) || '{}'); const allEpisodes = Object.values(episodes).flat() as Episode[]; reminders.forEach(rule => { let candidates: Episode[] = []; if (rule.scope === 'all') { candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.air_date); } else if (rule.scope === 'episode') { candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.season_number === rule.episode_season && e.episode_number === rule.episode_number); } else if (rule.scope.startsWith('movie')) { candidates = allEpisodes.filter(e => e.show_id === rule.tmdb_id && e.is_movie); if (rule.scope === 'movie_theatrical') candidates = candidates.filter(e => e.release_type === 'theatrical'); else if (rule.scope === 'movie_digital') candidates = candidates.filter(e => e.release_type === 'digital'); } candidates.forEach(ep => { if (!ep.air_date) return; const releaseDate = parseISO(ep.air_date); if (rule.offset_minutes === 0) { if (isSameDay(now, releaseDate)) triggerNotification(ep, rule, notifiedEvents); } else { const triggerDate = subMinutes(releaseDate, rule.offset_minutes); if (isSameDay(now, triggerDate)) triggerNotification(ep, rule, notifiedEvents); } }); }); localStorage.setItem(notifiedKey, JSON.stringify(notifiedEvents)); }; const triggerNotification = (ep: Episode, rule: Reminder, history: any) => { const key = `${rule.id}-${ep.id}-${new Date().toDateString()}`; if (history[key]) return; const title = ep.is_movie ? ep.name : ep.show_name; const body = ep.is_movie ? `${ep.release_type === 'theatrical' ? 'In Theaters' : 'Digital Release'} today!` : `S${ep.season_number}E${ep.episode_number} "${ep.name}" is airing!`; new Notification(title || 'TV Calendar', { body, icon: '/vite.svg', tag: key }); history[key] = Date.now(); }; const interval = setInterval(checkReminders, 60000); checkReminders(); return () => clearInterval(interval); }, [reminders, episodes, user]);
  const addToWatchlist = async (show: TVShow) => { if (watchlist.find(s => s.id === show.id)) return; const newWatchlist = [...watchlist, show]; setWatchlist(newWatchlist); if (user?.isCloud && supabase) { await supabase.from('watchlist').upsert({ user_id: user.id, tmdb_id: show.id, media_type: show.media_type, name: show.name, poster_path: show.poster_path, backdrop_path: show.backdrop_path, overview: show.overview, first_air_date: show.first_air_date, vote_average: show.vote_average }, { onConflict: 'user_id, tmdb_id' }); } if (window.innerWidth < 768 && !settings.suppressMobileAddWarning) { setIsMobileWarningOpen(true); } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); };
  const removeFromWatchlist = async (showId: number) => { const newWatchlist = watchlist.filter(s => s.id !== showId); setWatchlist(newWatchlist); if (user?.isCloud && supabase) { await supabase.from('watchlist').delete().match({ user_id: user.id, tmdb_id: showId }); } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); };
  const batchAddShows = async (shows: TVShow[]) => { const currentIds = new Set(watchlist.map(s => s.id)); const newShows = shows.filter(s => !currentIds.has(s.id)); if (newShows.length === 0) return; const newWatchlist = [...watchlist, ...newShows]; setWatchlist(newWatchlist); if (user?.isCloud && supabase) { const rows = newShows.map(show => ({ user_id: user.id, tmdb_id: show.id, media_type: show.media_type, name: show.name, poster_path: show.poster_path, backdrop_path: show.backdrop_path, overview: show.overview, first_air_date: show.first_air_date, vote_average: show.vote_average })); if (rows.length > 0) { await supabase.from('watchlist').upsert(rows, { onConflict: 'user_id, tmdb_id' }); } } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); };
  const subscribeToList = async (listId: string) => { if (subscribedLists.some(l => l.id === listId)) return; try { const listDetails = await getListDetails(listId); const newList: SubscribedList = { id: listId, name: listDetails.name, items: listDetails.items, item_count: listDetails.items.length }; const newLists = [...subscribedLists, newList]; setSubscribedLists(newLists); if (user?.isCloud && supabase) { await supabase.from('subscriptions').upsert({ user_id: user.id, list_id: listId, name: listDetails.name, item_count: listDetails.items.length }, { onConflict: 'user_id, list_id' }); } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); } catch (error) { throw error; } };
  const unsubscribeFromList = async (listId: string) => { const newLists = subscribedLists.filter(l => l.id !== listId); setSubscribedLists(newLists); if (user?.isCloud && supabase) { await supabase.from('subscriptions').delete().match({ user_id: user.id, list_id: listId }); } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); };
  const batchSubscribe = async (lists: SubscribedList[]) => { const currentIds = new Set(subscribedLists.map(l => l.id)); const freshLists = lists.filter(l => !currentIds.has(l.id)); if (freshLists.length === 0) return; const newLists = [...subscribedLists, ...freshLists]; setSubscribedLists(newLists); if (user?.isCloud && supabase) { const rows = freshLists.map(l => ({ user_id: user.id, list_id: l.id, name: l.name, item_count: l.item_count })); if (rows.length > 0) { await supabase.from('subscriptions').upsert(rows, { onConflict: 'user_id, list_id' }); } } if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); updateTimeoutRef.current = setTimeout(() => { refreshEpisodes(true); }, 2000); };
  const importBackup = (data: any) => { if (user?.isCloud) { uploadBackupToCloud(data); return; } if (Array.isArray(data)) { setWatchlist(data); } else if (typeof data === 'object' && data !== null) { if (data.user && data.user.username && data.user.tmdbKey) { setUser({ ...data.user, isAuthenticated: true, isCloud: false }); } if (data.settings) updateSettings(data.settings); if (data.subscribedLists) { setSubscribedLists(data.subscribedLists); } if (data.watchlist) { setWatchlist(data.watchlist); } if (data.reminders) setReminders(data.reminders); if (data.interactions) setInteractions(data.interactions); } };
  const uploadBackupToCloud = async (data: any) => { if (!user?.isCloud || !supabase) return; setLoading(true); try { let keyToSet = user.tmdbKey; let settingsToSet = settings; if (data.user?.tmdbKey) keyToSet = data.user.tmdbKey; if (data.settings) settingsToSet = { ...settings, ...data.settings }; await supabase.from('profiles').update({ tmdb_key: keyToSet, settings: settingsToSet }).eq('id', user.id); setUser(prev => prev ? ({ ...prev, tmdbKey: keyToSet }) : null); setApiToken(keyToSet); setSettings(settingsToSet); let items: TVShow[] = []; if (Array.isArray(data)) items = data; else if (data.watchlist) items = data.watchlist; if (items.length > 0) await batchAddShows(items); if (data.subscribedLists) await batchSubscribe(data.subscribedLists); } catch (e) { console.error("Cloud upload failed", e); alert("Failed to upload backup to cloud."); } finally { setLoading(false); } };
  const getSyncPayload = useCallback(() => { const simpleWatchlist = watchlist.map(item => ({ id: item.id, type: item.media_type })); const simpleLists = subscribedLists.map(list => list.id); const payload = { user: { username: user?.username, tmdbKey: user?.tmdbKey, isCloud: user?.isCloud }, watchlist: simpleWatchlist, lists: simpleLists, settings, interactions }; return LZString.compressToEncodedURIComponent(JSON.stringify(payload)); }, [user, watchlist, subscribedLists, settings, interactions]);
  const processSyncPayload = useCallback(async (encodedPayload: string) => { try { const json = LZString.decompressFromEncodedURIComponent(encodedPayload); if (!json) throw new Error("Invalid payload"); const data = JSON.parse(json); if (data.user) { const newUser: User = { ...data.user, isAuthenticated: true }; setUser(newUser); setApiToken(newUser.tmdbKey); if (!newUser.isCloud) { localStorage.setItem('tv_calendar_user', JSON.stringify(newUser)); } } if (data.settings) { updateSettings(data.settings); } if (data.interactions) { setInteractions(data.interactions); if (!data.user?.isCloud) { localStorage.setItem('tv_calendar_interactions', JSON.stringify(data.interactions)); } } if (data.watchlist && Array.isArray(data.watchlist)) { setLoading(true); const shows: TVShow[] = []; for (const item of data.watchlist) { try { if (item.type === 'movie') { const details = await getMovieDetails(item.id); shows.push(details); } else { const details = await getShowDetails(item.id); shows.push(details); } } catch (e) { console.error(e); } } await batchAddShows(shows); } if (data.lists && Array.isArray(data.lists)) { for (const listId of data.lists) { await subscribeToList(listId); } } setTimeout(() => window.location.reload(), 500); } catch (e) { console.error("Sync failed", e); alert("Failed to process sync data."); setLoading(false); } }, [batchAddShows, subscribeToList, updateSettings]);
  const closeMobileWarning = (suppressFuture: boolean) => { setIsMobileWarningOpen(false); if (suppressFuture) { updateSettings({ suppressMobileAddWarning: true }); } };

  return (
    <AppContext.Provider value={{
      user, login, loginCloud, logout, updateUserKey,
      watchlist, addToWatchlist, removeFromWatchlist, batchAddShows, batchSubscribe,
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
      interactions, toggleWatched, toggleEpisodeWatched, setRating,
      traktAuth, traktPoll, saveTraktToken, disconnectTrakt, syncTraktData
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