
import { TVShow, Season, Video } from '../types';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

export const getImageUrl = (path: string | null | undefined) => path ? `${IMAGE_BASE_URL}${path}` : 'https://placehold.co/500x750?text=No+Image';
export const getBackdropUrl = (path: string | null | undefined) => path ? `${BACKDROP_BASE_URL}${path}` : 'https://placehold.co/1920x1080?text=No+Image';

// In-memory token storage for Cloud Mode compatibility
let memoryApiToken: string | null = null;

export const setApiToken = (token: string) => {
    memoryApiToken = token;
};

const getAccessToken = (): string => {
  if (memoryApiToken) return memoryApiToken;
  try {
    // Attempt to read from new V2 store
    const v2Store = localStorage.getItem('tv_calendar_v2_store');
    if (v2Store) {
        const parsed = JSON.parse(v2Store);
        if (parsed.state && parsed.state.user && parsed.state.user.tmdb_key) {
            return parsed.state.user.tmdb_key;
        }
    }

    // Fallback to legacy store
    const userStr = localStorage.getItem('tv_calendar_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.tmdb_key || user.tmdbKey || '';
    }
  } catch (e) {
    console.error("Error reading token", e);
  }
  return '';
};

// --- RATE LIMITER & QUEUE SYSTEM ---

class RequestQueue {
    private queue: Array<() => Promise<void>> = [];
    private activeRequests = 0;
    private maxConcurrent = 3; // Keep low to avoid hitting 40 req/10s limit instantly
    private lastRequestTime = 0;
    private minDelay = 250; // Minimum 250ms spacing (~4 req/sec max)

    add<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const task = async () => {
                this.activeRequests++;
                try {
                    // Spacing Logic
                    const now = Date.now();
                    const timeSinceLast = now - this.lastRequestTime;
                    if (timeSinceLast < this.minDelay) {
                        await new Promise(r => setTimeout(r, this.minDelay - timeSinceLast));
                    }
                    this.lastRequestTime = Date.now();
                    
                    const result = await fn();
                    resolve(result);
                } catch (err) {
                    reject(err);
                } finally {
                    this.activeRequests--;
                    this.next();
                }
            };
            this.queue.push(task);
            this.next();
        });
    }

    private next() {
        if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) return;
        const task = this.queue.shift();
        if (task) task();
    }
}

const apiQueue = new RequestQueue();

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Internal fetch wrapper that handles the actual network call and retries
const executeFetch = async <T>(endpoint: string, params: Record<string, string>, token: string, retries: number): Promise<T> => {
    let urlString = `${BASE_URL}${endpoint}`;
    if (endpoint.startsWith('/4')) {
        urlString = `https://api.themoviedb.org${endpoint}`;
    }

    const url = new URL(urlString);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        // Rate Limit Handling
        if (response.status === 429 && retries > 0) {
            console.warn(`Rate limit hit for ${endpoint}. Backing off...`);
            const retryHeader = response.headers.get('Retry-After');
            const waitTime = retryHeader ? (parseInt(retryHeader) * 1000) + 500 : 2000;
            
            await wait(waitTime);
            return executeFetch(endpoint, params, token, retries - 1);
        }

        // Server Error Handling
        if (response.status >= 500 && retries > 0) {
            await wait(1000);
            return executeFetch(endpoint, params, token, retries - 1);
        }

        if (response.status === 401) throw new Error("Invalid API Key.");
        
        throw new Error(`TMDB API Error: ${response.status}`);
    }

    return response.json();
};

const fetchTMDB = async <T>(endpoint: string, params: Record<string, string> = {}, retries = 3): Promise<T> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Missing TMDB API Key. Please update it in Settings.");
  }

  // Wrap execution in the queue
  return apiQueue.add(() => executeFetch<T>(endpoint, params, token, retries));
};

export const getShowDetails = async (id: number): Promise<TVShow> => {
  const data = await fetchTMDB<any>(`/tv/${id}`);
  return {
      ...data,
      media_type: 'tv',
      origin_country: data.origin_country
  };
};

