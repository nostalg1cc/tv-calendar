
import { useQuery, useQueries } from '@tanstack/react-query';
import { getShowDetails, getSeasonDetails, getMovieReleaseDates, getMovieDetails } from '../services/tmdb';
import { Episode } from '../types';
import { useStore } from '../store';
import { parseISO, subMonths, addMonths, addDays, format } from 'date-fns';

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

const getUserRegion = () => {
    try {
        const lang = navigator.language || 'en-US';
        if (lang.includes('-')) return lang.split('-')[1].toUpperCase();
        return 'US'; 
    } catch {
        return 'US';
    }
};

// Heuristic to check if we should shift date forward (e.g. US show watched in Europe)
const shouldShiftDate = (originCountry: string[], userRegion: string) => {
    const AMERICAS = ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE'];
    const EASTERN_HEMISPHERE_REGIONS = [
        'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'PT', // Europe
        'AU', 'NZ', // Oceania
        'JP', 'KR', 'CN', 'IN', 'RU', 'SG', 'MY', 'PH', 'TH', 'VN' // Asia
    ];

    // If show is from Americas
    const isFromAmericas = originCountry.some(c => AMERICAS.includes(c));
    
    // And user is in East
    const isUserEast = EASTERN_HEMISPHERE_REGIONS.includes(userRegion);

    return isFromAmericas && isUserEast;
};

export const useCalendarEpisodes = (targetDate: Date) => {
    const watchlist = useStore(state => state.watchlist);
    const user = useStore(state => state.user);
    const settings = useStore(state => state.settings);
    const hasKey = !!user?.tmdb_key;
    
    // Prefer user setting, fallback to browser detection
    const userRegion = settings.country || getUserRegion();

    const showQueries = useQueries({
        queries: watchlist.map(show => ({
            queryKey: ['calendar_data', show.id, show.media_type, show.custom_poster_path, userRegion, settings.timeShift],
            queryFn: async (): Promise<Episode[]> => {
                if (show.media_type === 'movie') {
                    let releases = await getMovieReleaseDates(show.id);
                    
                    // Fallback: If no dates found, use global release
                    if (releases.length === 0 && show.first_air_date) {
                        releases = [{ date: show.first_air_date, type: 'theatrical', country: 'US' }];
                    }
                    
                    const posterToUse = show.custom_poster_path || show.poster_path;

                    // Categories: 
                    // Theatrical = theatrical (3), premiere (1)
                    // Digital = digital (4), physical (5)
                    const relevantReleases: any[] = [];
                    
                    const processCategory = (types: string[]) => {
                         const candidates = releases.filter(r => types.includes(r.type));
                         if (candidates.length > 0) {
                             // 1. Try to find user region match
                             let best = candidates.find(r => r.country === userRegion);
                             // 2. If not found, use the earliest one (candidates are typically sorted by date in getMovieReleaseDates)
                             if (!best) {
                                 // Sort by date just to be sure
                                 const sorted = [...candidates].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                 best = sorted[0];
                             }
                             if (best) relevantReleases.push(best);
                         }
                    };

                    processCategory(['theatrical', 'premiere']);
                    processCategory(['digital', 'physical']);

                    return relevantReleases.map(r => {
                        // Map specific types to generic categories for UI compatibility
                        let normalizedType: 'theatrical' | 'digital' = 'theatrical';
                        if (r.type === 'digital' || r.type === 'physical') normalizedType = 'digital';
                        
                        return {
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
                            release_type: normalizedType,
                            release_country: r.country,
                            show_backdrop_path: show.backdrop_path
                        };
                    });
                } else {
                    const details = await getShowDetails(show.id);
                    const eps: Episode[] = [];
                    
                    // Prioritize user selected poster
                    const posterToUse = show.custom_poster_path || details.poster_path;
                    
                    // Determine if we need to shift date based on origin vs user location
                    const needsShift = settings.timeShift && details.origin_country 
                        ? shouldShiftDate(details.origin_country, userRegion)
                        : false;

                    // Optimisation: Fetch last 2 seasons + specials
                    const seasonsToFetch = details.seasons?.slice(-2) || [];
                    const s0 = details.seasons?.find(s => s.season_number === 0);
                    if (s0 && !seasonsToFetch.some(s => s.season_number === 0)) seasonsToFetch.push(s0);

                    for (const season of seasonsToFetch) {
                        try {
                            const sData = await getSeasonDetails(show.id, season.season_number);
                            sData.episodes.forEach(e => {
                                if (e.air_date) {
                                    let finalDate = e.air_date;
                                    
                                    // Apply Time Shift if necessary
                                    if (needsShift) {
                                        const d = parseISO(e.air_date);
                                        finalDate = format(addDays(d, 1), 'yyyy-MM-dd');
                                    }

                                    eps.push({
                                        ...e,
                                        air_date: finalDate, // Override with shifted date
                                        show_id: show.id,
                                        show_name: show.name,
                                        is_movie: false,
                                        show_backdrop_path: details.backdrop_path,
                                        poster_path: posterToUse, // Use custom or refreshed show poster
                                        season1_poster_path: sData.poster_path // Keep season specific as fallback
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
