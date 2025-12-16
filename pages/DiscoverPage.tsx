import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getCollection, getImageUrl, getBackdropUrl, getMovieReleaseDates } from '../services/tmdb';
import { TVShow } from '../types';
import { Star, Plus, Check, Loader2, ChevronRight, ChevronLeft, CalendarClock, MoveRight, Trophy, TrendingUp, Ticket, MonitorPlay, Info, Play } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DiscoverModal from '../components/DiscoverModal';
import ShowDetailsModal from '../components/ShowDetailsModal';
import { format, parseISO } from 'date-fns';

interface SectionProps {
  title: string;
  fetchEndpoint: string;
  fetchParams?: Record<string, string>;
  mediaType: 'tv' | 'movie';
  onShowMore: () => void;
}

const DiscoverPage: React.FC = () => {
  const [modalConfig, setModalConfig] = useState<{title: string, endpoint: string, mediaType: 'tv' | 'movie', params?: Record<string, string>} | null>(null);

  const openModal = (title: string, endpoint: string, mediaType: 'tv' | 'movie', params?: Record<string, string>) => {
      setModalConfig({ title, endpoint, mediaType, params });
  };

  const today = new Date().toISOString().split('T')[0];
  
  const upcomingMovieParams = { 
      'primary_release_date.gte': today, 
      'sort_by': 'popularity.desc', 
      'with_release_type': '2|3',
      'with_original_language': 'en' 
  };
  
  const upcomingTVParams = { 
      'first_air_date.gte': today, 
      'sort_by': 'popularity.desc', 
      'with_original_language': 'en',
      'include_null_first_air_dates': 'false' 
  };
  
  return (
    <div className="w-full pb-20 md:pb-24">
        {/* HERO: Immersive Billboard */}
        <HeroCarousel 
            fetchEndpoint="/movie/now_playing"
            mediaType="movie"
        />

        {/* Content Container - Pushed up slightly to overlap vignette */}
        <div className="relative z-10 -mt-16 md:-mt-32 px-4 md:px-12 space-y-12">
            
            {/* Trending Row */}
            <DiscoverSection 
                title="Trending Now" 
                fetchEndpoint="/trending/all/week"
                mediaType="movie" // Generic type, section handles mixed
                onShowMore={() => openModal("Trending Now", "/trending/all/week", "movie")}
            />

            {/* Movies Row */}
            <DiscoverSection 
                title="New on Cinema" 
                fetchEndpoint="/movie/now_playing"
                mediaType="movie"
                onShowMore={() => openModal("In Theaters", "/movie/now_playing", "movie")}
            />

             {/* TV Row */}
             <DiscoverSection 
                title="Popular Series" 
                fetchEndpoint="/tv/popular"
                mediaType="tv"
                onShowMore={() => openModal("Popular TV", "/tv/popular", "tv")}
            />

            {/* Coming Soon Row */}
            <DiscoverSection 
                title="Coming Soon" 
                fetchEndpoint="/discover/movie"
                fetchParams={upcomingMovieParams}
                mediaType="movie"
                onShowMore={() => openModal("Coming Soon", "/discover/movie", "movie", upcomingMovieParams)}
            />
            
            {/* Top Rated Row */}
             <DiscoverSection 
                title="Critically Acclaimed" 
                fetchEndpoint="/movie/top_rated"
                mediaType="movie"
                onShowMore={() => openModal("Top Rated", "/movie/top_rated", "movie")}
            />
        </div>

        {modalConfig && (
            <DiscoverModal 
                isOpen={!!modalConfig}
                onClose={() => setModalConfig(null)}
                title={modalConfig.title}
                fetchEndpoint={modalConfig.endpoint}
                fetchParams={modalConfig.params}
                mediaType={modalConfig.mediaType}
            />
        )}
    </div>
  );
};

