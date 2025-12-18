
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Plus, Check, Sparkles, TrendingUp, MonitorPlay, Ticket, Star } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { searchShows, getPopularShows, getImageUrl, getRecommendations, getBackdropUrl } from '../services/tmdb';
import { TVShow } from '../types';

interface V2SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ShowCardProps {
    show: TVShow; 
    onAdd: (e: React.MouseEvent, s: TVShow) => void; 
    isTracked: boolean; 
    isRec?: boolean; 
    onHoverSpecial: (active: boolean) => void;
}

const ShowCard: React.FC<ShowCardProps> = ({ show, onAdd, isTracked, isRec = false, onHoverSpecial }) => {
    const isStrangerThings = show.id === 66732 || show.name.toLowerCase() === 'stranger things';

    return (
        <div 
            className="group relative flex flex-col gap-3 cursor-pointer"
            onMouseEnter={() => isStrangerThings && onHoverSpecial(true)}
            onMouseLeave={() => isStrangerThings && onHoverSpecial(false)}
        >
            <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 shadow-2xl transition-all duration-300 ${isTracked ? 'opacity-60' : 'group-hover:-translate-y-2 group-hover:shadow-indigo-900/20'} ${isRec ? 'ring-1 ring-indigo-500/30' : ''}`}>
                <img 
                    src={getImageUrl(show.poster_path)} 
                    alt="" 
                    className={`w-full h-full object-cover transition-transform duration-700 ${isStrangerThings ? 'group-hover:rotate-180' : 'group-hover:scale-110'}`}
                    loading="lazy"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                    <div className="text-center mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <div className="flex items-center justify-center gap-1 text-yellow-400 text-xs font-black mb-1">
                            <Star className="w-3 h-3 fill-current" /> {show.vote_average.toFixed(1)}
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium line-clamp-3">{show.overview}</p>
                    </div>
                    
                    <button 
                        onClick={(e) => !isTracked && onAdd(e, show)}
                        disabled={isTracked}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xl ${isTracked ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black'}`}
                    >
                        {isTracked ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
                </div>

                {/* Rec Badge */}
                {isRec && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-indigo-600 rounded text-[8px] font-black text-white uppercase tracking-widest shadow-lg">
                        Pick
                    </div>
                )}
            </div>

            <div className="px-1">
                <h4 className={`text-sm font-bold leading-tight line-clamp-1 group-hover:text-indigo-400 transition-colors ${isTracked ? 'text-zinc-500 line-through' : 'text-white'}`}>
                    {show.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-zinc-600">{show.first_air_date?.split('-')[0] || 'TBA'}</span>
                    {show.media_type === 'movie' && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-700 border border-zinc-800 px-1 rounded">Movie</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const V2SearchModal: React.FC<V2SearchModalProps> = ({ isOpen, onClose }) => {
    const { addToWatchlist, allTrackedShows, settings, setReminderCandidate } = useAppContext();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TVShow[]>([]);
    const [loading, setLoading] = useState(false);
    const [upsideDownMode, setUpsideDownMode] = useState(false);
    
    // Recommendation Engine State
    const [recommendations, setRecommendations] = useState<TVShow[]>([]);
    const [sourceName, setSourceName] = useState('');
    const [loadingRecs, setLoadingRecs] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setRecommendations([]);
            setUpsideDownMode(false);
            // Focus with a slight delay for animation
            setTimeout(() => inputRef.current?.focus(), 100);
            
            // Load initial trending/popular data
            setLoading(true);
            getPopularShows().then(setResults).finally(() => setLoading(false));
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        if (!query.trim()) {
            if (isOpen && query === '') {
                 getPopularShows().then(setResults);
            }
            return;
        }
        
        const timeoutId = setTimeout(() => {
            setLoading(true);
            searchShows(query)
                .then(setResults)
                .catch(console.error)
                .finally(() => setLoading(false));
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [query, isOpen]);

    const handleAdd = async (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        await addToWatchlist(show);
        
        // Trigger Recommendations
        if (settings.recommendationsEnabled) {
            setLoadingRecs(true);
            setSourceName(show.name);
            try {
                const recs = await getRecommendations(show.id, show.media_type);
                const trackedIds = new Set(allTrackedShows.map(s => s.id));
                // Filter out already tracked items
                const validRecs = recs.filter(r => !trackedIds.has(r.id));
                setRecommendations(validRecs);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingRecs(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-[#050505]/95 backdrop-blur-2xl flex flex-col animate-fade-in">
            {/* Easter Egg Overlay */}
            <div className={`fixed inset-0 pointer-events-none z-[190] transition-opacity duration-1000 ${upsideDownMode ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 shadow-[inset_0_0_150px_80px_rgba(185,28,28,0.6)] animate-pulse mix-blend-screen" />
                <div className="absolute inset-0 bg-red-950/20 mix-blend-overlay" />
            </div>

            {/* Header / Input Area */}
            <div className="shrink-0 p-6 md:p-12 pb-0 flex flex-col relative z-20">
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 md:top-12 md:right-12 p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="max-w-5xl w-full mx-auto">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 block flex items-center gap-2">
                        <Search className="w-3 h-3" /> Global Database Search
                    </label>
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="TYPE TO SEARCH..."
                        className="w-full bg-transparent border-none outline-none text-4xl md:text-7xl font-black text-white placeholder:text-zinc-800 uppercase tracking-tight"
                    />
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-12 py-8 relative z-20">
                <div className="max-w-5xl w-full mx-auto pb-20">
                    
                    {/* Recommendation Rail */}
                    {(recommendations.length > 0 || loadingRecs) && (
                        <div className="mb-12 animate-enter">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> 
                                    {loadingRecs ? 'Analyzing...' : `Because you added "${sourceName}"`}
                                </h3>
                                <button onClick={() => setRecommendations([])} className="text-[10px] font-bold text-zinc-600 hover:text-white uppercase tracking-widest">Clear</button>
                            </div>
                            
                            {loadingRecs ? (
                                <div className="h-40 w-full flex items-center justify-center border border-dashed border-white/10 rounded-3xl">
                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {recommendations.slice(0, 5).map(show => (
                                        <ShowCard 
                                            key={`rec-${show.id}`} 
                                            show={show} 
                                            onAdd={handleAdd} 
                                            isTracked={false} 
                                            isRec={true} 
                                            onHoverSpecial={setUpsideDownMode}
                                        />
                                    ))}
                                </div>
                            )}
                            <div className="h-px w-full bg-white/5 mt-12" />
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-12 h-12 text-zinc-800 animate-spin" />
                        </div>
                    ) : (
                        <div>
                            {query === '' && (
                                <h3 className="text-sm font-black text-zinc-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> Trending Now
                                </h3>
                            )}
                            
                            {results.length === 0 && query !== '' ? (
                                <div className="text-center py-20 opacity-30">
                                    <p className="text-xl font-black uppercase tracking-widest text-zinc-500">No Signal Found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {results.map(show => {
                                        const isTracked = allTrackedShows.some(s => s.id === show.id);
                                        return (
                                            <ShowCard 
                                                key={show.id} 
                                                show={show} 
                                                onAdd={handleAdd} 
                                                isTracked={isTracked} 
                                                onHoverSpecial={setUpsideDownMode}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default V2SearchModal;
