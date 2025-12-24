
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Plus, Check, Info, ChevronRight, Star, PlayCircle } from 'lucide-react';
import { useStore } from '../store';
import { getCollection, getBackdropUrl, getImageUrl } from '../services/tmdb';
import { TVShow } from '../types';
import V2TrailerModal from './V2TrailerModal';
import ShowDetailsModal from '../components/ShowDetailsModal';
import DiscoverModal from '../components/DiscoverModal';

interface ContentRowProps {
    title: string;
    subtitle?: string;
    endpoint?: string;
    mediaType?: 'tv' | 'movie';
    params?: Record<string, string>;
    items?: TVShow[];
    onOpenDetails: (show: TVShow) => void;
    onOpenAll?: () => void;
    isTop10?: boolean;
}

const V2Discover: React.FC = () => {
    const [heroItem, setHeroItem] = useState<TVShow | null>(null);
    
    // Modals
    const [detailsTarget, setDetailsTarget] = useState<{id: number, type: 'tv'|'movie'} | null>(null);
    const [trailerTarget, setTrailerTarget] = useState<{id: number, type: 'tv'|'movie'} | null>(null);
    const [listTarget, setListTarget] = useState<{title: string, endpoint: string, type: 'tv'|'movie', params?: any} | null>(null);

    useEffect(() => {
        // Load Hero (Trending)
        getCollection('/trending/all/week', 'movie', 1).then(items => {
            if (items.length > 0) setHeroItem(items[0]);
        });
    }, []);

    const openDetails = (show: TVShow) => setDetailsTarget({ id: show.id, type: show.media_type });
    const openTrailer = (id: number, type: 'tv'|'movie') => setTrailerTarget({ id, type });
    
    const openList = (title: string, endpoint: string, type: 'tv'|'movie', params?: any) => {
        setListTarget({ title, endpoint, type, params });
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-y-auto custom-scrollbar relative">
            
            {/* HERO */}
            {heroItem && (
                <HeroCarousel 
                    item={heroItem} 
                    onOpenDetails={() => openDetails(heroItem)}
                    onOpenTrailer={() => openTrailer(heroItem.id, heroItem.media_type)}
                />
            )}

            <div className="relative z-10 space-y-8 pb-24 -mt-10">
                <ContentRow 
                    title="Top 10 Trending"
                    endpoint="/trending/all/day"
                    mediaType="movie" 
                    isTop10
                    onOpenDetails={openDetails}
                />

                <ContentRow 
                    title="New on Cinema" 
                    endpoint="/movie/now_playing"
                    mediaType="movie"
                    onOpenDetails={openDetails}
                    onOpenAll={() => openList("In Theaters", "/movie/now_playing", "movie")}
                />

                <ContentRow 
                    title="Popular Series" 
                    endpoint="/tv/popular"
                    mediaType="tv"
                    onOpenDetails={openDetails}
                    onOpenAll={() => openList("Popular TV", "/tv/popular", "tv")}
                />

                <ContentRow 
                    title="Upcoming Movies" 
                    endpoint="/discover/movie"
                    mediaType="movie"
                    params={{ 
                        'primary_release_date.gte': today, 
                        'sort_by': 'popularity.desc', 
                        'with_release_type': '2|3' 
                    }}
                    onOpenDetails={openDetails}
                    onOpenAll={() => openList("Coming Soon", "/discover/movie", "movie", { 'primary_release_date.gte': today, 'sort_by': 'popularity.desc', 'with_release_type': '2|3' })}
                />

                <ContentRow 
                    title="Top Rated" 
                    endpoint="/movie/top_rated"
                    mediaType="movie"
                    onOpenDetails={openDetails}
                    onOpenAll={() => openList("Top Rated", "/movie/top_rated", "movie")}
                />
            </div>

            {/* MODALS */}
            {detailsTarget && (
                <ShowDetailsModal 
                    isOpen={!!detailsTarget} 
                    onClose={() => setDetailsTarget(null)} 
                    showId={detailsTarget.id} 
                    mediaType={detailsTarget.type} 
                />
            )}
            {trailerTarget && (
                <V2TrailerModal 
                    isOpen={!!trailerTarget} 
                    onClose={() => setTrailerTarget(null)} 
                    showId={trailerTarget.id} 
                    mediaType={trailerTarget.type} 
                />
            )}
            {listTarget && (
                <DiscoverModal 
                    isOpen={!!listTarget}
                    onClose={() => setListTarget(null)}
                    title={listTarget.title}
                    fetchEndpoint={listTarget.endpoint}
                    mediaType={listTarget.type}
                    fetchParams={listTarget.params}
                />
            )}
        </div>
    );
};

