import React, { useState, useMemo } from 'react';
import { Trash2, Star, Tv, ArrowUpDown, Clock, AlertCircle, Film, Filter, Link as LinkIcon, ListPlus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import { format, parseISO } from 'date-fns';
import { Episode } from '../types';
import ListManager from '../components/ListManager';

type SortOption = 'name' | 'upcoming';
type FilterOption = 'all' | 'tv' | 'movie';

const WatchlistPage: React.FC = () => {
  const { watchlist, subscribedLists, allTrackedShows, removeFromWatchlist, episodes } = useAppContext();
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isListManagerOpen, setIsListManagerOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

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

    if (filterBy !== 'all') list = list.filter(item => item.media_type === filterBy);
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
  }, [allTrackedShows, sortBy, filterBy, episodes, localSearch]);

  const confirmDelete = () => {
    if (deleteId) {
      removeFromWatchlist(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-white/5 pb-6">
        <div>
           <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
           <p className="text-slate-400 text-sm flex items-center gap-4">
             <span className="flex items-center gap-1"><Tv className="w-4 h-4" /> {showCount} Series</span>
             <span className="flex items-center gap-1"><Film className="w-4 h-4" /> {movieCount} Movies</span>
           </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400" />
                <input 
                    type="text" 
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Filter..."
                    className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none w-40 focus:w-60 transition-all"
                />
             </div>
             
             <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

             <button 
                onClick={() => setFilterBy(filterBy === 'all' ? 'tv' : filterBy === 'tv' ? 'movie' : 'all')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
             >
                <Filter className="w-4 h-4 text-slate-400" /> 
                <span className="uppercase text-xs font-bold tracking-wide">{filterBy}</span>
             </button>

             <button 
                onClick={() => setSortBy(sortBy === 'name' ? 'upcoming' : 'name')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
             >
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <span className="uppercase text-xs font-bold tracking-wide">{sortBy === 'upcoming' ? 'Next Airing' : 'A-Z'}</span>
             </button>
             
             <button 
                onClick={() => setIsListManagerOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 transition-all"
             >
                <ListPlus className="w-4 h-4" /> Lists
            </button>
        </div>
      </div>

      {/* Empty State */}
      {allTrackedShows.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[50vh] surface-card rounded-3xl border-dashed">
             <Tv className="w-16 h-16 text-slate-600 mb-4" />
             <h2 className="text-xl font-bold text-white">Your library is empty</h2>
             <p className="text-slate-500 mb-6">Track shows to see them here.</p>
             <Link to="/discover" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500">
                Discover Shows
             </Link>
          </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {processedList.map((show) => {
          const nextAirDate = getNextEpisodeDate(show.id);
          const isManual = watchlist.some(s => s.id === show.id);
          const foundList = subscribedLists.find(l => l.items.some(i => i.id === show.id));
          
          return (
            <div key={show.id} className="surface-card rounded-xl overflow-hidden flex h-36 group relative">
                {/* Poster */}
                <div className="w-24 shrink-0 relative bg-black">
                    <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                </div>
                
                {/* Content */}
                <div className="flex-1 p-3 flex flex-col justify-between relative overflow-hidden">
                    {/* Backdrop Ambient */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center opacity-0 group-hover:opacity-10 transition-all duration-500 pointer-events-none transform scale-125"
                        style={{ backgroundImage: `url(${getBackdropUrl(show.backdrop_path)})` }}
                    />

                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-slate-100 leading-tight line-clamp-1" title={show.name}>{show.name}</h3>
                            {(!foundList || isManual) && (
                                <button 
                                    onClick={() => setDeleteId(show.id)} 
                                    className="text-slate-600 hover:text-red-400 transition-colors p-1 -mr-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                             {show.media_type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                             <span>{show.first_air_date?.substring(0, 4)}</span>
                             <span>•</span>
                             <span className="text-indigo-400 font-medium">{show.vote_average.toFixed(1)}</span>
                        </div>
                        
                        {foundList && !isManual && (
                             <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-slate-400 max-w-full truncate">
                                 <LinkIcon className="w-3 h-3" />
                                 <span className="truncate">{foundList.name}</span>
                             </div>
                        )}
                    </div>

                    <div className="mt-auto pt-2 border-t border-white/5">
                        {nextAirDate ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Next: {format(parseISO(nextAirDate), 'MMM d')}</span>
                            </div>
                        ) : (
                            <div className="text-[10px] text-slate-600 font-medium uppercase tracking-wide">
                                {show.media_type === 'movie' ? 'Released' : 'Ended / TBD'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
          );
        })}
      </div>

      <ListManager isOpen={isListManagerOpen} onClose={() => setIsListManagerOpen(false)} />

      {/* Simple Alert for Delete */}
      {deleteId && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
              <div className="surface-panel p-6 rounded-2xl max-w-sm w-full border border-red-500/20" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      <AlertCircle className="text-red-500" /> Confirm Removal
                  </h3>
                  <p className="text-slate-400 text-sm mb-6">Remove this show from your library?</p>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                      <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg">Remove</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WatchlistPage;