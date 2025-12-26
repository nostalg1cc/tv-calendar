
import { useQuery, useQueries } from '@tanstack/react-query';
import { getShowDetails, getSeasonDetails, getMovieReleaseDates, getMovieDetails } from '../services/tmdb';
import { getTVMazeEpisodes } from '../services/tvmaze';
import { getTraktCalendar } from '../services/trakt';
import { Episode } from '../types';
import { useStore } from '../store';
import { parseISO, subMonths, addMonths, format } from 'date-fns';

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

export const useCalendarEpisodes = (targetDate: Date) => {
    const watchlist = useStore(state => state.watchlist);
    const user = useStore(state => state.user);
    const settings = useStore(state => state.settings);
    const traktToken = useStore(state => state.traktToken);
    const hasKey = !!user?.tmdb_key;
    
    const userRegion = settings.country || getUserRegion();

    const startWindowDate = subMonths(targetDate, 1);
    // Trakt API max days is 31 usually, but let's try fetching 60 days in chunks if needed or just 31 centered
    // For now, let's fetch a 60 day window from startWindowDate (2 months)
    const traktStartDate = format(startWindowDate, 'yyyy-MM-dd');
    const traktDays = 60; 

    // 1. Fetch Trakt Data (if connected)
    const traktQuery = useQuery({
        queryKey: ['trakt_calendar', traktStartDate, traktDays, traktToken],
        queryFn: async () => {
            if (!traktToken) return {};
            try {
                const data = await getTraktCalendar(traktToken, traktStartDate, traktDays);
                const map: Record<string, string> = {}; // "tmdb_s_e" -> iso_date
                
                if (Array.isArray(data)) {
                    data.forEach((item: any) => {
                         const tmdbId = item.show?.ids?.tmdb;
                         const s = item.episode?.season;
                         const e = item.episode?.number;
                         const airtime = item.first_aired; // ISO UTC
                         if (tmdbId && s && e && airtime) {
                             map[`${tmdbId}_${s}_${e}`] = airtime;
                         }
                    });
                }
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
        queries: watchlist.map(show => ({
            queryKey: ['calendar_data', show.id, show.media_type, show.custom_poster_path, userRegion],
            queryFn: async (): Promise<Episode[]> => {
                // --- MOVIES LOGIC ---
                if (show.media_type === 'movie') {
                    let releases = await getMovieReleaseDates(show.id, true);
                    
                    if (releases.length === 0 && show.first_air_date) {
                        releases = [{ date: show.first_air_date, type: 'theatrical', country: 'US' }];
                    }
                    
                    const posterToUse = show.custom_poster_path || show.poster_path;
                    
                    const userReleases = releases.filter(r => r.country === userRegion);
                    const globalReleases = releases.filter(r => r.country !== userRegion);

                    let bestDate = userReleases.find(r => r.type === 'digital' || r.type === 'physical');
                    
                    if (!bestDate) {
                        bestDate = userReleases.find(r => r.type === 'theatrical' || r.type === 'premiere');
                    }

                    if (!bestDate) {
                         const sortedGlobal = globalReleases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                         bestDate = sortedGlobal.find(r => r.country === 'US' && (r.type === 'digital' || r.type === 'physical'));
                         if (!bestDate) bestDate = sortedGlobal[0];
                    }

                    if (bestDate) {
                         let normalizedType: 'theatrical' | 'digital' = 'theatrical';
                         if (bestDate.type === 'digital' || bestDate.type === 'physical') normalizedType = 'digital';
                         
                         return [{
                            id: show.id * -1, 
                            name: show.name,
                            overview: show.overview,
                            vote_average: show.vote_average,
                            air_date: bestDate.date.split('T')[0], 
                            air_date_iso: bestDate.date, 
                            episode_number: 1,
                            season_number: 0,
                            still_path: show.backdrop_path,
                            poster_path: posterToUse,
                            show_id: show.id,
                            show_name: show.name,
                            is_movie: true,
                            release_type: normalizedType,
                            release_country: bestDate.country,
                            show_backdrop_path: show.backdrop_path
                        }];
                    }
                    return [];
                } 
                
                // --- TV SHOWS LOGIC ---
                else {
                    const details = await getShowDetails(show.id);
                    const eps: Episode[] = [];
                    const posterToUse = show.custom_poster_path || details.poster_path;
                    
                    // Fetch precise timestamps from TVMaze
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
                                // Default date from TMDB (usually YYYY-MM-DD)
                                const tmdbDateStr = e.air_date;
                                
                                // Check TVMaze
                                const mazeEntry = tvmazeData[e.season_number]?.[e.episode_number];
                                
                                // Determine the most accurate ISO timestamp
                                let finalIsoString: string | null = null;
                                let source: 'tmdb' | 'tvmaze' | 'trakt' = 'tmdb';
                                
                                if (mazeEntry && mazeEntry.timestamp) {
                                    finalIsoString = mazeEntry.timestamp;
                                    source = 'tvmaze';
                                } else if (mazeEntry && mazeEntry.date) {
                                    if (isGlobalStreamer(details.networks || [])) {
                                        finalIsoString = `${mazeEntry.date}T08:00:00Z`; // Assume 12AM PT / 8AM UTC
                                    } else {
                                        finalIsoString = mazeEntry.date;
                                    }
                                    source = 'tvmaze';
                                } else if (tmdbDateStr) {
                                    if (isGlobalStreamer(details.networks || [])) {
                                        finalIsoString = `${tmdbDateStr}T08:00:00Z`; // Assume 12AM PT / 8AM UTC
                                    } else {
                                        finalIsoString = tmdbDateStr;
                                    }
                                }

                                if (finalIsoString) {
                                    // Convert the timestamp to a Date object. 
                                    // This automatically handles the user's local timezone offset.
                                    let dateObj: Date;
                                    if (finalIsoString.includes('T')) {
                                        dateObj = new Date(finalIsoString);
                                    } else {
                                        // If we still only have YYYY-MM-DD, parse as local midnight
                                        dateObj = parseISO(finalIsoString);
                                    }

                                    // Create the grouping key based on the LOCAL date
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
            },
            staleTime: 1000 * 60 * 60 * 12, 
            enabled: hasKey && !!show.id, 
            retry: 1
        }))
    });

    const isLoading = showQueries.some(q => q.isLoading) || traktQuery.isLoading;
    const isRefetching = showQueries.some(q => q.isRefetching);

    const startWindow = subMonths(targetDate, 1);
    const endWindow = addMonths(targetDate, 1);

    const allEpisodes = showQueries
        .flatMap(q => q.data || [])
        .map(ep => {
            // Apply Trakt Override if available
            if (ep.show_id && ep.season_number && ep.episode_number) {
                 const traktKey = `${ep.show_id}_${ep.season_number}_${ep.episode_number}`;
                 const traktIso = traktMap[traktKey];
                 
                 if (traktIso) {
                     const dateObj = new Date(traktIso);
                     return {
                         ...ep,
                         air_date: format(dateObj, 'yyyy-MM-dd'),
                         air_date_iso: traktIso,
                         air_date_source: 'trakt' as const
                     };
                 }
            }
            return ep;
        })
        .filter(ep => {
             if (!ep.air_date) return false;
             // Filter based on the calculated local date
             const d = parseISO(ep.air_date);
             return d >= startWindow && d <= endWindow;
        });

    return {
        episodes: allEpisodes,
        isLoading,
        isRefetching,
        refetch: () => showQueries.forEach(q => q.refetch())
    };
};
