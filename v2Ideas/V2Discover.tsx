
import React, { useState } from 'react';
import { Search, Sparkles, TrendingUp, Tv, Film, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { searchShows, getPopularShows } from '../services/tmdb';
import { TVShow } from '../types';

const V2Discover: React.FC = () => {
    const { addToWatchlist, allTrackedShows } = useAppContext();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TVShow[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        try {
            const data = await searchShows(query);
            setResults(data);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (!query) {
            setLoading(true);
            getPopularShows().then(setResults).finally(() => setLoading(false));
        }
    }, [query]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-y-auto custom-scrollbar">
            <header className="px-12 py-10 shrink-0">
                <div className="flex items-center gap-4 mb-8">
                    <Sparkles className="w-8 h-8 text-indigo-500" />
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Exploration</h1>
                </div>

                <form onSubmit={handleSearch} className="max-w-3xl relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search standard frequencies for transmissions..."
                        className="w-full bg-zinc-950 border border-white/5 py-5 pl-16 pr-6 rounded-3xl text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-zinc-800 placeholder:font-black placeholder:uppercase placeholder:tracking-widest"
                    />
                </form>
            </header>

            <div className="px-12 pb-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">Analyzing Signals</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                        {results.map(item => {
                            const isAdded = allTrackedShows.some(s => s.id === item.id);
                            return (
                                <div key={item.id} className="group flex flex-col gap-4">
                                    <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden border border-white/5 bg-zinc-950 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-[0_0_40px_rgba(99,102,241,0.1)] group-hover:border-indigo-500/20">
                                        <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} className={`w-full h-full object-cover transition-all duration-700 ${isAdded ? 'grayscale opacity-30' : 'group-hover:opacity-40'}`} alt="" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                            <button 
                                                onClick={() => !isAdded && addToWatchlist(item)}
                                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${isAdded ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-indigo-500 hover:text-white'}`}
                                            >
                                                {isAdded ? 'Established' : 'Intercept'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="px-2">
                                        <h4 className="text-[13px] font-black text-white uppercase tracking-tight truncate mb-1">{item.name}</h4>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                                                {item.media_type === 'movie' ? <Film className="inline w-3 h-3 mr-1" /> : <Tv className="inline w-3 h-3 mr-1" />}
                                                {item.first_air_date?.split('-')[0]}
                                            </span>
                                            <span className="text-[9px] font-black text-indigo-400">{item.vote_average.toFixed(1)} ★</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default V2Discover;
