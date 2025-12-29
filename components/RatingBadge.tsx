
import React from 'react';

interface RatingBadgeProps {
    rating: number; // TMDB Vote Average
    className?: string;
}

const RatingBadge: React.FC<RatingBadgeProps> = ({ rating, className = "absolute top-2 right-2" }) => {
    // Default fallback if rating is missing
    const score = (rating || 0).toFixed(1);
    
    // Color Logic
    let bg = 'bg-zinc-600';
    if (rating >= 7) bg = 'bg-emerald-500';
    else if (rating >= 5) bg = 'bg-yellow-500';
    else if (rating > 0) bg = 'bg-red-500';

    if (!rating || rating === 0) return null;

    return (
        <div className={`${className} flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-md px-1.5 py-0.5 z-20 pointer-events-none shadow-sm`}>
            <div className={`w-1.5 h-1.5 rounded-full ${bg} shadow-[0_0_6px_currentColor]`} />
            <span className="text-[10px] font-bold text-white leading-none font-mono">{score}</span>
        </div>
    );
};

export default RatingBadge;
