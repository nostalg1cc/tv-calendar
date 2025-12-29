
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { getRatings } from '../services/omdb';
import { getShowDetails, getMovieDetails } from '../services/tmdb';
import { useStore } from '../store';

interface RatingBadgeProps {
    tmdbId: number;
    mediaType: 'tv' | 'movie';
    tmdbRating: number;
    className?: string;
}

const RatingBadge: React.FC<RatingBadgeProps> = ({ tmdbId, mediaType, tmdbRating, className = "absolute top-2 right-2" }) => {
    const hasOmdbKey = useStore(state => !!state.user?.omdb_key);

    const { data: ratings, isLoading } = useQuery({
        queryKey: ['ratings', mediaType, tmdbId],
        queryFn: async () => {
            if (!hasOmdbKey) return null;
            // 1. Get External IDs
            const fetcher = mediaType === 'movie' ? getMovieDetails : getShowDetails;
            const details = await fetcher(tmdbId);
            const imdbId = details.external_ids?.imdb_id;
            
            if (!imdbId) return null;
            
            // 2. Fetch OMDB
            return getRatings(imdbId);
        },
        enabled: hasOmdbKey,
        staleTime: 1000 * 60 * 60 * 24 * 7 // Cache for a week
    });

    if (hasOmdbKey && ratings) {
        // Show OMDB Data
        return (
            <div className={`${className} flex flex-col gap-1 items-end z-20`}>
                {ratings.rt && (
                    <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md border border-white/10 rounded px-1.5 py-0.5 shadow-lg">
                        <span className="text-[#FA320A] text-[10px] font-black">RT</span>
                        <span className="text-[10px] font-bold text-white">{ratings.rt}</span>
                    </div>
                )}
                {ratings.imdb && (
                    <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md border border-white/10 rounded px-1.5 py-0.5 shadow-lg">
                        <span className="text-[#F5C518] text-[10px] font-black">IMDb</span>
                        <span className="text-[10px] font-bold text-white">{ratings.imdb}</span>
                    </div>
                )}
                {!ratings.rt && !ratings.imdb && (
                    // Fallback to TMDB style if OMDB returned nothing useful
                     <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded px-1.5 py-0.5">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="text-[10px] font-bold text-white">{tmdbRating.toFixed(1)}</span>
                    </div>
                )}
            </div>
        );
    }

    // Default TMDB Banner
    const score = tmdbRating.toFixed(1);
    let bg = 'bg-yellow-500';
    if (tmdbRating >= 7) bg = 'bg-emerald-500';
    if (tmdbRating < 5) bg = 'bg-red-500';

    return (
        <div className={`${className} flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-md px-1.5 py-0.5 z-20`}>
            <div className={`w-1.5 h-1.5 rounded-full ${bg} shadow-[0_0_8px_currentColor]`} />
            <span className="text-[10px] font-bold text-white">{score}</span>
        </div>
    );
};

export default RatingBadge;
