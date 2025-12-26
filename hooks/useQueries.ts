
import { useQuery, useQueries } from '@tanstack/react-query';
import { getShowDetails, getSeasonDetails, getMovieReleaseDates, getMovieDetails } from '../services/tmdb';
import { getTVMazeEpisodes } from '../services/tvmaze';
import { Episode } from '../types';
import { useStore } from '../store';
import { parseISO, subMonths, addMonths, addDays, format } from 'date-fns';

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

export const useCalendarEpisodes = (targetDate: Date) => {
    const watchlist = useStore(state => state.watchlist);
    const user = useStore(state => state.user);
    const settings = useStore(state => state.settings);
    const hasKey = !!user?.tmdb_key;
    
    const userRegion = settings.country || getUserRegion();

    const showQueries = useQueries({
        queries: watchlist.map(show => ({
            queryKey: ['calendar_data', show.id, show.media_type, show.custom_poster_path, userRegion],
            queryFn: async (): Promise<Episode[]> => {
                if (show.media_type === 'movie') {
                    let releases = await getMovieReleaseDates(show.id);
                    
                    if (releases.length === 0 && show.first_air_date) {
                        releases = [{ date: show.first_air_date, type: 'theatrical', country: 'US' }];
                    }
                    
                    const posterToUse = show.custom_poster_path || show.poster_path;
                    const relevantReleases: any[] = [];
                    
                    const processCategory = (types: string[]) => {
                         const candidates = releases.filter(r => types.includes(r.type));
                         if (candidates.length > 0) {
                             let best = candidates.find(r => r.country === userRegion);
                             if (!best) {
                                 const sorted = [...candidates].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                 best = sorted[0];
                             }
                             if (best) relevantReleases.push(best);
                         }
                    };

                    processCategory(['theatrical', 'premiere']);
                    processCategory(['digital', 'physical']);

                    return relevantReleases.map(r => {
                        let normalizedType: 'theatrical' | 'digital' = 'theatrical';
                        if (r.type === 'digital' || r.type === 'physical') normalizedType = 'digital';
                        
                        return {
                            id: show.id * -1, 
                            name: show.name,
                            overview: show.overview,
                            vote_average: show.vote_average,
                            air_date: r.date.split('T')[0], // Use local date part for grouping
                            air_date_iso: r.date,
                            episode_number: 1,
                            season_number: 0,
                            still_path: show.backdrop_path,
                            poster_path: posterToUse,
                            show_id: show.id,
                            show_name: show.name,
                            is_movie: true,
                            release_type: normalizedType,
                            release_country: r.country,
                            show_backdrop_path: show.backdrop_path
                        };
                    });
                } else {
                    // 1. Fetch TMDB Details
                    const details = await getShowDetails(show.id);
                    const eps: Episode[] = [];
                    const posterToUse = show.custom_poster_path || details.poster_path;
                    
                    // 2. Fetch TVMaze Precise Dates
                    // We use this for exact timezone conversion
                    let tvmazeDates: Record<number, Record<number, string>> = {};
                    try {
                        tvmazeDates = await getTVMazeEpisodes(details.external_ids?.imdb_id, details.external_ids?.tvdb_id);
                    } catch (e) {
                        console.warn('TVMaze fetch failed', e);
                    }

                    const seasonsToFetch = details.seasons?.slice(-2) || [];
                    const s0 = details.seasons?.find(s => s.season_number === 0);
                    if (s0 && !seasonsToFetch.some(s => s.season_number === 0)) seasonsToFetch.push(s0);

                    // 3. Fetch Seasons
                    for (const season of seasonsToFetch) {
                        try {
                            const sData = await getSeasonDetails(show.id, season.season_number);
                            
                            sData.episodes.forEach(e => {
                                let finalDateStr = e.air_date; // Default YYYY-MM-DD
                                let fullIso = e.air_date;

                                const mazeDate = tvmazeDates[e.season_number]?.[e.episode_number];

                                if (mazeDate) {
                                    if (mazeDate.includes('T')) {
                                        // Case A: We have a full timestamp with timezone! 
                                        // (e.g. 2025-12-25T20:00:00-05:00)
                                        // Convert to user's local date string for the calendar bucket
                                        const d = new Date(mazeDate);
                                        finalDateStr = format(d, 'yyyy-MM-dd');
                                        fullIso = mazeDate;
                                    } else {
                                        // Case B: Date string only from TVMaze
                                        finalDateStr = mazeDate;
                                        fullIso = mazeDate;
                                    }
                                }

                                if (finalDateStr) {
                                    eps.push({
                                        ...e,
                                        air_date: finalDateStr,
                                        air_date_iso: fullIso,
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
            staleTime: 1000 * 60 * 60 * 24, // 24 hours
            enabled: hasKey && !!show.id, 
            retry: 1
        }))
    });

    const isLoading = showQueries.some(q => q.isLoading);
    const isRefetching = showQueries.some(q => q.isRefetching);

    const startWindow = subMonths(targetDate, 1);
    const endWindow = addMonths(targetDate, 1);

    const allEpisodes = showQueries
        .flatMap(q => q.data || [])
        .filter(ep => {
             if (!ep.air_date) return false;
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
