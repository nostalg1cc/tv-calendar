import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Trash2, Star, Tv, ArrowUpDown, Clock, AlertCircle, Film, Filter, Link as LinkIcon, ListPlus, Search, Eye, EyeOff, Check, StarOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import { format, parseISO } from 'date-fns';
import { Episode } from '../types';
import ListManager from '../components/ListManager';

type SortOption = 'name' | 'upcoming';
type FilterOption = 'all' | 'tv' | 'movie' | 'unwatched_movie';

const WatchlistPage: React.FC = () => {
  const { watchlist, subscribedLists, allTrackedShows, removeFromWatchlist, episodes, interactions, toggleWatched, setRating } = useAppContext();
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isListManagerOpen, setIsListManagerOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  // Infinite Scroll State
  const [displayLimit, setDisplayLimit] = useState(20);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Counts
  const movieCount = allTrackedShows.filter(s => s.media_type === 'movie').length;
  const showCount = allTrackedShows.filter(s => s.media_type === 'tv').length;

  const getNextEpisodeDate = (showId: number): string | null => {
    const today = new Date().toISOString().split('T')[0];
    const allEpisodes = Object.values(episodes).flat() as Episode[];
    const showEpisodes = allEpisodes.filter(ep => ep.show_id === showId && ep.air_date && ep.air_date >= today);
    showEpisodes.sort((a, b) => a.air_date.localeCompare(b.air_date));
    return showEpisodes.length > 0 ? showEpisodes[0].air_date : null;
  };

  const processedList = useMemo(() => {
    let list = [...allTrackedShows];

    if (filterBy === 'tv') {
        list = list.filter(item => item.media_type === 'tv');
    } else if (filterBy === 'movie') {
        list = list.filter(item => item.media_type === 'movie');
    } else if (filterBy === 'unwatched_movie') {
        list = list.filter(item => {
             if (item.media_type !== 'movie') return false;
             const interact = interactions[`movie-${item.id}`];
             return !interact?.is_watched;
        });
    }

    if (localSearch) list = list.filter(item => item.name.toLowerCase().includes(localSearch.toLowerCase()));

    return list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const dateA = getNextEpisodeDate(a.id);
      const dateB = getNextEpisodeDate(b.id);
      if (dateA && dateB) return dateA.localeCompare(dateB);
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [allTrackedShows, sortBy, filterBy, episodes, localSearch, interactions]);

  // Handle Infinite Scroll
  useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
              setDisplayLimit(prev => Math.min(prev + 20, processedList.length));
          }
      }, { threshold: 0.1 });

      if (loaderRef.current) {
          observer.observe(loaderRef.current);
      }

      return () => observer.disconnect();
  }, [processedList.length]);

  // Reset limit on filter change
  useEffect(() => {
      setDisplayLimit(20);
  }, [filterBy, sortBy, localSearch]);

  const confirmDelete = () => {
    if (deleteId) {
      removeFromWatchlist(deleteId);
      setDeleteId(null);
    }
  };

  const visibleItems = processedList.slice(0, displayLimit);

  // Rating Stars Helper
  const RatingStars = ({ item }: { item: any }) => {
      const interact = interactions[`${item.media_type}-${item.id}`];
      const currentRating = interact?.rating || 0;
      
      return (
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(item.id, item.media_type, star === currentRating ? 0 : star)}
                    className={`p-0.5 hover:scale-110 transition-transform ${star <= currentRating ? 'text-yellow-400' : 'text-zinc-700 hover:text-yellow-200'}`}
                  >
                      <Star className="w-3.5 h-3.5 fill-current" />
                  </button>
              ))}
          </div>
      );
  };

  return (
    <div className="w-full">
      {/* Page Header (Minimal Design) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-2">
        {/* Left: Title & Stats */}
        <div className="flex items-baseline gap-4">
           <h1 className="text-3xl font-bold text-white tracking-tighter">My Library</h1>
           <span className="text-xs text-zinc-500 font-medium">
              {showCount} Series <span className="mx-1 text-zinc-700">|</span> {movieCount} Movies
           </span>
        </div>

        {/* Right: Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-4">
             
             {/* Search */}
             <div className="relative group">
                <input 
                    type="text" 
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search..."
                    className="bg-transparent border-b border-zinc-800 focus:border-indigo-500 py-1 pl-0 pr-6 text-sm text-white focus:outline-none w-32 focus:w-48 transition-all placeholder:text-zinc-600"
                />
                <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-indigo-400" />
             </div>
             
             {/* Divider */}
             <div className="h-4 w-px bg-zinc-800 mx-1 hidden md:block" />

             {/* Filters (Text Only) */}
             <div className="flex items-center gap-3">
                 <button 
                    onClick={() => setFilterBy('all')}
                    className={`text-sm font-medium transition-colors ${filterBy === 'all' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                     All
                 </button>
                 <button 
                    onClick={() => setFilterBy('tv')}
                    className={`text-sm font-medium transition-colors ${filterBy === 'tv' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                     TV
                 </button>
                 <button 
                    onClick={() => setFilterBy('movie')}
                    className={`text-sm font-medium transition-colors ${filterBy === 'movie' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                     Movies
                 </button>
                  <button 
                    onClick={() => setFilterBy('unwatched_movie')}
                    className={`text-sm font-medium transition-colors flex items-center gap-1 ${filterBy === 'unwatched_movie' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Unwatched Movies"
                 >
                     <EyeOff className="w-3.5 h-3.5" />
                 </button>
             </div>

             {/* Divider */}
             <div className="h-4 w-px bg-zinc-800 mx-1 hidden md:block" />

             {/* Actions */}
             <div className="flex items-center gap-3">
                <button 
                    onClick={() => setSortBy(sortBy === 'name' ? 'upcoming' : 'name')}
                    className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                    title={sortBy === 'upcoming' ? 'Sort by Name' : 'Sort by Date'}
                >
                    <ArrowUpDown className="w-4 h-4" />
                </button>
                
                <button 
                    onClick={() => setIsListManagerOpen(true)}
                    className="text-zinc-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
                    title="Manage Lists"
                >
                    <ListPlus className="w-5 h-5" />
                </button>
             </div>
        </div>
      </div>

      {/* Empty State */}
      {allTrackedShows.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[50vh] surface-card rounded-3xl border-dashed border-zinc-800">
             <Tv className="w-16 h-16 text-zinc-600 mb-4" />
             <h2 className="text-xl font-bold text-white">Your library is empty</h2>
             <p className="text-zinc-500 mb-6">Track shows to see them here.</p>
             <Link to="/discover" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500">
                Discover Shows
             </Link>
          </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {visibleItems.map((show) => {
          const nextAirDate = getNextEpisodeDate(show.id);
          const isManual = watchlist.some(s => s.id === show.id);
          const foundList = subscribedLists.find(l => l.items.some(i => i.id === show.id));
          const interact = interactions[`${show.media_type}-${show.id}`];
          const isWatched = interact?.is_watched;
          
          return (
            <div key={show.id} className="surface-card rounded-xl overflow-hidden flex h-40 group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all">
                {/* Poster */}
                <div className="w-28 shrink-0 relative bg-black">
                    <img 
                        src={getImageUrl(show.poster_path)} 
                        loading="lazy"
                        className={`w-full h-full object-cover transition-all ${isWatched ? 'grayscale opacity-50' : 'opacity-80 group-hover:opacity-100'}`} 
                        alt="" 
                    />
                    {isWatched && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Check className="w-8 h-8 text-emerald-500 drop-shadow-lg" />
                        </div>
                    )}
                </div>
                
                {/* Content */}
                <div className="flex-1 p-3 flex flex-col justify-between relative overflow-hidden">
                    {/* Backdrop Ambient */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center opacity-0 group-hover:opacity-10 transition-all duration-500 pointer-events-none transform scale-125"
                        style={{ backgroundImage: `url(${getBackdropUrl(show.backdrop_path)})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-zinc-900 via-zinc-900/90 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />

                    <div className="relative z-10 min-w-0">
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <h3 className={`font-bold leading-tight line-clamp-1 group-hover:text-indigo-300 transition-colors ${isWatched ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-zinc-100'}`} title={show.name}>
                                {show.name}
                            </h3>
                            {(!foundList || isManual) && (
                                <button 
                                    onClick={() => setDeleteId(show.id)} 
                                    className="text-zinc-600 hover:text-red-400 transition-colors p-1 -mr-2 -mt-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                             {show.media_type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                             <span>{show.first_air_date?.substring(0, 4)}</span>
                             {show.media_type === 'movie' && (
                                 <div className="flex items-center gap-1 ml-auto">
                                     <button 
                                        onClick={() => toggleWatched(show.id, show.media_type)}
                                        className={`p-1 rounded hover:bg-white/10 ${isWatched ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-300'}`}
                                        title={isWatched ? "Mark Unwatched" : "Mark Watched"}
                                     >
                                         {isWatched ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                     </button>
                                 </div>
                             )}
                        </div>
                        
                        {/* Rating for Movies */}
                        {show.media_type === 'movie' && (
                            <div className="mb-2">
                                <RatingStars item={show} />
                            </div>
                        )}
                        
                        {foundList && !isManual && (
                             <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-zinc-400 max-w-full truncate">
                                 <LinkIcon className="w-3 h-3" />
                                 <span className="truncate">{foundList.name}</span>
                             </div>
                        )}
                    </div>

                    <div className="relative z-10 mt-auto pt-2 border-t border-white/5">
                        {nextAirDate ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Next: {format(parseISO(nextAirDate), 'MMM d')}</span>
                            </div>
                        ) : (
                            <div className="text-[10px] text-zinc-600 font-medium uppercase tracking-wide">
                                {show.media_type === 'movie' ? 'Released' : 'Ended / TBD'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
          );
        })}
      </div>

      {/* Load More Trigger */}
      {visibleItems.length < processedList.length && (
          <div ref={loaderRef} className="py-8 flex justify-center">
              <div className="flex items-center gap-2 text-zinc-500 text-sm animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
              </div>
          </div>
      )}

      <ListManager isOpen={isListManagerOpen} onClose={() => setIsListManagerOpen(false)} />

      {/* Confirm Delete Modal */}
      {deleteId && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
              <div 
                className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl" 
                onClick={e => e.stopPropagation()}
              >
                  <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                          <AlertCircle className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Confirm Removal</h3>
                  </div>
                  
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                      Are you sure you want to remove this from your library? This action cannot be undone.
                  </p>
                  
                  <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setDeleteId(null)} 
                        className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={confirmDelete} 
                        className="px-4 py-2.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-all"
                      >
                          Remove Item
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WatchlistPage;