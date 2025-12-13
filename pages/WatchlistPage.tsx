import React, { useState, useMemo } from 'react';
import { Trash2, Calendar, Star, Tv, ArrowUpDown, Clock, AlertCircle, Film, Filter, Link as LinkIcon, ListPlus } from 'lucide-react';
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

  // Helper to find the next airing episode for a specific show ID
  // Updated Logic: Compare string directly since YYYY-MM-DD sortable, and check against today's date string
  const getNextEpisodeDate = (showId: number): string | null => {
    // Current date string in YYYY-MM-DD (local time approximation)
    const today = new Date().toISOString().split('T')[0];

    // Flatten all episodes from the context
    const allEpisodes = Object.values(episodes).flat() as Episode[];
    
    // Filter for this show and future dates (inclusive of today)
    const showEpisodes = allEpisodes.filter(ep => 
        ep.show_id === showId && 
        ep.air_date && 
        ep.air_date >= today
    );

    // Sort by date ascending to get the nearest upcoming
    showEpisodes.sort((a, b) => a.air_date.localeCompare(b.air_date));

    return showEpisodes.length > 0 ? showEpisodes[0].air_date : null;
  };

  const sortedWatchlist = useMemo(() => {
    let list = [...allTrackedShows];

    // Filter
    if (filterBy !== 'all') {
        list = list.filter(item => item.media_type === filterBy);
    }

    // Sort
    return list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        // Upcoming sort
        const dateA = getNextEpisodeDate(a.id);
        const dateB = getNextEpisodeDate(b.id);

        if (dateA && dateB) return dateA.localeCompare(dateB);
        if (dateA && !dateB) return -1; // A has date, B doesn't -> A comes first
        if (!dateA && dateB) return 1;  // B has date, A doesn't -> B comes first
        
        // Neither has upcoming date, fallback to name
        return a.name.localeCompare(b.name);
      }
    });
  }, [allTrackedShows, sortBy, filterBy, episodes]);

  const confirmDelete = () => {
    if (deleteId) {
      removeFromWatchlist(deleteId);
      setDeleteId(null);
    }
  };

  if (allTrackedShows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="bg-white/5 p-6 rounded-full mb-6 animate-pulse">
          <Tv className="w-16 h-16 text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Your Watchlist is Empty</h2>
        <p className="text-slate-400 max-w-md mb-8">
          Start adding shows to your watchlist to track their episodes on your calendar.
        </p>
        <div className="flex gap-4">
             <Link 
            to="/search" 
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
            Browse Shows
            </Link>
            <button 
                onClick={() => setIsListManagerOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
                <ListPlus className="w-4 h-4" /> Subscribe to List
            </button>
        </div>
        
        <ListManager isOpen={isListManagerOpen} onClose={() => setIsListManagerOpen(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 bg-transparent p-6 rounded-2xl border border-white/10 backdrop-blur-md">
        <div>
           <h1 className="text-3xl font-bold text-white mb-1">My Tracked Shows</h1>
           <p className="text-slate-400 text-sm">Managing {allTrackedShows.length} titles on your calendar</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
            
            {/* List Manager Button */}
            <button 
                onClick={() => setIsListManagerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 font-medium transition-all"
            >
                <ListPlus className="w-4 h-4" /> Manage Lists
            </button>

             {/* Filter Control */}
            <div className="flex items-center gap-2 bg-transparent p-1 rounded-lg border border-white/10 overflow-x-auto">
                <button 
                    onClick={() => setFilterBy('all')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${filterBy === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Filter className="w-4 h-4" /> All
                </button>
                <button 
                    onClick={() => setFilterBy('tv')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${filterBy === 'tv' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Tv className="w-4 h-4" /> TV
                </button>
                <button 
                    onClick={() => setFilterBy('movie')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${filterBy === 'movie' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Film className="w-4 h-4" /> Movies
                </button>
            </div>

            {/* Sort Control */}
            <div className="flex items-center gap-2 bg-transparent p-1 rounded-lg border border-white/10">
                <button 
                    onClick={() => setSortBy('name')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${sortBy === 'name' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <ArrowUpDown className="w-4 h-4" /> A-Z
                </button>
                <button 
                    onClick={() => setSortBy('upcoming')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${sortBy === 'upcoming' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Clock className="w-4 h-4" /> Upcoming
                </button>
            </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 gap-4">
        {sortedWatchlist.map((show) => {
          const nextAirDate = getNextEpisodeDate(show.id);
          
          // Identify source
          const isManual = watchlist.some(s => s.id === show.id);
          const foundList = subscribedLists.find(l => l.items.some(i => i.id === show.id));
          
          const isManagedBySub = !!foundList;

          return (
            <div key={show.id} className="bg-transparent backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/5 flex flex-col sm:flex-row h-auto sm:h-48 group hover:border-indigo-500/30 transition-colors">
              <div className="relative w-full sm:w-32 shrink-0">
                 <img 
                   src={getImageUrl(show.poster_path)} 
                   alt={show.name} 
                   className="w-full h-full object-cover"
                 />
                 <div className="absolute top-2 left-2">
                     {show.media_type === 'movie' ? (
                         <div className="bg-black/70 backdrop-blur-md p-1.5 rounded-lg border border-white/10 text-indigo-400">
                             <Film className="w-4 h-4" />
                         </div>
                     ) : (
                         <div className="bg-black/70 backdrop-blur-md p-1.5 rounded-lg border border-white/10 text-emerald-400">
                             <Tv className="w-4 h-4" />
                         </div>
                     )}
                 </div>
              </div>
              
              <div className="relative flex-1 p-5 flex flex-col justify-between overflow-hidden">
                 {/* Background image effect */}
                 <div 
                   className="absolute inset-0 opacity-[0.07] bg-cover bg-center pointer-events-none group-hover:opacity-15 transition-opacity"
                   style={{ backgroundImage: `url(${getBackdropUrl(show.backdrop_path)})` }}
                 />
                 
                 <div className="relative z-10 flex flex-col h-full">
                   <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                            {show.name}
                            {isManagedBySub && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-normal bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30" title={`Managed by list: ${foundList?.name}`}>
                                    <LinkIcon className="w-3 h-3" /> {foundList?.name}
                                </span>
                            )}
                        </h2>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                             <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                {show.vote_average.toFixed(1)}
                            </span>
                            <span>•</span>
                            <span>{show.first_air_date ? show.first_air_date.substring(0, 4) : 'N/A'}</span>
                            {show.media_type === 'tv' && (
                                <>
                                    <span>•</span>
                                    <span>{show.number_of_seasons} Seasons</span>
                                </>
                            )}
                        </div>
                      </div>
                      
                      {isManagedBySub && !isManual ? (
                           <div className="text-slate-600 p-2 cursor-help" title="To remove this, unsubscribe from the list">
                                <Trash2 className="w-5 h-5 opacity-50" />
                           </div>
                      ) : (
                        <button 
                            onClick={() => setDeleteId(show.id)}
                            className="text-slate-500 hover:text-red-400 hover:bg-red-900/10 p-2 rounded-lg transition-colors"
                            title="Remove from Calendar"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                   </div>
                   
                   <p className="text-slate-400 text-sm line-clamp-2 mt-3 mb-2 flex-1">
                      {show.overview}
                   </p>

                   {/* Next Episode Footer */}
                   <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                        {nextAirDate ? (
                            <div className="flex items-center gap-2 text-sm text-indigo-300">
                                <Clock className="w-4 h-4" />
                                <span className="font-semibold">Next: {format(parseISO(nextAirDate), 'MMM d, yyyy')}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Clock className="w-4 h-4" />
                                <span>
                                    {show.media_type === 'movie' ? 'Release date passed or unknown' : 'No upcoming episodes found'}
                                </span>
                            </div>
                        )}
                   </div>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      <ListManager isOpen={isListManagerOpen} onClose={() => setIsListManagerOpen(false)} />

      {/* Delete Confirmation Modal */}
      {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
              <div 
                className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
                          <AlertCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Remove Show?</h3>
                      <p className="text-slate-400">
                          Are you sure you want to remove this show from your calendar? This cannot be undone.
                      </p>
                  </div>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setDeleteId(null)}
                        className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={confirmDelete}
                        className="flex-1 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors font-medium"
                      >
                          Remove
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WatchlistPage;