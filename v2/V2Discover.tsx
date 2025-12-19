
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Plus, Check, Info, ChevronRight, Star, Sparkles, TrendingUp, Calendar, Film, Tv } from 'lucide-react';
import { useStore } from '../store';
import { getCollection, getBackdropUrl, getImageUrl, getPopularShows, getRecommendations } from '../services/tmdb';
import { TVShow } from '../types';
import V2TrailerModal from './V2TrailerModal';
import ShowDetailsModal from '../components/ShowDetailsModal';
import DiscoverModal from '../components/DiscoverModal';
import { format, addDays } from 'date-fns';

// --- TYPES ---
interface ContentRowProps {
    title: string;
    subtitle?: string;
    endpoint?: string; // Optional if providing items directly
    mediaType?: 'movie' | 'tv'; // Optional if providing items
    params?: Record<string, string>;
    items?: TVShow[]; // Direct items override
    onOpenDetails: (show: TVShow) => void;
    onOpenAll?: () => void;
    isTop10?: boolean;
}

const V2Discover: React.FC = () => {
    const { watchlist } = useStore();
    
    // Modal States
    const [trailerTarget, setTrailerTarget] = useState<{showId: number, mediaType: 'tv' | 'movie', episode?: any} | null>(null);
    const [detailTarget, setDetailTarget] = useState<{showId: number, mediaType: 'tv' | 'movie'} | null>(null);
    const [viewAllConfig, setViewAllConfig] = useState<{title: string, endpoint: string, mediaType: 'tv' | 'movie', params?: Record<string, string>} | null>(null);

    // Data States
    const [heroItem, setHeroItem] = useState<TVShow | null>(null);
    const [top10Items, setTop10Items] = useState<TVShow[]>([]);
    const [recItems, setRecItems] = useState<TVShow[]>([]);
    const [recSource, setRecSource] = useState<string>('');

    const today = new Date().toISOString().split('T')[0];
    const nextMonth = format(addDays(new Date(), 30), 'yyyy-MM-dd');
    const lastMonth = format(addDays(new Date(), -30), 'yyyy-MM-dd');

    // --- INITIAL DATA FETCHING ---
    useEffect(() => {
        // 1. Fetch Hero (Trending Movie)
        getCollection('/trending/movie/day', 'movie', 1).then(data => {
            // Filter for English or high quality backdrop
            const hero = data.find(i => i.backdrop_path && (!i.origin_country || i.origin_country.includes('US') || i.origin_country.includes('GB'))) || data[0];
            setHeroItem(hero);
        });

        // 2. Fetch Top 10 (Trending All)
        getPopularShows().then(data => setTop10Items(data.slice(0, 10)));

        // 3. Fetch Personal Recommendations
        if (watchlist.length > 0) {
            // Pick random show from watchlist
            const randomSource = watchlist[Math.floor(Math.random() * watchlist.length)];
            setRecSource(randomSource.name);
            getRecommendations(randomSource.id, randomSource.media_type).then(data => {
                const trackedIds = new Set(watchlist.map(s => s.id));
                const filtered = data.filter(d => !trackedIds.has(d.id));
                setRecItems(filtered);
            });
        }
    }, [watchlist.length]); // Only re-run recs if watchlist size changes significantly (simplified)

    // --- HANDLERS ---
    const handlePlayTrailer = (id: number, type: 'tv' | 'movie') => {
        setTrailerTarget({ showId: id, mediaType: type });
    };

    const handleOpenDetails = (show: TVShow) => {
        setDetailTarget({ showId: show.id, mediaType: show.media_type });
    };

    const handleViewAll = (title: string, endpoint: string, mediaType: 'tv' | 'movie', params?: Record<string, string>) => {
        setViewAllConfig({ title, endpoint, mediaType, params });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-y-auto custom-scrollbar relative pb-20">
            
            {/* HERO BILLBOARD */}
            {heroItem ? (
                <HeroBillboard item={heroItem} onPlayTrailer={handlePlayTrailer} onOpenDetails={handleOpenDetails} />
            ) : (
                <div className="w-full h-[80vh] bg-zinc-900 animate-pulse" />
            )}
            
            {/* CONTENT STACK - Negative margin to pull up over hero gradient */}
            <div className="relative z-10 -mt-24 md:-mt-48 space-y-12 px-0 md:px-0">
                
                {/* 1. TOP 10 ROW */}
                <ContentRow 
                    title="Top 10 Trending Today" 
                    items={top10Items}
                    onOpenDetails={handleOpenDetails}
                    isTop10={true}
                />

                {/* 2. PERSONAL RECOMMENDATIONS */}
                {recItems.length > 0 ? (
                    <ContentRow 
                        title={`Because you added ${recSource}`}
                        subtitle="Recommended For You"
                        items={recItems}
                        onOpenDetails={handleOpenDetails}
                    />
                ) : (
                     <ContentRow 
                        title="Critically Acclaimed" 
                        subtitle="All Time Best" 
                        endpoint="/movie/top_rated" 
                        mediaType="movie" 
                        params={{ 'vote_count.gte': '3000', 'with_original_language': 'en' }} 
                        onOpenDetails={handleOpenDetails} 
                        onOpenAll={() => handleViewAll("Critically Acclaimed", "/movie/top_rated", "movie")}
                    />
                )}

                {/* 3. NEW ON CINEMA */}
                <ContentRow 
                    title="New on Cinema" 
                    subtitle="Now Playing" 
                    endpoint="/movie/now_playing" 
                    mediaType="movie" 
                    params={{ 'primary_release_date.gte': lastMonth, 'primary_release_date.lte': today, 'with_release_type': '3|2', 'with_original_language': 'en' }} 
                    onOpenDetails={handleOpenDetails} 
                    onOpenAll={() => handleViewAll("New on Cinema", "/movie/now_playing", "movie")}
                />

                 {/* 4. UPCOMING SERIES */}
                 <ContentRow 
                    title="Upcoming Series" 
                    subtitle="Mark Your Calendar" 
                    endpoint="/discover/tv" 
                    mediaType="tv" 
                    params={{ 'first_air_date.gte': today, 'sort_by': 'popularity.desc', 'with_original_language': 'en' }} 
                    onOpenDetails={handleOpenDetails} 
                    onOpenAll={() => handleViewAll("Upcoming Series", "/discover/tv", "tv", { 'first_air_date.gte': today })}
                />
                
                {/* 5. SCI-FI & FANTASY */}
                <ContentRow 
                    title="Sci-Fi & Fantasy" 
                    subtitle="Other Worlds" 
                    endpoint="/discover/movie" 
                    mediaType="movie" 
                    params={{ 'with_genres': '878,14', 'sort_by': 'popularity.desc', 'vote_count.gte': '500' }} 
                    onOpenDetails={handleOpenDetails} 
                    onOpenAll={() => handleViewAll("Sci-Fi & Fantasy", "/discover/movie", "movie", { 'with_genres': '878,14' })}
                />

                {/* 6. ANIMATION */}
                <ContentRow 
                    title="Animation" 
                    subtitle="Not Just For Kids" 
                    endpoint="/discover/movie" 
                    mediaType="movie" 
                    params={{ 'with_genres': '16', 'sort_by': 'popularity.desc' }} 
                    onOpenDetails={handleOpenDetails} 
                    onOpenAll={() => handleViewAll("Animation", "/discover/movie", "movie", { 'with_genres': '16' })}
                />
            </div>

            {/* MODALS */}
            {trailerTarget && (
                <V2TrailerModal isOpen={!!trailerTarget} onClose={() => setTrailerTarget(null)} showId={trailerTarget.showId} mediaType={trailerTarget.mediaType} episode={trailerTarget.episode} />
            )}

            {detailTarget && (
                <ShowDetailsModal isOpen={!!detailTarget} onClose={() => setDetailTarget(null)} showId={detailTarget.showId} mediaType={detailTarget.mediaType} />
            )}

            {viewAllConfig && (
                <DiscoverModal 
                    isOpen={!!viewAllConfig}
                    onClose={() => setViewAllConfig(null)}
                    title={viewAllConfig.title}
                    fetchEndpoint={viewAllConfig.endpoint}
                    mediaType={viewAllConfig.mediaType}
                    fetchParams={viewAllConfig.params}
                />
            )}
        </div>
    );
};

