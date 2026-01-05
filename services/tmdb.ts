
import { TVShow, Episode, Season, Video } from '../types';

const BASE_URL = 'https://api.themoviedb.org/3';
let API_KEY = '';

export const setApiToken = (key: string) => {
    API_KEY = key;
};

// --- Concurrency Control ---
const MAX_CONCURRENT = 4;
const queue: (() => Promise<void>)[] = [];
let activeCount = 0;

const processQueue = () => {
    if (activeCount >= MAX_CONCURRENT || queue.length === 0) return;
    
    activeCount++;
    const nextTask = queue.shift();
    if (nextTask) nextTask();
};

const enqueueFetch = <T>(fetcher: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
        const task = async () => {
            try {
                const result = await fetcher();
                resolve(result);
            } catch (err) {
                reject(err);
            } finally {
                activeCount--;
                processQueue();
            }
        };
        queue.push(task);
        processQueue();
    });
};

const fetchTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
    return enqueueFetch(async () => {
        if (!API_KEY) {
            const stored = localStorage.getItem('tv_calendar_v2_store');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.state?.user?.tmdb_key) {
                        API_KEY = parsed.state.user.tmdb_key;
                    }
                } catch (e) { }
            }
        }

        if (!API_KEY) throw new Error("API Key missing");

        const isBearer = API_KEY.length > 60; // Heuristic: v3 keys are ~32 chars, v4 JWTs are huge.
        
        const url = new URL(`${BASE_URL}${endpoint}`);
        
        if (!isBearer) {
             url.searchParams.append('api_key', API_KEY);
        }
        
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (isBearer) {
            headers['Authorization'] = `Bearer ${API_KEY}`;
        }

        const response = await fetch(url.toString(), { headers });
        if (!response.ok) throw new Error(`TMDB API Error: ${response.statusText}`);
        return response.json();
    });
};

