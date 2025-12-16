import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getCollection, getImageUrl, getBackdropUrl, getMovieReleaseDates } from '../services/tmdb';
import { TVShow } from '../types';
import { Star, Plus, Check, Loader2, ChevronRight, ChevronLeft, CalendarClock, MoveRight, Trophy, TrendingUp, Ticket, MonitorPlay, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DiscoverModal from '../components/DiscoverModal';
import ShowDetailsModal from '../components/ShowDetailsModal';
import { format, parseISO } from 'date-fns';

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  fetchEndpoint: string;
  fetchParams?: Record<string, string>;
  mediaType: 'tv' | 'movie';
  onShowMore: () => void;
  variant?: 'default' | 'compact';
}

const DiscoverPage: React.FC = () => {
  const [modalConfig, setModalConfig] = useState<{title: string, endpoint: string, mediaType: 'tv' | 'movie', params?: Record<string, string>} | null>(null);
  const [selectedShow, setSelectedShow] = useState<{id: number, mediaType: 'tv' | 'movie'} | null>(null);

  const openModal = (title: string, endpoint: string, mediaType: 'tv' | 'movie', params?: Record<string, string>) => {
      setModalConfig({ title, endpoint, mediaType, params });
  };

  const today = new Date().toISOString().split('T')[0];
  
  // Params
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
    <div className="max-w-[1600px] mx-auto p-0 md:p-4 pb-20 md:pb-24">
        {/* Header Area */}
        <div className="mb-6 px-4 pt-4 md:px-0 md:pt-0">
             <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Discover</h1>
             <p className="text-zinc-400 text-sm md:text-base">Explore trending hits, new premieres, and cinema releases.</p>
        </div>

        {/* HERO: Cinema Spotlight Carousel */}
        <div className="mb-10 md:mb-16">
            <HeroCarousel 
                fetchEndpoint="/movie/now_playing"
                mediaType="movie"
                title="Cinema Spotlight"
            />
        </div>

        <div className="space-y-12 md:space-y-16">
            
            {/* GROUP 1: Trending Now */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 px-4 md:px-0">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-white">Hot Right Now</h2>
                        <p className="text-[10px] md:text-xs text-zinc-500 font-medium uppercase tracking-wide">Global Trends</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-8">
                    <DiscoverSection 
                        title="Trending TV Shows" 
                        fetchEndpoint="/tv/popular"
                        mediaType="tv"
                        variant="compact"
                        onShowMore={() => openModal("Trending TV", "/tv/popular", "tv")}
                    />
                    <DiscoverSection 
                        title="Trending Movies" 
                        fetchEndpoint="/movie/popular"
                        mediaType="movie"
                        variant="compact"
                        onShowMore={() => openModal("Trending Movies", "/movie/popular", "movie")}
                    />
                </div>
            </div>

            {/* GROUP 2: Coming Soon */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 px-4 md:px-0">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <CalendarClock className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-white">Coming Soon</h2>
                        <p className="text-[10px] md:text-xs text-zinc-500 font-medium uppercase tracking-wide">Premieres & Releases</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <DiscoverSection 
                        title="Upcoming TV" 
                        fetchEndpoint="/discover/tv"
                        fetchParams={upcomingTVParams}
                        mediaType="tv"
                        variant="compact"
                        onShowMore={() => openModal("New TV Premieres", "/discover/tv", "tv", upcomingTVParams)}
                    />
                    <DiscoverSection 
                        title="Upcoming Movies" 
                        fetchEndpoint="/discover/movie"
                        fetchParams={upcomingMovieParams}
                        mediaType="movie"
                        variant="compact"
                        onShowMore={() => openModal("Upcoming Movies", "/discover/movie", "movie", upcomingMovieParams)}
                    />
                </div>
            </div>

            {/* GROUP 3: Top Rated */}
            <div className="space-y-6">
                 <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 px-4 md:px-0">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                        <Trophy className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-white">All-Time Greats</h2>
                        <p className="text-[10px] md:text-xs text-zinc-500 font-medium uppercase tracking-wide">Critically Acclaimed</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <DiscoverSection 
                        title="Top Rated TV" 
                        fetchEndpoint="/tv/top_rated"
                        mediaType="tv"
                        variant="compact"
                        onShowMore={() => openModal("Top Rated TV", "/tv/top_rated", "tv")}
                    />
                    <DiscoverSection 
                        title="Top Rated Movies" 
                        fetchEndpoint="/movie/top_rated"
                        mediaType="movie"
                        variant="compact"
                        onShowMore={() => openModal("Top Rated Movies", "/movie/top_rated", "movie")}
                    />
                </div>
            </div>

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

// --- New Hero Carousel Component ---
const HeroCarousel: React.FC<{ fetchEndpoint: string; mediaType: 'movie' | 'tv'; title: string }> = ({ fetchEndpoint, mediaType, title }) => {
    const [items, setItems] = useState<TVShow[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [digitalDate, setDigitalDate] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    
    const { allTrackedShows, addToWatchlist, setReminderCandidate } = useAppContext();
    const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        setLoading(true);
        // Fetch fewer items for hero, focus on high quality
        getCollection(fetchEndpoint, mediaType, 1)
            .then(data => setItems(data.slice(0, 8))) // Take top 8
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [fetchEndpoint, mediaType]);

    // Fetch Digital Release Date for Active Item
    useEffect(() => {
        if (!items[currentIndex]) return;
        
        const fetchDates = async () => {
            setDigitalDate(null); // Reset while fetching
            if (mediaType === 'movie') {
                try {
                    const dates = await getMovieReleaseDates(items[currentIndex].id);
                    const digital = dates.find(d => d.type === 'digital');
                    if (digital) {
                        setDigitalDate(digital.date);
                    }
                } catch (e) { console.error(e); }
            }
        };
        fetchDates();
    }, [currentIndex, items, mediaType]);

    // Auto Scroll Logic
    const resetTimer = useCallback(() => {
        if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        autoScrollRef.current = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, 8000); // 8 Seconds
    }, [items.length]);

    useEffect(() => {
        if (items.length > 0) {
            resetTimer();
        }
        return () => {
            if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        };
    }, [items.length, resetTimer]);

    const handleNext = () => {
        setCurrentIndex(prev => (prev + 1) % items.length);
        resetTimer(); // Reset timer on interaction
    };

    const handlePrev = () => {
        setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
        resetTimer(); // Reset timer on interaction
    };

    const handleAdd = async (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        await addToWatchlist(show);
        setReminderCandidate(show);
    };

    if (loading) {
        return <div className="w-full aspect-[2/3] md:aspect-[21/9] bg-zinc-900 rounded-none md:rounded-3xl animate-pulse" />;
    }

    if (items.length === 0) return null;

    const currentItem = items[currentIndex];
    const isAdded = allTrackedShows.some(s => s.id === currentItem.id);

    return (
        <>
        <div className="relative w-full aspect-[2/3] md:aspect-[21/9] rounded-none md:rounded-3xl overflow-hidden group shadow-2xl bg-zinc-950">
            {/* Mobile Poster (Portrait) */}
            <div className="absolute inset-0 md:hidden">
                <img 
                    src={getImageUrl(currentItem.poster_path)} 
                    alt={currentItem.name}
                    className="w-full h-full object-cover animate-fade-in"
                />
            </div>

            {/* Desktop Backdrop (Landscape) */}
            <div 
                key={currentItem.id}
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 animate-fade-in hidden md:block"
                style={{ backgroundImage: `url(${getBackdropUrl(currentItem.backdrop_path)})` }}
            />
            
            {/* Overlays */}
            {/* Desktop Overlay - Darker gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent hidden md:block" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent hidden md:block" />
            
            {/* Mobile Overlay - Stronger bottom gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent md:hidden" />

            {/* Content Container */}
            <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end items-start max-w-3xl">
                {/* Category Badge */}
                <div className="flex flex-wrap items-center gap-2 mb-3 md:mb-4 animate-fade-in-up">
                    <div className="bg-pink-500 text-white px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-pink-500/30">
                        <Ticket className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">In Theaters</span><span className="md:hidden">Cinema</span>
                    </div>
                    
                    {digitalDate && (
                         <div className="bg-emerald-500/80 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                             <MonitorPlay className="w-3 h-3 md:w-3.5 md:h-3.5" /> Home <span className="hidden md:inline">Release</span> {format(parseISO(digitalDate), 'MMM d')}
                         </div>
                    )}

                    <div className="bg-black/40 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1 border border-white/10">
                        <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-400 fill-current" /> {currentItem.vote_average.toFixed(1)}
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl md:text-6xl font-bold text-white mb-2 md:mb-4 leading-tight drop-shadow-xl animate-fade-in-up line-clamp-2 tracking-tight" style={{ animationDelay: '0.1s' }}>
                    {currentItem.name}
                </h2>

                {/* Overview */}
                <p className="text-zinc-300 text-xs md:text-base line-clamp-3 md:line-clamp-2 mb-6 md:mb-8 max-w-2xl leading-relaxed drop-shadow-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    {currentItem.overview}
                </p>

                {/* Actions */}
                <div className="flex items-center w-full md:w-auto gap-3 md:gap-4 animate-fade-in-up pb-2 md:pb-0" style={{ animationDelay: '0.3s' }}>
                    <button 
                        onClick={() => setShowDetails(true)}
                        className="flex-1 md:flex-none justify-center px-6 md:px-8 h-12 md:h-14 rounded-xl font-bold flex items-center gap-2 text-sm md:text-base transition-all bg-white text-black hover:bg-zinc-200 hover:scale-105 shadow-xl shadow-white/10"
                    >
                        <Info className="w-4 h-4 md:w-5 md:h-5" />
                        Info & Trailer
                    </button>

                    <button 
                        onClick={(e) => handleAdd(e, currentItem)}
                        disabled={isAdded}
                        className={`
                            justify-center px-4 h-12 md:h-14 rounded-xl font-bold flex items-center gap-2 transition-all border
                            ${isAdded 
                                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 cursor-default' 
                                : 'bg-white/10 text-white border-white/10 hover:bg-white/20 backdrop-blur-md'}
                        `}
                        title={isAdded ? "In Library" : "Add to Library"}
                    >
                        {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
                    
                    {/* Dots Indicator (Hidden on mobile generally, but could be useful. Kept desktop only for now for cleaner look) */}
                    <div className="hidden md:flex gap-2 ml-4">
                        {items.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/30'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Navigation Arrows (Desktop Only) */}
            <button 
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/50 text-white/50 hover:text-white backdrop-blur-sm border border-white/5 transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            >
                <ChevronLeft className="w-8 h-8" />
            </button>
            <button 
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/50 text-white/50 hover:text-white backdrop-blur-sm border border-white/5 transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            >
                <ChevronRight className="w-8 h-8" />
            </button>
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

const DiscoverSection: React.FC<SectionProps> = ({ title, icon, fetchEndpoint, fetchParams, mediaType, onShowMore, variant = 'default' }) => {
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

    if (loading) {
        return (
            <div className="w-full h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (items.length === 0) return null;

    // Responsive widths: Wider on mobile to show detail, standard on desktop
    const cardWidth = 'w-[38vw] sm:w-[160px] md:w-[200px]';
    const aspectRatio = 'aspect-[2/3]';

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between px-4 md:px-0">
                 <div className="flex items-center gap-2">
                    {icon}
                    <h3 className={`${variant === 'default' ? 'text-lg text-white' : 'text-base text-zinc-200'} font-bold tracking-tight`}>
                        {title}
                    </h3>
                 </div>
                 <button 
                    onClick={onShowMore}
                    className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-zinc-500 hover:text-white transition-colors group uppercase tracking-wider"
                 >
                     View All <MoveRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                 </button>
             </div>
             
             <div className="relative group/container">
                 <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scroll-smooth hide-scrollbar snap-x px-4 md:px-0">
                     {items.slice(0, 10).map(show => {
                         const isAdded = allTrackedShows.some(s => s.id === show.id);
                         return (
                             <div 
                                key={show.id} 
                                className={`snap-start shrink-0 ${cardWidth} flex flex-col gap-2 group relative cursor-pointer`}
                                onClick={() => setSelectedShow(show)}
                             >
                                 <div className={`relative ${aspectRatio} rounded-none md:rounded-xl overflow-hidden shadow-lg border border-zinc-800 bg-zinc-900 transition-all duration-300 group-hover:scale-[1.03] group-hover:border-indigo-500/30 group-hover:shadow-indigo-500/10`}>
                                     <img 
                                        src={getImageUrl(show.poster_path)} 
                                        alt={show.name} 
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                     />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                         <p className="text-xs font-bold text-white mb-2">{show.vote_average.toFixed(1)} ★</p>
                                         <button 
                                            onClick={(e) => handleAdd(e, show)}
                                            disabled={isAdded}
                                            className={`
                                                w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all
                                                ${isAdded 
                                                    ? 'bg-emerald-600/80 text-white cursor-default' 
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'}
                                            `}
                                         >
                                             {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                             {isAdded ? 'Tracking' : 'Add'}
                                         </button>
                                     </div>
                                 </div>
                                 <div className="px-1 md:px-0">
                                     <h3 className="font-bold text-zinc-200 text-sm leading-tight truncate group-hover:text-indigo-400 transition-colors" title={show.name}>{show.name}</h3>
                                     <p className="text-xs text-zinc-500">{show.first_air_date ? show.first_air_date.split('-')[0] : 'Unknown'}</p>
                                 </div>
                             </div>
                         );
                     })}
                     <div 
                        onClick={onShowMore}
                        className={`snap-start shrink-0 w-[25vw] md:w-[160px] flex items-center justify-center cursor-pointer group`}
                     >
                        <div className={`w-full ${aspectRatio} rounded-none md:rounded-xl border-2 border-dashed border-zinc-800 bg-transparent hover:bg-zinc-800/50 hover:border-indigo-500/30 flex flex-col items-center justify-center gap-3 transition-all`}>
                             <div className="p-3 rounded-full bg-zinc-800 group-hover:bg-indigo-600 transition-colors">
                                 <ChevronRight className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                             </div>
                             <span className="font-bold text-[10px] md:text-xs text-zinc-500 group-hover:text-white uppercase tracking-wider text-center">See More</span>
                        </div>
                     </div>
                 </div>
                 {/* Gradient Fade for Desktop */}
                 <div className="absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-[var(--bg-main)] to-transparent pointer-events-none hidden md:block"></div>
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