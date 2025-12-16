
import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Plus, Check, Star, Film, Tv, Sparkles, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { searchShows, getPopularShows, getImageUrl, getRecommendations, getBackdropUrl } from '../services/tmdb';
import { TVShow } from '../types';

type SearchResult = TVShow & { 
    recommendedSource?: string;
    isRecommendation?: boolean; 
};

const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, addToWatchlist, allTrackedShows, settings, setReminderCandidate } = useAppContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [bannerRecommendations, setBannerRecommendations] = useState<TVShow[]>([]);
  const [sourceRecommendation, setSourceRecommendation] = useState<string>('');
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setIsSearchOpen]);

  useEffect(() => {
    if (isSearchOpen && query === '') {
      setLoading(true);
      getPopularShows()
        .then(shows => setResults(shows))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isSearchOpen, query]);

  useEffect(() => {
    if (!query.trim()) return;
    const timeoutId = setTimeout(() => {
      setLoading(true);
      searchShows(query)
        .then(shows => setResults(shows))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
      if (!isSearchOpen) {
          setBannerRecommendations([]);
          setSourceRecommendation('');
      }
  }, [isSearchOpen]);

  const handleAdd = async (show: SearchResult) => {
      await addToWatchlist(show);
      setReminderCandidate(show);
      
      if (!settings.recommendationsEnabled) return;

      setLoadingRecs(true);
      try {
          const recs = await getRecommendations(show.id, show.media_type);
          
          if (recs && recs.length > 0) {
              if (settings.recommendationMethod === 'banner') {
                  setBannerRecommendations(recs);
                  setSourceRecommendation(show.name);
              } else {
                  // Inline Mode
                  const currentIds = new Set(results.map(r => r.id));
                  const uniqueRecs = recs.filter(r => !currentIds.has(r.id));

                  if (uniqueRecs.length > 0) {
                      const recsWithSource = uniqueRecs.map(r => ({
                          ...r,
                          recommendedSource: show.name,
                          isRecommendation: true
                      }));
                      
                      const index = results.findIndex(r => r.id === show.id);
                      if (index !== -1) {
                          const newResults = [
                              ...results.slice(0, index + 1),
                              ...recsWithSource,
                              ...results.slice(index + 1)
                          ];
                          setResults(newResults);
                      }
                  }
              }
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingRecs(false);
      }
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 md:pt-32 px-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setIsSearchOpen(false)}>
      <div 
        className="w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[75vh] relative overflow-hidden ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl" />

        {/* Search Header */}
        <div className="relative p-6 pb-2 border-b border-white/5 flex items-center gap-4 shrink-0 z-10">
          <Search className="w-6 h-6 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search TV Shows & Movies..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-white text-2xl font-medium placeholder:text-zinc-600"
            autoFocus
          />
          {loading && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
          <button 
            onClick={() => setIsSearchOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="relative overflow-y-auto custom-scrollbar flex-1 z-10">
            
            {/* Banner Recommendations */}
            {settings.recommendationsEnabled && settings.recommendationMethod === 'banner' && (bannerRecommendations.length > 0 || loadingRecs) && (
                <div className="mx-4 mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-indigo-300 flex items-center gap-2 uppercase tracking-wider">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            {loadingRecs ? 'Finding recommendations...' : `Because you added "${sourceRecommendation}"`}
                        </h3>
                        <button onClick={() => setBannerRecommendations([])} className="text-xs text-zinc-500 hover:text-white">
                            Dismiss
                        </button>
                    </div>

                    {loadingRecs ? (
                        <div className="h-24 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {bannerRecommendations.map(show => {
                                const isAdded = allTrackedShows.some(w => w.id === show.id);
                                return (
                                    <div key={`rec-${show.id}`} className="flex gap-3 p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 hover:border-indigo-500/30 transition-all group cursor-pointer" onClick={() => handleAdd(show)}>
                                        <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-black">
                                            <img src={getImageUrl(show.poster_path)} alt={show.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h4 className="font-bold text-white text-sm truncate">{show.name}</h4>
                                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 mb-1">
                                                {show.media_type === 'movie' ? 'Movie' : 'TV'} <span className="text-indigo-400">{show.vote_average.toFixed(1)} ★</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold group-hover:text-white transition-colors">
                                                <Plus className="w-3 h-3" /> Quick Add
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Main Results List */}
            <div className="p-4 pb-20">
                {query === '' && (
                    <div className="mb-4 px-2 flex items-center gap-2 text-zinc-500">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Trending This Week</span>
                    </div>
                )}

                {results.length === 0 && !loading ? (
                    <div className="text-center py-20 text-zinc-500">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No results found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {results.map((show, idx) => {
                            const isAdded = allTrackedShows.some(w => w.id === show.id);
                            const isInlineRec = show.isRecommendation;

                            return (
                            <div 
                                key={`${show.id}-${idx}`} 
                                className={`
                                    flex items-center gap-4 p-3 rounded-2xl transition-all group
                                    ${isInlineRec 
                                        ? 'bg-indigo-900/10 border border-indigo-500/20' 
                                        : 'hover:bg-white/5 border border-transparent hover:border-white/5'}
                                `}
                            >
                                <div className="relative w-12 h-16 shrink-0 z-10 bg-black rounded-lg overflow-hidden shadow-lg">
                                    <img src={getImageUrl(show.poster_path)} alt={show.name} className="w-full h-full object-cover" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    {isInlineRec && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-300 uppercase tracking-wide mb-0.5">
                                            <Sparkles className="w-3 h-3" />
                                            <span>Recommended</span>
                                        </div>
                                    )}
                                    <h4 className="font-bold text-white leading-tight truncate text-base">{show.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                                        {show.media_type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                                        <span>{show.first_air_date?.split('-')[0] || 'N/A'}</span>
                                        <span>•</span>
                                        <span className="text-yellow-500 flex items-center gap-0.5"><Star className="w-3 h-3 fill-current" /> {show.vote_average.toFixed(1)}</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => handleAdd(show)}
                                    disabled={isAdded}
                                    className={`
                                        shrink-0 p-3 rounded-xl transition-all
                                        ${isAdded 
                                            ? 'text-emerald-500 bg-emerald-500/10' 
                                            : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-indigo-600 hover:shadow-lg shadow-indigo-500/20'}
                                    `}
                                >
                                    {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </button>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
