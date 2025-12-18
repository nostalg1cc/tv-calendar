
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
  fullSyncRequired: boolean;
  performFullSync: () => Promise<void>;
  reminders: Reminder[];
  addReminder: (reminder: Reminder) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  interactions: Record<string, Interaction>; 
  toggleWatched: (id: number, mediaType: 'tv' | 'movie') => Promise<void>;
  toggleEpisodeWatched: (showId: number, season: number, episode: number) => Promise<void>;
  markHistoryWatched: (showId: number, season: number, episode: number) => Promise<void>;
  setRating: (id: number, mediaType: 'tv' | 'movie', rating: number) => Promise<void>;
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
  calendarScrollPos: number;
  setCalendarScrollPos: (pos: number) => void;
  calendarDate: Date;
  setCalendarDate: (date: Date) => void;
  traktAuth: (clientId: string) => Promise<any>;
  traktPoll: (deviceCode: string, clientId: string, clientSecret: string) => Promise<any>;
  saveTraktToken: (tokenData: any) => Promise<void>;
  disconnectTrakt: () => Promise<void>;
  syncTraktData: (background?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const COUNTRY_TIMEZONES: Record<string, string> = {
    'US': 'America/New_York', 'GB': 'Europe/London', 'JP': 'Asia/Tokyo', 'KR': 'Asia/Seoul',
    'CA': 'America/Toronto', 'AU': 'Australia/Sydney', 'DE': 'Europe/Berlin', 'FR': 'Europe/Paris',
    'BR': 'America/Sao_Paulo', 'IN': 'Asia/Kolkata',
};

export const THEMES: Record<string, Record<string, string>> = {
  default: { '500': '99, 102, 241' },
  rose: { '500': '244, 63, 94' },
  amber: { '500': '245, 158, 11' },
  emerald: { '500': '16, 185, 129' },
  sky: { '500': '14, 165, 233' },
  violet: { '500': '139, 92, 246' },
  zinc: { '500': '113, 113, 122' }
};

const DEFAULT_SETTINGS: AppSettings = {
  spoilerConfig: { images: false, overview: false, title: false, includeMovies: false, replacementMode: 'blur' },
  hideTheatrical: false, ignoreSpecials: false, recommendationsEnabled: true,
  recommendationMethod: 'banner', compactCalendar: true, viewMode: 'grid', 
  mobileNavLayout: 'standard', suppressMobileAddWarning: false,
  calendarPosterFillMode: 'cover', useSeason1Art: false, cleanGrid: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  timeShift: false, theme: 'default', customThemeColor: '#6366f1',
  appDesign: 'default', baseTheme: 'cosmic', appFont: 'inter',
  reminderStrategy: 'ask', hiddenItems: [], v2SidebarMode: 'fixed'
};

const CACHE_DURATION = 1000 * 60 * 60 * 6;
const DB_KEY_EPISODES = 'tv_calendar_episodes_v2'; 
const DB_KEY_META = 'tv_calendar_meta_v2';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('tv_calendar_user');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed?.tmdbKey) setApiToken(parsed.tmdbKey);
      return parsed;
    } catch { return null; }
  });

  const [settings, setSettings] = useState<AppSettings>(() => { 
    try { 
      const synced = JSON.parse(localStorage.getItem('tv_calendar_settings') || 'null') || DEFAULT_SETTINGS;
      const local = JSON.parse(localStorage.getItem('tv_calendar_local_prefs') || '{}');
      return { ...DEFAULT_SETTINGS, ...synced, ...local }; 
    } catch { return DEFAULT_SETTINGS; } 
  });

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
  const [fullSyncRequired, setFullSyncRequired] = useState(false);
  const [calendarScrollPos, setCalendarScrollPos] = useState(0);
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  const manualOverridesRef = useRef<Record<string, boolean>>({});
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allTrackedShows = useMemo(() => {
    const map = new Map<number, TVShow>();
    watchlist.forEach(s => map.set(s.id, s));
    subscribedLists.forEach(l => l.items.forEach(s => { if (!map.has(s.id)) map.set(s.id, s); }));
    return Array.from(map.values());
  }, [watchlist, subscribedLists]);

  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => { if (session) loginCloud(session); });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) loginCloud(session); 
        else if (_event === 'SIGNED_OUT' && user?.isCloud) logout();
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
      localStorage.setItem('tv_calendar_user', JSON.stringify(user)); 
    }
  }, [watchlist, subscribedLists, settings, user, reminders, interactions]);

  const login = (u: string, k: string) => {
    const newUser: User = { username: u, tmdbKey: k, isAuthenticated: true, isCloud: false };
    setApiToken(k);
    setUser(newUser);
  };

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

  const loginCloud = async (session: any) => {
    if (!supabase) return;
    const { user: authUser } = session;
    setLoading(true);
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      const newUser: User = { 
        id: authUser.id, username: p?.username || authUser.email, email: authUser.email, 
        tmdbKey: p?.tmdb_key || '', isAuthenticated: true, isCloud: true, 
        traktToken: p?.trakt_token, traktProfile: p?.trakt_profile, 
        fullSyncCompleted: p?.full_sync_completed 
      };

      if (newUser.tmdbKey) setApiToken(newUser.tmdbKey);

      const [wRes, sRes, iRes, mRes, rRes] = await Promise.all([
        supabase.from('watchlist').select('*'),
        supabase.from('subscriptions').select('*'),
        supabase.from('interactions').select('*'),
        supabase.from('watched_items').select('*'),
        supabase.from('reminders').select('*')
      ]);

      if (wRes.data) setWatchlist(wRes.data.map((item: any): TVShow => ({ 
        id: item.tmdb_id, name: item.name, poster_path: item.poster_path, backdrop_path: item.backdrop_path, 
        overview: item.overview, first_air_date: item.first_air_date, vote_average: item.vote_average, 
        media_type: item.media_type, number_of_seasons: item.number_of_seasons 
      })));

      if (sRes.data) {
        const lists: SubscribedList[] = [];
        for (const sub of sRes.data) {
          try {
            const d = await getListDetails(sub.list_id);
            lists.push({ id: sub.list_id, name: d.name, items: d.items, item_count: d.items.length });
          } catch (e) {}
        }
        setSubscribedLists(lists);
      }

      const intMap: Record<string, Interaction> = {};
      const manualMap: Record<string, boolean> = {};
      if (iRes.data) iRes.data.forEach((i: any) => {
        const key = i.media_type === 'episode' ? `episode-${i.tmdb_id}-${i.season_number}-${i.episode_number}` : `${i.media_type}-${i.tmdb_id}`;
        intMap[key] = { tmdb_id: i.tmdb_id, media_type: i.media_type, is_watched: i.is_watched, rating: i.rating, season_number: i.season_number, episode_number: i.episode_number, watched_at: i.watched_at };
      });
      if (mRes.data) mRes.data.forEach((m: any) => {
        const key = m.media_type === 'episode' ? `episode-${m.tmdb_id}-${m.season_number}-${m.episode_number}` : `${m.media_type}-${m.tmdb_id}`;
        manualMap[key] = m.is_watched;
        if (intMap[key]) intMap[key].is_watched = m.is_watched;
        else intMap[key] = { tmdb_id: m.tmdb_id, media_type: m.media_type, is_watched: m.is_watched, rating: 0, season_number: m.season_number, episode_number: m.episode_number, watched_at: m.watched_at };
      });
      setInteractions(intMap);
      manualOverridesRef.current = manualMap;

      if (rRes.data) setReminders(rRes.data.map((row: any) => ({ 
        id: row.id, tmdb_id: row.tmdb_id, media_type: row.media_type, show_name: row.show_name || 'Unknown', 
        scope: row.scope, episode_season: row.episode_season, episode_number: row.episode_number, offset_minutes: row.offset_minutes 
      })));

      if (p?.settings) setSettings({ ...DEFAULT_SETTINGS, ...p.settings });

      setUser(newUser);
      if (!p?.full_sync_completed) setFullSyncRequired(true);
      else {
        const cached = await get<Record<string, Episode[]>>(DB_KEY_EPISODES);
        if (cached) setEpisodes(cached);
        await loadCloudCalendar(newUser.id!);
      }
    } catch (e) {
      console.error("Cloud Login Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user?.isCloud && supabase) await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('tv_calendar_user');
    setWatchlist([]); setSubscribedLists([]); setEpisodes({}); setReminders([]); setInteractions({});
    await del(DB_KEY_EPISODES); await del(DB_KEY_META);
  };

  const getAdjustedDate = (airDate: string, originCountries?: string[]): string => {
    if (!settings.timeShift || !originCountries?.length || !settings.timezone) return airDate;
    const originTz = COUNTRY_TIMEZONES[originCountries[0]];
    if (!originTz) return airDate;
    const diff = getTimezoneOffsetMinutes(settings.timezone) - getTimezoneOffsetMinutes(originTz);
    const adjusted = 1200 + diff;
    if (adjusted >= 1440) return format(addDays(parseISO(airDate), 1), 'yyyy-MM-dd');
    if (adjusted < 0) return format(addDays(parseISO(airDate), -1), 'yyyy-MM-dd');
    return airDate;
  };

  const refreshEpisodes = useCallback(async (force = false) => { 
    if (fullSyncRequired || !user || (!user.tmdbKey && !user.isCloud)) { setLoading(false); return; } 
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
      const merge = (newEps: Episode[], countries?: string[]) => {
        setEpisodes(prev => {
          const next = { ...prev };
          newEps.forEach(ep => {
            if (!ep.air_date) return;
            const dateKey = getAdjustedDate(ep.air_date, countries);
            const existing = next[dateKey] || [];
            next[dateKey] = [...existing.filter(e => !(e.show_id === ep.show_id && e.episode_number === ep.episode_number && e.season_number === ep.season_number)), ep];
          });
          return next;
        });
      }; 
      let count = 0; const oneYearAgo = subYears(new Date(), 1); 
      while (count < uniqueItems.length) { 
        const batch: TVShow[] = uniqueItems.slice(count, count + 5); 
        await Promise.all(batch.map(async (item: TVShow) => { 
          try { 
            const batchEps: Episode[] = [];
            if (item.media_type === 'movie') {
              (await getMovieReleaseDates(item.id)).forEach(rel => batchEps.push({ 
                id: item.id * 1000 + (rel.type === 'theatrical' ? 1 : 2), name: item.name, 
                overview: item.overview, vote_average: item.vote_average, air_date: rel.date, 
                episode_number: 1, season_number: 1, still_path: item.backdrop_path, 
                show_backdrop_path: item.backdrop_path, poster_path: item.poster_path, 
                season1_poster_path: item.poster_path ? item.poster_path : undefined, 
                show_id: item.id, show_name: item.name, is_movie: true, release_type: rel.type 
              }));
            } else { 
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

  useEffect(() => { 
    if (user) refreshEpisodes(); 
  }, [user, allTrackedShows, fullSyncRequired, settings.timeShift, settings.timezone]);

  const updateUserKey = async (k: string) => { if (user) { const updated = { ...user, tmdbKey: k }; setUser(updated); setApiToken(k); if (user.isCloud && supabase) await supabase.from('profiles').update({ tmdb_key: k }).eq('id', user.id); } };
  const updateSettings = async (s: Partial<AppSettings>) => { setSettings(prev => { const updated = { ...prev, ...s }; if (user?.isCloud && supabase) supabase.from('profiles').update({ settings: updated }).eq('id', user.id).then(); return updated; }); };
  const addReminder = async (r: Reminder) => { const n = { ...r, id: r.id || crypto.randomUUID() }; setReminders(prev => [...prev, n]); if (user?.isCloud && supabase) await supabase.from('reminders').insert({ user_id: user.id, tmdb_id: n.tmdb_id, media_type: n.media_type, show_name: n.show_name, scope: n.scope, episode_season: n.episode_season, episode_number: n.episode_number, offset_minutes: n.offset_minutes }); };
  const removeReminder = async (id: string) => { setReminders(prev => prev.filter(r => r.id !== id)); if (user?.isCloud && supabase) await supabase.from('reminders').delete().eq('id', id); };
  const addToWatchlist = async (show: TVShow) => { if (watchlist.find(s => s.id === show.id)) return; setWatchlist(prev => [...prev, show]); if (user?.isCloud && supabase) await supabase.from('watchlist').upsert({ user_id: user.id, tmdb_id: show.id, media_type: show.media_type, name: show.name, poster_path: show.poster_path, backdrop_path: show.backdrop_path, overview: show.overview, first_air_date: show.first_air_date, vote_average: show.vote_average }, { onConflict: 'user_id, tmdb_id' }); if (settings.reminderStrategy === 'ask') setReminderCandidate(show); };
  const removeFromWatchlist = async (id: number) => { setWatchlist(prev => prev.filter(s => s.id !== id)); if (user?.isCloud && supabase) supabase.from('watchlist').delete().match({ user_id: user.id, tmdb_id: id }).then(); };
  const unhideShow = (id: number) => { updateSettings({ hiddenItems: (settings.hiddenItems || []).filter(i => i.id !== id) }); };
  const batchAddShows = async (shows: TVShow[]) => { const current = new Set(watchlist.map(s => s.id)); const filtered = shows.filter(s => !current.has(s.id)); if (filtered.length === 0) return; setWatchlist(prev => [...prev, ...filtered]); };
  const subscribeToList = async (listId: string) => { try { const d = await getListDetails(listId); setSubscribedLists(prev => [...prev, { id: listId, name: d.name, items: d.items, item_count: d.items.length }]); } catch (e) { throw e; } };
  const unsubscribeFromList = async (id: string) => { setSubscribedLists(prev => prev.filter(l => l.id !== id)); };
  const batchSubscribe = async (lists: SubscribedList[]) => { setSubscribedLists(prev => [...prev, ...lists]); };
  const importBackup = (d: any) => { if (d.settings) updateSettings(d.settings); if (d.watchlist) setWatchlist(d.watchlist); };
  const uploadBackupToCloud = async (d: any) => { /* Placeholder */ };
  const getSyncPayload = useCallback(() => LZString.compressToEncodedURIComponent(JSON.stringify({ user, watchlist, settings, interactions })), [user, watchlist, settings, interactions]);
  const processSyncPayload = useCallback(async (p: string) => { /* Placeholder */ }, []);
  const closeMobileWarning = (s: boolean) => { setIsMobileWarningOpen(false); if (s) updateSettings({ suppressMobileAddWarning: true }); };
  const reloadAccount = async () => { window.location.reload(); };
  const traktAuth = async (cid: string) => await getDeviceCode(cid);
  const traktPoll = async (dc: string, cid: string, cs: string) => await pollToken(dc, cid, cs);
  const saveTraktToken = async (tokenData: any) => { if (!user) return; try { const profile = await getTraktProfile(tokenData.access_token); const updatedUser: User = { ...user, traktToken: { ...tokenData, created_at: Date.now() / 1000 }, traktProfile: profile }; setUser(updatedUser); if (user.isCloud && supabase) await supabase.from('profiles').update({ trakt_token: updatedUser.traktToken, trakt_profile: profile }).eq('id', user.id); } catch (e) {} };
  const disconnectTrakt = async () => { if (!user) return; const updatedUser = { ...user, traktToken: undefined, traktProfile: undefined }; setUser(updatedUser); if (user.isCloud && supabase) await supabase.from('profiles').update({ trakt_token: null, trakt_profile: null }).eq('id', user.id); };
  const syncTraktData = async (background = false) => { if (!user?.traktToken) return; if (!background) setLoading(true); setIsSyncing(true); try { const token = user.traktToken.access_token; // Use an explicit cast for the Promise.all result to avoid unknown[] property access issues
    const [movieHistory, showHistory] = (await Promise.all([getWatchedHistory(token, 'movies'), getWatchedHistory(token, 'shows')])) as [any[], any[]]; let newShowsToAdd: TVShow[] = []; const currentShowIds = new Set(allTrackedShows.map(s => s.id)); for (const item of movieHistory) { const tmdbId = item.movie.ids.tmdb; if (!tmdbId || currentShowIds.has(tmdbId)) continue; try { newShowsToAdd.push(await getMovieDetails(tmdbId)); } catch (e) {} } if (newShowsToAdd.length > 0) await batchAddShows(newShowsToAdd); } catch (e) {} finally { setLoading(false); setIsSyncing(false); } };
  const toggleWatched = async (id: number, mt: 'tv' | 'movie') => { const key = `${mt}-${id}`; const isWatched = !interactions[key]?.is_watched; // Fixed shorthand variable name (is_watched -> is_watched: isWatched)
    const updated = { tmdb_id: id, media_type: mt, is_watched: isWatched, rating: interactions[key]?.rating || 0, watched_at: isWatched ? new Date().toISOString() : undefined }; setInteractions(prev => ({ ...prev, [key]: updated })); if (user?.traktToken) { const payload = mt === 'movie' ? { movies: [{ ids: { tmdb: id } }] } : { shows: [{ ids: { tmdb: id } }] }; syncHistory(user.traktToken.access_token, payload, isWatched ? 'add' : 'remove').catch(console.error); } if (user?.isCloud) saveManualWatchedStatus(updated); };
  const toggleEpisodeWatched = async (sid: number, s: number, e: number) => { const key = `episode-${sid}-${s}-${e}`; const isWatched = !interactions[key]?.is_watched; // Fixed shorthand variable name (is_watched -> is_watched: isWatched)
    const updated = { tmdb_id: sid, media_type: 'episode' as const, season_number: s, episode_number: e, is_watched: isWatched, rating: interactions[key]?.rating || 0, watched_at: isWatched ? new Date().toISOString() : undefined }; setInteractions(prev => ({ ...prev, [key]: updated })); if (user?.traktToken) { const payload = { shows: [{ ids: { tmdb: sid }, seasons: [{ number: s, episodes: [{ number: e }] }] }] }; syncHistory(user.traktToken.access_token, payload, isWatched ? 'add' : 'remove').catch(console.error); } if (user?.isCloud) saveManualWatchedStatus(updated); };
  const markHistoryWatched = async (sid: number, s: number, e: number) => { setIsSyncing(true); try { const show = await getShowDetails(sid); const epsToMark: Interaction[] = []; for (let si = 1; si <= s; si++) { try { const sData = await getSeasonDetails(sid, si); sData.episodes.forEach(ep => { if (ep.season_number < s || (ep.season_number === s && ep.episode_number <= e)) { epsToMark.push({ tmdb_id: sid, media_type: 'episode', season_number: ep.season_number, episode_number: ep.episode_number, is_watched: true, rating: 0, watched_at: new Date().toISOString() }); } }); } catch (err) {} } setInteractions(prev => { const next = { ...prev }; epsToMark.forEach(i => { const key = `episode-${sid}-${i.season_number}-${i.episode_number}`; if (!next[key]?.is_watched) next[key] = i; }); return next; }); if (user?.isCloud && supabase) { for (let i = 0; i < epsToMark.length; i += 100) await supabase.from('watched_items').upsert(epsToMark.slice(i, i + 100).map(item => ({ user_id: user.id, ...item })), { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' }); } } catch (e) {} finally { setIsSyncing(false); } };
  const setRating = async (id: number, mt: 'tv' | 'movie', r: number) => { const key = `${mt}-${id}`; const updated = { ...(interactions[key] || { tmdb_id: id, media_type: mt, is_watched: false }), rating: r }; setInteractions(prev => ({ ...prev, [key]: updated })); if (user?.isCloud) await saveRatingToCloud(updated); };
  const performFullSync = async () => { if (!user?.isCloud || !supabase || !user.id) return; setIsSyncing(true); setLoading(true); try { const uniqueItems = Array.from(new Map(allTrackedShows.map(item => [item.id, item])).values()); setSyncProgress({ current: 0, total: uniqueItems.length }); await supabase.from('user_calendar_events').delete().eq('user_id', user.id); let fullEps: Episode[] = []; for (const item of uniqueItems) { try { if (item.media_type === 'movie') { (await getMovieReleaseDates(item.id)).forEach(rel => fullEps.push({ id: item.id * 1000, name: item.name, overview: item.overview, vote_average: item.vote_average, air_date: rel.date, episode_number: 1, season_number: 1, still_path: item.backdrop_path, show_backdrop_path: item.backdrop_path, poster_path: item.poster_path, show_id: item.id, show_name: item.name, is_movie: true, release_type: rel.type })); } else { const details = await getShowDetails(item.id); for (const sMeta of (details.seasons || [])) { const sData = await getSeasonDetails(item.id, sMeta.season_number); sData.episodes.forEach(ep => { if (ep.air_date) fullEps.push({ ...ep, show_id: item.id, show_name: item.name, poster_path: item.poster_path, show_backdrop_path: details.backdrop_path, is_movie: false }); }); } } } catch (e) {} setSyncProgress(p => ({ ...p, current: p.current + 1 })); } if (fullEps.length > 0) await saveToCloudCalendar(fullEps, user.id); await supabase.from('profiles').update({ full_sync_completed: true }).eq('id', user.id); const map: Record<string, Episode[]> = {}; fullEps.forEach(ep => { if (!ep.air_date) return; if (!map[ep.air_date]) map[ep.air_date] = []; map[ep.air_date].push(ep); }); setEpisodes(map); setFullSyncRequired(false); } catch (e) {} finally { setIsSyncing(false); setLoading(false); } };
  const loadCloudCalendar = async (uid: string) => { if (!supabase) return; const oneYearAgo = subYears(new Date(), 1).toISOString(); try { const { data } = await supabase.from('user_calendar_events').select('*').eq('user_id', uid).gte('air_date', oneYearAgo); if (data) { const map: Record<string, Episode[]> = {}; data.forEach((row: any) => { const k = row.air_date; if (!k) return; if (!map[k]) map[k] = []; map[k].push({ id: row.id, show_id: row.tmdb_id, show_name: row.title, name: row.episode_name || row.title, overview: row.overview || '', vote_average: row.vote_average || 0, air_date: row.air_date, episode_number: row.episode_number, season_number: row.season_number, still_path: row.backdrop_path, poster_path: row.poster_path, is_movie: row.media_type === 'movie', release_type: row.release_type }); }); setEpisodes(map); await set(DB_KEY_EPISODES, map); } } catch (e) {} };
  const loadArchivedEvents = async () => { if (!user?.isCloud || !supabase || !user.id) return; setLoading(true); try { const oneYearAgo = subYears(new Date(), 1).toISOString(); const { data } = await supabase.from('user_calendar_events').select('*').eq('user_id', user.id).lt('air_date', oneYearAgo); if (data) setEpisodes(prev => { const next = { ...prev }; data.forEach((row: any) => { const k = row.air_date; if (!k) return; if (!next[k]) next[k] = []; next[k].push({ id: row.id, show_id: row.tmdb_id, show_name: row.title, name: row.episode_name || row.title, overview: row.overview || '', vote_average: row.vote_average || 0, air_date: row.air_date, episode_number: row.episode_number, season_number: row.season_number, still_path: row.backdrop_path, poster_path: row.poster_path, is_movie: row.media_type === 'movie', release_type: row.release_type }); }); return next; }); } catch (e) {} finally { setLoading(false); } };
  const saveToCloudCalendar = async (list: Episode[], uid: string) => { if (!supabase || list.length === 0) return; // Use explicit casting to any for list to avoid unknown type property access errors
    const rows = (list as any[]).map(ep => ({ user_id: uid, tmdb_id: ep.show_id || ep.id, media_type: ep.is_movie ? 'movie' : 'tv', season_number: ep.season_number ?? -1, episode_number: ep.episode_number ?? -1, title: ep.show_name || ep.name || '', episode_name: ep.name || '', overview: ep.overview || '', air_date: ep.air_date, poster_path: ep.poster_path || null, backdrop_path: ep.still_path || null, vote_average: ep.vote_average || 0, release_type: ep.release_type || null })); for (let i = 0; i < rows.length; i += 100) await supabase.from('user_calendar_events').upsert(rows.slice(i, i + 100), { onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' }); };
  const requestNotificationPermission = async () => { if (!('Notification' in window)) return false; if (Notification.permission === 'granted') return true; return (await Notification.requestPermission()) === 'granted'; };

  return (
    <AppContext.Provider value={{
      user, login, loginCloud, logout, updateUserKey, watchlist, addToWatchlist, removeFromWatchlist, 
      unhideShow, batchAddShows, batchSubscribe, subscribedLists, subscribeToList, unsubscribeFromList, 
      allTrackedShows, episodes, loading, isSyncing, syncProgress, refreshEpisodes, loadArchivedEvents,
      requestNotificationPermission, isSearchOpen, setIsSearchOpen, settings, updateSettings,
      importBackup, uploadBackupToCloud, getSyncPayload, processSyncPayload, isMobileWarningOpen, 
      closeMobileWarning, reminders, addReminder, removeReminder, reminderCandidate, setReminderCandidate,
      reloadAccount, calendarScrollPos, setCalendarScrollPos, calendarDate, setCalendarDate,
      interactions, toggleWatched, toggleEpisodeWatched, markHistoryWatched, setRating,
      traktAuth, traktPoll, saveTraktToken, disconnectTrakt, syncTraktData, fullSyncRequired, performFullSync
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

const getTimezoneOffsetMinutes = (tz: string): number => {
  try {
    const str = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).format(new Date());
    const match = str.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (match) return (match[1] === '+' ? 1 : -1) * (parseInt(match[2]) * 60 + parseInt(match[3]));
  } catch (e) {}
  return 0; 
};
