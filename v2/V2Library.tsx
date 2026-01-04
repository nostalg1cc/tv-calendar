import React, { useState, useMemo } from 'react';
import { LayoutGrid, List as ListIcon, Search, Filter, Star, Clock, Tv, Film, Trash2, Check, ArrowUpDown, Layers, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import { getImageUrl } from '../services/tmdb';
import { TVShow } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import V2ShowDetailsModal from './V2ShowDetailsModal';
import RatingBadge from '../components/RatingBadge';

const V2Library: React.FC = () => {
    const { watchlist, removeFromWatchlist, settings, history } = useStore();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'tv' | 'movie'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'watched' | 'unwatched'>('all');
    const [sort, setSort] = useState<'date_added' | 'rating' | 'name' | 'release'>('date_added');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [selectedItem, setSelectedItem] = useState<TVShow | null>(null);

    // Stats
    const totalShows = watchlist.filter(i => i.media_type === 'tv').length;
    const totalMovies = watchlist.filter(i => i.media_type === 'movie').length;

    const filtered = useMemo(() => {
        let items = [...watchlist];
        
        // Type Filter
        if (typeFilter !== 'all') {
            items = items.filter(i => i.media_type === typeFilter);
        }
        
        // Status Filter
        if (statusFilter !== 'all') {
            items = items.filter(item => {
                let isWatched = false;
                if (item.media_type === 'movie') {
                    isWatched = history[`movie-${item.id}`]?.is_watched;
                } else {
                    // For TV, if *any* episode is watched, consider it "started/watched" for this filter context
                    // Or we could check if user has history entries.
                    isWatched = Object.keys(history).some(key => key.startsWith(`episode-${item.id}-`) && history[key].is_watched);
                }
                
                return statusFilter === 'watched' ? isWatched : !isWatched;
            });
        }
        
        // Search
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q));
        }

        return items.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'rating') return b.vote_average - a.vote_average;
            if (sort === 'release') return (b.first_air_date || '').localeCompare(a.first_air_date || '');
            // date_added (reverse array order as proxy since newly added are appended)
            return watchlist.indexOf(b) - watchlist.indexOf(a);
        });
    }, [watchlist, typeFilter, statusFilter, search, sort, history]);

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            {/* Header Stats */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-panel/50">
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Items</p>
                        <p className="text-xl font-black text-text-main">{watchlist.length}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                             <div className="p-1.5 rounded bg-indigo-500/10 text-indigo-400"><Tv className="w-3 h-3" /></div>
                             <span className="text-sm font-bold text-zinc-300">{totalShows}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="p-1.5 rounded bg-pink-500/10 text-pink-400"><Film className="w-3 h-3" /></div>
                             <span className="text-sm font-bold text-zinc-300">{totalMovies}</span>
                        </div>
                    </div>
                </div>
                
                {/* Search */}
                <div className="relative group w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                    <input 
                        type="text" 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Filter collection..." 
                        className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-2 border-b border-white/5 flex items-center justify-between bg-background overflow-x-auto hide-scrollbar gap-4">
                <div className="flex gap-2 shrink-0">
                    {(['all', 'tv', 'movie'] as const).map(t => (
                        <button 
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${typeFilter === t ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-transparent hover:bg-white/5'}`}
                        >
                            {t === 'all' ? 'Everything' : t === 'tv' ? 'Series' : 'Films'}
                        </button>
                    ))}
                    
                    <div className="w-px h-6 bg-white/10 mx-1 self-center" />

                    {(['all', 'watched', 'unwatched'] as const).map(s => (
                        <button 
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1 ${statusFilter === s ? 'bg-white/10 text-white border-white/10' : 'bg-transparent text-zinc-500 border-transparent hover:bg-white/5'}`}
                        >
                            {s === 'watched' && <Eye className="w-3 h-3" />}
                            {s === 'unwatched' && <EyeOff className="w-3 h-3" />}
                            {s === 'all' ? 'All Status' : (s.charAt(0).toUpperCase() + s.slice(1))}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Sort:</span>
                        <select 
                            value={sort} 
                            onChange={(e) => setSort(e.target.value as any)}
                            className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer hover:text-indigo-400 transition-colors"
                        >
                            <option value="date_added">Date Added</option>
                            <option value="rating">Rating</option>
                            <option value="release">Release Date</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                     </div>
                     <div className="w-px h-4 bg-white/10" />
                     <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} className="text-zinc-500 hover:text-white transition-colors">
                         {view === 'grid' ? <ListIcon className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                     </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <Filter className="w-16 h-16 text-zinc-500 mb-4" />
                        <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No Items Match</p>
                    </div>
                ) : (
                    <div className={
                        view === 'grid' 
                        ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4" 
                        : "flex flex-col gap-2"
                    }>
                        {filtered.map(item => (
                            <div 
                                key={item.id} 
                                onClick={() => setSelectedItem(item)}
                                className={`group relative cursor-pointer ${view === 'list' ? 'flex items-center gap-4 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5' : ''}`}
                            >
                                {/* Poster Container */}
                                <div className={`relative overflow-hidden rounded-lg bg-zinc-900 border border-white/10 shadow-lg ${view === 'grid' ? 'aspect-[2/3]' : 'w-12 h-16 shrink-0'}`}>
                                    <img src={getImageUrl(item.custom_poster_path || item.poster_path)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" alt="" />
                                    {/* Rating Banner */}
                                    <RatingBadge rating={item.vote_average} />
                                    
                                    {/* Grid Overlay Actions */}
                                    {view === 'grid' && (
                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); if(confirm("Remove?")) removeFromWatchlist(item.id); }}
                                                className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <span className="text-[9px] font-bold text-zinc-500 uppercase">View Details</span>
                                        </div>
                                    )}
                                </div>

                                {/* Meta Info (Grid vs List) */}
                                {view === 'grid' ? (
                                    <div className="mt-2">
                                        <h4 className="text-[11px] font-bold text-zinc-200 truncate group-hover:text-indigo-400 transition-colors">{item.name}</h4>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-[9px] font-mono text-zinc-500">{item.first_air_date?.split('-')[0]}</span>
                                            <span className="text-[9px] font-bold text-zinc-600 uppercase">{item.media_type === 'movie' ? 'Film' : 'TV'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 min-w-0 flex items-center justify-between pr-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-zinc-200">{item.name}</h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] bg-white/10 px-1.5 rounded text-zinc-300 font-mono">{item.first_air_date?.split('-')[0]}</span>
                                                <span className="text-[10px] text-zinc-500 uppercase font-bold">{item.media_type === 'movie' ? 'Movie' : 'TV Series'}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); if(confirm("Remove?")) removeFromWatchlist(item.id); }}
                                            className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedItem && (
                settings.useBetaLayouts ? (
                    <V2ShowDetailsModal 
                        isOpen={!!selectedItem}
                        onClose={() => setSelectedItem(null)}
                        showId={selectedItem.id}
                        mediaType={selectedItem.media_type}
                    />
                ) : (
                    <ShowDetailsModal 
                        isOpen={!!selectedItem}
                        onClose={() => setSelectedItem(null)}
                        showId={selectedItem.id}
                        mediaType={selectedItem.media_type}
                    />
                )
            )}
        </div>
    );
};

export default V2Library;