// --- HERO COMPONENT ---

const HeroCarousel: React.FC<{ item: TVShow; onOpenDetails: () => void; onOpenTrailer: () => void }> = ({ item, onOpenDetails, onOpenTrailer }) => {
    const { watchlist, addToWatchlist } = useStore();
    const isAdded = watchlist.some(s => s.id === item.id);

    return (
        <div className="relative w-full h-[70vh] shrink-0">
            <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path)})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#020202]/80 via-transparent to-transparent" />
            </div>
            
            <div className="absolute bottom-0 left-0 p-8 md:p-16 max-w-3xl pb-20">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                        #{item.media_type === 'movie' ? 'Movie' : 'Series'} of the Week
                    </span>
                    <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-current" /> {item.vote_average.toFixed(1)}
                    </div>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black text-white leading-[0.9] tracking-tighter mb-4 drop-shadow-2xl">
                    {item.name}
                </h1>
                <p className="text-zinc-300 text-sm md:text-base line-clamp-3 mb-8 max-w-xl font-medium drop-shadow-md leading-relaxed">
                    {item.overview}
                </p>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onOpenTrailer}
                        className="px-8 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95"
                    >
                        <Play className="w-5 h-5 fill-current" /> Play Trailer
                    </button>
                    <button 
                        onClick={onOpenDetails}
                        className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95"
                    >
                        <Info className="w-5 h-5" /> More Info
                    </button>
                    <button 
                        onClick={() => !isAdded && addToWatchlist(item)}
                        className={`px-4 py-3 rounded-xl font-bold flex items-center justify-center transition-transform active:scale-95 border ${isAdded ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-default' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
                    >
                        {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
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
    }, [endpoint, mediaType, items, isTop10, params]);

    if (fetchedItems.length === 0) return null;

    return (
        <div className="group/section pl-6 md:pl-16 relative">
            {/* Header */}
            <div className="flex items-end justify-between pr-6 md:pr-16 mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg md:text-xl font-bold text-white tracking-tight group-hover/section:text-indigo-400 transition-colors cursor-pointer" onClick={onOpenAll}>
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
            
            {/* Horizontal Scroll - Increased padding for Top 10 scaling */}
            <div className={`relative -ml-6 md:-ml-16 w-screen overflow-x-auto hide-scrollbar px-6 md:px-16 ${isTop10 ? 'pt-12 pb-12' : 'pt-4 pb-8'}`}>
                <div className="flex gap-4 w-max items-end">
                    {fetchedItems.map((item, idx) => {
                        const trackedItem = watchlist.find(s => s.id === item.id);
                        const isAdded = !!trackedItem;
                        const posterSrc = trackedItem?.custom_poster_path || item.poster_path;
                        
                        if (isTop10) {
                            return (
                                <div key={item.id} className="relative flex items-end -mr-6 cursor-pointer group/card z-0 hover:z-20" onClick={() => onOpenDetails(item)}>
                                    {/* Big Number SVG */}
                                    <div className="relative w-24 h-full flex items-end justify-end z-0">
                                        <svg viewBox="0 0 70 100" className="h-40 w-full overflow-visible" preserveAspectRatio="none">
                                            <text 
                                                x="40" 
                                                y="100" 
                                                fontSize="140" 
                                                fontWeight="900" 
                                                textAnchor="middle"
                                                stroke="#444" 
                                                strokeWidth="2" 
                                                fill="#09090b"
                                                style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-10px' }}
                                            >
                                                {idx + 1}
                                            </text>
                                        </svg>
                                    </div>
                                    
                                    {/* Card */}
                                    <div className="relative w-[140px] aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl z-10 transition-transform duration-300 group-hover/card:scale-110 group-hover/card:-translate-y-4 origin-bottom-left -ml-4">
                                        <img src={getImageUrl(posterSrc)} className="w-full h-full object-cover" loading="lazy" alt="" />
                                        <div className="absolute inset-0 bg-black/10 group-hover/card:bg-transparent transition-colors" />
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
                                        src={getImageUrl(posterSrc)} 
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