// --- HERO COMPONENT ---
const HeroBillboard: React.FC<{ item: TVShow; onPlayTrailer: (id: number, type: 'tv' | 'movie') => void; onOpenDetails: (show: TVShow) => void }> = ({ item, onPlayTrailer, onOpenDetails }) => {
    const { addToWatchlist, watchlist } = useStore();
    const isAdded = watchlist.some(s => s.id === item.id);

    return (
        <div className="relative w-full h-[85vh] md:h-[95vh] shrink-0 overflow-hidden group/hero">
            {/* Background */}
            <div 
                className="absolute inset-0 bg-cover bg-top md:bg-center transition-transform duration-[20s] ease-linear group-hover/hero:scale-105" 
                style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path)})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/20 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-16 max-w-5xl z-20 pointer-events-none">
                 <div className="pointer-events-auto animate-fade-in-up mt-32 md:mt-0">
                    
                    {/* Meta Badge */}
                    <div className="flex items-center gap-3 mb-6">
                        <span className={`px-3 py-1 backdrop-blur-md border border-white/20 rounded text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 ${item.media_type === 'movie' ? 'bg-indigo-600/60' : 'bg-pink-600/60'}`}>
                            {item.media_type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                            {item.media_type === 'movie' ? 'Film' : 'Series'}
                        </span>
                        {item.vote_average > 0 && (
                            <div className="flex items-center gap-1 text-yellow-400 text-xs font-black drop-shadow-md">
                                <Star className="w-3.5 h-3.5 fill-current" /> {item.vote_average.toFixed(1)}
                            </div>
                        )}
                        <span className="text-zinc-300 font-bold text-xs drop-shadow-md">{item.first_air_date?.split('-')[0]}</span>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9] drop-shadow-2xl line-clamp-2 max-w-4xl">
                        {item.name}
                    </h1>

                    {/* Overview */}
                    <p className="text-sm md:text-lg text-zinc-200 font-medium line-clamp-3 max-w-xl leading-relaxed drop-shadow-lg text-shadow mt-6 mb-8">
                        {item.overview}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onPlayTrailer(item.id, item.media_type)} 
                            className="h-12 px-8 bg-white text-black hover:bg-zinc-200 rounded-lg font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105"
                        >
                            <Play className="w-4 h-4 fill-current" /> Trailer
                        </button>
                        <button 
                            onClick={() => !isAdded ? addToWatchlist(item) : null} 
                            disabled={isAdded}
                            className={`h-12 px-8 rounded-lg font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all border ${isAdded ? 'bg-zinc-900/80 border-zinc-800 text-zinc-500 cursor-default' : 'bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md hover:scale-105'}`}
                        >
                             {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                             {isAdded ? 'In Library' : 'My List'}
                        </button>
                        <button 
                            onClick={() => onOpenDetails(item)}
                            className="h-12 w-12 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-110"
                            title="More Info"
                        >
                            <Info className="w-5 h-5" />
                        </button>
                    </div>
                 </div>
            </div>
        </div>
    );
};

