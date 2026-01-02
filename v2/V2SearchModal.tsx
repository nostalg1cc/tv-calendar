
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Plus, Check, Sparkles, Star, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { searchShows, getPopularShows, getImageUrl, getRecommendations } from '../services/tmdb';
import { TVShow } from '../types';

interface V2SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const V2SearchModal: React.FC<V2SearchModalProps> = ({ isOpen, onClose }) => {
    const { addToWatchlist, watchlist, settings } = useStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TVShow[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Recommendation State
    const [recommendations, setRecommendations] = useState<TVShow[]>([]);
    const [recLoading, setRecLoading] = useState(false);
    const [recSource, setRecSource] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setRecommendations([]);
            setTimeout(() => inputRef.current?.focus(), 100);
            setLoading(true);
            getPopularShows().then(setResults).finally(() => setLoading(false));
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) return;
        const timeoutId = setTimeout(() => {
            setLoading(true);
            setRecommendations([]); // Clear recs on new search
            searchShows(query).then(setResults).finally(() => setLoading(false));
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleAdd = async (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        addToWatchlist(show);

        // Fetch Recommendations
        if (settings.recommendationsEnabled) {
            setRecLoading(true);
            setRecSource(show.name);
            try {
                const recs = await getRecommendations(show.id, show.media_type);
                const trackedIds = new Set(watchlist.map(s => s.id));
                const validRecs = recs.filter(r => !trackedIds.has(r.id));

                if (validRecs.length > 0) {
                    if (settings.recommendationMethod === 'banner') {
                        setRecommendations(validRecs);
                    } else {
                        // Inline Mode: Inject into results
                        setResults(prev => {
                             const idx = prev.findIndex(p => p.id === show.id);
                             if (idx === -1) return prev;
                             const newResults = [...prev];
                             // Insert up to 3 recs after the added item, marking them
                             const recsWithFlag = validRecs.slice(0, 3).map(r => ({...r, _isRec: true}));
                             newResults.splice(idx + 1, 0, ...recsWithFlag);
                             return newResults;
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch recommendations", err);
            } finally {
                setRecLoading(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050505]/95 backdrop-blur-2xl flex flex-col animate-fade-in">
            <div className="shrink-0 p-6 md:p-12 pb-0 flex flex-col relative z-20">
                <button onClick={onClose} className="absolute top-6 right-6 p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
                <div className="max-w-5xl w-full mx-auto">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 block flex items-center gap-2"><Search className="w-3 h-3" /> Database Search</label>
                    <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="TYPE TO SEARCH..." className="w-full bg-transparent border-none outline-none text-4xl md:text-7xl font-black text-white placeholder:text-zinc-800 uppercase tracking-tight" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-12 py-8 relative z-20">
                <div className="max-w-5xl w-full mx-auto pb-20">
                    
                    {/* Banner Recommendations */}
                    {(recommendations.length > 0 || recLoading) && settings.recommendationMethod === 'banner' && (
                        <div className="mb-10 p-6 bg-gradient-to-r from-indigo-900/20 to-transparent border-l-4 border-indigo-500 rounded-r-xl animate-enter">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-400" /> 
                                    {recLoading ? 'Curating suggestions...' : `Because you added "${recSource}"`}
                                </h4>
                                {!recLoading && <button onClick={() => setRecommendations([])} className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase">Close</button>}
                            </div>
                            
                            {recLoading ? (
                                <div className="flex gap-4">
                                    {[1,2,3].map(i => <div key={i} className="w-32 h-48 bg-white/5 rounded-xl animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                    {recommendations.slice(0, 5).map(show => {
                                        const trackedItem = watchlist.find(s => s.id === show.id);
                                        const isTracked = !!trackedItem;
                                        const posterSrc = trackedItem?.custom_poster_path || show.poster_path;

                                        return (
                                            <div key={show.id} className="group relative flex flex-col gap-2 cursor-pointer" onClick={(e) => !isTracked && handleAdd(e, show)}>
                                                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900 border border-white/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-indigo-500/30">
                                                    <img src={getImageUrl(posterSrc)} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <Plus className="w-6 h-6 text-white" />
                                                    </div>
                                                </div>
                                                <h5 className="text-[10px] font-bold text-indigo-200 truncate">{show.name}</h5>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-zinc-800 animate-spin" /></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {results.map(show => {
                                const trackedItem = watchlist.find(s => s.id === show.id);
                                const isTracked = !!trackedItem;
                                const isRec = (show as any)._isRec;
                                const posterSrc = trackedItem?.custom_poster_path || show.poster_path;
                                
                                return (
                                    <div 
                                        key={`${show.id}-${isRec ? 'rec' : 'res'}`} 
                                        className={`group relative flex flex-col gap-3 cursor-pointer animate-fade-in ${isRec ? 'col-span-1' : ''}`} 
                                        onClick={(e) => !isTracked && handleAdd(e, show)}
                                    >
                                        <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-zinc-900 border shadow-2xl transition-all duration-300 ${isRec ? 'border-indigo-500/30 shadow-indigo-500/10 ring-1 ring-indigo-500/20' : 'border-white/5'}`}>
                                            <img src={getImageUrl(posterSrc)} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                                            
                                            {isRec && (
                                                <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                                    <Sparkles className="w-2 h-2" /> Suggested
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                                                <button className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xl ${isTracked ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black'}`}>
                                                    {isTracked ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-1">
                                            <h4 className={`text-sm font-bold leading-tight line-clamp-1 ${isRec ? 'text-indigo-300' : 'text-white'}`}>{show.name}</h4>
                                            {isRec ? (
                                                <p className="text-[9px] text-zinc-500 mt-0.5 flex items-center gap-1">Based on previous add</p>
                                            ) : (
                                                <p className="text-[10px] text-zinc-600 mt-1">{show.first_air_date?.split('-')[0] || 'TBA'}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default V2SearchModal;
