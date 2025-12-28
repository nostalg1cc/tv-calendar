
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

// Heuristic: Major streamers usually release at specific UTC times (e.g. 8AM UTC / 12AM PT)
// If we only get a date string, assuming this time helps adjust for local user timezone.
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
    const traktDays = 90; 

    // 1. Fetch Trakt Data (if connected) 
    const traktQuery = useQuery({
        queryKey: ['trakt_calendar', traktStartDate, traktDays, traktToken],
        queryFn: async () => {
            if (!traktToken) return {};
            try {
                const [shows, movies, dvds] = await Promise.all([
                    getTraktCalendar(traktToken, traktStartDate, traktDays),
                    getTraktMovieCalendar(traktToken, traktStartDate, traktDays, 'movies'),
                    getTraktMovieCalendar(traktToken, traktStartDate, traktDays, 'dvd')
                ]);

                const map: Record<string, TraktDateEntry[]> = {}; 
                
                // Process Shows
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

                // Process Movies
                const processMovie = (item: any, type: 'theatrical' | 'digital') => {
                    const tmdbId = item.movie?.ids?.tmdb;
                    const released = item.released;
                    if (tmdbId && released) {
                        const key = `movie_${tmdbId}`;
                        if (!map[key]) map[key] = [];
                        // Don't dedupe strictly, we want both types if available
                        map[key].push({ date: released, type });
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
        staleTime: 1000 * 60 * 60 * 1 
    });

    const traktMap = traktQuery.data || {};

    const showQueries = useQueries({
        queries: watchlist.map(show => ({
            queryKey: ['calendar_data', show.id, show.media_type, show.custom_poster_path, userRegion, traktToken ? 'trakt' : 'no-trakt'],
            queryFn: async (): Promise<Episode[]> => {
                try {
                    // --- MOVIES LOGIC ---
                    if (show.media_type === 'movie') {
                        const results: Episode[] = [];
                        const traktEntries = traktMap[`movie_${show.id}`];

                        // 1. If Trakt data exists, use it
                        if (traktEntries && traktEntries.length > 0) {
                            traktEntries.forEach(entry => {
                                const posterToUse = show.custom_poster_path || show.poster_path;
                                let dateObj = new Date(entry.date);
                                
                                if (!isNaN(dateObj.getTime())) {
                                    results.push({
                                        id: show.id * -1 - (entry.type === 'digital' ? 99999 : 0), 
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
                            // If we have Trakt data, we trust it over TMDB for this specific item
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

                        // Capture distinct types: Theatrical AND Digital
                        const typesFound = new Set<string>();

                        // Helper to add if valid
                        const addRelease = (r: any, forcedType: 'theatrical' | 'digital') => {
                            const dateStr = r.date.split('T')[0];
                            // Check if we already have this DATE + TYPE combo to avoid clutter
                            const key = `${dateStr}-${forcedType}`;
                            if (typesFound.has(key)) return;
                            
                            typesFound.add(key);
                            results.push({
                                id: show.id * -1 - (forcedType === 'digital' ? 99999 : 0), 
                                name: show.name,
                                overview: show.overview,
                                vote_average: show.vote_average,
                                air_date: dateStr, 
                                air_date_iso: r.date, 
                                episode_number: 1,
                                season_number: 0,
                                still_path: show.backdrop_path,
                                poster_path: posterToUse,
                                show_id: show.id,
                                show_name: show.name,
                                is_movie: true,
                                release_type: forcedType,
                                release_country: r.country,
                                show_backdrop_path: show.backdrop_path
                            });
                        };

                        // 1. Try to find Digital
                        let digital = userReleases.find(r => r.type === 'digital' || r.type === 'physical');
                        if (!digital) digital = globalReleases.find(r => r.country === 'US' && (r.type === 'digital' || r.type === 'physical'));
                        if (digital) addRelease(digital, 'digital');

                        // 2. Try to find Theatrical
                        let theatrical = userReleases.find(r => r.type === 'theatrical' || r.type === 'premiere');
                        if (!theatrical) {
                            // Fallback Global
                             const sorted = globalReleases.filter(r => r.type === 'theatrical' || r.type === 'premiere').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                             theatrical = sorted[0];
                        }
                        if (theatrical) addRelease(theatrical, 'theatrical');

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
                                        // TVMaze has a date but no timestamp?
                                        if (isGlobalStreamer(details.networks || [])) {
                                            finalIsoString = `${mazeEntry.date}T08:00:00Z`;
                                        } else {
                                            finalIsoString = mazeEntry.date;
                                        }
                                        source = 'tvmaze';
                                    } else if (tmdbDateStr) {
                                        // Fallback to TMDB
                                        if (isGlobalStreamer(details.networks || [])) {
                                            // Inject 8AM UTC for streamers to force proper day shift in local time
                                            finalIsoString = `${tmdbDateStr}T08:00:00Z`; 
                                        } else {
                                            finalIsoString = tmdbDateStr;
                                        }
                                    }

                                    if (finalIsoString) {
                                        // Key Logic: 
                                        // If string has 'T' (timestamp), use new Date() to respect timezone shift.
                                        // If string is just YYYY-MM-DD, parseISO keeps it strictly on that day (Local 00:00).
                                        let dateObj: Date;
                                        if (finalIsoString.includes('T')) {
                                            dateObj = new Date(finalIsoString);
                                        } else {
                                            dateObj = parseISO(finalIsoString);
                                        }

                                        if (isNaN(dateObj.getTime())) return;

                                        // We store the computed Local Date String (YYYY-MM-DD) for grouping in the calendar
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
            // Apply Trakt Override for TV Episodes
            if (!ep.is_movie && ep.show_id && ep.season_number && ep.episode_number) {
                 const traktKey = `${ep.show_id}_${ep.season_number}_${ep.episode_number}`;
                 const traktEntries = traktMap[traktKey];
                 
                 if (traktEntries && traktEntries.length > 0) {
                     const entry = traktEntries[0];
                     let dateObj = new Date(entry.date); // Trakt usually sends ISO timestamp

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
