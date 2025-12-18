import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Plus, Check, Info, ChevronRight, Loader2, Star, TrendingUp, Compass, Film, Tv } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getCollection, getBackdropUrl, getImageUrl } from '../services/tmdb';
import { TVShow, Episode } from '../types';
import V2TrailerModal from './V2TrailerModal';

const V2Discover: React.FC = () => {
    const [trailerTarget, setTrailerTarget] = useState<{showId: number, mediaType: 'tv' | 'movie'} | null>(null);

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-y-auto custom-scrollbar relative">
            <HeroBillboard onPlayTrailer={(id, type) => setTrailerTarget({ showId: id, mediaType: type })} />
            
            <div className="relative z-10 -mt-20 md:-mt-32 pb-20 space-y-8 px-6 md:px-12">
                <ContentRow 
                    title="Trending Transmissions" 
                    endpoint="/trending/all/week" 
                    mediaType="movie" 
                />
                <ContentRow 
                    title="Cinema Premieres" 
                    endpoint="/movie/now_playing" 
                    mediaType="movie" 
                />
                <ContentRow 
                    title="Serial Feeds" 
                    endpoint="/tv/popular" 
                    mediaType="tv" 
                />
                <ContentRow 
                    title="Critical Hits" 
                    endpoint="/movie/top_rated" 
                    mediaType="movie" 
                />
                <ContentRow 
                    title="Upcoming Signals" 
                    endpoint="/movie/upcoming" 
                    mediaType="movie" 
                />
            </div>

            {trailerTarget && (
                <V2TrailerModal 
                    isOpen={!!trailerTarget} 
                    onClose={() => setTrailerTarget(null)}
                    showId={trailerTarget.showId}
                    mediaType={trailerTarget.mediaType}
                />
            )}
        </div>
    );
};

const HeroBillboard: React.FC<{ onPlayTrailer: (id: number, type: 'tv' | 'movie') => void }> = ({ onPlayTrailer }) => {
    const [items, setItems] = useState<TVShow[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const { addToWatchlist, allTrackedShows } = useAppContext();
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        getCollection('/trending/all/day', 'movie', 1)
            .then(data => {
                setItems(data.slice(0, 6)); // Top 6
                setLoading(false);
            });
    }, []);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, 8000);
    }, [items.length]);

    useEffect(() => {
        if (items.length > 0) resetTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [items, resetTimer]);

    if (loading || items.length === 0) {
        return <div className="w-full h-[80vh] bg-zinc-950 animate-pulse" />;
    }

    const item = items[currentIndex];
    const isAdded = allTrackedShows.some(s => s.id === item.id);

    return (
        <div className="relative w-full h-[85vh] shrink-0 overflow-hidden group/hero">
            {/* Background Layers */}
            {items.map((bgItem, idx) => (
                <div 
                    key={bgItem.id}
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                    style={{ backgroundImage: `url(${getBackdropUrl(bgItem.backdrop_path)})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/20 to-transparent" />
                </div>
            ))}

            {/* Content Overlay */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 max-w-4xl z-20 pointer-events-none">
                <div className="pointer-events-auto space-y-6 animate-fade-in-up">
                    <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded text-[10px] font-black uppercase tracking-widest text-white">
                            {item.media_type === 'movie' ? 'Film' : 'Series'}
                        </span>
                        <div className="flex items-center gap-1 text-yellow-500 text-xs font-black">
                            <Star className="w-3.5 h-3.5 fill-current" /> {item.vote_average.toFixed(1)}
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9] drop-shadow-2xl">
                        {item.name}
                    </h1>

                    <p className="text-sm md:text-base text-zinc-300 font-medium line-clamp-3 max-w-xl leading-relaxed drop-shadow-lg">
                        {item.overview}
                    </p>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onPlayTrailer(item.id, item.media_type)}
                            className="h-12 px-8 bg-white text-black hover:bg-zinc-200 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        >
                            <Play className="w-4 h-4 fill-current" /> Initialize
                        </button>
                        <button 
                            onClick={() => !isAdded && addToWatchlist(item)}
                            disabled={isAdded}
                            className={`h-12 px-8 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all border ${isAdded ? 'bg-zinc-900/80 border-zinc-800 text-zinc-500 cursor-default' : 'bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-md'}`}
                        >
                            {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {isAdded ? 'Tracking' : 'Track'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Pagination Indicators */}
            <div className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30">
                {items.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => { setCurrentIndex(idx); resetTimer(); }}
                        className={`w-1 transition-all duration-300 ${idx === currentIndex ? 'h-12 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'h-6 bg-white/20 hover:bg-white/40'}`}
                    />
                ))}
            </div>
        </div>
    );
};

const ContentRow: React.FC<{ title: string; endpoint: string; mediaType: 'movie' | 'tv' }> = ({ title, endpoint, mediaType }) => {
    const [items, setItems] = useState<TVShow[]>([]);
    const { addToWatchlist, allTrackedShows } = useAppContext();

    useEffect(() => {
        getCollection(endpoint, mediaType, 1).then(setItems);
    }, [endpoint, mediaType]);

    if (items.length === 0) return null;

    return (
        <div className="group/section">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover/section:text-indigo-400 transition-colors">
                    {title}
                </h3>
                <div className="flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">View Database</span>
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                </div>
            </div>

            <div className="relative -mx-6 md:-mx-12 px-6 md:px-12 overflow-x-auto hide-scrollbar pb-8 pt-2">
                <div className="flex gap-4 w-max">
                    {items.map(item => {
                        const isAdded = allTrackedShows.some(s => s.id === item.id);
                        return (
                            <div 
                                key={item.id} 
                                className="relative group/card cursor-pointer w-[160px] aspect-[2/3] transition-all duration-300 ease-out hover:scale-105 hover:z-20 origin-center"
                            >
                                <div className="w-full h-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 relative shadow-xl">
                                    <img 
                                        src={getImageUrl(item.poster_path)} 
                                        alt={item.name} 
                                        loading="lazy"
                                        className={`w-full h-full object-cover transition-all duration-500 ${isAdded ? 'grayscale opacity-40' : 'group-hover/card:opacity-40'}`}
                                    />
                                    
                                    {isAdded && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 shadow-lg">
                                                <Check className="w-4 h-4 text-emerald-400" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black via-black/80 to-transparent">
                                        <h4 className="text-[11px] font-black text-white uppercase tracking-tight leading-tight mb-1 line-clamp-2">
                                            {item.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[9px] font-mono text-zinc-400">{item.first_air_date?.split('-')[0]}</span>
                                            <span className="text-[9px] font-bold text-indigo-400">{item.vote_average.toFixed(1)} ★</span>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); if(!isAdded) addToWatchlist(item); }}
                                            disabled={isAdded}
                                            className={`w-full py-2 rounded-lg font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 ${isAdded ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-zinc-200'}`}
                                        >
                                            {isAdded ? 'Linked' : <><Plus className="w-3 h-3" /> Add</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default V2Discover;