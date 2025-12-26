
const BASE_URL = 'https://api4.thetvdb.com/v4';
let TOKEN = '';
let TOKEN_EXP = 0;

const getKey = () => {
    // Check various common env patterns in case user didn't use VITE_ prefix
    const env = import.meta.env as any;
    return env.VITE_THETVDB_API_KEY || 
           env.VITE_THETVDB_API || 
           env.thetvdb_api || 
           '';
};

const login = async () => {
    const key = getKey();
    if (!key) return null;
    
    // Check if we have a valid token
    if (TOKEN && Date.now() < TOKEN_EXP) return TOKEN;

    try {
        const res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            body: JSON.stringify({ apikey: key }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.ok) throw new Error("Login failed");

        const data = await res.json();
        if (data.data?.token) {
            TOKEN = data.data.token;
            // Token usually lasts 1 month, but we set a conservative daily refresh
            TOKEN_EXP = Date.now() + (1000 * 60 * 60 * 24); 
            return TOKEN;
        }
    } catch (e) {
        console.warn("TheTVDB Login Failed:", e);
    }
    return null;
};

// Fetch episodes for a specific season to get exact airdates
export const getTVDBSeasonDates = async (tvdbId: number, seasonNumber: number): Promise<Record<number, string>> => {
    const token = await login();
    if (!token) return {};
    
    try {
        // Fetch official episodes for the season.
        // We use page 0. If a season has > 500 episodes this might miss some, 
        // but for standard TV this is safe and efficient.
        const res = await fetch(`${BASE_URL}/series/${tvdbId}/episodes/default?season=${seasonNumber}&page=0`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) return {};

        const json = await res.json();
        const map: Record<number, string> = {}; 
        
        if (json.data && json.data.episodes) {
             json.data.episodes.forEach((ep: any) => {
                 // Check if 'aired' exists and is a valid string
                 if (ep.aired && typeof ep.aired === 'string') {
                     map[ep.number] = ep.aired;
                 }
             });
        }
        return map;
    } catch (e) {
        // Fail silently and return empty map so app falls back to TMDB
        return {};
    }
};