// --- ROW COMPONENT ---
const ContentRow: React.FC<ContentRowProps> = ({ title, subtitle, endpoint, mediaType, params, items, onOpenDetails, onOpenAll, isTop10 }) => {
    const [fetchedItems, setFetchedItems] = useState<TVShow[]>([]);
    const { addToWatchlist, watchlist } = useStore();

    useEffect(() => {
        if (items) {
            setFetchedItems(items);
        } else if (endpoint && mediaType) {
            getCollection(endpoint, mediaType, 1, params).then(data => {
                // Filter english if needed
                const filtered = data.filter(i => !i.origin_country || i.origin_country.includes('US') || i.origin_country.includes('GB') || i.origin_country.length === 0);
                setFetchedItems(filtered.slice(0, isTop10 ? 10 : 20));
            });
        }
    }, [endpoint, mediaType, items, isTop10]);

    if (fetchedItems.length === 0) return null;

    return (
        <div className="group/section pl-6 md:pl-16 relative">
            {/* Header */}
            <div className="flex items-end justify-between pr-6 md:pr-16 mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white tracking-tight group-hover/section:text-indigo-400 transition-colors cursor-pointer" onClick={onOpenAll}>
                        {title}
                    </h3>
                    {subtitle && (
                        <div className="hidden md:flex items-center gap-2">
                             <div className="w-1 h-1 rounded-full bg-zinc-600" />
                             <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{subtitle}</span>
                        </div>
                    )}
                </div>
                {onOpenAll && (
                    <button 
                        onClick={onOpenAll} 
                        className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-all transform translate-x-[-10px] group-hover/section:translate-x-0"
                    >
                        View All <ChevronRight className="w-3 h-3" />
                    </button>
                )}
            </div>
            
            {/* Horizontal Scroll */}
            <div className="relative -ml-6 md:-ml-16 w-screen overflow-x-auto hide-scrollbar pb-8 pt-4 px-6 md:px-16">
                <div className="flex gap-4 w-max">
                    {fetchedItems.map((item, idx) => {
                        const isAdded = watchlist.some(s => s.id === item.id);
                        
                        if (isTop10) {
                            return (
                                <div key={item.id} className="relative w-[280px] h-[180px] flex-shrink-0 cursor-pointer group/card z-0 hover:z-10" onClick={() => onOpenDetails(item)}>
                                    {/* Big Number SVG */}
                                    <div className="absolute -left-4 bottom-0 h-[105%] w-[50%] flex items-end justify-center pointer-events-none z-0">
                                         <svg viewBox="0 0 70 100" className="h-full w-full drop-shadow-2xl overflow-visible">
                                            <text x="0" y="88" fontSize="110" fontWeight="900" fill="#020202" stroke="#444" strokeWidth="2" style={{ fontFamily: 'Inter, sans-serif' }}>
                                                {idx + 1}
                                            </text>
                                            <text x="0" y="88" fontSize="110" fontWeight="900" fill="none" stroke="#666" strokeWidth="1" className="opacity-50" style={{ fontFamily: 'Inter, sans-serif' }}>
                                                {idx + 1}
                                            </text>
                                        </svg>
                                    </div>
                                    
                                    {/* Card */}
                                    <div className="absolute right-0 top-0 w-[130px] h-[190px] rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl z-10 transition-transform duration-300 group-hover/card:scale-110 origin-center">
                                        <img src={getImageUrl(item.poster_path)} className="w-full h-full object-cover" loading="lazy" alt="" />
                                        <div className="absolute inset-0 bg-black/20 group-hover/card:bg-transparent transition-colors" />
                                        
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                                            <div className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Top 10</div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); if(!isAdded) addToWatchlist(item); }}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAdded ? 'bg-zinc-800 text-emerald-500' : 'bg-white text-black hover:scale-110'}`}
                                            >
                                                {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                            </button>
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-yellow-500">
                                                <Star className="w-2.5 h-2.5 fill-current" /> {item.vote_average.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        // Standard Card
                        return (
                             <div 
                                key={item.id} 
                                className="relative group/card cursor-pointer w-[150px] aspect-[2/3] transition-all duration-300 ease-out hover:scale-105 hover:z-20 origin-center"
                                onClick={() => onOpenDetails(item)}
                             >
                                 <div className="w-full h-full rounded-lg overflow-hidden bg-zinc-900 border border-white/5 relative shadow-lg">
                                     <img 
                                        src={getImageUrl(item.poster_path)} 
                                        alt={item.name} 
                                        loading="lazy"
                                        className={`w-full h-full object-cover transition-all duration-500 ${isAdded ? 'grayscale opacity-60' : ''}`}
                                     />
                                     {isAdded && (
                                         <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1 border border-white/10 backdrop-blur-sm">
                                             <Check className="w-3 h-3 text-emerald-500 stroke-[3px]" />
                                         </div>
                                     )}

                                     {/* Hover Info */}
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                         <div className="transform translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
                                            <h4 className="text-[10px] font-bold text-white leading-tight line-clamp-2 mb-1">{item.name}</h4>
                                            
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[8px] font-mono text-zinc-400">{item.first_air_date?.split('-')[0]}</span>
                                                <div className="flex items-center gap-0.5 text-yellow-500 text-[8px] font-bold">
                                                    <Star className="w-2 h-2 fill-current" /> {item.vote_average.toFixed(1)}
                                                </div>
                                            </div>

                                            <button 
                                                onClick={(e) => { e.stopPropagation(); if(!isAdded) addToWatchlist(item); }}
                                                className={`w-full py-1.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${isAdded ? 'bg-zinc-800 text-zinc-500 cursor-default' : 'bg-white text-black hover:bg-zinc-200'}`}
                                            >
                                                {isAdded ? 'Added' : <><Plus className="w-2.5 h-2.5" /> List</>}
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
