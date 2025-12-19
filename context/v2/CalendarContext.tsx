import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Episode, TVShow } from '../../types';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { useSettings } from './SettingsContext';
import { get, set } from 'idb-keyval';
import { supabase } from '../../services/supabase';
import { addDays, parseISO, subMonths, format, subYears } from 'date-fns';
import { getShowDetails, getSeasonDetails, getMovieDetails, getMovieReleaseDates } from '../../services/tmdb';

interface CalendarContextType {
    episodes: Record<string, Episode[]>;
    calendarDate: Date;
    setCalendarDate: (date: Date) => void;
    refreshEpisodes: (force?: boolean) => Promise<void>;
    loadArchivedEvents: () => Promise<void>;
    loading: boolean;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

// Timezone Helpers
const COUNTRY_TIMEZONES: Record<string, string> = {
    'US': 'America/New_York', 'CA': 'America/Toronto', 'GB': 'Europe/London', 'IE': 'Europe/Dublin',
    'JP': 'Asia/Tokyo', 'KR': 'Asia/Seoul', 'CN': 'Asia/Shanghai', 'AU': 'Australia/Sydney', 'NZ': 'Pacific/Auckland',
    'DE': 'Europe/Berlin', 'FR': 'Europe/Paris', 'ES': 'Europe/Madrid', 'IT': 'Europe/Rome', 'NL': 'Europe/Amsterdam',
    'BR': 'America/Sao_Paulo', 'MX': 'America/Mexico_City', 'AR': 'America/Argentina/Buenos_Aires',
    'IN': 'Asia/Kolkata', 'RU': 'Europe/Moscow', 'ZA': 'Africa/Johannesburg'
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

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const { watchlist, subscribedLists, saveToCloudCalendar, fullSyncRequired, dataLoading } = useData();
    
    const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [loading, setLoading] = useState(false);

    // Initial Cache Load on Mount
    useEffect(() => {
        const initCache = async () => {
            try {
                const cached = await get<Record<string, Episode[]>>('tv_calendar_episodes_v2');
                if (cached) {
                    setEpisodes(cached);
                }
            } catch (e) {
                console.error("Failed to load cache", e);
            }
        };
        initCache();
    }, []);

    // Derived list of all shows to track
    const allTrackedShows = React.useMemo(() => {
        const map = new Map<number, TVShow>();
        watchlist.forEach(show => map.set(show.id, show));
        subscribedLists.forEach(list => list.items.forEach(show => { if (!map.has(show.id)) map.set(show.id, show); }));
        return Array.from(map.values());
    }, [watchlist, subscribedLists]);

    // Time Shift Logic
    const getAdjustedDate = useCallback((airDate: string, originCountries?: string[]): string => {
        if (!settings.timeShift || !settings.timezone) return airDate;
        if (!originCountries || originCountries.length === 0) return airDate; 
        const originTz = COUNTRY_TIMEZONES[originCountries[0]];
        if (!originTz) return airDate;
        
        try {
            const originOffset = getTimezoneOffsetMinutes(originTz);
            const userOffset = getTimezoneOffsetMinutes(settings.timezone);
            const airTimeMinutes = 20 * 60; // Assume 8 PM prime time
            const diffMinutes = userOffset - originOffset;
            const adjustedTimeMinutes = airTimeMinutes + diffMinutes;
            
            if (adjustedTimeMinutes >= 24 * 60) return format(addDays(parseISO(airDate), 1), 'yyyy-MM-dd');
            if (adjustedTimeMinutes < 0) return format(addDays(parseISO(airDate), -1), 'yyyy-MM-dd');
        } catch (e) {}
        return airDate;
    }, [settings.timeShift, settings.timezone]);

    // Re-bucket episodes on settings change
    useEffect(() => {
        setEpisodes(prev => {
            const allEps = Object.values(prev).flat();
            if (allEps.length === 0) return prev;
            const newMap: Record<string, Episode[]> = {};
            allEps.forEach(ep => {
                if (!ep.air_date) return;
                const dateKey = getAdjustedDate(ep.air_date, ep.origin_country);
                if (!newMap[dateKey]) newMap[dateKey] = [];
                if (!newMap[dateKey].some(e => e.id === ep.id)) newMap[dateKey].push(ep);
            });
            // Update cache silently
            set('tv_calendar_episodes_v2', newMap).catch(() => {});
            return newMap;
        });
    }, [settings.timeShift, settings.timezone, getAdjustedDate]);

    // Refresh Logic
    const refreshEpisodes = useCallback(async (force = false) => {
        if (fullSyncRequired) return;
        if (!user || (!user.tmdbKey && !user.isCloud)) return;
        if (dataLoading && !force) return; // Wait for watchlist to load from cloud/local before deciding to refresh

        const shouldSync = settings.autoSync || force;
        const lastUpdate = await get<number>('tv_calendar_meta_v2');
        const now = Date.now();
        const cachedEps = await get<Record<string, Episode[]>>('tv_calendar_episodes_v2');
        
        // Ensure UI has cache even if state was empty (redundant but safe)
        if (cachedEps && Object.keys(episodes).length === 0) setEpisodes(cachedEps);

        // If cloud user, prefer loading from DB first
        if (user.isCloud && !force) {
            // Load from Supabase
            if (supabase) {
                const oneYearAgo = subYears(new Date(), 1).toISOString();
                const { data } = await supabase.from('user_calendar_events').select('*').eq('user_id', user.id).gte('air_date', oneYearAgo);
                if (data && data.length > 0) {
                    const dbMap: Record<string, Episode[]> = {};
                    data.forEach((row: any) => {
                         const ep: Episode = {
                             id: row.id, show_id: row.tmdb_id, show_name: row.title, name: row.episode_name || row.title, overview: row.overview,
                             vote_average: row.vote_average, air_date: row.air_date, episode_number: row.episode_number, season_number: row.season_number,
                             still_path: row.backdrop_path, poster_path: row.poster_path, is_movie: row.media_type === 'movie', release_type: row.release_type
                         };
                         // Dates from DB should already be correct/shifted or raw? Assuming raw from API.
                         // Apply shift locally for display
                         const key = getAdjustedDate(ep.air_date, []); // Passing empty origin, DB might not have it. V2 sync saves origin?
                         if (!dbMap[key]) dbMap[key] = [];
                         dbMap[key].push(ep);
                    });
                    setEpisodes(dbMap);
                    set('tv_calendar_episodes_v2', dbMap);
                    return; // Done
                }
            }
        }

        // Local fetch or force fetch
        // If we have cache, and it's fresh enough, and we are not forcing, skip.
        if (!shouldSync || (!user.isCloud && !force && lastUpdate && (now - lastUpdate < (1000 * 60 * 60 * 6)))) {
             if (cachedEps) return;
             if (allTrackedShows.length === 0) return;
        }
        
        // Guard against wiping data if watchlist isn't loaded yet
        if (allTrackedShows.length === 0 && !force) {
             return;
        }

        // Fetch from TMDB logic (Simulated here, reusing logic from AppContext basically)
        setLoading(true);
        try {
            // If forcing, start fresh. If auto-syncing, use cache as base to prevent flicker/wipe.
            const finalMap: Record<string, Episode[]> = force ? {} : { ...(cachedEps || {}) };
            const sixMonthsAgo = subMonths(new Date(), 6);
            
            // Batched fetching...
            let processed = 0;
            const unique = allTrackedShows; // Assuming simplified
            while (processed < unique.length) {
                const batch = unique.slice(processed, processed + 10);
                await Promise.all(batch.map(async (item) => {
                     try {
                        let origin = item.origin_country;
                        if (item.media_type === 'movie') {
                            if (!origin) { const d = await getMovieDetails(item.id); origin = d.origin_country; }
                            const dates = await getMovieReleaseDates(item.id);
                            dates.forEach(rel => {
                                const ep = { id: item.id * 1000 + (rel.type === 'theatrical' ? 1 : 2), name: item.name, overview: item.overview, air_date: rel.date, episode_number: rel.type === 'theatrical' ? 1 : 2, season_number: 1, show_id: item.id, show_name: item.name, is_movie: true, release_type: rel.type, origin_country: origin, poster_path: item.poster_path, still_path: item.backdrop_path } as Episode;
                                const k = getAdjustedDate(ep.air_date, origin);
                                if (!finalMap[k]) finalMap[k] = [];
                                // Dedup logic
                                if (!finalMap[k].some(e => e.id === ep.id)) finalMap[k].push(ep);
                            });
                        } else {
                            // TV Logic
                             const d = await getShowDetails(item.id);
                             origin = d.origin_country;
                             const seasons = d.seasons || [];
                             for (const s of seasons) {
                                 // Optimistic fetch limit
                                 if (s.air_date && parseISO(s.air_date) < sixMonthsAgo && s.season_number < (seasons[seasons.length-1]?.season_number || 1)) continue;
                                 const sData = await getSeasonDetails(item.id, s.season_number);
                                 sData.episodes.forEach(ep => {
                                     if (ep.air_date) {
                                         const e = { ...ep, show_id: item.id, show_name: item.name, poster_path: item.poster_path, season1_poster_path: d.poster_path, show_backdrop_path: d.backdrop_path, origin_country: origin };
                                         const k = getAdjustedDate(ep.air_date, origin);
                                         if (!finalMap[k]) finalMap[k] = [];
                                         // Remove stale if exists, push new
                                         finalMap[k] = finalMap[k].filter(ex => ex.id !== e.id);
                                         finalMap[k].push(e);
                                     }
                                 });
                             }
                        }
                     } catch {}
                }));
                processed += 10;
            }

            setEpisodes(finalMap);
            await set('tv_calendar_episodes_v2', finalMap);
            await set('tv_calendar_meta_v2', Date.now());
            
            // Sync to cloud if needed
            if (user.isCloud && !fullSyncRequired) {
                 const newEps = Object.values(finalMap).flat();
                 await saveToCloudCalendar(newEps);
            }

        } catch (e) { console.error(e); } finally { setLoading(false); }

    }, [user, allTrackedShows, fullSyncRequired, settings.timeShift, settings.timezone, settings.autoSync, getAdjustedDate, saveToCloudCalendar, dataLoading]);

    const loadArchivedEvents = async () => {
        if (!user?.isCloud || !supabase) return;
        setLoading(true);
        try {
            const oneYearAgo = subYears(new Date(), 1).toISOString();
            const { data } = await supabase.from('user_calendar_events').select('*').eq('user_id', user.id).lt('air_date', oneYearAgo);
            if (data) {
                setEpisodes(prev => {
                    const next = { ...prev };
                    data.forEach((row: any) => {
                         const k = row.air_date; 
                         if (!next[k]) next[k] = [];
                         next[k].push({
                             id: row.id, show_id: row.tmdb_id, show_name: row.title, name: row.title, air_date: row.air_date, episode_number: row.episode_number, season_number: row.season_number, is_movie: row.media_type === 'movie', release_type: row.release_type
                         } as Episode);
                    });
                    return next;
                });
            }
        } catch {} finally { setLoading(false); }
    };

    return (
        <CalendarContext.Provider value={{ episodes, calendarDate, setCalendarDate, refreshEpisodes, loadArchivedEvents, loading }}>
            {children}
        </CalendarContext.Provider>
    );
};

export const useCalendar = () => {
    const context = useContext(CalendarContext);
    if (!context) throw new Error('useCalendar must be used within CalendarProvider');
    return context;
};