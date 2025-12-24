
import { useQuery, useQueries } from '@tanstack/react-query';
import { getShowDetails, getSeasonDetails, getMovieReleaseDates, getMovieDetails } from '../services/tmdb';
import { Episode } from '../types';
import { useStore } from '../store';
import { parseISO, subMonths, addMonths } from 'date-fns';

export const useShowData = (showId: number, mediaType: 'tv' | 'movie') => {
    const user = useStore(state => state.user);
    // Only run if we have a key (either in user object or legacy check)
    const hasKey = !!user?.tmdb_key;

    return useQuery({
        queryKey: ['media', mediaType, showId],
        queryFn: async () => mediaType === 'movie' ? getMovieDetails(showId) : getShowDetails(showId),
        staleTime: 1000 * 60 * 60 * 24 * 7, // 7 Days Stale for static show data
        enabled: hasKey && !!showId,
    });
};

export const useCalendarEpisodes = (targetDate: Date) => {
    const watchlist = useStore(state => state.watchlist);
    const user = useStore(state => state.user);
    const hasKey = !!user?.tmdb_key;

    const showQueries = useQueries({
        queries: watchlist.map(show => ({
            queryKey: ['calendar_data', show.id, show.media_type, show.custom_poster_path],
            queryFn: async (): Promise<Episode[]> => {
                if (show.media_type === 'movie') {
                    let releases = await getMovieReleaseDates(show.id);
                    
                    // Fallback: If no specific US/Digital dates found, use the global release date
                    if (releases.length === 0 && show.first_air_date) {
                        releases = [{ date: show.first_air_date, type: 'theatrical' }];
                    }
                    
                    const posterToUse = show.custom_poster_path || show.poster_path;

                    return releases.map(r => ({
                        id: show.id * -1, 
                        name: show.name,
                        overview: show.overview,
                        vote_average: show.vote_average,
                        air_date: r.date,
                        episode_number: 1,
                        season_number: 0,
                        still_path: show.backdrop_path,
                        poster_path: posterToUse,
                        show_id: show.id,
                        show_name: show.name,
                        is_movie: true,
                        release_type: r.type,
                        show_backdrop_path: show.backdrop_path
                    }));
                } else {
                    const details = await getShowDetails(show.id);
                    const eps: Episode[] = [];
                    
                    // Prioritize user selected poster
                    const posterToUse = show.custom_poster_path || details.poster_path;
                    
                    // Optimisation: Fetch last 2 seasons + specials
                    const seasonsToFetch = details.seasons?.slice(-2) || [];
                    const s0 = details.seasons?.find(s => s.season_number === 0);
                    if (s0 && !seasonsToFetch.some(s => s.season_number === 0)) seasonsToFetch.push(s0);

                    for (const season of seasonsToFetch) {
                        try {
                            const sData = await getSeasonDetails(show.id, season.season_number);
                            sData.episodes.forEach(e => {
                                eps.push({
                                    ...e,
                                    show_id: show.id,
                                    show_name: show.name,
                                    is_movie: false,
                                    show_backdrop_path: details.backdrop_path,
                                    poster_path: posterToUse, // Use custom or refreshed show poster
                                    season1_poster_path: sData.poster_path // Keep season specific as fallback
                                });
                            });
                        } catch (e) {
                            console.warn(`Failed to fetch season ${season.season_number}`);
                        }
                    }
                    return eps;
                }
            },
            staleTime: 1000 * 60 * 60 * 24, // 24 hours - relies on IDB cache for instant load
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
