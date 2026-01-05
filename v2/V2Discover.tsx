
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Plus, Check, ArrowRight, TrendingUp, History, Lightbulb, Ticket, Tv, Eye, EyeOff, Flame, Layers, Star, Clock, Calendar, Filter, Sparkles, Trophy, Film, Ghost, Zap, Infinity, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { getCollection, getBackdropUrl, getImageUrl, getRecommendations } from '../services/tmdb';
import { TVShow, WatchedItem } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import V2ShowDetailsModal from './V2ShowDetailsModal';
import V2TrailerModal from './V2TrailerModal';
import V2DiscoverModal from './V2DiscoverModal';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// --- TYPES ---
interface DiscoverySectionData {
    id: string;
    title: string;
    subtitle?: string;
    items: TVShow[];
    type?: 'tv' | 'movie'; // Forced type for linking
    icon?: any;
    endpoint?: string;
    params?: any;
    isTop10?: boolean;
}

type FilterType = 'all' | 'movies' | 'tv' | 'scifi' | 'horror' | 'anime' | 'classics' | 'gems';

const FILTERS: { id: FilterType, label: string, icon: any }[] = [
    { id: 'all', label: 'Home', icon: Sparkles },
    { id: 'movies', label: 'Films', icon: Film },
    { id: 'tv', label: 'Series', icon: Tv },
    { id: 'scifi', label: 'Sci-Fi', icon: Zap },
    { id: 'horror', label: 'Horror', icon: Ghost },
    { id: 'anime', label: 'Anime', icon: Infinity },
    { id: 'classics', label: 'Classics', icon: History },
    { id: 'gems', label: 'Hidden Gems', icon: Lightbulb },
];

// Helper to filter out clutter (specific regions/languages)
const filterContent = (items: TVShow[]) => {
    const BLOCK_LANGS = ['hi', 'te', 'ta', 'kn', 'ml', 'pa', 'mr', 'bn', 'gu', 'or', 'as', 'ur', 'ne', 'si'];
    return items.filter(item => {
        if (item.original_language && BLOCK_LANGS.includes(item.original_language)) return false;
        if (!item.poster_path) return false;
        return true;
    });
};

