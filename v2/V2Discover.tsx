import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Plus, Check, ArrowRight, Sparkles, TrendingUp, CalendarClock, History, Lightbulb, Ticket, Tv, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import { getCollection, getBackdropUrl, getImageUrl, getRecommendations } from '../services/tmdb';
import { TVShow, WatchedItem } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import V2ShowDetailsModal from './V2ShowDetailsModal';
import V2TrailerModal from './V2TrailerModal';
import V2DiscoverModal from './V2DiscoverModal';
import toast from 'react-hot-toast';

// Genre Map for Personalization context
const GENRE_MAP: Record<number, string> = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
    10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
    10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
};

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

// Filter out specific regions/languages to reduce clutter
const filterContent = (items: TVShow[]) => {
    // Block list for Indian content as requested
    const BLOCK_LANGS = ['hi', 'te', 'ta', 'kn', 'ml', 'pa', 'mr', 'bn', 'gu', 'or', 'as', 'ur', 'ne', 'si'];
    const BLOCK_REGIONS = ['IN'];
    
    return items.filter(item => {
        if (item.original_language && BLOCK_LANGS.includes(item.original_language)) return false;
        if (item.origin_country && item.origin_country.some(c => BLOCK_REGIONS.includes(c))) return false;
        return true;
    });
};

