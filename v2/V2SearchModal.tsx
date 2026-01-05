
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Loader2, Plus, Check, Sparkles, Star, ArrowRight, Film, Tv, Eye, EyeOff, Layout, Globe } from 'lucide-react';
import { useStore } from '../store';
import { searchShows, getPopularShows, getImageUrl, getRecommendations } from '../services/tmdb';
import { TVShow, WatchedItem } from '../types';
import V2ShowDetailsModal from './V2ShowDetailsModal';
import ShowDetailsModal from '../components/ShowDetailsModal';
import toast from 'react-hot-toast';

interface V2SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ResultItemProps {
    show: TVShow;
    isLocal: boolean;
    watchlist: TVShow[];
    history: Record<string, WatchedItem>;
    onOpenDetails: (show: TVShow) => void;
    onAdd: (e: React.MouseEvent, show: TVShow) => void;
    onWatch: (e: React.MouseEvent, show: TVShow, isWatched: boolean) => void;
}

const ResultItem: React.FC<ResultItemProps> = ({ 
    show, 
    isLocal, 
    watchlist, 
    history, 
    onOpenDetails, 
    onAdd, 
    onWatch 
}) => {
    const isAdded = watchlist.some(w => w.id === show.id);
    
    let isWatched = false;
    if (show.media_type === 'movie') isWatched = history[`movie-${show.id}`]?.is_watched;
    else isWatched = Object.values(history).some((h: WatchedItem) => h.tmdb_id === show.id && h.is_watched);

    return (
        <div 
            onClick={() => onOpenDetails(show)}
            className={`group flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all border ${isLocal ? 'bg-indigo-900/10 border-indigo-500/20 hover:bg-indigo-900/20' : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800'}`}
        >
            {/* Poster */}
            <div className="relative w-12 h-16 shrink-0 rounded-lg overflow-hidden bg-zinc-800 shadow-md">
                <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" alt="" loading="lazy" />
                {isWatched && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                        <Check className="w-5 h-5 text-emerald-500" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-bold truncate ${isLocal ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                    {show.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${show.media_type === 'movie' ? 'border-pink-500/20 text-pink-400 bg-pink-500/5' : 'border-blue-500/20 text-blue-400 bg-blue-500/5'}`}>
                        {show.media_type === 'movie' ? 'Film' : 'Series'}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                        {show.first_air_date?.split('-')[0] || 'TBA'}
                    </span>
                    {isLocal && <span className="text-[9px] text-indigo-400 font-bold ml-auto flex items-center gap-1"><Check className="w-3 h-3" /> In Library</span>}
                </div>
            </div>

            {/* Actions (Hover) */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isAdded && (
                     <button 
                        onClick={(e) => onAdd(e, show)}
                        className="p-2 rounded-full bg-white text-black hover:scale-110 transition-transform shadow-lg"
                        title="Add to Library"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
                <button 
                    onClick={(e) => onWatch(e, show, isWatched)}
                    className={`p-2 rounded-full transition-transform hover:scale-110 shadow-lg ${isWatched ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    title={isWatched ? "Mark Unwatched" : "Mark Watched"}
                >
                    {isWatched ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};

const V2SearchModal: React.FC<V2SearchModalProps> = ({ isOpen, onClose }) => {
    const { addToWatchlist, watchlist, settings, history, toggleWatched } = useStore();
    const [query, setQuery] = useState('');
    
    // Results
    const [localResults, setLocalResults] = useState<TVShow[]>([]);
    const [globalResults, setGlobalResults] = useState<TVShow[]>([]);
    
    // State
    const [loading, setLoading] = useState(false);
    const [detailsItem, setDetailsItem] = useState<TVShow | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial focus and reset
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setLocalResults([]);
            setGlobalResults([]);
            setTimeout(() => inputRef.current?.focus(), 100);
            
            // Preload popular if empty
            setLoading(true);
            getPopularShows().then(setGlobalResults).finally(() => setLoading(false));
            
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Search Logic
    useEffect(() => {
        if (!query.trim()) {
            setLocalResults([]);
            // If empty query, revert to popular global
            if (isOpen) {
                 getPopularShows().then(setGlobalResults);
            }
            return;
        }

        // 1. Search Local Library first (Instant)
        const lowerQ = query.toLowerCase();
        const matches = watchlist.filter(item => item.name.toLowerCase().includes(lowerQ));
        setLocalResults(matches);

        // 2. Debounced Global Search
        const timeoutId = setTimeout(() => {
            // Only search global if user wants more or local is empty (we'll fetch anyway to show options)
            setLoading(true);
            searchShows(query).then(res => {
                // Filter out items already in local results to avoid duplication in global list
                const localIds = new Set(matches.map(m => m.id));
                setGlobalResults(res.filter(r => !localIds.has(r.id)));
            }).finally(() => setLoading(false));
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [query, watchlist, isOpen]);

    // --- HANDLERS ---

    const handleAdd = (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        addToWatchlist(show);
        toast.success("Added to Library");
    };

    const handleWatch = (e: React.MouseEvent, show: TVShow, isWatched: boolean) => {
        e.stopPropagation();
        if (!watchlist.some(w => w.id === show.id)) {
            addToWatchlist(show);
        }

        if (show.media_type === 'movie') {
            toggleWatched({ tmdb_id: show.id, media_type: 'movie', is_watched: isWatched });
            toast.success(isWatched ? "Marked unwatched" : "Marked watched");
        } else {
            // For TV, simply toggle tracking + maybe prompt in future. 
            // In search context, we just want quick action.
            toast("Added to library. Use details to mark specific episodes.");
        }
    };

    const openDetails = (show: TVShow) => {
        setDetailsItem(show);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[150] bg-[#050505]/95 backdrop-blur-2xl flex flex-col animate-fade-in">
                
                {/* Header Input */}
                <div className="shrink-0 p-6 md:p-8 border-b border-white/5 bg-[#050505] flex items-center gap-6">
                    <Search className="w-6 h-6 text-zinc-500" />
                    <input 
                        ref={inputRef} 
                        type="text" 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        placeholder="Search your library or the world..." 
                        className="flex-1 bg-transparent border-none outline-none text-2xl md:text-4xl font-black text-white placeholder:text-zinc-800 uppercase tracking-tight h-full" 
                    />
                    <button onClick={onClose} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                    <div className="max-w-5xl mx-auto space-y-12 pb-20">
                        
                        {/* 1. Local Results */}
                        {localResults.length > 0 && (
                            <div className="animate-fade-in-up">
                                <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Layout className="w-4 h-4" /> My Library
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {localResults.map(item => (
                                        <ResultItem 
                                            key={item.id} 
                                            show={item} 
                                            isLocal={true} 
                                            watchlist={watchlist} 
                                            history={history}
                                            onOpenDetails={openDetails}
                                            onAdd={handleAdd}
                                            onWatch={handleWatch}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Global Results */}
                        {(globalResults.length > 0 || loading) && (
                            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <Globe className="w-4 h-4" /> {query ? "Global Database" : "Trending Now"}
                                    </h3>
                                    {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                                </div>
                                
                                {globalResults.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {globalResults.map(item => (
                                            <ResultItem 
                                                key={item.id} 
                                                show={item} 
                                                isLocal={false} 
                                                watchlist={watchlist} 
                                                history={history}
                                                onOpenDetails={openDetails}
                                                onAdd={handleAdd}
                                                onWatch={handleWatch}
                                            />
                                        ))}
                                    </div>
                                ) : !loading && query && (
                                    <div className="text-zinc-600 text-sm italic">No global matches found.</div>
                                )}
                            </div>
                        )}

                        {!query && localResults.length === 0 && globalResults.length === 0 && !loading && (
                             <div className="text-center py-20 opacity-30">
                                 <Search className="w-24 h-24 mx-auto mb-4 text-zinc-700" />
                                 <p className="text-xl font-bold text-zinc-500 uppercase tracking-widest">Start Typing...</p>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Nested Details Modal */}
            {detailsItem && (
                settings.useBetaLayouts ? (
                    <V2ShowDetailsModal 
                        isOpen={!!detailsItem} 
                        onClose={() => setDetailsItem(null)} 
                        showId={detailsItem.id} 
                        mediaType={detailsItem.media_type} 
                    />
                ) : (
                    <ShowDetailsModal 
                        isOpen={!!detailsItem} 
                        onClose={() => setDetailsItem(null)} 
                        showId={detailsItem.id} 
                        mediaType={detailsItem.media_type} 
                    />
                )
            )}
        </>
    );
};

export default V2SearchModal;