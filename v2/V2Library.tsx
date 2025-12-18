
import React, { useState } from 'react';
import { List, Trash2, Check, Filter, Tv, Film, MonitorPlay } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getImageUrl } from '../services/tmdb';

const V2Library: React.FC = () => {
    const { watchlist, interactions, removeFromWatchlist, toggleWatched } = useAppContext();
    const [filter, setFilter] = useState<'all' | 'tv' | 'movie'>('all');

    const filteredItems = watchlist.filter(i => {
        if (filter === 'all') return true;
        return i.media_type === filter;
    });

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-y-auto custom-scrollbar">
            <header className="px-12 py-10 shrink-0 border-b border-white/5 bg-zinc-950/20 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <List className="w-8 h-8 text-indigo-500" />
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Manifest</h1>
                    </div>
                    
                    <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
                        {['all', 'tv', 'movie'].map(f => (
                            <button 
                                key={f} 
                                onClick={() => setFilter(f as any)} 
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="px-12 py-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {filteredItems.map(item => {
                    const isWatched = interactions[`${item.media_type}-${item.id}`]?.is_watched;
                    return (
                        <div key={item.id} className="bg-zinc-950 border border-white/5 rounded-[2.5rem] p-6 flex gap-6 hover:bg-zinc-900/40 transition-all group">
                            <div className="w-24 aspect-[2/3] rounded-2xl overflow-hidden shrink-0 border border-white/5 relative">
                                <img src={getImageUrl(item.poster_path)} className={`w-full h-full object-cover transition-all ${isWatched ? 'grayscale opacity-40' : ''}`} alt="" />
                                {isWatched && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Check className="w-8 h-8 text-emerald-500" /></div>}
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-between py-2 min-w-0">
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700 bg-white/5 px-2 py-1 rounded border border-white/5">
                                            {item.media_type}
                                        </span>
                                        <button onClick={() => removeFromWatchlist(item.id)} className="text-zinc-800 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <h3 className="text-base font-black text-zinc-100 uppercase tracking-tight leading-none mb-2 truncate group-hover:text-indigo-400 transition-colors">{item.name}</h3>
                                    <div className="flex items-center gap-3 text-zinc-600">
                                        <span className="text-[10px] font-mono">{item.first_air_date?.split('-')[0]}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{item.vote_average.toFixed(1)} ★</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => toggleWatched(item.id, item.media_type)}
                                        className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isWatched ? 'bg-zinc-900 text-emerald-500' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5'}`}
                                    >
                                        {isWatched ? <Check className="w-3.5 h-3.5" /> : <MonitorPlay className="w-3.5 h-3.5" />}
                                        {isWatched ? 'Confirmed' : 'Manual Sync'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default V2Library;
