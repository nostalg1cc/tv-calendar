
const TRAKT_CLIENT_ID = 'e577265a0729792679263900976f75567793575975259727529'; // Demo ID
const TRAKT_API_URL = 'https://api.trakt.tv';

const getHeaders = (token?: string) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': localStorage.getItem('trakt_client_id') || TRAKT_CLIENT_ID
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const getDeviceCode = async (clientId: string) => {
    const res = await fetch(`${TRAKT_API_URL}/oauth/device/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId })
    });
    if (!res.ok) throw new Error('Failed to reach Trakt');
    return res.json();
};

export const pollToken = async (deviceCode: string, clientId: string, clientSecret: string) => {
    const res = await fetch(`${TRAKT_API_URL}/oauth/device/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: deviceCode,
            client_id: clientId,
            client_secret: clientSecret
        })
    });
    return { status: res.status, data: await res.json().catch(() => ({})) }; 
};

export const getTraktProfile = async (token: string) => {
    const res = await fetch(`${TRAKT_API_URL}/users/me?extended=full`, {
        headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
};

export const getWatchedHistory = async (token: string, type: 'movies' | 'shows' = 'shows') => {
    // limit to 100 for now to prevent massive payloads, or handle pagination in app
    const res = await fetch(`${TRAKT_API_URL}/sync/watched/${type}?extended=noseasons`, {
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
