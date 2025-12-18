
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Plus, Check, Info, ChevronRight, Loader2, Star, TrendingUp, Compass, Film, Tv, Calendar, Ticket, MonitorPlay } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getCollection, getBackdropUrl, getImageUrl, getPopularShows } from '../services/tmdb';
import { TVShow } from '../types';
import V2TrailerModal from './V2TrailerModal';
import ShowDetailsModal from '../components/ShowDetailsModal';
import { format, addDays } from 'date-fns';

// Helper to fetch mixed trending for Top 10 (duplicated slightly to allow custom endpoint/period)
const fetchTop10 = async (): Promise<TVShow[]> => {
    return await getPopularShows();
};

const V2Discover: React.FC = () => {
    const [trailerTarget, setTrailerTarget] = useState<{showId: number, mediaType: 'tv' | 'movie', episode?: any} | null>(null);
    const [detailTarget, setDetailTarget] = useState<{showId: number, mediaType: 'tv' | 'movie'} | null>(null);
    const [upsideDownMode, setUpsideDownMode] = useState(false);
    
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = format(addDays(new Date(), 30), 'yyyy-MM-dd');
    const lastMonth = format(addDays(new Date(), -30), 'yyyy-MM-dd');

    const handlePlayTrailer = (id: number, type: 'tv' | 'movie') => {
        setTrailerTarget({ showId: id, mediaType: type });
    };

    const handleOpenDetails = (show: TVShow) => {
        setDetailTarget({ showId: show.id, mediaType: show.media_type });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-y-auto custom-scrollbar relative">
            {/* Easter Egg Overlay */}
            <div className={`fixed inset-0 pointer-events-none z-[200] transition-opacity duration-1000 ${upsideDownMode ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 shadow-[inset_0_0_150px_80px_rgba(185,28,28,0.6)] animate-pulse mix-blend-screen" />
                <div className="absolute inset-0 bg-red-950/20 mix-blend-overlay" />
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-900/40 to-transparent opacity-50" />
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-red-900/40 to-transparent opacity-50" />
            </div>

            <HeroBillboard onPlayTrailer={handlePlayTrailer} />
            
            <div className="relative z-10 -mt-24 md:-mt-48 pb-20 space-y-12 px-6 md:px-12">
                
                {/* Priority 0: Top 10 Row */}
                <Top10Row onOpenDetails={handleOpenDetails} onHoverSpecial={setUpsideDownMode} />

                {/* Priority 1: Trending Shows */}
                <ContentRow 
                    title="Trending Series" 
                    subtitle="Hot List"
                    endpoint="/trending/tv/week" 
                    mediaType="tv"
                    filterEn={true}
                    onOpenDetails={handleOpenDetails}
                    onHoverSpecial={setUpsideDownMode}
                />

                {/* Priority 2: Trending Movies */}
                <ContentRow 
                    title="Trending Movies" 
                    subtitle="Hot List"
                    endpoint="/trending/movie/week" 
                    mediaType="movie"
                    filterEn={true}
                    onOpenDetails={handleOpenDetails}
                    onHoverSpecial={setUpsideDownMode}
                />

                {/* Priority 3: In Theaters */}
                <ContentRow 
                    title="In Theaters Now" 
                    subtitle="Box Office"
                    endpoint="/discover/movie" 
                    mediaType="movie" 
                    params={{
                        'primary_release_date.gte': lastMonth,
                        'primary_release_date.lte': today,
                        'with_release_type': '3|2',
                        'sort_by': 'popularity.desc',
                        'with_original_language': 'en'
                    }}
                    onOpenDetails={handleOpenDetails}
                    onHoverSpecial={setUpsideDownMode}
                />

                {/* Priority 4: Upcoming Digital */}
                <ContentRow 
                    title="Upcoming Digital" 
                    subtitle="Digital & Streaming Premieres"
                    endpoint="/discover/movie" 
                    mediaType="movie" 
                    params={{
                        'primary_release_date.gte': today,
                        'primary_release_date.lte': nextMonth,
                        'with_release_type': '4|5', // Digital / Physical
                        'sort_by': 'popularity.desc', // Sort by popularity to show relevant upcoming
                        'with_original_language': 'en'
                    }}
                    onOpenDetails={handleOpenDetails}
                    onHoverSpecial={setUpsideDownMode}
                />
                
                {/* Priority 5: Top Rated (Critical) */}
                <ContentRow 
                    title="Critically Acclaimed" 
                    subtitle="All Time Best"
                    endpoint="/movie/top_rated" 
                    mediaType="movie" 
                    params={{ 'with_original_language': 'en' }}
                    onOpenDetails={handleOpenDetails}
                    onHoverSpecial={setUpsideDownMode}
                />
            </div>

            {trailerTarget && (
                <V2TrailerModal 
                    isOpen={!!trailerTarget} 
                    onClose={() => setTrailerTarget(null)}
                    showId={trailerTarget.showId}
                    mediaType={trailerTarget.mediaType}
                    episode={trailerTarget.episode}
                />
            )}

            {detailTarget && (
                <ShowDetailsModal 
                    isOpen={!!detailTarget}
                    onClose={() => setDetailTarget(null)}
                    showId={detailTarget.showId}
                    mediaType={detailTarget.mediaType}
                />
            )}
        </div>
    );
};

const Top10Row: React.FC<{ onOpenDetails: (show: TVShow) => void; onHoverSpecial: (active: boolean) => void }> = ({ onOpenDetails, onHoverSpecial }) => {
    const [items, setItems] = useState<TVShow[]>([]);
    
    useEffect(() => {
        fetchTop10().then(data => setItems(data.slice(0, 10)));
    }, []);

    if (items.length === 0) return null;

    return (
        <div className="group/section">
            <div className="flex items-end gap-3 mb-6 px-1">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Top 10 Trending
                </h3>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 border-l border-zinc-700 pl-3">Today</span>
            </div>

            <div className="relative -mx-6 md:-mx-12 px-6 md:px-12 overflow-x-auto hide-scrollbar pb-8">
                <div className="flex gap-4 w-max">
                    {items.map((item, index) => {
                        const isStrangerThings = item.id === 66732 || item.name.toLowerCase() === 'stranger things';
                        return (
                            <div 
                                key={item.id}
                                onClick={() => onOpenDetails(item)}
                                onMouseEnter={() => isStrangerThings && onHoverSpecial(true)}
                                onMouseLeave={() => isStrangerThings && onHoverSpecial(false)}
                                className="relative w-[180px] h-[220px] flex-shrink-0 cursor-pointer group/card transition-transform duration-300 hover:scale-105 z-0 hover:z-10"
                            >
                                {/* Number SVG - Behind */}
                                <div className="absolute left-[-20px] bottom-0 h-full w-[140px] flex items-end justify-start pointer-events-none z-0">
                                    <svg className="h-full w-full overflow-visible" viewBox="0 0 100 150">
                                        <text 
                                            x="-10" 
                                            y="145" 
                                            fontSize="160" 
                                            fontWeight="900" 
                                            fill="#020202" 
                                            stroke="#444" 
                                            strokeWidth="2"
                                            style={{ fontFamily: 'Inter, sans-serif' }}
                                        >
                                            {index + 1}
                                        </text>
                                    </svg>
                                </div>

                                {/* Poster - Overlapping Right */}
                                <div className="absolute right-0 top-0 w-[140px] h-[210px] rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl z-10 transition-all duration-300 group-hover/card:border-white/30">
                                    <img 
                                        src={getImageUrl(item.poster_path)} 
                                        alt={item.name} 
                                        className={`w-full h-full object-cover transition-transform duration-700 ${isStrangerThings ? 'group-hover/card:rotate-180' : ''}`}
                                    />
                                    {/* Simple Overlay on Hover */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                                            <Info className="w-5 h-5" />
                                        </div>
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

const HeroBillboard: React.FC<{ onPlayTrailer: (id: number, type: 'tv' | 'movie') => void }> = ({ onPlayTrailer }) => {
    const [items, setItems] = useState<TVShow[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const { addToWatchlist, allTrackedShows } = useAppContext();
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Fetch mixed trending, filter for EN, take top 5
        getCollection('/trending/all/day', 'movie', 1) 
            .then(data => {
                const enItems = data.filter(i => !i.origin_country || i.origin_country.includes('US') || i.origin_country.includes('GB') || i.origin_country.length === 0);
                setItems(enItems.slice(0, 6)); 
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
        return <div className="w-full h-[80vh] bg-[#050505] animate-pulse" />;
    }

    const item = items[currentIndex];
    const isAdded = allTrackedShows.some(s => s.id === item.id);

    return (
        <div className="relative w-full h-[75vh] md:h-[85vh] shrink-0 overflow-hidden group/hero">
            {/* Background Layers */}
            {items.map((bgItem, idx) => (
                <div 
                    key={bgItem.id}
                    className={`absolute inset-0 bg-cover bg-top md:bg-center transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                    style={{ backgroundImage: `url(${getBackdropUrl(bgItem.backdrop_path)})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/30 to-transparent" />
                </div>
            ))}

            {/* Content Overlay */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 max-w-4xl z-20 pointer-events-none">
                <div className="pointer-events-auto space-y-6 animate-fade-in-up mt-20 md:mt-0">
                    <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 backdrop-blur-md border border-white/10 rounded text-[10px] font-black uppercase tracking-widest text-white ${item.media_type === 'movie' ? 'bg-indigo-600/80 border-indigo-500/50' : 'bg-pink-600/80 border-pink-500/50'}`}>
                            {item.media_type === 'movie' ? 'Film' : 'Series'}
                        </span>
                        <div className="flex items-center gap-1 text-yellow-400 text-xs font-black">
                            <Star className="w-3.5 h-3.5 fill-current" /> {item.vote_average.toFixed(1)}
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9] drop-shadow-2xl line-clamp-2">
                        {item.name}
                    </h1>

                    <p className="text-sm md:text-lg text-zinc-200 font-medium line-clamp-3 max-w-xl leading-relaxed drop-shadow-lg text-shadow">
                        {item.overview}
                    </p>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onPlayTrailer(item.id, item.media_type)}
                            className="h-12 px-8 bg-white text-black hover:bg-zinc-200 rounded-lg font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105"
                        >
                            <Play className="w-4 h-4 fill-current" /> Trailer
                        </button>
                        <button 
                            onClick={() => !isAdded && addToWatchlist(item)}
                            disabled={isAdded}
                            className={`h-12 px-8 rounded-lg font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all border ${isAdded ? 'bg-zinc-900/80 border-zinc-800 text-zinc-500 cursor-default' : 'bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md hover:scale-105'}`}
                        >
                            {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {isAdded ? 'In Library' : 'My List'}
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
                        className={`w-1 transition-all duration-300 ${idx === currentIndex ? 'h-12 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'h-3 bg-white/20 hover:bg-white/40'}`}
                    />
                ))}
            </div>
        </div>
    );
};

