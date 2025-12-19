
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Plus, Check } from 'lucide-react';
import { useStore } from '../store';
import { searchShows, getPopularShows, getImageUrl } from '../services/tmdb';
import { TVShow } from '../types';

interface V2SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const V2SearchModal: React.FC<V2SearchModalProps> = ({ isOpen, onClose }) => {
    const { addToWatchlist, watchlist } = useStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TVShow[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setTimeout(() => inputRef.current?.focus(), 100);
            setLoading(true);
            getPopularShows().then(setResults).finally(() => setLoading(false));
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) return;
        const timeoutId = setTimeout(() => {
            setLoading(true);
            searchShows(query).then(setResults).finally(() => setLoading(false));
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleAdd = (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        addToWatchlist(show);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-[#050505]/95 backdrop-blur-2xl flex flex-col animate-fade-in">
            <div className="shrink-0 p-6 md:p-12 pb-0 flex flex-col relative z-20">
                <button onClick={onClose} className="absolute top-6 right-6 p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
                <div className="max-w-5xl w-full mx-auto">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 block flex items-center gap-2"><Search className="w-3 h-3" /> Database Search</label>
                    <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="TYPE TO SEARCH..." className="w-full bg-transparent border-none outline-none text-4xl md:text-7xl font-black text-white placeholder:text-zinc-800 uppercase tracking-tight" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-12 py-8 relative z-20">
                <div className="max-w-5xl w-full mx-auto pb-20">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-zinc-800 animate-spin" /></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {results.map(show => {
                                const isTracked = watchlist.some(s => s.id === show.id);
                                return (
                                    <div 
                                        key={show.id} 
                                        className="group relative flex flex-col gap-3 cursor-pointer" 
                                        onClick={(e) => !isTracked && handleAdd(e, show)}
                                    >
                                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 shadow-2xl transition-all duration-300">
                                            <img src={getImageUrl(show.poster_path)} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                                                <button className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xl ${isTracked ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black'}`}>
                                                    {isTracked ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-1">
                                            <h4 className="text-sm font-bold leading-tight line-clamp-1 text-white">{show.name}</h4>
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
