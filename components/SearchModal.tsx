
import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Plus, Check, Star, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { searchShows, getPopularShows, getImageUrl, getRecommendations } from '../services/tmdb';
import { TVShow } from '../types';

type SearchResult = TVShow & { 
    recommendedSource?: string;
    isRecommendation?: boolean; 
};

const SearchModal: React.FC = () => {
  const isSearchOpen = useStore(state => state.isSearchOpen);
  const setIsSearchOpen = useStore(state => state.setIsSearchOpen);
  const addToWatchlist = useStore(state => state.addToWatchlist);
  const watchlist = useStore(state => state.watchlist);
  const settings = useStore(state => state.settings);
  
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
      getPopularShows().then(shows => setResults(shows)).catch(console.error).finally(() => setLoading(false));
    }
  }, [isSearchOpen, query]);

  useEffect(() => {
    if (!query.trim()) return;
    const timeoutId = setTimeout(() => {
      setLoading(true);
      searchShows(query).then(shows => setResults(shows)).catch(console.error).finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
      if (!isSearchOpen) {
          setBannerRecommendations([]);
          setSourceRecommendation('');
      }
  }, [isSearchOpen]);

  const handleAdd = async (e: React.MouseEvent, show: SearchResult) => {
      e.stopPropagation();
      addToWatchlist(show);
      
      if (!settings.recommendationsEnabled) return;
      setLoadingRecs(true);
      try {
          const recs = await getRecommendations(show.id, show.media_type);
          const trackedIds = new Set(watchlist.map(s => s.id));
          const validRecs = recs.filter(r => !trackedIds.has(r.id));
          
          if (validRecs.length > 0) {
              if (settings.recommendationMethod === 'banner') {
                  setBannerRecommendations(validRecs);
                  setSourceRecommendation(show.name);
              } else {
                  const currentIds = new Set(results.map(r => r.id));
                  const uniqueRecs = validRecs.filter(r => !currentIds.has(r.id));
                  if (uniqueRecs.length > 0) {
                      const recsWithSource = uniqueRecs.map(r => ({ ...r, recommendedSource: show.name, isRecommendation: true }));
                      const index = results.findIndex(r => r.id === show.id);
                      if (index !== -1) {
                          const newResults = [...results.slice(0, index + 1), ...recsWithSource, ...results.slice(index + 1)];
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
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-10 sm:pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsSearchOpen(false)}>
      <div className="bg-[#09090b] border border-white/10 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/10 flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md shrink-0 sticky top-0 z-20">
          <Search className="w-6 h-6 text-zinc-400" />
          <input type="text" placeholder="Search TV Shows & Movies..." value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-white text-xl placeholder:text-zinc-500 font-medium" autoFocus />
          {loading && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
          <button onClick={() => setIsSearchOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#09090b]">
            {settings.recommendationsEnabled && settings.recommendationMethod === 'banner' && (bannerRecommendations.length > 0 || loadingRecs) && (
                <div className="py-6 px-6 bg-indigo-500/5 border-b border-white/10 animate-fade-in">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2 uppercase tracking-wide"><Sparkles className="w-4 h-4 text-indigo-400" /> {loadingRecs ? 'Finding recommendations...' : `Because you added "${sourceRecommendation}"`}</h3>
                        <button onClick={() => setBannerRecommendations([])} className="text-xs text-zinc-400 hover:text-white transition-colors">Dismiss</button>
                    </div>
                    {loadingRecs ? (<div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>) : (
                        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
                            {bannerRecommendations.map(show => {
                                const isAdded = watchlist.some(w => w.id === show.id);
                                return (
                                    <div key={`rec-${show.id}`} className="relative w-32 shrink-0 snap-start group">
                                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 shadow-lg relative"><img src={getImageUrl(show.poster_path)} alt={show.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" /><div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button onClick={(e) => handleAdd(e, show as SearchResult)} disabled={isAdded} className={`p-2 rounded-full ${isAdded ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:scale-110 transition-transform'}`}>{isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}</button></div></div>
                                        <h4 className="text-xs font-bold text-white mt-2 truncate">{show.name}</h4>
                                        <p className="text-[10px] text-zinc-400 flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-current" /> {show.vote_average.toFixed(1)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            <div className="p-6">
                {results.length === 0 && !loading ? (
                    <div className="text-center py-20 text-zinc-500 flex flex-col items-center"><Search className="w-12 h-12 mb-4 opacity-20" /><p className="text-lg">No results found.</p><p className="text-sm opacity-60">Try searching for a different title.</p></div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {results.map((show, idx) => {
                            const isAdded = watchlist.some(w => w.id === show.id);
                            const isInlineRec = show.isRecommendation;
                            return (
                                <div key={`${show.id}-${idx}`} className={`group relative flex flex-col gap-2 animate-fade-in-up ${isInlineRec ? 'col-span-1' : ''}`} style={{ animationDelay: `${idx * 50}ms` }}>
                                    {isInlineRec && (<div className="absolute -top-3 left-0 right-0 z-20 flex justify-center"><div className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-indigo-400 flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> For You</div></div>)}
                                    <div className={`relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg bg-zinc-900 transition-all duration-300 ${isInlineRec ? 'ring-2 ring-indigo-500 shadow-indigo-500/20' : 'group-hover:-translate-y-1 group-hover:shadow-2xl'}`}>
                                        <img src={getImageUrl(show.poster_path)} alt={show.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded backdrop-blur-md">{show.media_type === 'movie' ? 'Movie' : 'TV'}</span><div className="flex items-center gap-1 text-yellow-400 text-xs font-bold"><Star className="w-3.5 h-3.5 fill-current" /> {show.vote_average.toFixed(1)}</div></div>
                                                <p className="text-xs text-zinc-300 line-clamp-3 mb-3 leading-relaxed">{show.overview || "No overview available."}</p>
                                                <button onClick={(e) => handleAdd(e, show)} disabled={isAdded} className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg ${isAdded ? 'bg-emerald-600 text-white cursor-default' : 'bg-white text-black hover:bg-zinc-200'}`}>{isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {isAdded ? 'Tracking' : 'Add to List'}</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-1"><h4 className={`font-bold text-sm leading-tight truncate transition-colors ${isInlineRec ? 'text-indigo-300' : 'text-zinc-200'}`}>{show.name}</h4><div className="flex items-center gap-2 mt-0.5"><span className="text-xs text-zinc-500 font-medium">{show.first_air_date ? show.first_air_date.split('-')[0] : 'TBA'}</span>{isInlineRec && (<span className="text-[9px] text-zinc-500 truncate max-w-[80px]">from "{show.recommendedSource}"</span>)}</div></div>
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
