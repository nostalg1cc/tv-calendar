
const BASE_URL = 'https://api.tvmaze.com';

// Simple rate limiter to be nice to their API
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getTVMazeEpisodes = async (imdbId?: string, tvdbId?: number): Promise<Record<number, Record<number, string>>> => {
    try {
        let showId;
        
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
        // TVMaze API is fast, but let's add a tiny buffer if hitting it hard in a loop
        // (handled by caller concurrency usually, but safe to keep simple here)
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
