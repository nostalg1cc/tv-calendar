import React, { useEffect, useState } from 'react';
import { getCollection, getImageUrl } from '../services/tmdb';
import { TVShow } from '../types';
import { Star, Plus, Check, Loader2, ChevronRight, Film, Tv, Flame, CalendarClock, MoveRight, Sparkles, Trophy, TrendingUp, Ticket } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DiscoverModal from '../components/DiscoverModal';

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

  const openModal = (title: string, endpoint: string, mediaType: 'tv' | 'movie', params?: Record<string, string>) => {
      setModalConfig({ title, endpoint, mediaType, params });
  };

  const today = new Date().toISOString().split('T')[0];
  
  // Params - Adjusted to remove vote count restrictions for upcoming content and enforce English for "blockbuster" feel
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
    <div className="max-w-[1600px] mx-auto pb-24">
        {/* Header Area */}
        <div className="mb-8 px-4 md:px-0">
             <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
             <p className="text-zinc-400">Explore trending hits, new premieres, and cinema releases.</p>
        </div>

        {/* HERO: In Theaters */}
        <div className="mb-12">
            <DiscoverSection 
                title="Cinema Spotlight" 
                icon={<Ticket className="w-5 h-5 text-pink-500" />}
                fetchEndpoint="/movie/now_playing"
                mediaType="movie"
                onShowMore={() => openModal("In Theaters", "/movie/now_playing", "movie")}
            />
        </div>

        <div className="space-y-16">
            
            {/* GROUP 1: Trending Now */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-4 md:px-0 border-b border-zinc-800 pb-4">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Hot Right Now</h2>
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Global Trends</p>
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
                <div className="flex items-center gap-3 px-4 md:px-0 border-b border-zinc-800 pb-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <CalendarClock className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Coming Soon</h2>
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Premieres & Releases</p>
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
                 <div className="flex items-center gap-3 px-4 md:px-0 border-b border-zinc-800 pb-4">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">All-Time Greats</h2>
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Critically Acclaimed</p>
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

const DiscoverSection: React.FC<SectionProps> = ({ title, icon, fetchEndpoint, fetchParams, mediaType, onShowMore, variant = 'default' }) => {
    const [items, setItems] = useState<TVShow[]>([]);
    const [loading, setLoading] = useState(true);
    const { allTrackedShows, addToWatchlist, setReminderCandidate } = useAppContext();

    useEffect(() => {
        setLoading(true);
        getCollection(fetchEndpoint, mediaType, 1, fetchParams)
            .then(data => setItems(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [fetchEndpoint, mediaType, JSON.stringify(fetchParams)]);

    const handleAdd = async (show: TVShow) => {
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

    // Default vs Compact styles
    const cardWidth = variant === 'default' ? 'w-[160px] md:w-[220px]' : 'w-[140px] md:w-[180px]';
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
                    className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-white transition-colors group uppercase tracking-wider"
                 >
                     View All <MoveRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                 </button>
             </div>
             
             <div className="relative group/container">
                 <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-0 scroll-smooth hide-scrollbar snap-x">
                     {items.slice(0, 10).map(show => {
                         const isAdded = allTrackedShows.some(s => s.id === show.id);
                         return (
                             <div 
                                key={show.id} 
                                className={`snap-start shrink-0 ${cardWidth} flex flex-col gap-2 group relative`}
                             >
                                 <div className={`relative ${aspectRatio} rounded-xl overflow-hidden shadow-lg border border-zinc-800 bg-zinc-900 transition-all duration-300 group-hover:scale-[1.03] group-hover:border-indigo-500/30 group-hover:shadow-indigo-500/10`}>
                                     <img 
                                        src={getImageUrl(show.poster_path)} 
                                        alt={show.name} 
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                     />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                         <p className="text-xs font-bold text-white mb-2">{show.vote_average.toFixed(1)} ★</p>
                                         <button 
                                            onClick={() => handleAdd(show)}
                                            disabled={isAdded}
                                            className={`
                                                w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5
                                                ${isAdded 
                                                    ? 'bg-emerald-600/90 text-white cursor-default' 
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'}
                                            `}
                                         >
                                             {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                             {isAdded ? 'Tracking' : 'Add'}
                                         </button>
                                     </div>
                                 </div>
                                 <div>
                                     <h3 className="font-bold text-zinc-200 text-sm leading-tight truncate group-hover:text-indigo-400 transition-colors" title={show.name}>{show.name}</h3>
                                     <p className="text-xs text-zinc-500">{show.first_air_date ? show.first_air_date.split('-')[0] : 'Unknown'}</p>
                                 </div>
                             </div>
                         );
                     })}
                     <div 
                        onClick={onShowMore}
                        className={`snap-start shrink-0 ${cardWidth} flex items-center justify-center cursor-pointer group`}
                     >
                        <div className={`w-full ${aspectRatio} rounded-xl border-2 border-dashed border-zinc-800 bg-transparent hover:bg-zinc-800/50 hover:border-indigo-500/30 flex flex-col items-center justify-center gap-3 transition-all`}>
                             <div className="p-3 rounded-full bg-zinc-800 group-hover:bg-indigo-600 transition-colors">
                                 <ChevronRight className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                             </div>
                             <span className="font-bold text-xs text-zinc-500 group-hover:text-white uppercase tracking-wider">See More</span>
                        </div>
                     </div>
                 </div>
                 {/* Gradient Fade for Desktop */}
                 <div className="absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-[var(--bg-main)] to-transparent pointer-events-none hidden md:block"></div>
             </div>
        </div>
    );
};

export default DiscoverPage;