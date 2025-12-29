
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Plus, Check, Info, ChevronRight, Star, Ticket, MonitorPlay, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { getCollection, getBackdropUrl, getImageUrl, getRecommendations } from '../services/tmdb';
import { TVShow } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import V2TrailerModal from './V2TrailerModal';
import RatingBadge from '../components/RatingBadge';

const V2Discover: React.FC = () => {
    const { watchlist, addToWatchlist } = useStore();
    const [heroItems, setHeroItems] = useState<TVShow[]>([]);
    const [heroIndex, setHeroIndex] = useState(0);
    
    // Personalized Recommendation State
    const [recSource, setRecSource] = useState<TVShow | null>(null);
    const [recommendations, setRecommendations] = useState<TVShow[]>([]);

    // Modals
    const [detailsId, setDetailsId] = useState<{id: number, type: 'tv'|'movie'} | null>(null);
    const [trailerId, setTrailerId] = useState<{id: number, type: 'tv'|'movie'} | null>(null);

    // Section Data
    const [trending, setTrending] = useState<TVShow[]>([]);
    const [topHorror, setTopHorror] = useState<TVShow[]>([]);
    const [topAction, setTopAction] = useState<TVShow[]>([]);
    const [inTheaters, setInTheaters] = useState<TVShow[]>([]);

    useEffect(() => {
        // 1. Fetch Hero & Trending
        getCollection('/trending/all/week', 'movie').then(data => {
            setHeroItems(data.slice(0, 5));
            setTrending(data.slice(0, 10)); // Top 10
        });

        // 2. Fetch Personalized Recs
        if (watchlist.length > 0) {
            const random = watchlist[Math.floor(Math.random() * watchlist.length)];
            setRecSource(random);
            getRecommendations(random.id, random.media_type).then(setRecommendations);
        }

        // 3. Fetch Genre Lists
        getCollection('/discover/movie', 'movie', 1, { with_genres: '27', sort_by: 'vote_average.desc', 'vote_count.gte': '300' }).then(setTopHorror);
        getCollection('/discover/movie', 'movie', 1, { with_genres: '28', sort_by: 'popularity.desc' }).then(setTopAction);
        getCollection('/movie/now_playing', 'movie', 1).then(setInTheaters);

    }, []);

    // Hero Auto-Rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setHeroItems(prev => {
                if (prev.length === 0) return [];
                setHeroIndex(curr => (curr + 1) % prev.length);
                return prev;
            });
        }, 8000);
        return () => clearInterval(interval);
    }, [heroItems]);

    const handleAdd = (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        addToWatchlist(show);
    };

    const HeroSection = () => {
        if (heroItems.length === 0) return <div className="h-[70vh] bg-zinc-900 animate-pulse" />;
        const item = heroItems[heroIndex];
        const isAdded = watchlist.some(w => w.id === item.id);

        return (
            <div className="relative w-full h-[70vh] group">
                <div className="absolute inset-0 bg-cover bg-center transition-all duration-700" style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path)})` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/30 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#020202]/90 via-transparent to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full max-w-4xl pb-24">
                    <div className="flex items-center gap-3 mb-4 opacity-0 animate-fade-in-up" key={item.id + 'badge'}>
                        <div className="px-2 py-0.5 rounded border border-white/20 bg-white/10 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white">
                            #{heroIndex + 1} Trending
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                            <Star className="w-3.5 h-3.5 fill-current" /> {item.vote_average.toFixed(1)}
                        </div>
                    </div>
                    
                    <h1 className="text-4xl md:text-6xl font-black text-white leading-[0.9] tracking-tighter mb-4 drop-shadow-2xl opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }} key={item.id + 'title'}>
                        {item.name}
                    </h1>
                    
                    <p className="text-zinc-300 text-sm md:text-base line-clamp-3 mb-8 max-w-xl font-medium drop-shadow-md leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }} key={item.id + 'desc'}>
                        {item.overview}
                    </p>

                    <div className="flex items-center gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms' }} key={item.id + 'btns'}>
                         <button 
                            onClick={() => setTrailerId({ id: item.id, type: item.media_type })}
                            className="h-12 px-6 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <Play className="w-5 h-5 fill-current" /> Trailer
                        </button>
                        <button 
                            onClick={() => setDetailsId({ id: item.id, type: item.media_type })}
                            className="h-12 px-6 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <Info className="w-5 h-5" /> Info
                        </button>
                        <button 
                            onClick={(e) => handleAdd(e, item)}
                            disabled={isAdded}
                            className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all ${isAdded ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}
                        >
                            {isAdded ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Dots */}
                <div className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                    {heroItems.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setHeroIndex(idx)}
                            className={`w-1.5 transition-all duration-300 rounded-full ${idx === heroIndex ? 'h-12 bg-white' : 'h-2 bg-white/20 hover:bg-white/50'}`}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const Section = ({ title, items, isTop10, icon: Icon }: any) => {
        if (!items || items.length === 0) return null;

        return (
            <div className="py-6 group/section">
                <div className="px-6 md:px-16 flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                         {Icon && <Icon className="w-5 h-5 text-indigo-500" />} {title}
                    </h3>
                    <button className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
                        View All <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
                
                <div className="overflow-x-auto hide-scrollbar px-6 md:px-16 pb-8 -mx-0 w-full">
                    <div className="flex gap-4 w-max items-end">
                        {items.map((show: TVShow, idx: number) => {
                            const isAdded = watchlist.some(w => w.id === show.id);
                            
                            if (isTop10) {
                                return (
                                    <div key={show.id} className="relative flex items-end -mr-4 cursor-pointer group/card z-0 hover:z-20" onClick={() => setDetailsId({id: show.id, type: show.media_type})}>
                                        <span className="text-[160px] leading-[0.8] font-black text-[#1a1a1a] stroke-white tracking-tighter" style={{ WebkitTextStroke: '2px #333' }}>{idx + 1}</span>
                                        <div className="relative w-[130px] aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl z-10 transition-transform duration-300 group-hover/card:scale-105 origin-bottom -ml-8 mb-2">
                                            <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" loading="lazy" alt="" />
                                            <RatingBadge tmdbId={show.id} mediaType={show.media_type} tmdbRating={show.vote_average} />
                                            {isAdded && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Check className="w-8 h-8 text-emerald-500" /></div>}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div 
                                    key={show.id} 
                                    className="relative w-[160px] aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer group/card transition-all duration-300 hover:scale-105 hover:z-20 hover:shadow-2xl hover:border-indigo-500/30"
                                    onClick={() => setDetailsId({id: show.id, type: show.media_type})}
                                >
                                    <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover transition-opacity group-hover/card:opacity-40" loading="lazy" alt="" />
                                    <RatingBadge tmdbId={show.id} mediaType={show.media_type} tmdbRating={show.vote_average} />
                                    
                                    {isAdded && (
                                        <div className="absolute top-2 left-2 bg-emerald-500/20 border border-emerald-500/30 p-1 rounded-full backdrop-blur-md">
                                            <Check className="w-3 h-3 text-emerald-500" />
                                        </div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                                        <h4 className="text-sm font-bold text-white leading-tight mb-1 line-clamp-2">{show.name}</h4>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[10px] text-zinc-400 font-mono">{show.first_air_date?.split('-')[0]}</span>
                                            <span className="text-[10px] border border-white/20 px-1 rounded text-zinc-300 uppercase">{show.media_type === 'movie' ? 'Film' : 'TV'}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => handleAdd(e, show)}
                                            disabled={isAdded}
                                            className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${isAdded ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-zinc-200'}`}
                                        >
                                            {isAdded ? 'Tracking' : 'Add to Library'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020202] pb-20">
            <HeroSection />

            <div className="relative z-10 -mt-20 space-y-4">
                <Section title="Top 10 Today" items={trending} isTop10 />
                
                {recSource && recommendations.length > 0 && (
                    <Section 
                        title={`Because you watch ${recSource.name}`} 
                        items={recommendations} 
                        icon={Sparkles}
                    />
                )}

                <Section title="Now In Cinemas" items={inTheaters} icon={Ticket} />
                <Section title="Top Rated Horror" items={topHorror} />
                <Section title="Action & Adventure" items={topAction} />
            </div>

            {detailsId && (
                <ShowDetailsModal 
                    isOpen={!!detailsId}
                    onClose={() => setDetailsId(null)}
                    showId={detailsId.id}
                    mediaType={detailsId.type}
                />
            )}
            
            {trailerId && (
                 <V2TrailerModal 
                    isOpen={!!trailerId}
                    onClose={() => setTrailerId(null)}
                    showId={trailerId.id}
                    mediaType={trailerId.type}
                 />
            )}
        </div>
    );
};

export default V2Discover;
