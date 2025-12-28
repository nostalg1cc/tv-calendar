
import { useQuery, useQueries } from '@tanstack/react-query';
import { getShowDetails, getSeasonDetails, getMovieReleaseDates, getMovieDetails } from '../services/tmdb';
import { getTVMazeEpisodes } from '../services/tvmaze';
import { getTraktCalendar, getTraktMovieCalendar } from '../services/trakt';
import { Episode } from '../types';
import { useStore } from '../store';
import { parseISO, subMonths, addMonths, format, isValid, isSameDay } from 'date-fns';

export const useShowData = (showId: number, mediaType: 'tv' | 'movie') => {
    const user = useStore(state => state.user);
    const hasKey = !!user?.tmdb_key;

    return useQuery({
        queryKey: ['media', mediaType, showId],
        queryFn: async () => mediaType === 'movie' ? getMovieDetails(showId) : getShowDetails(showId),
        staleTime: 1000 * 60 * 60 * 24 * 7, 
        enabled: hasKey && !!showId,
    });
};

const getUserRegion = () => {
    try {
        const lang = navigator.language || 'en-US';
        if (lang.includes('-')) return lang.split('-')[1].toUpperCase();
        return 'US'; 
    } catch {
        return 'US';
    }
};

const isGlobalStreamer = (networks: any[]) => {
    if (!networks || networks.length === 0) return false;
    const streamers = ['Netflix', 'Disney+', 'Amazon', 'Apple TV+', 'Hulu', 'HBO Max', 'Peacock', 'Paramount+'];
    return networks.some(n => streamers.some(s => n.name.includes(s)));
};

interface TraktDateEntry {
    date: string; // ISO
    type?: 'theatrical' | 'digital';
}

