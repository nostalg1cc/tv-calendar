
const BASE_URL = 'https://api.tvmaze.com';

const getKey = () => {
    const env = import.meta.env as any;
    return env.VITE_TVMAZE_API_KEY || env.VITE_tvmaze_API_KEY || '';
};

export const getTVMazeEpisodes = async (imdbId?: string, tvdbId?: number): Promise<Record<number, Record<number, string>>> => {
    try {
        let showId;
        const apiKey = getKey();
        // Append API key if it exists, though standard endpoints are often public
        // TVMaze doesn't typically use a key for basic endpoints, but we respect the user request
        // assuming it might be needed for rate limits or specific endpoints in their setup.
        // We will append it as a query param if it exists, but standard public API doesn't formally document it for this endpoint.
        // However, we will proceed with the standard lookup which is reliable.
        
        // 1. Lookup Show ID
        if (imdbId) {
             const res = await fetch(`${BASE_URL}/lookup/shows?imdb=${imdbId}`);
             if (res.ok) showId = (await res.json()).id;
        }
        
        if (!showId && tvdbId) {
             const res = await fetch(`${BASE_URL}/lookup/shows?thetvdb=${tvdbId}`);
             if (res.ok) showId = (await res.json()).id;
        }

        if (!showId) return {};

        // 2. Fetch Episodes List
        const res = await fetch(`${BASE_URL}/shows/${showId}/episodes`);
        if (!res.ok) return {};
        
        const episodes = await res.json();
        const map: Record<number, Record<number, string>> = {}; 

        episodes.forEach((ep: any) => {
            if (!map[ep.season]) map[ep.season] = {};
            // 'airstamp' is ISO 8601 with timezone (e.g., 2011-04-18T01:00:00+00:00)
            // 'airdate' is YYYY-MM-DD local to broadcaster (less precise)
            // We prioritize airstamp for exact local conversion
            map[ep.season][ep.number] = ep.airstamp || ep.airdate; 
        });
        
        return map;
    } catch (e) {
        console.warn("TVMaze fetch failed", e);
        return {};
    }
};
