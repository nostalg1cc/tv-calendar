
export interface Ratings {
    imdb?: string;
    rt?: string;
    metacritic?: string;
}

// Service deprecated/disabled
export const getRatings = async (imdbId: string): Promise<Ratings | null> => {
    return null;
};