export const useCalendarEpisodes = (targetDateInput: Date | string) => {
    const watchlist = useStore(state => state.watchlist);
    const user = useStore(state => state.user);
    const settings = useStore(state => state.settings);
    const traktToken = useStore(state => state.traktToken);
    const hasKey = !!user?.tmdb_key;
    
    // Ensure targetDate is valid
    const targetDate = (targetDateInput instanceof Date && !isNaN(targetDateInput.getTime())) 
        ? targetDateInput 
        : (typeof targetDateInput === 'string' ? new Date(targetDateInput) : new Date());

    const userRegion = settings.country || getUserRegion();

    const startWindowDate = isValid(targetDate) ? subMonths(targetDate, 1) : new Date();
    const traktStartDate = format(startWindowDate, 'yyyy-MM-dd');
    const traktDays = 90; // Extended window to catch releases near month boundaries

    // 1. Fetch Trakt Data (if connected) - Now includes Movies and DVDs
    const traktQuery = useQuery({
        queryKey: ['trakt_calendar', traktStartDate, traktDays, traktToken],
        queryFn: async () => {
            if (!traktToken) return {};
            try {
                // Fetch Shows, Theatrical Movies, and Digital/DVD Releases in parallel
                const [shows, movies, dvds] = await Promise.all([
                    getTraktCalendar(traktToken, traktStartDate, traktDays),
                    getTraktMovieCalendar(traktToken, traktStartDate, traktDays, 'movies'),
                    getTraktMovieCalendar(traktToken, traktStartDate, traktDays, 'dvd')
                ]);

                // Map: key -> array of entries (movies can have multiple dates: digital/theatrical)
                const map: Record<string, TraktDateEntry[]> = {}; 
                
                // Process Shows (Key: tmdbId_S_E)
                if (Array.isArray(shows)) {
                    shows.forEach((item: any) => {
                         const tmdbId = item.show?.ids?.tmdb;
                         const s = item.episode?.season;
                         const e = item.episode?.number;
                         const airtime = item.first_aired; 
                         if (tmdbId && s && e && airtime) {
                             const key = `${tmdbId}_${s}_${e}`;
                             if (!map[key]) map[key] = [];
                             map[key].push({ date: airtime });
                         }
                    });
                }

                // Process Movies (Key: movie_tmdbId)
                const processMovie = (item: any, type: 'theatrical' | 'digital') => {
                    const tmdbId = item.movie?.ids?.tmdb;
                    const released = item.released;
                    if (tmdbId && released) {
                        const key = `movie_${tmdbId}`;
                        if (!map[key]) map[key] = [];
                        // Avoid duplicates if same date and type (unlikely but safe)
                        if (!map[key].some(e => e.date === released && e.type === type)) {
                            map[key].push({ date: released, type });
                        }
                    }
                };

                if (Array.isArray(movies)) movies.forEach(m => processMovie(m, 'theatrical'));
                if (Array.isArray(dvds)) dvds.forEach(d => processMovie(d, 'digital'));

                return map;
            } catch (e) {
                console.warn("Trakt calendar fetch failed", e);
                return {};
            }
        },
        enabled: !!traktToken && hasKey,
        staleTime: 1000 * 60 * 60 * 1 // 1 hour
    });

    const traktMap = traktQuery.data || {};

    const showQueries = useQueries({
        // Include traktToken in key to force refetch when token changes
        queries: watchlist.map(show => ({
            queryKey: ['calendar_data', show.id, show.media_type, show.custom_poster_path, userRegion, traktToken ? 'trakt' : 'no-trakt'],
            queryFn: async (): Promise<Episode[]> => {
                try {
                    // --- MOVIES LOGIC ---
                    if (show.media_type === 'movie') {
                        const results: Episode[] = [];
                        const traktEntries = traktMap[`movie_${show.id}`];

                        // 1. If Trakt data exists, use it (could be multiple: theatrical and digital)
                        if (traktEntries && traktEntries.length > 0) {
                            traktEntries.forEach(entry => {
                                const posterToUse = show.custom_poster_path || show.poster_path;
                                
                                // Date Parsing Logic:
                                // If "2025-12-25" -> parseISO keeps it local 25th.
                                // If "2025-12-25T08:00:00Z" -> new Date() adjusts to local.
                                let dateObj: Date;
                                if (entry.date.length === 10) {
                                    dateObj = parseISO(entry.date);
                                } else {
                                    dateObj = new Date(entry.date);
                                }

                                if (!isNaN(dateObj.getTime())) {
                                    results.push({
                                        id: show.id * -1 - (entry.type === 'digital' ? 99999 : 0), // Unique ID for keying
                                        name: show.name,
                                        overview: show.overview,
                                        vote_average: show.vote_average,
                                        air_date: format(dateObj, 'yyyy-MM-dd'), 
                                        air_date_iso: entry.date, 
                                        episode_number: 1,
                                        season_number: 0,
                                        still_path: show.backdrop_path,
                                        poster_path: posterToUse,
                                        show_id: show.id,
                                        show_name: show.name,
                                        is_movie: true,
                                        release_type: entry.type || 'digital',
                                        release_country: 'Global', 
                                        show_backdrop_path: show.backdrop_path,
                                        air_date_source: 'trakt'
                                    });
                                }
                            });
                            return results;
                        }

                        // 2. Fallback to TMDB
                        let releases = await getMovieReleaseDates(show.id, true);
                        
                        if (releases.length === 0 && show.first_air_date) {
                            releases = [{ date: show.first_air_date, type: 'theatrical', country: 'US' }];
                        }
                        
                        const posterToUse = show.custom_poster_path || show.poster_path;
                        const userReleases = releases.filter(r => r.country === userRegion);
                        const globalReleases = releases.filter(r => r.country !== userRegion);

                        // Find distinct dates for Theatrical vs Digital
                        const typesOfInterest = ['theatrical', 'digital'];
                        const foundDates = new Set<string>();

                        typesOfInterest.forEach(typeKey => {
                            let best = userReleases.find(r => r.type === typeKey || (typeKey === 'digital' ? r.type === 'physical' : r.type === 'premiere'));
                            if (!best && typeKey === 'theatrical') {
                                // Fallback to global for theatrical mainly
                                const sorted = globalReleases.filter(r => r.type === 'theatrical' || r.type === 'premiere').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                best = sorted[0];
                            }
                            if (!best && typeKey === 'digital') {
                                // Fallback to US digital
                                best = globalReleases.find(r => r.country === 'US' && (r.type === 'digital' || r.type === 'physical'));
                            }

                            if (best) {
                                // Dedup dates
                                const dateStr = best.date.split('T')[0]; // TMDB usually has T or not
                                if (!foundDates.has(dateStr)) {
                                    foundDates.add(dateStr);
                                    
                                    results.push({
                                        id: show.id * -1 - (typeKey === 'digital' ? 99999 : 0), 
                                        name: show.name,
                                        overview: show.overview,
                                        vote_average: show.vote_average,
                                        air_date: dateStr, 
                                        air_date_iso: best.date, 
                                        episode_number: 1,
                                        season_number: 0,
                                        still_path: show.backdrop_path,
                                        poster_path: posterToUse,
                                        show_id: show.id,
                                        show_name: show.name,
                                        is_movie: true,
                                        release_type: (typeKey === 'digital' ? 'digital' : 'theatrical'),
                                        release_country: best.country,
                                        show_backdrop_path: show.backdrop_path
                                    });
                                }
                            }
                        });

                        return results;
                    } 
                    
                    // --- TV SHOWS LOGIC ---
                    else {
                        const details = await getShowDetails(show.id);
                        const eps: Episode[] = [];
                        const posterToUse = show.custom_poster_path || details.poster_path;
                        
                        let tvmazeData: Record<number, Record<number, { date: string, timestamp?: string }>> = {};
                        try {
                            tvmazeData = await getTVMazeEpisodes(
                                details.external_ids?.imdb_id, 
                                details.external_ids?.tvdb_id,
                                userRegion
                            );
                        } catch (e) {
                            console.warn('TVMaze fetch failed', e);
                        }

                        const seasonsToFetch = details.seasons?.slice(-2) || [];
                        const s0 = details.seasons?.find(s => s.season_number === 0);
                        if (s0 && !seasonsToFetch.some(s => s.season_number === 0)) seasonsToFetch.push(s0);

                        for (const season of seasonsToFetch) {
                            try {
                                const sData = await getSeasonDetails(show.id, season.season_number);
                                
                                sData.episodes.forEach(e => {
                                    const tmdbDateStr = e.air_date;
                                    const mazeEntry = tvmazeData[e.season_number]?.[e.episode_number];
                                    
                                    let finalIsoString: string | null = null;
                                    let source: 'tmdb' | 'tvmaze' | 'trakt' = 'tmdb';
                                    
                                    if (mazeEntry && mazeEntry.timestamp) {
                                        finalIsoString = mazeEntry.timestamp;
                                        source = 'tvmaze';
                                    } else if (mazeEntry && mazeEntry.date) {
                                        if (isGlobalStreamer(details.networks || [])) {
                                            finalIsoString = `${mazeEntry.date}T08:00:00Z`;
                                        } else {
                                            finalIsoString = mazeEntry.date;
                                        }
                                        source = 'tvmaze';
                                    } else if (tmdbDateStr) {
                                        if (isGlobalStreamer(details.networks || [])) {
                                            finalIsoString = `${tmdbDateStr}T08:00:00Z`;
                                        } else {
                                            finalIsoString = tmdbDateStr;
                                        }
                                    }

                                    if (finalIsoString) {
                                        let dateObj: Date;
                                        // Strict parsing to avoid date shifting for non-timestamps
                                        if (finalIsoString.length === 10) { // YYYY-MM-DD
                                            dateObj = parseISO(finalIsoString);
                                        } else {
                                            dateObj = new Date(finalIsoString);
                                        }

                                        if (isNaN(dateObj.getTime())) return;

                                        const localDateKey = format(dateObj, 'yyyy-MM-dd');
                                        
                                        eps.push({
                                            ...e,
                                            air_date: localDateKey, 
                                            air_date_iso: finalIsoString, 
                                            air_date_source: source,
                                            show_id: show.id,
                                            show_name: show.name,
                                            is_movie: false,
                                            show_backdrop_path: details.backdrop_path,
                                            poster_path: posterToUse,
                                            season1_poster_path: sData.poster_path
                                        });
                                    }
                                });
                            } catch (e) {
                                console.warn(`Failed to fetch season ${season.season_number}`);
                            }
                        }
                        return eps;
                    }
                } catch(e) {
                    console.error(`Error in calendar query for ${show.id}`, e);
                    return [];
                }
            },
            staleTime: 1000 * 60 * 60 * 1, 
            enabled: hasKey && !!show.id, 
            retry: 1
        }))
    });

    const isLoading = showQueries.some(q => q.isLoading) || traktQuery.isLoading;
    const isRefetching = showQueries.some(q => q.isRefetching);

    const startWindow = isValid(targetDate) ? subMonths(targetDate, 1) : new Date();
    const endWindow = isValid(targetDate) ? addMonths(targetDate, 1) : new Date();

    const allEpisodes = showQueries
        .flatMap(q => q.data || [])
        .map(ep => {
            // Apply Trakt Override for TV Episodes if available (Shows only)
            // Movies are already handled in the queryFn logic to allow duplicates
            if (!ep.is_movie && ep.show_id && ep.season_number && ep.episode_number) {
                 const traktKey = `${ep.show_id}_${ep.season_number}_${ep.episode_number}`;
                 const traktEntries = traktMap[traktKey];
                 
                 if (traktEntries && traktEntries.length > 0) {
                     const entry = traktEntries[0];
                     let dateObj: Date;
                     if (entry.date.length === 10) dateObj = parseISO(entry.date);
                     else dateObj = new Date(entry.date);

                     if (!isNaN(dateObj.getTime())) {
                        return {
                            ...ep,
                            air_date: format(dateObj, 'yyyy-MM-dd'),
                            air_date_iso: entry.date,
                            air_date_source: 'trakt' as const
                        };
                     }
                 }
            }
            return ep;
        })
        .filter(ep => {
             if (!ep.air_date) return false;
             try {
                const d = parseISO(ep.air_date);
                if (isNaN(d.getTime())) return false;
                return d >= startWindow && d <= endWindow;
             } catch {
                return false;
             }
        });

    return {
        episodes: allEpisodes,
        isLoading,
        isRefetching,
        refetch: () => showQueries.forEach(q => q.refetch())
    };
};
