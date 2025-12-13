import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Plus, Check, Star, Film, Tv, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { searchShows, getPopularShows, getImageUrl, getRecommendations } from '../services/tmdb';
import { TVShow } from '../types';

// Extended type to handle recommendation source metadata locally
type SearchResult = TVShow & { 
    recommendedSource?: string;
    isRecommendation?: boolean; 
};

const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, addToWatchlist, allTrackedShows, settings } = useAppContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Recommendations state (for Banner mode)
  const [bannerRecommendations, setBannerRecommendations] = useState<TVShow[]>([]);
  const [sourceRecommendation, setSourceRecommendation] = useState<string>('');
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setIsSearchOpen]);

  // Load popular shows when opened empty
  useEffect(() => {
    if (isSearchOpen && query === '') {
      setLoading(true);
      getPopularShows()
        .then(shows => setResults(shows))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isSearchOpen, query]);

  // Debounced search
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

  // Reset recommendations when search modal closes
  useEffect(() => {
      if (!isSearchOpen) {
          setBannerRecommendations([]);
          setSourceRecommendation('');
      }
  }, [isSearchOpen]);

  const handleAdd = async (show: SearchResult) => {
      await addToWatchlist(show);
      
      // If recommendations are disabled, stop here
      if (!settings.recommendationsEnabled) return;

      setLoadingRecs(true);
      try {
          const recs = await getRecommendations(show.id, show.media_type);
          
          if (recs && recs.length > 0) {
              if (settings.recommendationMethod === 'banner') {
                  // Banner Mode
                  setBannerRecommendations(recs);
                  setSourceRecommendation(show.name);
              } else {
                  // Inline Mode (Spotify Style)
                  
                  // 1. Deduplication: Filter out items that are already currently displayed in the results list.
                  // This prevents the "infinite loop" of adding A -> Recs B -> Add B -> Recs A (duplicate).
                  const currentIds = new Set(results.map(r => r.id));
                  const uniqueRecs = recs.filter(r => !currentIds.has(r.id));

                  if (uniqueRecs.length > 0) {
                      const recsWithSource = uniqueRecs.map(r => ({
                          ...r,
                          recommendedSource: show.name,
                          isRecommendation: true
                      }));
                      
                      // 2. Insert after the item that was just added
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
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setIsSearchOpen(false)}>
      <div 
        className="w-full max-w-3xl bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] backdrop-blur-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-white/5">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search TV Shows & Movies..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-slate-500"
            autoFocus
          />
          {loading && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
          <button 
            onClick={() => setIsSearchOpen(false)}
            className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto custom-scrollbar">
            
            {/* Banner Recommendations Section (Only if method is 'banner' and enabled) */}
            {settings.recommendationsEnabled && settings.recommendationMethod === 'banner' && (bannerRecommendations.length > 0 || loadingRecs) && (
                <div className="p-4 bg-indigo-900/20 border-b border-white/10 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            {loadingRecs ? 'Finding recommendations...' : `Because you added "${sourceRecommendation}"`}
                        </h3>
                        <button onClick={() => setBannerRecommendations([])} className="text-xs text-slate-400 hover:text-white">
                            Dismiss
                        </button>
                    </div>

                    {loadingRecs ? (
                        <div className="h-32 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {bannerRecommendations.map(show => {
                                const isAdded = allTrackedShows.some(w => w.id === show.id);
                                return (
                                    <div key={`rec-${show.id}`} className="flex gap-3 p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all group">
                                        <div className="relative w-12 h-16 shrink-0">
                                            <img 
                                            src={getImageUrl(show.poster_path)} 
                                            alt={show.name} 
                                            className="w-full h-full object-cover rounded shadow"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h4 className="font-bold text-white text-sm truncate">{show.name}</h4>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1.5">
                                                {show.media_type === 'movie' ? 'Movie' : 'TV Show'} • {show.vote_average.toFixed(1)} ★
                                            </div>
                                            <button 
                                                onClick={() => handleAdd(show)}
                                                disabled={isAdded}
                                                className={`
                                                    self-start px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1
                                                    ${isAdded 
                                                        ? 'bg-green-500/10 text-green-400 cursor-default' 
                                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
                                                `}
                                            >
                                                {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                                {isAdded ? 'Added' : 'Quick Add'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Main Results List */}
            <div className="p-4">
            {results.length === 0 && !loading ? (
                <div className="text-center py-12 text-slate-500">
                <p>No results found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((show, idx) => {
                    const isAdded = allTrackedShows.some(w => w.id === show.id);
                    const isInlineRec = show.isRecommendation;

                    return (
                    <div 
                        key={`${show.id}-${idx}`} // Use index to allow duplicate recommendations if they appear in different contexts (though deduplication logic largely prevents this now)
                        className={`
                            flex gap-4 p-3 rounded-xl transition-all group animate-fade-in
                            ${isInlineRec 
                                ? 'bg-indigo-950/30 border border-indigo-500/30 shadow-lg shadow-indigo-900/10 relative overflow-hidden' 
                                : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'}
                        `}
                    >
                        {/* Subtle background glow for recommendations */}
                        {isInlineRec && <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>}

                        <div className="relative w-16 h-24 shrink-0 z-10">
                            <img 
                            src={getImageUrl(show.poster_path)} 
                            alt={show.name} 
                            className="w-full h-full object-cover rounded-md shadow-lg"
                            />
                            <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-[2px] rounded p-0.5">
                                {show.media_type === 'movie' ? <Film className="w-3 h-3 text-white" /> : <Tv className="w-3 h-3 text-white" />}
                            </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between py-1 z-10">
                        <div>
                            {isInlineRec && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-300 uppercase tracking-wide mb-1.5 opacity-90">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Because you added "{show.recommendedSource}"</span>
                                </div>
                            )}
                            <h4 className="font-bold text-white leading-tight mb-1 line-clamp-1">{show.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{show.first_air_date?.split('-')[0] || 'N/A'}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1 text-yellow-500">
                                <Star className="w-3 h-3 fill-current" />
                                {show.vote_average.toFixed(1)}
                            </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => handleAdd(show)}
                            disabled={isAdded}
                            className={`
                            self-start mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors
                            ${isAdded 
                                ? 'bg-green-500/20 text-green-400 cursor-default' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}
                            `}
                        >
                            {isAdded ? (
                            <><Check className="w-3 h-3" /> Added</>
                            ) : (
                            <><Plus className="w-3 h-3" /> Add</>
                            )}
                        </button>
                        </div>
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