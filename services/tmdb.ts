
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

// Helper to get token securely
const getAccessToken = (): string => {
  // 1. Prefer in-memory token (Cloud Mode / Active Session)
  if (memoryApiToken) return memoryApiToken;

  // 2. Fallback to LocalStorage (Local Mode / Persistence)
  try {
    const userStr = localStorage.getItem('tv_calendar_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.tmdbKey || '';
    }
  } catch (e) {
    console.error("Error reading token", e);
  }
  return '';
};

// Retry helper
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchTMDB = async <T>(endpoint: string, params: Record<string, string> = {}, retries = 3): Promise<T> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Missing TMDB API Key. Please update it in Settings.");
  }

  let urlString = `${BASE_URL}${endpoint}`;
  
  // Support v4 endpoints by overriding base URL
  if (endpoint.startsWith('/4')) {
    urlString = `https://api.themoviedb.org${endpoint}`;
  }

  const url = new URL(urlString);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // Rate Limiting Logic: 429 Too Many Requests
        if (response.status === 429 && retries > 0) {
            console.warn(`Rate limit hit for ${endpoint}. Retrying...`);
            const retryAfter = response.headers.get('Retry-After');
            // Improved Exponential Backoff:
            // If Retry-After exists, use it.
            // If not, scale: 1.5s, 3s, 6s...
            let delay = retryAfter ? parseInt(retryAfter) * 1000 : 1500 * (4 - retries); 
            
            // Add jitter
            delay += Math.random() * 500;
            
            await wait(delay);
            return fetchTMDB(endpoint, params, retries - 1);
        }

        if (response.status === 401) {
           throw new Error("Invalid API Key. Please check your credentials.");
        }
        
        // General Retry for 5xx server errors
        if (response.status >= 500 && retries > 0) {
             await wait(1000);
             return fetchTMDB(endpoint, params, retries - 1);
        }

        throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
      }
      return response.json();

  } catch (error: any) {
      // Retry network errors (fetch throws on network failure)
      if (retries > 0 && !error.message?.includes("Invalid API Key")) {
          await wait(1500);
          return fetchTMDB(endpoint, params, retries - 1);
      }
      throw error;
  }
};

export const getShowDetails = async (id: number): Promise<TVShow> => {
  const data = await fetchTMDB<any>(`/tv/${id}`);
  return {
      ...data,
      media_type: 'tv',
      origin_country: data.origin_country // Pass this through for timezone logic
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
        }))
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

  // Check if query is a numeric ID
  if (/^\d+$/.test(query)) {
      const id = parseInt(query, 10);
      const results: TVShow[] = [];

      // Try fetching as TV Show
      try {
          const tvDetails = await getShowDetails(id);
          if (tvDetails && tvDetails.name) {
              results.push(tvDetails);
          }
      } catch (e) {
          // Ignore 404
      }

      // Try fetching as Movie
      try {
          const movieDetails = await getMovieDetails(id);
          if (movieDetails && movieDetails.name) {
              results.push(movieDetails);
          }
      } catch (e) {
          // Ignore 404
      }

      if (results.length > 0) {
          return results;
      }
  }

  // Use multi search to get TV and Movies (Default text search)
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
      number_of_seasons: undefined, // Explicitly undefined so logic fetches real details
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

// Generic fetcher for lists (Popular, Top Rated, etc) with pagination and optional params
export const getCollection = async (
    endpoint: string, 
    mediaType: 'tv' | 'movie', 
    page: number = 1,
    extraParams: Record<string, string> = {}
): Promise<TVShow[]> => {
    const data = await fetchTMDB<{ results: any[] }>(endpoint, { 
        page: page.toString(), 
        ...extraParams 
    });
    
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

// Fetch recommendations based on what the user just added
export const getRecommendations = async (id: number, mediaType: 'tv' | 'movie'): Promise<TVShow[]> => {
  const endpoint = mediaType === 'movie' ? `/movie/${id}/recommendations` : `/tv/${id}/recommendations`;
  try {
      const data = await fetchTMDB<{ results: any[] }>(endpoint);
      
      return data.results
        .filter((item: any) => item.poster_path)
        .slice(0, 4) // Return top 4 recommendations
        .map((item: any) => ({
          id: item.id,
          name: mediaType === 'movie' ? item.title : item.name,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          overview: item.overview,
          first_air_date: mediaType === 'movie' ? item.release_date : item.first_air_date,
          vote_average: item.vote_average,
          number_of_seasons: undefined, // Explicitly undefined
          media_type: mediaType,
          origin_country: item.origin_country || []
        }));
  } catch (e) {
      console.warn("Failed to fetch recommendations", e);
      return [];
  }
};

export const getListDetails = async (listId: string): Promise<{ name: string; items: TVShow[] }> => {
    try {
        // v4 lists endpoint
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
            responses.forEach(res => {
                allItems = [...allItems, ...res.results];
            });
        }

        const items = allItems
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
            
        return { name: listName, items };

    } catch (e) {
        try {
            const data = await fetchTMDB<any>(`/list/${listId}`); // Uses v3 base
            const items = data.items
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
            return { name: data.name, items };
        } catch (v3Error) {
             console.error("Failed to fetch list", v3Error);
             throw new Error("Could not find list or list is private.");
        }
    }
};

export const getMovieReleaseDates = async (id: number): Promise<{ date: string, type: 'theatrical' | 'digital' }[]> => {
    try {
        const data = await fetchTMDB<{ results: any[] }>(`/movie/${id}/release_dates`);
        const usRelease = data.results.find((r: any) => r.iso_3166_1 === 'US');
        
        if (!usRelease) return [];

        const releases: { date: string, type: 'theatrical' | 'digital' }[] = [];
        
        const theatrical = usRelease.release_dates
            .filter((d: any) => d.type === 3)
            .sort((a: any, b: any) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())[0];

        if (theatrical) {
            releases.push({ date: theatrical.release_date.split('T')[0], type: 'theatrical' });
        }

        const digital = usRelease.release_dates
            .filter((d: any) => d.type === 4 || d.type === 5)
            .sort((a: any, b: any) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())[0];

        if (digital) {
            releases.push({ date: digital.release_date.split('T')[0], type: 'digital' });
        }
        
        return releases;
    } catch (e) {
        console.warn("Failed to fetch release dates", e);
        return [];
    }
};

// Fetch videos for various scopes
export const getVideos = async (
    mediaType: 'movie' | 'tv', 
    id: number, 
    season?: number, 
    episode?: number
): Promise<Video[]> => {
    try {
        let endpoint = `/${mediaType}/${id}`;
        
        if (mediaType === 'tv') {
            if (season !== undefined) endpoint += `/season/${season}`;
            if (episode !== undefined) endpoint += `/episode/${episode}`;
        }
        
        endpoint += '/videos';
        
        const data = await fetchTMDB<{ results: Video[] }>(endpoint);
        
        // Filter for YouTube only and sort by official status + type
        // Prioritize: Trailer > Teaser > Clip
        const typeOrder = { 'Trailer': 3, 'Teaser': 2, 'Clip': 1, 'Featurette': 0, 'Behind the Scenes': 0 };
        
        return data.results
            .filter(v => v.site === 'YouTube')
            .sort((a, b) => {
                const scoreA = (typeOrder[a.type as keyof typeof typeOrder] || 0);
                const scoreB = (typeOrder[b.type as keyof typeof typeOrder] || 0);
                return scoreB - scoreA;
            });
    } catch (e) {
        console.warn(`Failed to fetch videos for ${mediaType}/${id}`, e);
        return [];
    }
};
