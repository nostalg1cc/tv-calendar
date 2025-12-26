
const BASE_URL = 'https://api.tvmaze.com';

const getKey = () => {
    const env = import.meta.env as any;
    return env.VITE_TVMAZE_API_KEY || env.VITE_tvmaze_API_KEY || '';
};

const getCountryName = (code: string) => {
    try {
        const names = new Intl.DisplayNames(['en'], { type: 'region' });
        return names.of(code) || code;
    } catch {
        return code;
    }
};

export const getTVMazeEpisodes = async (imdbId?: string, tvdbId?: number, countryCode: string = 'US'): Promise<Record<number, Record<number, string>>> => {
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

        const map: Record<number, Record<number, string>> = {}; 
        let usedAlternate = false;

        // 2. Try Alternate Lists (e.g. "German Premiere") if not US
        if (countryCode && countryCode !== 'US') {
            try {
                const listRes = await fetch(`${BASE_URL}/shows/${showId}/alternatelists`);
                if (listRes.ok) {
                    const lists = await listRes.json();
                    const countryName = getCountryName(countryCode);
                    
                    // Fuzzy match for country in list name (e.g. "German Premiere", "UK Airing")
                    const candidate = lists.find((l: any) => 
                        l.name && (
                            l.name.toLowerCase().includes(countryCode.toLowerCase()) || 
                            l.name.toLowerCase().includes(countryName.toLowerCase())
                        )
                    );

                    if (candidate) {
                        const epsRes = await fetch(`${BASE_URL}/alternatelists/${candidate.id}/alternateepisodes`);
                        if (epsRes.ok) {
                            const altEps = await epsRes.json();
                            altEps.forEach((ep: any) => {
                                if (ep.season && ep.number) {
                                    if (!map[ep.season]) map[ep.season] = {};
                                    // Use airstamp (ISO) if available, else airdate
                                    map[ep.season][ep.number] = ep.airstamp || ep.airdate; 
                                }
                            });
                            usedAlternate = true;
                        }
                    }
                }
            } catch (e) {
                console.warn("TVMaze Alternate List fetch failed", e);
            }
        }

        // 3. If no alternate found, use standard episodes as base
        if (!usedAlternate) {
            const res = await fetch(`${BASE_URL}/shows/${showId}/episodes`);
            if (res.ok) {
                const episodes = await res.json();
                episodes.forEach((ep: any) => {
                    if (!map[ep.season]) map[ep.season] = {};
                    // 'airstamp' is ISO 8601 with timezone (e.g., 2011-04-18T01:00:00+00:00)
                    // If we have an alternate map already partially filled (unlikely here but good practice), don't overwrite
                    if (!map[ep.season][ep.number]) {
                        map[ep.season][ep.number] = ep.airstamp || ep.airdate; 
                    }
                });
            }
        }
        
        return map;
    } catch (e) {
        console.warn("TVMaze fetch failed", e);
        return {};
    }
};