export const getSeasonDetails = async (id: number, seasonNumber: number): Promise<Season> => {
    const data = await fetchTMDB<any>(`/tv/${id}/season/${seasonNumber}`);
    return {
        id: data.id,
        name: data.name,
        overview: data.overview,
        poster_path: data.poster_path,
        season_number: data.season_number,
        episodes: data.episodes.map((ep: any) => ({
            id: ep.id,
            name: ep.name,
            overview: ep.overview,
            vote_average: ep.vote_average,
            air_date: ep.air_date,
            episode_number: ep.episode_number,
            season_number: ep.season_number,
            still_path: ep.still_path
        })),
        episode_count: data.episodes.length,
        vote_average: 0 // Placeholder
    };
};

export const getMovieDetails = async (id: number): Promise<TVShow> => {
  const data = await fetchTMDB<any>(`/movie/${id}`);
  return {
    id: data.id,
    name: data.title,
    poster_path: data.poster_path,
    backdrop_path: data.backdrop_path,
    overview: data.overview,
    first_air_date: data.release_date,
    vote_average: data.vote_average,
    media_type: 'movie',
    origin_country: data.production_countries?.map((c: any) => c.iso_3166_1) || []
  };
};

export const searchShows = async (query: string): Promise<TVShow[]> => {
  if (!query) return [];
  if (/^\d+$/.test(query)) {
      const id = parseInt(query, 10);
      const results: TVShow[] = [];
      try {
          const tvDetails = await getShowDetails(id);
          if (tvDetails && tvDetails.name) results.push(tvDetails);
      } catch (e) {}
      try {
          const movieDetails = await getMovieDetails(id);
          if (movieDetails && movieDetails.name) results.push(movieDetails);
      } catch (e) {}
      if (results.length > 0) return results;
  }

  const data = await fetchTMDB<{ results: any[] }>('/search/multi', { query });
  
  return data.results
    .filter((item: any) => (item.media_type === 'tv' || item.media_type === 'movie') && item.poster_path)
    .map((item: any) => ({
      id: item.id,
      name: item.media_type === 'movie' ? item.title : item.name,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      overview: item.overview,
      first_air_date: item.media_type === 'movie' ? item.release_date : item.first_air_date,
      vote_average: item.vote_average,
      number_of_seasons: undefined,
      media_type: item.media_type,
      origin_country: item.origin_country || []
    }));
};

export const getPopularShows = async (): Promise<TVShow[]> => {
    const data = await fetchTMDB<{ results: any[] }>('/trending/all/week');
    return data.results
        .filter((item: any) => (item.media_type === 'tv' || item.media_type === 'movie') && item.poster_path)
        .map((item: any) => ({
            id: item.id,
            name: item.media_type === 'movie' ? item.title : item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            overview: item.overview,
            first_air_date: item.media_type === 'movie' ? item.release_date : item.first_air_date,
            vote_average: item.vote_average,
            media_type: item.media_type,
            origin_country: item.origin_country || []
        }));
};

export const getCollection = async (endpoint: string, mediaType: 'tv' | 'movie', page: number = 1, extraParams: Record<string, string> = {}): Promise<TVShow[]> => {
    const data = await fetchTMDB<{ results: any[] }>(endpoint, { page: page.toString(), ...extraParams });
    return data.results
      .filter((item: any) => item.poster_path)
      .map((item: any) => ({
        id: item.id,
        name: mediaType === 'movie' ? item.title : item.name,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        overview: item.overview,
        first_air_date: mediaType === 'movie' ? item.release_date : item.first_air_date,
        vote_average: item.vote_average,
        media_type: mediaType,
        origin_country: item.origin_country || []
      }));
};

export const getRecommendations = async (id: number, mediaType: 'tv' | 'movie'): Promise<TVShow[]> => {
  const endpoint = mediaType === 'movie' ? `/movie/${id}/recommendations` : `/tv/${id}/recommendations`;
  try {
      const data = await fetchTMDB<{ results: any[] }>(endpoint);
      return data.results.filter((item: any) => item.poster_path).slice(0, 4).map((item: any) => ({
          id: item.id,
          name: mediaType === 'movie' ? item.title : item.name,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          overview: item.overview,
          first_air_date: mediaType === 'movie' ? item.release_date : item.first_air_date,
          vote_average: item.vote_average,
          media_type: mediaType,
          origin_country: item.origin_country || []
        }));
  } catch (e) { return []; }
};