export const getImageUrl = (path: string | null | undefined, size: string = 'w500') => {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const getBackdropUrl = (path: string | null | undefined) => {
    if (!path) return 'https://via.placeholder.com/1920x1080?text=No+Image';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `https://image.tmdb.org/t/p/original${path}`;
};

export const searchShows = async (query: string): Promise<TVShow[]> => {
    const data = await fetchTMDB<{ results: any[] }>('/search/multi', { query });
    return data.results
        .filter((item: any) => item.media_type === 'tv' || item.media_type === 'movie')
        .map(mapShow);
};

export const getPopularShows = async (): Promise<TVShow[]> => {
    const data = await fetchTMDB<{ results: any[] }>('/trending/all/week');
    return data.results.map(mapShow);
};

export const getRecommendations = async (id: number, type: 'tv' | 'movie'): Promise<TVShow[]> => {
    const data = await fetchTMDB<{ results: any[] }>(`/${type}/${id}/recommendations`);
    return data.results.map(item => mapShow({ ...item, media_type: type }));
};

export const getListDetails = async (listId: string): Promise<{ name: string, items: TVShow[] }> => {
    const data = await fetchTMDB<{ name: string, items: any[] }>(`/list/${listId}`);
    return {
        name: data.name,
        items: data.items.map(mapShow)
    };
};

export const getCollection = async (endpoint: string, mediaType: 'tv' | 'movie', page: number = 1, params: Record<string, string> = {}): Promise<TVShow[]> => {
    const data = await fetchTMDB<{ results: any[] }>(endpoint, { page: page.toString(), ...params });
    return data.results.map(item => mapShow({ ...item, media_type: mediaType }));
};

export const getVideos = async (mediaType: 'tv' | 'movie', id: number, season?: number, episode?: number): Promise<Video[]> => {
    let endpoint = `/${mediaType}/${id}`;
    if (season !== undefined) endpoint += `/season/${season}`;
    if (episode !== undefined) endpoint += `/episode/${episode}`;
    endpoint += '/videos';

    try {
        const data = await fetchTMDB<{ results: any[] }>(endpoint);
        return data.results.map((v: any) => ({
            id: v.id,
            key: v.key,
            name: v.name,
            site: v.site,
            type: v.type
        }));
    } catch (e) {
        return [];
    }
};

export const getShowDetails = async (id: number): Promise<TVShow> => {
    // Request external_ids and credits
    const data = await fetchTMDB<any>(`/tv/${id}?append_to_response=external_ids,credits`);
    const show = mapShow({ ...data, media_type: 'tv' });
    if (data.external_ids) show.external_ids = data.external_ids;
    if (data.credits) show.credits = data.credits;
    if (data.status) show.status = data.status;
    if (data.genres) show.genres = data.genres;
    // TV show runtime usually comes in episode_run_time array
    if (data.episode_run_time && data.episode_run_time.length > 0) show.runtime = data.episode_run_time[0];
    return show;
};

export const getMovieDetails = async (id: number): Promise<TVShow> => {
    const data = await fetchTMDB<any>(`/movie/${id}?append_to_response=credits`);
    const movie = mapShow({ ...data, media_type: 'movie' });
    if (data.credits) movie.credits = data.credits;
    if (data.status) movie.status = data.status;
    if (data.genres) movie.genres = data.genres;
    if (data.runtime) movie.runtime = data.runtime;
    return movie;
};

export const getSeasonDetails = async (id: number, seasonNumber: number): Promise<Season> => {
    const data = await fetchTMDB<any>(`/tv/${id}/season/${seasonNumber}`);
    return {
        id: data.id,
        name: data.name,
        overview: data.overview,
        poster_path: data.poster_path,
        season_number: data.season_number,
        episode_count: data.episodes?.length || 0,
        vote_average: data.vote_average,
        episodes: data.episodes.map((e: any) => ({
            id: e.id,
            name: e.name,
            overview: e.overview,
            vote_average: e.vote_average,
            air_date: e.air_date,
            episode_number: e.episode_number,
            season_number: e.season_number,
            still_path: e.still_path,
            show_id: id,
            show_name: '',
            is_movie: false
        }))
    };
};

export const getMovieReleaseDates = async (id: number, fullList: boolean = false): Promise<{ date: string, type: 'theatrical' | 'digital' | 'physical' | 'premiere', country: string }[]> => {
    try {
        const data = await fetchTMDB<{ results: any[] }>(`/movie/${id}/release_dates`);
        const results = data.results;
        const releases: any[] = [];

        const typeMap: Record<number, string> = { 1: 'premiere', 2: 'theatrical', 3: 'theatrical', 4: 'digital', 5: 'physical', 6: 'tv' };

        if (fullList) {
            results.forEach((countryData: any) => {
                countryData.release_dates.forEach((d: any) => {
                    if (typeMap[d.type]) {
                         releases.push({
                             date: d.release_date.split('T')[0],
                             type: typeMap[d.type],
                             country: countryData.iso_3166_1
                         });
                    }
                });
            });
            return releases;
        } else {
            const processType = (typeCodes: number[], typeName: string) => {
                let candidates: any[] = [];
                
                results.forEach((countryData: any) => {
                    const dates = countryData.release_dates.filter((d: any) => typeCodes.includes(d.type));
                    dates.forEach((d: any) => {
                         candidates.push({ 
                             date: d.release_date, 
                             type: typeName, 
                             country: countryData.iso_3166_1 
                         });
                    });
                });

                candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                const us = candidates.find(c => c.country === 'US');
                const earliest = candidates[0];

                if (us) {
                    releases.push({ date: us.date.split('T')[0], type: typeName, country: 'US' });
                }
                
                if (earliest && (!us || earliest.country !== 'US')) {
                    releases.push({ date: earliest.date.split('T')[0], type: typeName, country: earliest.country });
                }
            };

            processType([3, 2], 'theatrical');
            processType([4], 'digital');
            processType([5], 'physical'); 
            processType([1], 'premiere');

            const unique = releases.filter((v, i, a) => a.findIndex(t => (t.type === v.type && t.date === v.date && t.country === v.country)) === i);
            
            return unique.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
    } catch (e) { return []; }
};

export const getShowImages = async (mediaType: 'tv' | 'movie', id: number) => {
    const data = await fetchTMDB<any>(`/${mediaType}/${id}/images`);
    return {
        posters: data.posters || [],
        backdrops: data.backdrops || [],
        logos: data.logos || []
    };
};

export const getPersonDetails = async (id: number) => {
    return await fetchTMDB<any>(`/person/${id}`);
};

export const getPersonCredits = async (id: number) => {
    const data = await fetchTMDB<any>(`/person/${id}/combined_credits`);
    const cast = data.cast || [];
    // Filter out items without posters and sort by popularity
    return cast
        .filter((item: any) => item.poster_path)
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .map(mapShow);
};

const mapShow = (data: any): TVShow => ({
    id: data.id,
    name: data.title || data.name,
    poster_path: data.poster_path,
    backdrop_path: data.backdrop_path,
    overview: data.overview,
    first_air_date: data.release_date || data.first_air_date,
    vote_average: data.vote_average,
    media_type: data.media_type || (data.title ? 'movie' : 'tv'),
    origin_country: data.origin_country,
    seasons: data.seasons,
    original_language: data.original_language,
    networks: data.networks 
});
