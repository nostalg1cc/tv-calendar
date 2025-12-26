
import { useQuery, useQueries } from '@tanstack/react-query';
import { getShowDetails, getSeasonDetails, getMovieReleaseDates, getMovieDetails } from '../services/tmdb';
import { getTVMazeEpisodes } from '../services/tvmaze';
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

export const useCalendarEpisodes = (targetDate: Date) => {
    const watchlist = useStore(state => state.watchlist);
    const user = useStore(state => state.user);
    const settings = useStore(state => state.settings);
    const hasKey = !!user?.tmdb_key;
    
    // Explicitly use the setting or fallback to browser locale
    const userRegion = settings.country || getUserRegion();

    const showQueries = useQueries({
        queries: watchlist.map(show => ({
            queryKey: ['calendar_data', show.id, show.media_type, show.custom_poster_path, userRegion],
            queryFn: async (): Promise<Episode[]> => {
                // --- MOVIES LOGIC ---
                if (show.media_type === 'movie') {
                    // Fetch all release dates
                    let releases = await getMovieReleaseDates(show.id, true); // true = get full list to process manually
                    
                    // Fallback to basic info if no specific releases found
                    if (releases.length === 0 && show.first_air_date) {
                        releases = [{ date: show.first_air_date, type: 'theatrical', country: 'US' }];
                    }
                    
                    const posterToUse = show.custom_poster_path || show.poster_path;
                    
                    // Logic: Find the BEST date for the User's Country
                    const userReleases = releases.filter(r => r.country === userRegion);
                    const globalReleases = releases.filter(r => r.country !== userRegion);

                    // 1. Look for Digital in User Country (Type 4=Digital, 5=Physical)
                    let bestDate = userReleases.find(r => r.type === 'digital' || r.type === 'physical');
                    
                    // 2. Look for Theatrical in User Country (Type 3=Theatrical, 2=Limited)
                    if (!bestDate) {
                        bestDate = userReleases.find(r => r.type === 'theatrical' || r.type === 'premiere');
                    }

                    // 3. Fallback: Global Earliest (Digital preferred, then Theatrical)
                    if (!bestDate) {
                         const sortedGlobal = globalReleases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                         // Prefer US digital as standard fallback
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
                            air_date: bestDate.date.split('T')[0], // YYYY-MM-DD
                            air_date_iso: bestDate.date, // Preserve full ISO for time if available
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
                    // 1. Fetch TMDB Details (for metadata)
                    const details = await getShowDetails(show.id);
                    const eps: Episode[] = [];
                    const posterToUse = show.custom_poster_path || details.poster_path;
                    
                    // 2. Fetch TVMaze Precise Dates (The Source of Truth for Airtime)
                    // Pass the user's region to attempt finding country-specific alternate lists
                    let tvmazeDates: Record<number, Record<number, string>> = {};
                    try {
                        tvmazeDates = await getTVMazeEpisodes(
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

                    // 3. Fetch Seasons and Merge Data
                    for (const season of seasonsToFetch) {
                        try {
                            const sData = await getSeasonDetails(show.id, season.season_number);
                            
                            sData.episodes.forEach(e => {
                                let finalDateStr = e.air_date; // Default YYYY-MM-DD from TMDB
                                let fullIso = e.air_date;

                                // Check TVMaze for a precise timestamp
                                const mazeDate = tvmazeDates[e.season_number]?.[e.episode_number];

                                if (mazeDate) {
                                    if (mazeDate.includes('T')) {
                                        // Precise ISO Timestamp available! (e.g. 2025-12-25T20:00:00-05:00)
                                        // Create a Date object. This automatically converts to the Browser's Local Timezone.
                                        const dateObj = new Date(mazeDate);
                                        
                                        // Format this LOCAL date as YYYY-MM-DD for the calendar bucket.
                                        // This ensures if it airs at 10PM US time on the 25th, but it's 4AM on the 26th for the user,
                                        // it appears on the 26th in their calendar.
                                        finalDateStr = format(dateObj, 'yyyy-MM-dd');
                                        fullIso = mazeDate;
                                    } else {
                                        // Just a date string from TVMaze
                                        finalDateStr = mazeDate;
                                        fullIso = mazeDate;
                                    }
                                }

                                if (finalDateStr) {
                                    eps.push({
                                        ...e,
                                        air_date: finalDateStr, // Grouping Key (Local Day)
                                        air_date_iso: fullIso,  // Display Time (Absolute or Date String)
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
            staleTime: 1000 * 60 * 60 * 12, // 12 hours
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
             // Filter based on the *local* date calculated above
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