const V2Discover: React.FC = () => {
    const { watchlist, addToWatchlist, setReminderCandidate, settings, history, toggleWatched } = useStore();
    
    // Static Data
    const [heroItems, setHeroItems] = useState<TVShow[]>([]);
    const [trending, setTrending] = useState<TVShow[]>([]);
    const [trendingTV, setTrendingTV] = useState<TVShow[]>([]);
    const [popularMovies, setPopularMovies] = useState<TVShow[]>([]);
    const [inTheaters, setInTheaters] = useState<TVShow[]>([]);
    
    // Dynamic Personalized Rows
    const [personalizedSections, setPersonalizedSections] = useState<PersonalizedSection[]>([]);
    const personalizationInitialized = useRef(false);

    // Modals
    const [detailsId, setDetailsId] = useState<{id: number, type: 'tv'|'movie'} | null>(null);
    const [trailerId, setTrailerId] = useState<{id: number, type: 'tv'|'movie'} | null>(null);
    const [categoryModal, setCategoryModal] = useState<{title: string, endpoint: string, type: 'tv'|'movie', params?: any} | null>(null);

    // Initial Fetch
    useEffect(() => {
        getCollection('/trending/movie/week', 'movie').then(data => {
            const clean = filterContent(data);
            setHeroItems(clean.slice(0, 8));
            setTrending(clean);
        });
        getCollection('/trending/tv/week', 'tv').then(data => setTrendingTV(filterContent(data)));
        getCollection('/movie/popular', 'movie').then(data => setPopularMovies(filterContent(data)));
        getCollection('/movie/now_playing', 'movie', 1).then(data => setInTheaters(filterContent(data)));
    }, []);

    // Personalization Logic
    useEffect(() => {
        if (watchlist.length === 0) return;
        if (personalizationInitialized.current) return;

        const generateSections = async () => {
            const sections: PersonalizedSection[] = [];
            const processedIds = new Set<number>();

            const isWatched = (item: TVShow) => {
                if (item.media_type === 'movie') return history[`movie-${item.id}`]?.is_watched;
                return Object.values(history).some((h: WatchedItem) => h.tmdb_id === item.id && h.is_watched);
            };

            const watchedItems = watchlist.filter(item => isWatched(item));
            const interestedItems = watchlist.filter(item => !isWatched(item));
            
            const shuffledWatched = [...watchedItems].sort(() => 0.5 - Math.random());
            let watchedCount = 0;
            
            for (const item of shuffledWatched) {
                if (watchedCount >= 2) break;
                if (processedIds.has(item.id)) continue;
                try {
                    const recs = await getRecommendations(item.id, item.media_type);
                    const valid = filterContent(recs.filter(r => !watchlist.some(w => w.id === r.id)));
                    if (valid.length >= 5) {
                        sections.push({
                            id: `watched-${item.id}`,
                            title: `Because you watched ${item.name}`,
                            items: valid,
                            type: item.media_type,
                            icon: History,
                            endpoint: `/${item.media_type}/${item.id}/recommendations`
                        });
                        processedIds.add(item.id);
                        watchedCount++;
                    }
                } catch(e) {}
            }

            const shuffledInterested = [...interestedItems].sort(() => 0.5 - Math.random());
            let interestedCount = 0;

            for (const item of shuffledInterested) {
                if (interestedCount >= 2) break;
                if (processedIds.has(item.id)) continue;
                try {
                    const recs = await getRecommendations(item.id, item.media_type);
                    const valid = filterContent(recs.filter(r => !watchlist.some(w => w.id === r.id)));
                    if (valid.length >= 5) {
                        sections.push({
                            id: `interested-${item.id}`,
                            title: `Since you're interested in ${item.name}`,
                            items: valid,
                            type: item.media_type,
                            icon: Lightbulb,
                            endpoint: `/${item.media_type}/${item.id}/recommendations`
                        });
                        processedIds.add(item.id);
                        interestedCount++;
                    }
                } catch(e) {}
            }

            setPersonalizedSections(sections);
            personalizationInitialized.current = true;
        };

        generateSections();
    }, [watchlist.length]); 

    // --- HANDLERS ---
    const handleAdd = (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        addToWatchlist(show);
        toast.success("Added to Library");
    };

    const handleWatch = (e: React.MouseEvent, show: TVShow, isAdded: boolean, isWatched: boolean) => {
        e.stopPropagation();
        
        if (!isAdded) {
            addToWatchlist(show);
        }

        if (show.media_type === 'movie') {
            // For movies, just toggle watched status
            toggleWatched({ 
                tmdb_id: show.id, 
                media_type: 'movie', 
                is_watched: isWatched 
            });
            toast.success(isWatched ? "Marked unwatched" : "Marked watched");
        } else {
            // For TV, trigger the advanced "Seen All / Progress" modal
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
            {settings.useBetaLayouts ? (
                <BetaView 
                    heroItems={heroItems}
                    trending={trending}
                    trendingTV={trendingTV}
                    popularMovies={popularMovies}
                    inTheaters={inTheaters}
                    personalizedSections={personalizedSections}
                    {...sharedProps}
                />
            ) : (
                <ClassicView 
                    heroItems={heroItems}
                    trending={trending}
                    trendingTV={trendingTV}
                    popularMovies={popularMovies}
                    inTheaters={inTheaters}
                    personalizedSections={personalizedSections}
                    onOpenTrailer={(id: number, type: 'tv' | 'movie') => setTrailerId({id, type})}
                    {...sharedProps}
                />
            )}

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

// --- SHARED SUB-COMPONENTS ---

const CategorySection = ({ title, subtitle, items, type, icon: Icon, onMore, onOpenDetails, onAdd, onWatch, watchlist, history, endpoint, params }: any) => {
    if (!items || items.length === 0) return null;
    return (
        <div className="py-8 border-t border-white/5 animate-fade-in-up">
            <div className="max-w-[1800px] mx-auto px-4 md:px-8 mb-6 flex items-end justify-between">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                         {Icon && <Icon className="w-6 h-6 text-indigo-500" />}
                         {title}
                    </h3>
                    {subtitle && <p className="text-sm text-zinc-500 font-medium mt-1">{subtitle}</p>}
                </div>
                {(onMore || (endpoint && onMore === undefined)) && (
                    <button 
                        onClick={onMore ? onMore : () => {}} 
                        className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest flex items-center gap-2 group"
                    >
                        View All <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                )}
            </div>
            
            <div className="overflow-x-auto hide-scrollbar px-4 md:px-8 -mx-0 w-full">
                <div className="flex gap-4 w-max">
                    {items.slice(0, 15).map((show: TVShow) => {
                         const isAdded = watchlist.some((w: any) => w.id === show.id);
                         let isWatched = false;
                         if (show.media_type === 'movie') isWatched = history[`movie-${show.id}`]?.is_watched;
                         else isWatched = Object.values(history).some((h: any) => h.tmdb_id === show.id && h.is_watched);

                         return (
                            <div 
                                key={show.id} 
                                className="w-[160px] md:w-[200px] group relative cursor-pointer"
                                onClick={() => onOpenDetails(show.id, show.media_type)}
                            >
                                <div className="aspect-[2/3] overflow-hidden bg-zinc-900 mb-3 border border-white/5 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl">
                                    <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" alt="" />
                                    
                                    {/* Action Overlay */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                                         {/* Watchlist Toggle */}
                                         <button 
                                            onClick={(e) => !isAdded && onAdd(e, show)} 
                                            className={`w-8 h-8 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 ${isAdded ? 'bg-zinc-900 text-zinc-500 cursor-default' : 'bg-white text-black'}`}
                                            title={isAdded ? "In Library" : "Add to Library"}
                                         >
                                            {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                         </button>
                                         {/* Watched Toggle */}
                                         <button 
                                            onClick={(e) => onWatch(e, show, isAdded, isWatched)} 
                                            className={`w-8 h-8 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 ${isWatched ? 'bg-emerald-500 text-white' : 'bg-black/50 backdrop-blur-md text-white hover:bg-black/70'}`}
                                            title={isWatched ? "Mark Unwatched" : "Mark Watched"}
                                         >
                                            {isWatched ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                         </button>
                                    </div>
                                </div>
                                <h4 className="text-sm font-bold text-zinc-400 truncate">{show.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-zinc-600 mt-1">
                                    <span className="uppercase font-bold">{show.media_type === 'movie' ? 'Film' : 'TV'}</span>
                                    <span>•</span>
                                    <span>{show.first_air_date?.split('-')[0] || 'TBA'}</span>
                                    <span className="ml-auto text-indigo-500 font-bold">{show.vote_average.toFixed(1)}</span>
                                </div>
                            </div>
                         );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- BETA LAYOUT ---
const BetaView: React.FC<any> = ({ heroItems, trending, trendingTV, popularMovies, inTheaters, personalizedSections, onOpenDetails, onAdd, onWatch, onViewCategory, watchlist, history }) => {
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

    if (!hero) return <div className="h-screen bg-black" />;

    const recItem = personalizedSections[0]?.items[0];
    const isAdded = watchlist.some((w: any) => w.id === hero.id);

    return (
        <div className="pb-32 font-sans">
            <div className="relative w-full h-[85vh] flex flex-col justify-end p-6 md:p-12 overflow-hidden group">
                 {heroItems.map((item: TVShow, idx: number) => (
                     <div 
                        key={item.id}
                        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-100' : 'opacity-0'}`} 
                        style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path)})` }}
                    >
                         <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/20 to-transparent" />
                    </div>
                 ))}
                
                <div className="relative z-10 max-w-4xl animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-2 py-1">Editor's Choice</span>
                        <div className="h-px w-10 bg-white/50" />
                        <span className="text-white/80 text-xs font-mono uppercase tracking-widest">Trending #{currentIndex + 1}</span>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.85] tracking-tighter mb-6 mix-blend-overlay opacity-90">{hero.name}</h1>
                    <p className="text-zinc-300 text-sm md:text-lg font-medium max-w-xl leading-relaxed mb-8 line-clamp-3">{hero.overview}</p>
                    <div className="flex gap-4">
                        <button onClick={() => onOpenDetails(hero.id, hero.media_type)} className="h-12 px-8 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-zinc-200 transition-colors">Explore</button>
                        <button onClick={(e) => onAdd(e, hero)} className={`h-12 w-12 border flex items-center justify-center transition-colors ${isAdded ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'border-white/20 text-white hover:bg-white/10'}`}>
                            {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
                     {heroItems.map((_: any, idx: number) => (
                         <button
                            key={idx}
                            onClick={() => { setCurrentIndex(idx); resetTimer(); }}
                            className={`w-1 h-8 md:h-12 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white scale-y-110' : 'bg-white/20 hover:bg-white/40'}`}
                         />
                     ))}
                </div>
            </div>

            {personalizedSections.map((section: PersonalizedSection) => (
                <CategorySection 
                    key={section.id} 
                    title={section.title} 
                    subtitle={section.subtitle}
                    items={section.items} 
                    type={section.type} 
                    icon={section.icon}
                    onOpenDetails={onOpenDetails} 
                    onAdd={onAdd}
                    onWatch={onWatch} 
                    watchlist={watchlist}
                    history={history}
                    onMore={() => section.endpoint ? onViewCategory(section.title, section.endpoint, section.type, section.params) : undefined}
                    endpoint={section.endpoint}
                />
            ))}

            <div className="max-w-[1800px] mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[300px]">
                    {recItem && (
                        <div className="md:col-span-1 md:row-span-2 relative group overflow-hidden bg-zinc-900 cursor-pointer border border-white/5" onClick={() => onOpenDetails(recItem.id, recItem.media_type)}>
                            <img src={getImageUrl(recItem.poster_path)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent p-6 flex flex-col justify-end">
                                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Top Pick</div>
                                <h3 className="text-2xl font-bold text-white leading-none mb-2">{recItem.name}</h3>
                            </div>
                        </div>
                    )}
                    <div className="md:col-span-2 md:row-span-1 relative group overflow-hidden bg-zinc-900 cursor-pointer border border-white/5" onClick={() => onViewCategory("In Theaters", "/movie/now_playing", "movie")}>
                        {inTheaters[0] && <img src={getBackdropUrl(inTheaters[0].backdrop_path)} className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-all duration-700" alt="" />}
                        <div className="absolute inset-0 p-8 flex flex-col justify-center items-start">
                            <div className="bg-white text-black text-[10px] font-black uppercase px-2 py-0.5 mb-3">Cinema</div>
                            <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">Now Playing</h3>
                        </div>
                    </div>
                </div>
            </div>

            <CategorySection title="Trending TV" items={trendingTV} type="tv" onMore={() => onViewCategory("Trending TV", "/trending/tv/week", "tv")} onOpenDetails={onOpenDetails} onAdd={onAdd} onWatch={onWatch} watchlist={watchlist} history={history} icon={TrendingUp} />
            <CategorySection title="Popular Movies" items={popularMovies} type="movie" onMore={() => onViewCategory("Popular Movies", "/movie/popular", "movie")} onOpenDetails={onOpenDetails} onAdd={onAdd} onWatch={onWatch} watchlist={watchlist} history={history} icon={Ticket} />
        </div>
    );
};

// --- CLASSIC VIEW ---
const ClassicView: React.FC<any> = ({ heroItems, trending, trendingTV, popularMovies, inTheaters, personalizedSections, onOpenDetails, onOpenTrailer, onAdd, onWatch, onViewCategory, watchlist, history }) => {
     const hero = heroItems[0];
     const isAdded = hero ? watchlist.some((w: any) => w.id === hero.id) : false;

    return (
        <div className="pb-20">
            {hero && (
                <div className="relative w-full h-[65vh] group">
                     <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: `url(${getBackdropUrl(hero.backdrop_path)})` }}>
                        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020202] to-transparent" />
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-16 max-w-3xl pt-20">
                        <h1 className="text-4xl md:text-7xl font-bold text-white tracking-tighter mb-4 drop-shadow-2xl">{hero.name}</h1>
                        <p className="text-zinc-200 text-sm md:text-base line-clamp-3 mb-8 font-medium drop-shadow-md">{hero.overview}</p>
                        <div className="flex gap-4">
                            <button onClick={() => onOpenTrailer && onOpenTrailer(hero.id, hero.media_type)} className="px-6 py-3 bg-white text-black font-bold rounded-lg flex items-center gap-2 hover:bg-zinc-200 transition-colors"><Play className="w-5 h-5 fill-current" /> Play Trailer</button>
                            <button onClick={(e) => onAdd(e, hero)} className={`px-6 py-3 font-bold rounded-lg flex items-center gap-2 transition-colors backdrop-blur-md ${isAdded ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-800/80 text-white hover:bg-zinc-700'}`}>
                                {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                {isAdded ? 'Library' : 'My List'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="relative z-10 -mt-16 space-y-2">
                 <CategorySection title="Top 10 Today" items={trending} type="movie" onOpenDetails={onOpenDetails} onAdd={onAdd} onWatch={onWatch} watchlist={watchlist} history={history} />
                 
                 {personalizedSections.map((section: PersonalizedSection) => (
                    <CategorySection 
                        key={section.id} 
                        title={section.title} 
                        subtitle={section.subtitle}
                        items={section.items} 
                        type={section.type} 
                        icon={section.icon}
                        onOpenDetails={onOpenDetails} 
                        onAdd={onAdd} 
                        onWatch={onWatch}
                        watchlist={watchlist} 
                        history={history}
                        onMore={() => section.endpoint ? onViewCategory(section.title, section.endpoint, section.type, section.params) : undefined}
                        endpoint={section.endpoint}
                    />
                ))}

                 <CategorySection title="Popular Series" items={trendingTV} type="tv" onOpenDetails={onOpenDetails} onAdd={onAdd} onWatch={onWatch} watchlist={watchlist} history={history} icon={Tv} />
                 <CategorySection title="Now In Cinemas" items={inTheaters} type="movie" onOpenDetails={onOpenDetails} onAdd={onAdd} onWatch={onWatch} watchlist={watchlist} history={history} icon={Ticket} />
            </div>
        </div>
    );
};

export default V2Discover;