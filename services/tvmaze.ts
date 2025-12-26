
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

export const getTVMazeEpisodes = async (imdbId?: string, tvdbId?: number, countryCode: string = 'US'): Promise<Record<number, Record<number, { date: string, timestamp?: string }>>> => {
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

        const map: Record<number, Record<number, { date: string, timestamp?: string }>> = {}; 
        let usedAlternate = false;

        // 2. Try Alternate Lists (e.g. "German Premiere") if not US
        if (countryCode && countryCode !== 'US') {
            try {
                const listRes = await fetch(`${BASE_URL}/shows/${showId}/alternatelists`);
                if (listRes.ok) {
                    const lists = await listRes.json();
                    const countryName = getCountryName(countryCode);
                    
                    // Fuzzy match for country in list name
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
                                    map[ep.season][ep.number] = {
                                        date: ep.airdate,
                                        timestamp: ep.airstamp // Precise ISO string
                                    };
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

        // 3. If no alternate found (or to fill gaps), use standard episodes
        // We only fetch if we haven't fully populated from alternate, or as a fallback base
        // Actually, always fetching standard is safer to ensure we have data, 
        // but we respect alternate overrides if they exist.
        
        const res = await fetch(`${BASE_URL}/shows/${showId}/episodes`);
        if (res.ok) {
            const episodes = await res.json();
            episodes.forEach((ep: any) => {
                if (!map[ep.season]) map[ep.season] = {};
                // Only write if not already set by alternate list
                if (!map[ep.season][ep.number]) {
                    map[ep.season][ep.number] = {
                        date: ep.airdate,
                        timestamp: ep.airstamp
                    };
                }
            });
        }
        
        return map;
    } catch (e) {
        console.warn("TVMaze fetch failed", e);
        return {};
    }
};
