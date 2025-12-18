import React, { useState, useCallback } from 'react';
import { Search, Plus, Check, Loader2, Info } from 'lucide-react';
import { searchShows, getImageUrl, getPopularShows } from '../services/tmdb';
import { useAppContext } from '../context/AppContext';
import { TVShow } from '../types';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TVShow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const { watchlist, addToWatchlist, setReminderCandidate } = useAppContext();

  // Load popular shows on first mount
  React.useEffect(() => {
    if (!initialLoaded && query === '') {
      setIsSearching(true);
      getPopularShows().then(shows => {
        setResults(shows);
        setIsSearching(false);
        setInitialLoaded(true);
      });
    }
  }, [initialLoaded, query]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const shows = await searchShows(query);
      setResults(shows);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (show: TVShow) => {
      await addToWatchlist(show);
      setReminderCandidate(show);
  };

  const isInWatchlist = useCallback((showId: number) => {
    return watchlist.some(s => s.id === showId);
  }, [watchlist]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Find Your Favorite Shows</h1>
        <p className="text-slate-400">Search TMDB's massive database to add shows to your calendar.</p>
      </div>

      <form onSubmit={handleSearch} className="mb-10 max-w-2xl mx-auto relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a TV show..."
            className="w-full bg-transparent backdrop-blur-md text-white pl-12 pr-4 py-4 rounded-full border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-lg text-lg placeholder:text-slate-500"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6" />
        </div>
      </form>

      {isSearching ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {results.map((show) => {
             const added = isInWatchlist(show.id);
             return (
              <div key={show.id} className="bg-transparent rounded-xl overflow-hidden shadow-lg border border-white/5 hover:border-indigo-500/30 transition-all group flex flex-col hover:bg-white/5 backdrop-blur-sm">
                <div className="relative aspect-[2/3] overflow-hidden">
                  <img
                    src={getImageUrl(show.poster_path)}
                    alt={show.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                     <p className="text-xs text-slate-300 line-clamp-3 mb-2">{show.overview || "No overview available."}</p>
                     <p className="text-xs font-bold text-indigo-400">Rating: {show.vote_average.toFixed(1)}</p>
                  </div>
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-white text-lg leading-tight mb-1 line-clamp-1" title={show.name}>
                    {show.name}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    {show.first_air_date ? show.first_air_date.substring(0, 4) : 'Unknown Year'}
                  </p>
                  
                  <div className="mt-auto">
                    <button
                      onClick={() => handleAdd(show)}
                      disabled={added}
                      className={`
                        w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                        ${added 
                          ? 'bg-green-600/20 text-green-400 cursor-default border border-green-600/30' 
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}
                      `}
                    >
                      {added ? (
                        <>
                          <Check className="w-4 h-4" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" /> Add to Calendar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
             );
          })}
        </div>
      )}

      {!isSearching && results.length === 0 && (
        <div className="text-center text-slate-500 py-10 flex flex-col items-center">
            <Info className="w-12 h-12 mb-4 opacity-50"/>
            <p>No results found. Try searching for something else.</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;