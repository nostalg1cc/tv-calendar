
const TRAKT_API_URL = 'https://api.trakt.tv';

const getCredentials = () => ({
    clientId: localStorage.getItem('trakt_client_id') || '',
    clientSecret: localStorage.getItem('trakt_client_secret') || ''
});

const getHeaders = (token?: string) => {
    const { clientId } = getCredentials();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': clientId
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const getDeviceCode = async () => {
    const { clientId } = getCredentials();
    if (!clientId) throw new Error("Missing Trakt Client ID");

    const res = await fetch(`${TRAKT_API_URL}/oauth/device/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId })
    });
    
    if (!res.ok) {
        const txt = await res.text();
        console.error("Trakt Auth Error:", txt);
        throw new Error(`Trakt Error: ${res.statusText}`);
    }
    return res.json();
};

export const pollToken = async (deviceCode: string) => {
    const { clientId, clientSecret } = getCredentials();
    if (!clientId || !clientSecret) throw new Error("Missing Credentials");

    const body: any = {
        code: deviceCode,
        client_id: clientId,
        client_secret: clientSecret
    };

    const res = await fetch(`${TRAKT_API_URL}/oauth/device/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    // Return raw status for polling logic (200=OK, 400=Pending)
    return { status: res.status, data: await res.json().catch(() => ({})) }; 
};

export const getTraktProfile = async (token: string) => {
    const res = await fetch(`${TRAKT_API_URL}/users/me?extended=full`, {
        headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
};

export const getTraktCalendar = async (token: string, startDate: string, days: number) => {
    const res = await fetch(`${TRAKT_API_URL}/calendars/my/shows/${startDate}/${days}`, {
        headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch calendar');
    return res.json();
};

export const getTraktMovieCalendar = async (token: string, startDate: string, days: number, type: 'movies' | 'dvd') => {
    const res = await fetch(`${TRAKT_API_URL}/calendars/my/${type}/${startDate}/${days}`, {
        headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
};

export const getWatchedHistory = async (token: string, type: 'movies' | 'shows' = 'shows') => {
    // Fetch full history (remove extended=noseasons to get episodes)
    const res = await fetch(`${TRAKT_API_URL}/sync/watched/${type}`, {
        headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
};

export const getShowProgress = async (token: string, traktShowId: number) => {
    const res = await fetch(`${TRAKT_API_URL}/shows/${traktShowId}/progress/watched`, {
        headers: getHeaders(token)
    });
    if (!res.ok) return null;
    return res.json();
};

export const syncHistory = async (token: string, items: any, action: 'add' | 'remove') => {
    const endpoint = action === 'add' ? 'sync/history' : 'sync/history/remove';
    const res = await fetch(`${TRAKT_API_URL}/${endpoint}`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(items)
    });
    if (!res.ok) throw new Error('Failed to sync history');
    return res.json();
};

export const getTraktIdFromTmdbId = async (tmdbId: number, type: 'movie' | 'show') => {
    const res = await fetch(`${TRAKT_API_URL}/search/tmdb/${tmdbId}?type=${type}`, {
        headers: getHeaders()
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0]?.show?.ids?.trakt || data[0]?.movie?.ids?.trakt;
};

export const getTraktSeason = async (traktId: string | number, season: number) => {
    const res = await fetch(`${TRAKT_API_URL}/shows/${traktId}/seasons/${season}?extended=full`, {
         headers: getHeaders()
    });
    if (!res.ok) return [];
    return res.json();
};

export const getTraktShowSummary = async (traktId: string | number) => {
    const res = await fetch(`${TRAKT_API_URL}/shows/${traktId}?extended=full`, {
         headers: getHeaders()
    });
    if (!res.ok) return null;
    return res.json();
};
