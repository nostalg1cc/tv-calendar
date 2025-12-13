import React, { useEffect, useState } from 'react';
import { getCollection, getImageUrl } from '../services/tmdb';
import { TVShow } from '../types';
import { Star, Plus, Check, Loader2, ChevronRight, Film, Tv, Flame, CalendarClock, MoveRight, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DiscoverModal from '../components/DiscoverModal';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
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
  
  // Logic for Upcoming Movies (Theatrical/Digital)
  const upcomingMovieParams = {
      'primary_release_date.gte': today,
      'sort_by': 'popularity.desc',
      'with_original_language': 'en',
      'vote_count.gte': '5',
      // Release Types: 2 (Limited), 3 (Theatrical)
      'with_release_type': '2|3', 
  };

  // Logic for Upcoming TV (New Series/Seasons)
  const upcomingTVParams = {
      'first_air_date.gte': today,
      'sort_by': 'popularity.desc',
      'with_original_language': 'en',
      'vote_count.gte': '5', // Filter out completely unknown low-quality entries
      'include_null_first_air_dates': 'false'
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 pb-12">
        <div className="px-4 md:px-0">
             <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
             <p className="text-slate-400">Explore trending hits and upcoming releases.</p>
        </div>

        <DiscoverSection 
            title="Popular on TV" 
            icon={<Tv className="w-5 h-5 text-indigo-400" />}
            fetchEndpoint="/tv/popular"
            mediaType="tv"
            onShowMore={() => openModal("Popular on TV", "/tv/popular", "tv")}
        />

        <DiscoverSection 
            title="Upcoming Blockbusters" 
            icon={<CalendarClock className="w-5 h-5 text-emerald-400" />}
            fetchEndpoint="/discover/movie"
            fetchParams={upcomingMovieParams}
            mediaType="movie"
             onShowMore={() => openModal("Upcoming Blockbusters", "/discover/movie", "movie", upcomingMovieParams)}
        />

        <DiscoverSection 
            title="New TV Premieres" 
            icon={<Sparkles className="w-5 h-5 text-purple-400" />}
            fetchEndpoint="/discover/tv"
            fetchParams={upcomingTVParams}
            mediaType="tv"
             onShowMore={() => openModal("New TV Premieres", "/discover/tv", "tv", upcomingTVParams)}
        />
        
        <DiscoverSection 
            title="Trending Movies" 
            icon={<Flame className="w-5 h-5 text-orange-400" />}
            fetchEndpoint="/movie/popular"
            mediaType="movie"
             onShowMore={() => openModal("Trending Movies", "/movie/popular", "movie")}
        />

        <DiscoverSection 
            title="In Theaters" 
            icon={<Film className="w-5 h-5 text-pink-400" />}
            fetchEndpoint="/movie/now_playing"
            mediaType="movie"
             onShowMore={() => openModal("In Theaters", "/movie/now_playing", "movie")}
        />

        <DiscoverSection 
            title="Top Rated TV" 
            icon={<Star className="w-5 h-5 text-yellow-400" />}
            fetchEndpoint="/tv/top_rated"
            mediaType="tv"
             onShowMore={() => openModal("Top Rated TV", "/tv/top_rated", "tv")}
        />

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

const DiscoverSection: React.FC<SectionProps> = ({ title, icon, fetchEndpoint, fetchParams, mediaType, onShowMore }) => {
    const [items, setItems] = useState<TVShow[]>([]);
    const [loading, setLoading] = useState(true);
    const { allTrackedShows, addToWatchlist } = useAppContext();

    useEffect(() => {
        setLoading(true);
        getCollection(fetchEndpoint, mediaType, 1, fetchParams)
            .then(data => setItems(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [fetchEndpoint, mediaType, JSON.stringify(fetchParams)]);

    if (loading) {
        return (
            <div className="w-full h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between px-4 md:px-0">
                 <div className="flex items-center gap-2">
                    {icon}
                    <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
                 </div>
                 <button 
                    onClick={onShowMore}
                    className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white transition-colors group"
                 >
                     Show All <MoveRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                 </button>
             </div>
             
             <div className="relative group/container">
                 <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-0 scroll-smooth hide-scrollbar snap-x">
                     {items.slice(0, 10).map(show => {
                         const isAdded = allTrackedShows.some(s => s.id === show.id);
                         return (
                             <div 
                                key={show.id} 
                                className="snap-start shrink-0 w-[160px] md:w-[200px] flex flex-col gap-2 group relative"
                             >
                                 <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-white/5 bg-slate-800 transition-all duration-300 group-hover:scale-[1.03] group-hover:border-indigo-500/30">
                                     <img 
                                        src={getImageUrl(show.poster_path)} 
                                        alt={show.name} 
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                     />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                         <p className="text-xs font-bold text-white mb-1">{show.vote_average.toFixed(1)} ★</p>
                                         <button 
                                            onClick={() => addToWatchlist(show)}
                                            disabled={isAdded}
                                            className={`
                                                w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5
                                                ${isAdded 
                                                    ? 'bg-green-600/80 text-white cursor-default' 
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'}
                                            `}
                                         >
                                             {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                             {isAdded ? 'Tracking' : 'Add'}
                                         </button>
                                     </div>
                                 </div>
                                 <div>
                                     <h3 className="font-bold text-white text-sm leading-tight truncate group-hover:text-indigo-400 transition-colors" title={show.name}>{show.name}</h3>
                                     <p className="text-xs text-slate-400">{show.first_air_date ? show.first_air_date.split('-')[0] : 'Unknown'}</p>
                                 </div>
                             </div>
                         );
                     })}
                     <div 
                        onClick={onShowMore}
                        className="snap-start shrink-0 w-[160px] md:w-[200px] flex items-center justify-center cursor-pointer group"
                     >
                        <div className="w-full aspect-[2/3] rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/30 hover:bg-slate-800 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-3 transition-all">
                             <div className="p-3 rounded-full bg-slate-700 group-hover:bg-indigo-600 transition-colors">
                                 <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-white" />
                             </div>
                             <span className="font-medium text-slate-400 group-hover:text-white">View All</span>
                        </div>
                     </div>
                 </div>
                 <div className="absolute top-0 bottom-0 right-0 w-12 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none md:hidden"></div>
             </div>
        </div>
    );
};

export default DiscoverPage;