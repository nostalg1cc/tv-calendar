
import { useQuery, useQueries } from '@tanstack/react-query';
import { getShowDetails, getSeasonDetails, getMovieReleaseDates, getMovieDetails } from '../services/tmdb';
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

// Heuristic: Check if show is from US broadcast network (Next Day for Intl)
// Streaming services (Netflix, etc) usually do Global Release (Same Day)
const shouldShiftDate = (networks: any[], originCountry: string[], userRegion: string) => {
    const US_BROADCASTERS = ['ABC', 'NBC', 'CBS', 'FOX', 'The CW', 'AMC', 'HBO', 'Showtime', 'Starz', 'FX', 'USA Network'];
    const AMERICAS = ['US', 'CA', 'MX', 'BR'];
    const EASTERN_REGIONS = ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'AU', 'NZ', 'JP', 'KR', 'CN', 'IN'];

    // 1. Must be from Americas
    const isFromAmericas = originCountry.some(c => AMERICAS.includes(c));
    if (!isFromAmericas) return false;

    // 2. User must be in Eastern Hemisphere
    const isUserEast = EASTERN_REGIONS.includes(userRegion);
    if (!isUserEast) return false;

    // 3. Check Network Type
    // If we have network data, check if it's a broadcaster
    if (networks && networks.length > 0) {
        const networkName = networks[0].name;
        // If it's a US broadcaster, shift it
        if (US_BROADCASTERS.some(b => networkName.includes(b))) return true;
        // If it's Netflix/Disney/Apple/Amazon, usually don't shift (Global Drop)
        return false; 
    }

    // Default Fallback if no network info: Shift if from US
    return true; 
};

export const useCalendarEpisodes = (targetDate: Date) => {
    const watchlist = useStore(state => state.watchlist);
    const user = useStore(state => state.user);
    const settings = useStore(state => state.settings);
    const hasKey = !!user?.tmdb_key;
    
    const userRegion = settings.country || getUserRegion();

    const showQueries = useQueries({
        queries: watchlist.map(show => ({
            queryKey: ['calendar_data', show.id, show.media_type, show.custom_poster_path, userRegion, settings.timeShift],
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
                    const posterToUse = show.custom_poster_path || details.poster_path;
                    
                    // Smart Shift Logic
                    const shiftDays = settings.timeShift && details.origin_country 
                        ? (shouldShiftDate(details.networks || [], details.origin_country, userRegion) ? 1 : 0)
                        : 0;

                    const seasonsToFetch = details.seasons?.slice(-2) || [];
                    const s0 = details.seasons?.find(s => s.season_number === 0);
                    if (s0 && !seasonsToFetch.some(s => s.season_number === 0)) seasonsToFetch.push(s0);

                    for (const season of seasonsToFetch) {
                        try {
                            const sData = await getSeasonDetails(show.id, season.season_number);
                            sData.episodes.forEach(e => {
                                if (e.air_date) {
                                    let finalDate = e.air_date;
                                    if (shiftDays > 0) {
                                        const d = parseISO(e.air_date);
                                        finalDate = format(addDays(d, shiftDays), 'yyyy-MM-dd');
                                    }

                                    eps.push({
                                        ...e,
                                        air_date: finalDate,
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
            staleTime: 1000 * 60 * 60 * 24,
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
