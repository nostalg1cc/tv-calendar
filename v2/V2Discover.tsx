
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Plus, Check, ArrowRight, TrendingUp, History, Lightbulb, Ticket, Tv, Eye, EyeOff, Flame, Layers, Star, Clock, Calendar } from 'lucide-react';
import { useStore } from '../store';
import { getCollection, getBackdropUrl, getImageUrl, getRecommendations } from '../services/tmdb';
import { TVShow, WatchedItem } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import V2ShowDetailsModal from './V2ShowDetailsModal';
import V2TrailerModal from './V2TrailerModal';
import V2DiscoverModal from './V2DiscoverModal';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface PersonalizedSection {
    id: string;
    title: string;
    items: TVShow[];
    type: 'tv' | 'movie';
    icon?: any;
    subtitle?: string;
    endpoint?: string;
    params?: any;
}

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
    
    // Data State
    const [heroItems, setHeroItems] = useState<TVShow[]>([]);
    const [viralHits, setViralHits] = useState<TVShow[]>([]); 
    const [criticalHits, setCriticalHits] = useState<TVShow[]>([]); 
    const [hiddenGems, setHiddenGems] = useState<TVShow[]>([]);
    const [shortMovies, setShortMovies] = useState<TVShow[]>([]);
    const [upcoming, setUpcoming] = useState<TVShow[]>([]);
    
    const [genreRow, setGenreRow] = useState<{title: string, items: TVShow[]} | null>(null);
    const [personalizedSections, setPersonalizedSections] = useState<PersonalizedSection[]>([]);
    const [isPersonalizing, setIsPersonalizing] = useState(false);

    // Modals
    const [detailsId, setDetailsId] = useState<{id: number, type: 'tv'|'movie'} | null>(null);
    const [trailerId, setTrailerId] = useState<{id: number, type: 'tv'|'movie'} | null>(null);
    const [categoryModal, setCategoryModal] = useState<{title: string, endpoint: string, type: 'tv'|'movie', params?: any} | null>(null);

    // Initial Fetch
    useEffect(() => {
        // Hero: Trending Movies
        getCollection('/trending/movie/week', 'movie').then(data => {
            setHeroItems(filterContent(data).slice(0, 8));
        });

        // Viral Hits: Trending All
        getCollection('/trending/all/day', 'movie').then(data => {
            setViralHits(filterContent(data).slice(0, 10));
        });

        // Critically Acclaimed: Top Rated
        getCollection('/movie/top_rated', 'movie').then(data => {
             setCriticalHits(filterContent(data));
        });

        // Hidden Gems: Discover with filters
        getCollection('/discover/movie', 'movie', 1, { 
            'vote_average.gte': '7.5', 
            'vote_count.gte': '100', 
            'vote_count.lte': '5000',
            'sort_by': 'popularity.desc'
        }).then(data => setHiddenGems(filterContent(data)));

        // Short & Sweet: Runtime < 100m
        getCollection('/discover/movie', 'movie', 1, {
            'with_runtime.lte': '100',
            'sort_by': 'popularity.desc'
        }).then(data => setShortMovies(filterContent(data)));

        // Upcoming
        const today = new Date().toISOString().split('T')[0];
        getCollection('/discover/movie', 'movie', 1, {
            'primary_release_date.gte': today,
            'sort_by': 'popularity.desc'
        }).then(data => setUpcoming(filterContent(data)));

        // Random Genre Spotlight
        const genres = [
            { id: 878, name: 'Sci-Fi', type: 'movie' },
            { id: 27, name: 'Horror', type: 'movie' },
            { id: 16, name: 'Animation', type: 'movie' },
            { id: 35, name: 'Comedy', type: 'tv' },
            { id: 80, name: 'Crime', type: 'tv' }
        ] as const;
        
        const randomGenre = genres[Math.floor(Math.random() * genres.length)];
        const endpoint = randomGenre.type === 'movie' ? '/discover/movie' : '/discover/tv';
        getCollection(endpoint, randomGenre.type, 1, { with_genres: randomGenre.id.toString(), sort_by: 'popularity.desc' })
            .then(data => {
                setGenreRow({ title: randomGenre.name, items: filterContent(data) });
            });

    }, []);

    // Smart "For You" Algorithm
    useEffect(() => {
        if (isPersonalizing || personalizedSections.length > 0) return;

        const generateSections = async () => {
            setIsPersonalizing(true);
            const sections: PersonalizedSection[] = [];
            const processedIds = new Set<number>();

            const isWatched = (item: TVShow) => {
                if (item.media_type === 'movie') return history[`movie-${item.id}`]?.is_watched;
                return Object.values(history).some((h: WatchedItem) => h.tmdb_id === item.id && h.is_watched);
            };

            const watchedItems = watchlist.filter(item => isWatched(item));
            if (watchedItems.length > 0) {
                 const shuffled = [...watchedItems].sort(() => 0.5 - Math.random()).slice(0, 2);
                 for (const item of shuffled) {
                     try {
                         const recs = await getRecommendations(item.id, item.media_type);
                         const valid = filterContent(recs.filter(r => !watchlist.some(w => w.id === r.id)));
                         if (valid.length >= 5) {
                             sections.push({
                                 id: `watched-${item.id}`,
                                 title: `Because you watched ${item.name}`,
                                 subtitle: "Similar styles & themes",
                                 items: valid,
                                 type: item.media_type,
                                 icon: History,
                                 endpoint: `/${item.media_type}/${item.id}/recommendations`
                             });
                             processedIds.add(item.id);
                         }
                     } catch(e) {}
                 }
            }

            setPersonalizedSections(sections);
            setIsPersonalizing(false);
        };

        if (watchlist.length > 0) {
            generateSections();
        }
    }, [watchlist.length]); 

    // --- HANDLERS ---
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

    const sharedProps = {
        onOpenDetails: (id: number, type: 'tv' | 'movie') => setDetailsId({id, type}),
        onAdd: handleAdd,
        onWatch: handleWatch,
        onViewCategory: (title: string, endpoint: string, type: 'tv' | 'movie', params?: any) => setCategoryModal({title, endpoint, type, params}),
        watchlist,
        history
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020202] relative">
            <BetaView 
                heroItems={heroItems}
                viralHits={viralHits}
                criticalHits={criticalHits}
                hiddenGems={hiddenGems}
                shortMovies={shortMovies}
                upcoming={upcoming}
                genreRow={genreRow}
                personalizedSections={personalizedSections}
                {...sharedProps}
            />

            {/* MATCHES BANNER */}
            <div className="px-6 md:px-12 pb-12 pt-4 animate-fade-in-up">
                <Link to="/matches" className="block group relative w-full h-40 md:h-48 rounded-sm overflow-hidden cursor-pointer border border-white/10 hover:border-indigo-500/50 transition-all duration-300">
                    <div className="absolute inset-0 flex">
                        {heroItems.slice(0, 3).map((item, i) => (
                            <div key={item.id} className="flex-1 bg-cover bg-center blur-sm opacity-40 group-hover:opacity-60 transition-opacity" style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path)})` }} />
                        ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-black/80 to-indigo-900/90" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                         <div className="w-12 h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-transform">
                             <Flame className="w-6 h-6 fill-current" />
                         </div>
                         <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-1">Find Your Next Obsession</h3>
                         <p className="text-sm text-indigo-200 font-medium">Swipe through personalized picks in Match Mode</p>
                    </div>
                </Link>
            </div>

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
            
            {trailerId && (
                 <V2TrailerModal 
                    isOpen={!!trailerId}
                    onClose={() => setTrailerId(null)}
                    showId={trailerId.id}
                    mediaType={trailerId.type}
                 />
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

// --- REUSABLE 1PX GAP ROW ---

const DiscoveryRow = ({ 
    title, 
    subtitle, 
    items, 
    onOpenDetails, 
    onAdd, 
    onWatch, 
    watchlist, 
    history, 
    onMore,
    icon: Icon 
}: any) => {
    if (!items || items.length === 0) return null;
    
    return (
        <div className="py-6 border-b border-white/5 animate-fade-in-up last:border-0">
             <div className="flex items-end justify-between px-6 md:px-12 mb-4">
                 <div className="flex items-center gap-3">
                     {Icon && <div className="p-1.5 bg-zinc-900 rounded border border-white/10 text-indigo-400"><Icon className="w-4 h-4" /></div>}
                     <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
                        {subtitle && <p className="text-[10px] font-medium text-zinc-500 mt-0.5">{subtitle}</p>}
                     </div>
                 </div>
                 {onMore && (
                     <button onClick={onMore} className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-wider flex items-center gap-1">
                         View All <ArrowRight className="w-3 h-3" />
                     </button>
                 )}
             </div>

             <div className="flex overflow-x-auto hide-scrollbar bg-white/5 gap-px pb-px">
                 {/* Left Spacer to align with padding */}
                 <div className="w-[23px] md:w-[47px] shrink-0 bg-[#020202]" />
                 
                 {items.slice(0, 15).map((show: TVShow) => {
                     const isAdded = watchlist.some((w: any) => w.id === show.id);
                     let isWatched = false;
                     if (show.media_type === 'movie') isWatched = history[`movie-${show.id}`]?.is_watched;
                     else isWatched = Object.values(history).some((h: any) => h.tmdb_id === show.id && h.is_watched);

                     return (
                         <div 
                             key={show.id} 
                             className="group relative w-[140px] md:w-[160px] shrink-0 aspect-[2/3] bg-[#09090b] cursor-pointer overflow-hidden"
                             onClick={() => onOpenDetails(show.id, show.media_type)}
                         >
                             <img 
                                 src={getImageUrl(show.poster_path)} 
                                 className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" 
                                 loading="lazy" 
                                 alt="" 
                             />
                             
                             {/* Gradient & Info Overlay */}
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                 <h4 className="text-xs font-bold text-white leading-tight line-clamp-2 mb-1">{show.name}</h4>
                                 <div className="flex items-center justify-between">
                                     <span className="text-[9px] text-zinc-400 font-mono">{show.first_air_date?.split('-')[0]}</span>
                                     <span className="text-[9px] text-indigo-400 font-bold">{show.vote_average.toFixed(1)}</span>
                                 </div>
                             </div>

                             {/* Status Indicators */}
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
                 <div className="w-[24px] md:w-[48px] shrink-0 bg-[#020202]" />
             </div>
        </div>
    );
};

// --- VIEW COMPONENT ---
const BetaView: React.FC<any> = ({ 
    heroItems, viralHits, criticalHits, genreRow, personalizedSections, hiddenGems, shortMovies, upcoming,
    onOpenDetails, onAdd, onWatch, onViewCategory, watchlist, history 
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasHero = heroItems && heroItems.length > 0;

    const resetTimer = useCallback(() => {
        if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        autoScrollRef.current = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % heroItems.length);
        }, 8000); 
    }, [heroItems.length]);

    useEffect(() => {
        if (hasHero) resetTimer();
        return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
    }, [hasHero, resetTimer]);

    const hero = hasHero ? heroItems[currentIndex] : null;

    if (!hero) return <div className="h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>;

    const isAdded = watchlist.some((w: any) => w.id === hero.id);

    return (
        <div className="pb-8 font-sans">
            {/* HERO BILLBOARD */}
            <div className="relative w-full h-[80vh] flex flex-col justify-end overflow-hidden group border-b border-white/5">
                 {heroItems.map((item: TVShow, idx: number) => (
                     <div 
                        key={item.id}
                        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-100' : 'opacity-0'}`} 
                        style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path)})` }}
                    >
                         <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/30 to-transparent" />
                         <div className="absolute inset-0 bg-gradient-to-r from-[#020202]/80 via-transparent to-transparent" />
                    </div>
                 ))}
                
                <div className="relative z-10 w-full px-6 md:px-12 pb-16 md:pb-20 max-w-5xl animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-sm px-3 py-1.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Trending #{currentIndex + 1}</span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border border-zinc-700 px-2 py-1 rounded-sm">
                            {hero.media_type === 'movie' ? 'Film' : 'Series'}
                        </span>
                    </div>
                    
                    <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.85] tracking-tighter mb-6 mix-blend-overlay opacity-90 drop-shadow-2xl">
                        {hero.name}
                    </h1>
                    
                    <p className="text-zinc-300 text-sm md:text-lg font-medium max-w-xl leading-relaxed mb-8 line-clamp-3 drop-shadow-md">
                        {hero.overview}
                    </p>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={() => onOpenDetails(hero.id, hero.media_type)} 
                            className="h-12 px-8 bg-white text-black hover:bg-zinc-200 rounded-sm font-black uppercase tracking-widest text-xs transition-colors flex items-center gap-2"
                        >
                            <Play className="w-4 h-4 fill-current" /> Explore
                        </button>
                        <button 
                            onClick={(e) => onAdd(e, hero)} 
                            className={`h-12 w-12 border flex items-center justify-center transition-colors rounded-sm ${isAdded ? 'bg-zinc-900 border-zinc-700 text-zinc-500' : 'border-white/20 text-white hover:bg-white/10 backdrop-blur-md'}`}
                        >
                            {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Hero Indicators */}
                <div className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
                     {heroItems.map((_: any, idx: number) => (
                         <button
                            key={idx}
                            onClick={() => { setCurrentIndex(idx); resetTimer(); }}
                            className={`w-1 h-8 md:h-12 transition-all duration-300 ${idx === currentIndex ? 'bg-white scale-y-110' : 'bg-white/20 hover:bg-white/40'}`}
                         />
                     ))}
                </div>
            </div>

            {/* ROWS CONTAINER */}
            <div className="flex flex-col">
                
                {/* 1. VIRAL HITS (Top 10 Style) */}
                <div className="py-8 border-b border-white/5">
                    <div className="px-6 md:px-12 mb-4 flex items-end justify-between">
                         <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-red-500" /> Global Viral Hits
                            </h3>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Most watched today.</p>
                         </div>
                    </div>
                    
                    <div className="overflow-x-auto hide-scrollbar px-6 md:px-12 w-full">
                        <div className="flex gap-8 w-max">
                            {viralHits.map((show: TVShow, idx: number) => (
                                <div 
                                    key={show.id} 
                                    className="relative group cursor-pointer w-[140px] md:w-[160px] shrink-0 transition-transform hover:scale-105"
                                    onClick={() => onOpenDetails(show.id, show.media_type)}
                                >
                                     {/* Big Number */}
                                     <span className="absolute -left-6 bottom-0 text-[120px] font-black text-zinc-900 leading-none select-none z-0 stroke-white/10" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}>
                                         {idx + 1}
                                     </span>
                                     
                                     <div className="relative z-10 aspect-[2/3] bg-zinc-900 ml-6 border border-white/10 shadow-xl overflow-hidden rounded-sm">
                                         <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" loading="lazy" alt="" />
                                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <div className="bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20">
                                                  <ArrowRight className="w-4 h-4 text-white" />
                                              </div>
                                         </div>
                                     </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. COMING SOON */}
                <DiscoveryRow 
                    title="Coming Soon"
                    subtitle="Releasing in the next 30 days"
                    items={upcoming}
                    icon={Calendar}
                    {...{ onOpenDetails, onAdd, onWatch, watchlist, history }}
                    onMore={() => onViewCategory("Coming Soon", "/discover/movie", "movie", { 'primary_release_date.gte': new Date().toISOString().split('T')[0], 'sort_by': 'popularity.desc' })}
                />

                {/* 3. PERSONALIZED SECTIONS */}
                {personalizedSections.map((section: PersonalizedSection) => (
                    <DiscoveryRow 
                        key={section.id}
                        title={section.title}
                        subtitle={section.subtitle}
                        items={section.items}
                        icon={section.icon}
                        {...{ onOpenDetails, onAdd, onWatch, watchlist, history }}
                        onMore={section.endpoint ? () => onViewCategory(section.title, section.endpoint!, section.type, section.params) : undefined}
                    />
                ))}

                {/* 4. GENRE SPOTLIGHT BANNER */}
                {genreRow && (
                    <div className="px-6 md:px-12 py-12 border-b border-white/5">
                        <div className="relative rounded-sm overflow-hidden bg-zinc-900 border border-white/5 h-[320px]">
                             <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${getBackdropUrl(genreRow.items[0]?.backdrop_path)})` }} />
                             <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                             
                             <div className="absolute inset-0 p-10 flex flex-col justify-center max-w-xl">
                                 <div className="flex items-center gap-2 mb-2">
                                     <Layers className="w-4 h-4 text-indigo-500" />
                                     <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Genre Spotlight</span>
                                 </div>
                                 <h2 className="text-4xl font-black text-white tracking-tight mb-4">{genreRow.title}</h2>
                                 <p className="text-zinc-400 text-sm mb-8 leading-relaxed font-medium">Explore our curated selection of top-tier titles in this category. Handpicked for quality and relevance.</p>
                                 
                                 <div className="flex gap-4">
                                     {genreRow.items.slice(0, 3).map(item => (
                                         <div key={item.id} className="w-20 aspect-[2/3] bg-zinc-800 border border-white/10 cursor-pointer hover:scale-105 transition-transform" onClick={() => onOpenDetails(item.id, item.media_type)}>
                                             <img src={getImageUrl(item.poster_path)} className="w-full h-full object-cover" alt="" />
                                         </div>
                                     ))}
                                     <button 
                                        onClick={() => onViewCategory(genreRow.title, '/discover/movie', 'movie', { with_genres: '878' })} // Generic link for now, logic handles it
                                        className="w-20 aspect-[2/3] bg-zinc-900/80 border border-white/10 flex flex-col items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                                     >
                                         <ArrowRight className="w-5 h-5 mb-1" />
                                         <span className="text-[8px] font-black uppercase tracking-widest">View All</span>
                                     </button>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}
                
                {/* 5. CRITICALLY ACCLAIMED */}
                <DiscoveryRow 
                    title="Critically Acclaimed" 
                    subtitle="Masterpieces with 8.0+ rating" 
                    items={criticalHits} 
                    icon={Star}
                    {...{ onOpenDetails, onAdd, onWatch, watchlist, history }}
                    onMore={() => onViewCategory("Critically Acclaimed", "/movie/top_rated", "movie")}
                />

                {/* 6. HIDDEN GEMS */}
                <DiscoveryRow 
                    title="Hidden Gems" 
                    subtitle="Highly rated but less known" 
                    items={hiddenGems} 
                    icon={Lightbulb}
                    {...{ onOpenDetails, onAdd, onWatch, watchlist, history }}
                />

                {/* 7. SHORT & SWEET */}
                <DiscoveryRow 
                    title="Short & Punchy" 
                    subtitle="Movies under 100 minutes" 
                    items={shortMovies} 
                    icon={Clock}
                    {...{ onOpenDetails, onAdd, onWatch, watchlist, history }}
                />

            </div>
        </div>
    );
};

export default V2Discover;