export const getListDetails = async (listId: string): Promise<{ name: string; items: TVShow[] }> => {
    try {
        const data = await fetchTMDB<any>(`/4/list/${listId}`, { page: '1' });
        let allItems = [...data.results];
        const totalPages = data.total_pages;
        const listName = data.name;

        if (totalPages > 1) {
            const promises = [];
            for (let i = 2; i <= totalPages; i++) {
                promises.push(fetchTMDB<any>(`/4/list/${listId}`, { page: i.toString() }));
            }
            const responses = await Promise.all(promises);
            responses.forEach(res => { allItems = [...allItems, ...res.results]; });
        }

        const items = allItems.filter((item: any) => (item.media_type === 'tv' || item.media_type === 'movie') && item.poster_path).map((item: any) => ({
            id: item.id,
            name: item.media_type === 'movie' ? item.title : item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            overview: item.overview,
            first_air_date: item.media_type === 'movie' ? item.release_date : item.first_air_date,
            vote_average: item.vote_average,
            media_type: item.media_type,
            origin_country: item.origin_country || []
        }));
        return { name: listName, items };
    } catch (e) {
        try {
            const data = await fetchTMDB<any>(`/list/${listId}`);
            const items = data.items.filter((item: any) => (item.media_type === 'tv' || item.media_type === 'movie') && item.poster_path).map((item: any) => ({
                id: item.id,
                name: item.media_type === 'movie' ? item.title : item.name,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                overview: item.overview,
                first_air_date: item.media_type === 'movie' ? item.release_date : item.first_air_date,
                vote_average: item.vote_average,
                media_type: item.media_type,
                origin_country: item.origin_country || []
            }));
            return { name: data.name, items };
        } catch (v3Error) { throw new Error("Could not find list or list is private."); }
    }
};

export const getMovieReleaseDates = async (id: number): Promise<{ date: string, type: 'theatrical' | 'digital' }[]> => {
    try {
        const data = await fetchTMDB<{ results: any[] }>(`/movie/${id}/release_dates`);
        const usRelease = data.results.find((r: any) => r.iso_3166_1 === 'US');
        if (!usRelease) return [];
        const releases: { date: string, type: 'theatrical' | 'digital' }[] = [];
        const theatrical = usRelease.release_dates.filter((d: any) => d.type === 3).sort((a: any, b: any) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())[0];
        if (theatrical) releases.push({ date: theatrical.release_date.split('T')[0], type: 'theatrical' });
        const digital = usRelease.release_dates.filter((d: any) => d.type === 4 || d.type === 5).sort((a: any, b: any) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())[0];
        if (digital) releases.push({ date: digital.release_date.split('T')[0], type: 'digital' });
        return releases;
    } catch (e) { return []; }
};

export const getVideos = async (mediaType: 'movie' | 'tv', id: number, season?: number, episode?: number): Promise<Video[]> => {
    try {
        let endpoint = `/${mediaType}/${id}`;
        if (mediaType === 'tv') {
            if (season !== undefined) endpoint += `/season/${season}`;
            if (episode !== undefined) endpoint += `/episode/${episode}`;
        }
        endpoint += '/videos';
        const data = await fetchTMDB<{ results: Video[] }>(endpoint);
        const typeOrder = { 'Trailer': 3, 'Teaser': 2, 'Clip': 1, 'Featurette': 0, 'Behind the Scenes': 0 };
        return data.results.filter(v => v.site === 'YouTube').sort((a, b) => {
            const scoreA = (typeOrder[a.type as keyof typeof typeOrder] || 0);
            const scoreB = (typeOrder[b.type as keyof typeof typeOrder] || 0);
            return scoreB - scoreA;
        });
    } catch (e) { return []; }
};