// --- Netflix-style Hero Billboard ---
const HeroCarousel: React.FC<{ fetchEndpoint: string; mediaType: 'movie' | 'tv' }> = ({ fetchEndpoint, mediaType }) => {
    const [items, setItems] = useState<TVShow[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showDetails, setShowDetails] = useState(false);
    
    const { allTrackedShows, addToWatchlist, setReminderCandidate } = useAppContext();
    const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        setLoading(true);
        // Fetch top 5 for Hero
        getCollection(fetchEndpoint, mediaType, 1)
            .then(data => setItems(data.slice(0, 5))) 
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [fetchEndpoint, mediaType]);

    // Auto Scroll Logic
    const resetTimer = useCallback(() => {
        if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        autoScrollRef.current = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, 10000); // 10 Seconds for hero
    }, [items.length]);

    useEffect(() => {
        if (items.length > 0) {
            resetTimer();
        }
        return () => {
            if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        };
    }, [items.length, resetTimer]);

    const handleAdd = async (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        await addToWatchlist(show);
        setReminderCandidate(show);
    };

    if (loading) {
        return <div className="w-full h-[60vh] md:h-[85vh] bg-zinc-950 animate-pulse" />;
    }

    if (items.length === 0) return null;

    const currentItem = items[currentIndex];
    const isAdded = allTrackedShows.some(s => s.id === currentItem.id);

    return (
        <>
        <div className="relative w-full h-[65vh] md:h-[95vh] overflow-hidden group">
            {/* Background Image - Animate opacity for transition effect */}
            {items.map((item, idx) => (
                <div 
                    key={item.id}
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                    style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path)})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/40 to-transparent" />
                    {/* Bottom Vignette for seamless merge */}
                    <div className="absolute inset-x-0 bottom-0 h-48 md:h-80 bg-gradient-to-t from-[var(--bg-main)] to-transparent" />
                </div>
            ))}
            
            {/* Content Container */}
            <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-12 pt-20 md:pt-0 max-w-4xl z-10 pointer-events-none">
                 <div className="pointer-events-auto animate-fade-in-up">
                    {/* Meta Badge */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] md:text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                            {currentItem.media_type === 'movie' ? 'Movie' : 'Series'}
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400 text-xs md:text-sm font-bold">
                             <Star className="w-3.5 h-3.5 fill-current" /> {currentItem.vote_average.toFixed(1)}
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-7xl font-bold text-white leading-[0.9] md:leading-[0.9] tracking-tighter mb-4 md:mb-6 drop-shadow-2xl">
                        {currentItem.name}
                    </h1>

                    {/* Overview */}
                    <p className="text-zinc-200 text-sm md:text-lg line-clamp-3 md:line-clamp-3 mb-6 md:mb-8 max-w-xl leading-relaxed drop-shadow-md">
                        {currentItem.overview}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 md:gap-4">
                        <button 
                            onClick={() => setShowDetails(true)}
                            className="px-6 md:px-8 py-3 md:py-3.5 bg-white text-black hover:bg-zinc-200 rounded-lg font-bold flex items-center gap-2 transition-transform active:scale-95 text-sm md:text-base"
                        >
                            <Play className="w-5 h-5 fill-current" /> Play Trailer
                        </button>
                        <button 
                            onClick={(e) => handleAdd(e, currentItem)}
                            disabled={isAdded}
                            className={`px-6 md:px-8 py-3 md:py-3.5 rounded-lg font-bold flex items-center gap-2 transition-transform active:scale-95 text-sm md:text-base border ${isAdded ? 'bg-zinc-800/80 border-zinc-700 text-zinc-400' : 'bg-zinc-600/60 border-zinc-500 hover:bg-zinc-600/80 text-white backdrop-blur-md'}`}
                        >
                             {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                             {isAdded ? 'My List' : 'Add to List'}
                        </button>
                    </div>
                 </div>
            </div>

            {/* Carousel Indicators (Right side) */}
            <div className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
                 {items.map((_, idx) => (
                     <button
                        key={idx}
                        onClick={() => { setCurrentIndex(idx); resetTimer(); }}
                        className={`w-1 h-8 md:h-12 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white scale-y-110' : 'bg-white/20 hover:bg-white/40'}`}
                     />
                 ))}
            </div>
        </div>

        {showDetails && (
            <ShowDetailsModal 
                isOpen={showDetails} 
                onClose={() => setShowDetails(false)} 
                showId={currentItem.id} 
                mediaType={mediaType} 
            />
        )}
        </>
    );
}

// --- Netflix-style Horizontal Row Section ---
const DiscoverSection: React.FC<SectionProps> = ({ title, fetchEndpoint, fetchParams, mediaType, onShowMore }) => {
    const [items, setItems] = useState<TVShow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
    const { allTrackedShows, addToWatchlist, setReminderCandidate } = useAppContext();

    useEffect(() => {
        setLoading(true);
        getCollection(fetchEndpoint, mediaType, 1, fetchParams)
            .then(data => setItems(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [fetchEndpoint, mediaType, JSON.stringify(fetchParams)]);

    const handleAdd = async (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        await addToWatchlist(show);
        setReminderCandidate(show);
    };

    if (loading) return null; // Or a skeleton
    if (items.length === 0) return null;

    return (
        <div className="group/section">
             <div className="flex items-end justify-between mb-3 px-1">
                 <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight group-hover/section:text-indigo-400 transition-colors cursor-pointer" onClick={onShowMore}>
                     {title}
                 </h2>
                 <button onClick={onShowMore} className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
                     Explore All <ChevronRight className="w-3 h-3" />
                 </button>
             </div>
             
             {/* Horizontal Scroll Container */}
             <div className="relative -mx-4 md:-mx-12 px-4 md:px-12 overflow-x-auto hide-scrollbar pb-8 pt-4">
                 <div className="flex gap-3 md:gap-4 w-max">
                     {items.slice(0, 15).map(show => {
                         const isAdded = allTrackedShows.some(s => s.id === show.id);
                         return (
                             <div 
                                key={show.id} 
                                className="relative group/card cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-20 origin-center"
                                style={{ width: '150px', height: '225px' }} // Standard Poster Ratio
                                onClick={() => setSelectedShow(show)}
                             >
                                 <div className="w-full h-full rounded-md overflow-hidden bg-zinc-900 shadow-lg relative">
                                     <img 
                                        src={getImageUrl(show.poster_path)} 
                                        alt={show.name} 
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-opacity"
                                     />
                                     
                                     {/* Hover Reveal Overlay */}
                                     <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                                         <div>
                                            <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight mb-1">{show.name}</h4>
                                            <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                                                <span>{show.vote_average.toFixed(1)} Match</span>
                                            </div>
                                         </div>

                                         <div className="flex gap-2">
                                             <button 
                                                onClick={(e) => handleAdd(e, show)}
                                                disabled={isAdded}
                                                className={`flex-1 py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 ${isAdded ? 'bg-zinc-700 text-zinc-400' : 'bg-white text-black hover:bg-zinc-200'}`}
                                             >
                                                 {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                             </button>
                                             <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10">
                                                 <Info className="w-3 h-3 text-white" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         );
                     })}
                 </div>
             </div>

             {selectedShow && (
                 <ShowDetailsModal 
                    isOpen={!!selectedShow} 
                    onClose={() => setSelectedShow(null)} 
                    showId={selectedShow.id} 
                    mediaType={mediaType} 
                 />
             )}
        </div>
    );
};

export default DiscoverPage;