const ContentRow: React.FC<{ title: string; subtitle?: string; endpoint: string; mediaType: 'movie' | 'tv'; params?: Record<string, string>; filterEn?: boolean; onOpenDetails: (show: TVShow) => void; onHoverSpecial: (active: boolean) => void }> = ({ title, subtitle, endpoint, mediaType, params, filterEn, onOpenDetails, onHoverSpecial }) => {
    const [items, setItems] = useState<TVShow[]>([]);
    const { addToWatchlist, allTrackedShows } = useAppContext();

    useEffect(() => {
        getCollection(endpoint, mediaType, 1, params)
            .then(data => {
                let filtered = data;
                if (filterEn) {
                    filtered = data.filter(i => !i.origin_country || i.origin_country.includes('US') || i.origin_country.includes('GB') || i.origin_country.length === 0);
                }
                setItems(filtered);
            });
    }, [endpoint, mediaType, JSON.stringify(params)]);

    if (items.length === 0) return null;

    return (
        <div className="group/section">
            <div className="flex items-end gap-3 mb-4 px-1">
                <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover/section:text-indigo-400 transition-colors">
                    {title}
                </h3>
                {subtitle && <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 border-l border-zinc-700 pl-3">{subtitle}</span>}
                
                <div className="flex-1 h-px bg-zinc-900 mb-2 ml-4 group-hover/section:bg-zinc-800 transition-colors" />
                
                <div className="flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">View All</span>
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                </div>
            </div>

            <div className="relative -mx-6 md:-mx-12 px-6 md:px-12 overflow-x-auto hide-scrollbar pb-8 pt-2">
                <div className="flex gap-4 w-max">
                    {items.slice(0, 20).map(item => {
                        const isAdded = allTrackedShows.some(s => s.id === item.id);
                        const isStrangerThings = item.id === 66732 || item.name.toLowerCase() === 'stranger things';

                        return (
                            <div 
                                key={item.id} 
                                onClick={() => onOpenDetails(item)}
                                onMouseEnter={() => isStrangerThings && onHoverSpecial(true)}
                                onMouseLeave={() => isStrangerThings && onHoverSpecial(false)}
                                className="relative group/card cursor-pointer w-[160px] aspect-[2/3] transition-all duration-300 ease-out hover:scale-110 hover:z-50 origin-center"
                            >
                                <div className="w-full h-full rounded-lg overflow-hidden bg-zinc-900 border border-white/5 relative shadow-xl group-hover/card:shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                    <img 
                                        src={getImageUrl(item.poster_path)} 
                                        alt={item.name} 
                                        loading="lazy"
                                        className={`w-full h-full object-cover transition-all duration-700 ${isAdded ? 'grayscale opacity-40' : ''} ${isStrangerThings ? 'group-hover/card:rotate-180' : ''}`}
                                    />
                                    
                                    {isAdded && (
                                        <div className="absolute top-2 right-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                                                <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Hover Reveal Overlay */}
                                    <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black via-black/80 to-transparent">
                                        <div className="translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[8px] font-black text-white bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-md uppercase">
                                                    {item.vote_average.toFixed(1)}
                                                </span>
                                                <span className="text-[9px] font-mono text-zinc-300">{item.first_air_date?.split('-')[0]}</span>
                                            </div>
                                            
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-tight leading-tight mb-3 line-clamp-2">
                                                {item.name}
                                            </h4>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); if(!isAdded) addToWatchlist(item); }}
                                                disabled={isAdded}
                                                className={`w-full py-2 rounded font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 ${isAdded ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-zinc-200'}`}
                                            >
                                                {isAdded ? 'Added' : <><Plus className="w-3 h-3" /> List</>}
                                            </button>
                                        </div>
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