const V2Discover: React.FC = () => {
    const { watchlist, addToWatchlist, setReminderCandidate, settings, history, toggleWatched } = useStore();
    
    // State
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [heroItems, setHeroItems] = useState<TVShow[]>([]);
    const [sections, setSections] = useState<DiscoverySectionData[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [detailsId, setDetailsId] = useState<{id: number, type: 'tv'|'movie'} | null>(null);
    const [trailerId, setTrailerId] = useState<{id: number, type: 'tv'|'movie'} | null>(null);
    const [categoryModal, setCategoryModal] = useState<{title: string, endpoint: string, type: 'tv'|'movie', params?: any} | null>(null);

    // Fetch Logic based on Filter
    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            setSections([]);
            
            try {
                // 1. Determine Endpoints based on Filter
                let heroEndpoint = '/trending/all/day';
                let heroType: 'tv' | 'movie' = 'movie';
                const newSections: DiscoverySectionData[] = [];

                if (activeFilter === 'all') {
                    // --- ALL (HOME) ---
                    // Hero: Trending Movies
                    const heroData = await getCollection('/trending/movie/week', 'movie');
                    setHeroItems(filterContent(heroData).slice(0, 5));

                    // Viral (Top 10)
                    const viral = await getCollection('/trending/all/day', 'movie');
                    newSections.push({ id: 'viral', title: 'Global Viral Hits', subtitle: 'Most watched in the last 24h', items: filterContent(viral).slice(0, 10), isTop10: true, icon: TrendingUp });

                    // Upcoming
                    const today = new Date().toISOString().split('T')[0];
                    const upcoming = await getCollection('/discover/movie', 'movie', 1, { 'primary_release_date.gte': today, 'sort_by': 'popularity.desc' });
                    newSections.push({ id: 'upcoming', title: 'Coming Soon', subtitle: 'Releasing in the next 30 days', items: filterContent(upcoming), icon: Calendar });

                    // Personalized
                    const watchedItems = watchlist.filter(w => history[`movie-${w.id}`]?.is_watched || history[`episode-${w.id}`]); // Rough check
                    if (watchedItems.length > 0) {
                         const seed = watchedItems[Math.floor(Math.random() * watchedItems.length)];
                         const recs = await getRecommendations(seed.id, seed.media_type);
                         newSections.push({ id: 'recs', title: `Because you watched ${seed.name}`, items: filterContent(recs), type: seed.media_type, icon: History });
                    }

                    // Critically Acclaimed
                    const acclaimed = await getCollection('/movie/top_rated', 'movie');
                    newSections.push({ id: 'acclaimed', title: 'Critically Acclaimed', subtitle: 'Masterpieces with 8.0+ rating', items: filterContent(acclaimed), icon: Star });
                
                } else if (activeFilter === 'movies') {
                    // --- MOVIES ---
                    const heroData = await getCollection('/movie/now_playing', 'movie');
                    setHeroItems(filterContent(heroData).slice(0, 5));

                    const popular = await getCollection('/movie/popular', 'movie');
                    newSections.push({ id: 'pop_movies', title: 'Popular Films', items: filterContent(popular), type: 'movie' });

                    const top = await getCollection('/movie/top_rated', 'movie');
                    newSections.push({ id: 'top_movies', title: 'Highest Rated', items: filterContent(top), type: 'movie' });
                
                } else if (activeFilter === 'tv') {
                    // --- TV ---
                    const heroData = await getCollection('/tv/trending/week', 'tv');
                    setHeroItems(filterContent(heroData).slice(0, 5));

                    const popular = await getCollection('/tv/popular', 'tv');
                    newSections.push({ id: 'pop_tv', title: 'Popular Series', items: filterContent(popular), type: 'tv' });

                    const airing = await getCollection('/tv/on_the_air', 'tv');
                    newSections.push({ id: 'airing_tv', title: 'Airing Now', items: filterContent(airing), type: 'tv' });

                } else if (activeFilter === 'horror') {
                     // --- HORROR ---
                     const heroData = await getCollection('/discover/movie', 'movie', 1, { with_genres: '27', sort_by: 'popularity.desc' });
                     setHeroItems(filterContent(heroData).slice(0, 5));
                     
                     const highRated = await getCollection('/discover/movie', 'movie', 1, { with_genres: '27', sort_by: 'vote_average.desc', 'vote_count.gte': '500' });
                     newSections.push({ id: 'horror_top', title: 'Nightmare Fuel', subtitle: 'Highest rated horror films', items: filterContent(highRated), type: 'movie' });

                     const shows = await getCollection('/discover/tv', 'tv', 1, { with_genres: '9648,18', sort_by: 'popularity.desc' }); // Mystery/Drama often horror adjacent for TV
                     newSections.push({ id: 'horror_tv', title: 'Dark & Mysterious', items: filterContent(shows), type: 'tv' });

                } else if (activeFilter === 'scifi') {
                     // --- SCI-FI ---
                     const heroData = await getCollection('/discover/movie', 'movie', 1, { with_genres: '878', sort_by: 'popularity.desc' });
                     setHeroItems(filterContent(heroData).slice(0, 5));

                     const space = await getCollection('/discover/movie', 'movie', 1, { with_genres: '878', with_keywords: '9882' }); // Space
                     newSections.push({ id: 'space', title: 'Space Operas', items: filterContent(space), type: 'movie' });

                } else if (activeFilter === 'anime') {
                     // --- ANIME ---
                     const heroData = await getCollection('/discover/tv', 'tv', 1, { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc' });
                     setHeroItems(filterContent(heroData).slice(0, 5));

                     const movies = await getCollection('/discover/movie', 'movie', 1, { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc' });
                     newSections.push({ id: 'anime_mov', title: 'Anime Features', items: filterContent(movies), type: 'movie' });
                     
                     newSections.push({ id: 'anime_show', title: 'Trending Series', items: filterContent(heroData).slice(5), type: 'tv' });

                } else if (activeFilter === 'classics') {
                     // --- CLASSICS ---
                     const heroData = await getCollection('/discover/movie', 'movie', 1, { 'primary_release_date.lte': '1990-01-01', sort_by: 'popularity.desc' });
                     setHeroItems(filterContent(heroData).slice(0, 5));
                     
                     const gold = await getCollection('/discover/movie', 'movie', 1, { 'primary_release_date.lte': '1980-01-01', sort_by: 'vote_average.desc', 'vote_count.gte': '1000' });
                     newSections.push({ id: 'golden', title: 'Golden Age', items: filterContent(gold), type: 'movie' });

                } else if (activeFilter === 'gems') {
                     // --- HIDDEN GEMS ---
                     const heroData = await getCollection('/discover/movie', 'movie', 1, { 'vote_average.gte': '7.5', 'vote_count.lte': '2000', 'vote_count.gte': '100', sort_by: 'popularity.desc' });
                     setHeroItems(filterContent(heroData).slice(0, 5));
                     
                     const tvGems = await getCollection('/discover/tv', 'tv', 1, { 'vote_average.gte': '8.0', 'vote_count.lte': '1000', 'vote_count.gte': '50', sort_by: 'popularity.desc' });
                     newSections.push({ id: 'tv_gems', title: 'Underrated Series', items: filterContent(tvGems), type: 'tv' });
                     
                     newSections.push({ id: 'movie_gems', title: 'Critics Darlings', items: filterContent(heroData).slice(5), type: 'movie' });
                }

                setSections(newSections);

            } catch (e) {
                console.error(e);
                toast.error("Failed to load content");
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, [activeFilter, watchlist.length]); // Reload if watchlist changes for personalized rows

    // --- SHARED PROPS ---
    const handleAdd = (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        addToWatchlist(show);
        toast.success("Added to Library");
    };

    const handleWatch = (e: React.MouseEvent, show: TVShow, isAdded: boolean, isWatched: boolean) => {
        e.stopPropagation();
        if (!isAdded) addToWatchlist(show);

        if (show.media_type === 'movie') {
            toggleWatched({ tmdb_id: show.id, media_type: 'movie', is_watched: isWatched });
            toast.success(isWatched ? "Marked unwatched" : "Marked watched");
        } else {
            setReminderCandidate(show);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-hidden relative">
            
            {/* STICKY HEADER & FILTERS */}
            <div className="shrink-0 z-30 bg-[#020202]/95 backdrop-blur-xl border-b border-white/5 sticky top-0">
                <div className="overflow-x-auto hide-scrollbar">
                    <div className="flex gap-1 p-2 md:p-3 min-w-max">
                        {FILTERS.map(f => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFilter(f.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all
                                    ${activeFilter === f.id 
                                        ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                                        : 'bg-zinc-900/50 text-zinc-500 border-white/5 hover:border-white/20 hover:text-zinc-300'}
                                `}
                            >
                                <f.icon className={`w-3 h-3 ${activeFilter === f.id ? 'text-black' : 'text-zinc-500'}`} />
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                {/* HERO */}
                <HeroView items={heroItems} onOpenDetails={(id, type) => setDetailsId({id, type})} onAdd={handleAdd} watchlist={watchlist} />

                {/* SECTIONS */}
                <div className="flex flex-col gap-px bg-white/5 pb-px border-t border-white/5">
                    {sections.map(section => (
                        <DiscoveryRow 
                            key={section.id}
                            data={section}
                            onOpenDetails={(id, type) => setDetailsId({id, type})}
                            onAdd={handleAdd}
                            onWatch={handleWatch}
                            watchlist={watchlist}
                            history={history}
                            onMore={() => section.endpoint ? setCategoryModal({ title: section.title, endpoint: section.endpoint, type: section.type || 'movie', params: section.params }) : undefined}
                        />
                    ))}
                </div>
            </div>

            {/* MODALS */}
            {detailsId && (
                settings.useBetaLayouts ? (
                    <V2ShowDetailsModal 
                        isOpen={!!detailsId}
                        onClose={() => setDetailsId(null)}
                        showId={detailsId.id}
                        mediaType={detailsId.type}
                    />
                ) : (
                    <ShowDetailsModal 
                        isOpen={!!detailsId}
                        onClose={() => setDetailsId(null)}
                        showId={detailsId.id}
                        mediaType={detailsId.type}
                    />
                )
            )}
            
            {categoryModal && (
                <V2DiscoverModal 
                    isOpen={!!categoryModal}
                    onClose={() => setCategoryModal(null)}
                    title={categoryModal.title}
                    fetchEndpoint={categoryModal.endpoint}
                    mediaType={categoryModal.type}
                    fetchParams={categoryModal.params}
                />
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const HeroView = ({ items, onOpenDetails, onAdd, watchlist }: any) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const autoScrollRef = useRef<any>(null);

    useEffect(() => {
        if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        if (items.length > 0) {
            autoScrollRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % items.length);
            }, 8000);
        }
        return () => clearInterval(autoScrollRef.current);
    }, [items]);

    const hero = items[currentIndex];
    if (!hero) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="w-8 h-8 text-zinc-700 animate-spin" /></div>;

    const isAdded = watchlist.some((w: any) => w.id === hero.id);

    return (
        <div className="relative w-full h-[65vh] md:h-[75vh] flex flex-col justify-end group overflow-hidden bg-black">
             {items.map((item: TVShow, idx: number) => (
                 <div 
                    key={item.id}
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-60' : 'opacity-0'}`} 
                    style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path)})` }}
                />
             ))}
             
             {/* Gradient Overlays */}
             <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/20 to-transparent" />
             <div className="absolute inset-0 bg-gradient-to-r from-[#020202]/80 via-transparent to-transparent" />

             <div className="relative z-10 w-full px-6 md:px-12 pb-12 max-w-4xl">
                 <div className="flex items-center gap-2 mb-4 opacity-80">
                     <span className="bg-white text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">Featured</span>
                     <div className="h-px w-8 bg-white/50" />
                     <span className="text-white text-[10px] font-mono uppercase tracking-widest">{hero.media_type}</span>
                 </div>
                 
                 <h1 className="text-4xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter mb-4 mix-blend-overlay opacity-90">
                     {hero.name}
                 </h1>
                 
                 <p className="text-zinc-300 text-sm md:text-base font-medium max-w-xl leading-relaxed mb-6 line-clamp-2 drop-shadow-md">
                     {hero.overview}
                 </p>
                 
                 <div className="flex gap-3">
                     <button onClick={() => onOpenDetails(hero.id, hero.media_type)} className="h-10 px-6 bg-white text-black font-bold uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-colors flex items-center gap-2 rounded-sm">
                         <Play className="w-3 h-3 fill-current" /> Details
                     </button>
                     <button onClick={(e) => onAdd(e, hero)} className={`h-10 w-10 border flex items-center justify-center transition-colors rounded-sm ${isAdded ? 'bg-zinc-900 border-zinc-700 text-zinc-500' : 'border-white/20 text-white hover:bg-white/10 backdrop-blur-md'}`}>
                         {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                     </button>
                 </div>
             </div>

             {/* Indicators */}
             <div className="absolute right-6 bottom-12 flex gap-1 z-20">
                 {items.map((_: any, idx: number) => (
                     <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/20 hover:bg-white/40'}`}
                     />
                 ))}
             </div>
        </div>
    );
};

const DiscoveryRow = ({ data, onOpenDetails, onAdd, onWatch, watchlist, history, onMore }: any) => {
    if (!data.items || data.items.length === 0) return null;
    
    // --- TOP 10 RANK STYLE ---
    if (data.isTop10) {
        return (
            <div className="bg-[#050505] w-full py-8">
                 <div className="px-6 md:px-12 mb-4 flex justify-between items-end">
                     <div>
                         <h3 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-3">
                             <TrendingUp className="w-5 h-5 text-red-500" />
                             {data.title}
                         </h3>
                     </div>
                 </div>
                 
                 <div className="w-full overflow-x-auto hide-scrollbar px-6 md:px-12">
                     <div className="flex gap-4 w-max">
                         {data.items.map((show: TVShow, idx: number) => {
                             const isAdded = watchlist.some((w: any) => w.id === show.id);
                             return (
                                 <div 
                                    key={show.id} 
                                    className="group relative cursor-pointer w-[280px] h-[160px] bg-zinc-900 border border-white/5 rounded-sm overflow-hidden flex hover:border-zinc-700 transition-colors"
                                    onClick={() => onOpenDetails(show.id, show.media_type)}
                                 >
                                      {/* Rank Number Area */}
                                      <div className="w-16 bg-zinc-950 flex items-center justify-center border-r border-white/5 relative overflow-hidden">
                                          <span className="text-6xl font-black text-zinc-800 italic absolute -bottom-4 -left-2 select-none tracking-tighter" style={{ WebkitTextStroke: '1px #333' }}>
                                              {idx + 1}
                                          </span>
                                      </div>
                                      
                                      {/* Image Area */}
                                      <div className="flex-1 relative overflow-hidden">
                                          <img 
                                              src={getBackdropUrl(show.backdrop_path || show.poster_path)} 
                                              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" 
                                              alt="" 
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-4">
                                               <h4 className="text-sm font-bold text-white leading-tight line-clamp-2">{show.name}</h4>
                                               <div className="flex items-center gap-2 mt-1">
                                                   <span className="text-[9px] text-zinc-400 font-mono border border-zinc-700 px-1 rounded">{show.media_type === 'movie' ? 'FILM' : 'TV'}</span>
                                                   <span className="text-[9px] text-zinc-500">{show.first_air_date?.split('-')[0]}</span>
                                               </div>
                                          </div>
                                      </div>
                                      
                                      {/* Quick Add */}
                                      <button 
                                          onClick={(e) => !isAdded && onAdd(e, show)}
                                          className={`absolute top-2 right-2 p-1.5 rounded-full z-20 ${isAdded ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity'}`}
                                      >
                                          {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                      </button>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
            </div>
        );
    }

    // --- STANDARD 1PX GRID ROW ---
    return (
        <div className="bg-[#050505] w-full py-8">
             <div className="flex items-end justify-between px-6 md:px-12 mb-4">
                 <div className="flex items-center gap-3">
                     {data.icon && <div className="p-1.5 bg-zinc-900 rounded border border-white/10 text-indigo-400"><data.icon className="w-4 h-4" /></div>}
                     <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">{data.title}</h3>
                        {data.subtitle && <p className="text-[10px] font-medium text-zinc-500 mt-0.5">{data.subtitle}</p>}
                     </div>
                 </div>
                 {onMore && (
                     <button onClick={onMore} className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-wider flex items-center gap-1 group">
                         View All <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                     </button>
                 )}
             </div>

             <div className="w-full overflow-x-auto hide-scrollbar">
                 <div className="flex min-w-full w-max gap-px bg-white/5 border-y border-white/5">
                     {/* Left Padding Spacer within flex to maintain gap rhythm if needed, or use px on parent. 
                         Here we rely on parent padding for the header, but the row goes edge to edge. 
                         Let's add a spacer item for visual alignment start.
                     */}
                     <div className="w-[23px] md:w-[47px] shrink-0 bg-[#020202]" />
                     
                     {data.items.slice(0, 15).map((show: TVShow) => {
                         const isAdded = watchlist.some((w: any) => w.id === show.id);
                         let isWatched = false;
                         if (show.media_type === 'movie') isWatched = history[`movie-${show.id}`]?.is_watched;
                         else isWatched = Object.values(history).some((h: any) => h.tmdb_id === show.id && h.is_watched);

                         return (
                             <div 
                                 key={show.id} 
                                 className="group relative w-[150px] md:w-[170px] shrink-0 aspect-[2/3] bg-[#09090b] cursor-pointer overflow-hidden"
                                 onClick={() => onOpenDetails(show.id, show.media_type || data.type)}
                             >
                                 <img 
                                     src={getImageUrl(show.poster_path)} 
                                     className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700 ease-out group-hover:opacity-100" 
                                     loading="lazy" 
                                     alt="" 
                                 />
                                 
                                 <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                     <h4 className="text-xs font-bold text-white leading-tight line-clamp-2 mb-1">{show.name}</h4>
                                     <div className="flex items-center justify-between">
                                         <span className="text-[9px] text-zinc-400 font-mono">{show.first_air_date?.split('-')[0]}</span>
                                         <span className="text-[9px] text-indigo-400 font-bold">{show.vote_average.toFixed(1)}</span>
                                     </div>
                                 </div>

                                 <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-200">
                                     <button 
                                         onClick={(e) => !isAdded && onAdd(e, show)}
                                         className={`w-6 h-6 flex items-center justify-center rounded-sm shadow-md ${isAdded ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-zinc-200'}`}
                                     >
                                         {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                     </button>
                                     <button 
                                         onClick={(e) => onWatch(e, show, isAdded, isWatched)}
                                         className={`w-6 h-6 flex items-center justify-center rounded-sm shadow-md ${isWatched ? 'bg-emerald-600 text-white' : 'bg-black/60 backdrop-blur-md text-white hover:bg-black'}`}
                                     >
                                         {isWatched ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                     </button>
                                 </div>
                             </div>
                         );
                     })}
                     
                     {/* Right Spacer */}
                     <div className="w-[23px] md:w-[47px] shrink-0 bg-[#020202]" />
                 </div>
             </div>
        </div>
    );
};

export default V2Discover;
