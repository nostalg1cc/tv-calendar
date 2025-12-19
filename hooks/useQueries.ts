
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
        staleTime: 1000 * 60 * 60 * 24,
        enabled: hasKey && !!showId,
    });
};

export const useCalendarEpisodes = (targetDate: Date) => {
    const watchlist = useStore(state => state.watchlist);
    const user = useStore(state => state.user);
    const hasKey = !!user?.tmdb_key;

    const showQueries = useQueries({
        queries: watchlist.map(show => ({
            queryKey: ['calendar_data', show.id, show.media_type],
            queryFn: async (): Promise<Episode[]> => {
                if (show.media_type === 'movie') {
                    const releases = await getMovieReleaseDates(show.id);
                    return releases.map(r => ({
                        id: show.id * -1, 
                        name: show.name,
                        overview: show.overview,
                        vote_average: show.vote_average,
                        air_date: r.date,
                        episode_number: 1,
                        season_number: 0,
                        still_path: show.backdrop_path,
                        poster_path: show.poster_path,
                        show_id: show.id,
                        show_name: show.name,
                        is_movie: true,
                        release_type: r.type,
                        show_backdrop_path: show.backdrop_path
                    }));
                } else {
                    const details = await getShowDetails(show.id);
                    const eps: Episode[] = [];
                    
                    // Optimisation: Fetch last 2 seasons + specials
                    const seasonsToFetch = details.seasons?.slice(-2) || [];
                    const s0 = details.seasons?.find(s => s.season_number === 0);
                    if (s0) seasonsToFetch.push(s0);

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
                                    poster_path: details.poster_path, // Use main show poster for calendar grid
                                    season1_poster_path: sData.poster_path // Fallback for specific season art if enabled
                                });
                            });
                        } catch (e) {
                            console.warn(`Failed to fetch season ${season.season_number}`);
                        }
                    }
                    return eps;
                }
            },
            staleTime: 1000 * 60 * 60 * 6, // 6 hours cache
            enabled: hasKey && !!show.id, // CRITICAL: Don't fetch until key is present
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
