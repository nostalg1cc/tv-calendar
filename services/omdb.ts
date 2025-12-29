
import { useStore } from '../store';

const BASE_URL = 'https://www.omdbapi.com/';

export interface Ratings {
    imdb?: string;
    rt?: string;
    metacritic?: string;
}

export const getRatings = async (imdbId: string): Promise<Ratings | null> => {
    // Access store directly to avoid passing user object everywhere
    // Note: This relies on the store being initialized
    let apiKey: string | undefined;
    try {
         apiKey = useStore.getState().user?.omdb_key;
    } catch {
        // Fallback or early init
    }
    
    if (!apiKey || !imdbId) return null;

    try {
        const res = await fetch(`${BASE_URL}?i=${imdbId}&apikey=${apiKey}`);
        const data = await res.json();
        
        if (data.Response === 'True') {
            const ratings: Ratings = {
                imdb: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : undefined,
            };
            
            if (data.Ratings && Array.isArray(data.Ratings)) {
                data.Ratings.forEach((r: any) => {
                    if (r.Source === 'Rotten Tomatoes') ratings.rt = r.Value;
                    if (r.Source === 'Metacritic') ratings.metacritic = r.Value;
                });
            }
            
            return ratings;
        }
    } catch (e) {
        console.error("OMDB Fetch Error", e);
    }
    return null;
};
