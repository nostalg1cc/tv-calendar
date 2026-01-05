
import React, { useState, useMemo } from 'react';
import { LayoutGrid, List as ListIcon, Search, Filter, Star, Clock, Tv, Film, Trash2, Check, ArrowUpDown, Layers, Eye, EyeOff, Play } from 'lucide-react';
import { useStore } from '../store';
import { getImageUrl } from '../services/tmdb';
import { TVShow } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import V2ShowDetailsModal from './V2ShowDetailsModal';
import RatingBadge from '../components/RatingBadge';

const V2Library: React.FC = () => {
    const { watchlist, removeFromWatchlist, settings, history, toggleWatched } = useStore();
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
            // date_added fallback to array index (approximate)
            return watchlist.indexOf(b) - watchlist.indexOf(a);
        });
    }, [watchlist, typeFilter, statusFilter, search, sort, history]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-hidden">
            {/* Header Stats */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#09090b]">
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Library</p>
                        <p className="text-xl font-black text-white">{watchlist.length} <span className="text-zinc-600 text-sm">Titles</span></p>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                             <Tv className="w-4 h-4 text-zinc-600" />
                             <span className="text-sm font-bold text-zinc-400">{totalShows}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <Film className="w-4 h-4 text-zinc-600" />
                             <span className="text-sm font-bold text-zinc-400">{totalMovies}</span>
                        </div>
                    </div>
                </div>
                
                {/* Search */}
                <div className="relative group w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-white transition-colors" />
                    <input 
                        type="text" 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Filter collection..." 
                        className="w-full bg-zinc-900 border border-white/5 rounded-none pl-9 pr-4 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-2 border-b border-white/5 flex items-center justify-between bg-[#050505] overflow-x-auto hide-scrollbar gap-4">
                <div className="flex gap-1 shrink-0">
                    {(['all', 'tv', 'movie'] as const).map(t => (
                        <button 
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === t ? 'text-white bg-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {t === 'all' ? 'All' : t === 'tv' ? 'Series' : 'Films'}
                        </button>
                    ))}
                    
                    <div className="w-px h-4 bg-white/10 mx-2 self-center" />

                    {(['all', 'watched', 'unwatched'] as const).map(s => (
                        <button 
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${statusFilter === s ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {s === 'watched' && <Eye className="w-3 h-3" />}
                            {s === 'unwatched' && <EyeOff className="w-3 h-3" />}
                            {s === 'all' ? 'All Status' : (s.charAt(0).toUpperCase() + s.slice(1))}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase">Sort</span>
                        <select 
                            value={sort} 
                            onChange={(e) => setSort(e.target.value as any)}
                            className="bg-transparent text-[10px] font-bold text-zinc-400 outline-none cursor-pointer hover:text-white transition-colors uppercase tracking-wider"
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
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#09090b]">
                {filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <Filter className="w-16 h-16 text-zinc-700 mb-4 stroke-1" />
                        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No Items Match</p>
                    </div>
                ) : (
                    <>
                        {view === 'grid' && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-px bg-zinc-900 border-b border-zinc-900">
                                {filtered.map(item => {
                                    let isWatched = false;
                                    if (item.media_type === 'movie') isWatched = history[`movie-${item.id}`]?.is_watched;
                                    else isWatched = Object.keys(history).some(key => key.startsWith(`episode-${item.id}-`) && history[key].is_watched);

                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setSelectedItem(item)}
                                            className="group relative aspect-[2/3] bg-black cursor-pointer overflow-hidden"
                                        >
                                            <img 
                                                src={getImageUrl(item.custom_poster_path || item.poster_path)} 
                                                className={`w-full h-full object-cover transition-all duration-500 ${isWatched ? 'grayscale opacity-60' : 'opacity-80 group-hover:opacity-100'}`} 
                                                loading="lazy" 
                                                alt="" 
                                            />
                                            
                                            {/* Top Info */}
                                            {settings.showCalendarRatings && <RatingBadge rating={item.vote_average} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            
                                            {isWatched && (
                                                <div className="absolute top-2 left-2 bg-black/60 p-1 rounded-full backdrop-blur-md">
                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                </div>
                                            )}

                                            {/* Bottom Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight mb-1 drop-shadow-md">{item.name}</h4>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-mono text-zinc-400">{item.first_air_date?.split('-')[0]}</span>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); if(confirm("Remove?")) removeFromWatchlist(item.id); }}
                                                            className="text-zinc-500 hover:text-red-500 transition-colors"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleWatched({ tmdb_id: item.id, media_type: 'movie', is_watched: isWatched }); }}
                                                            className={`transition-colors ${isWatched ? 'text-emerald-500' : 'text-zinc-500 hover:text-white'}`}
                                                            title={isWatched ? "Mark Unwatched" : "Mark Watched"}
                                                        >
                                                            {isWatched ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {view === 'list' && (
                            <div className="flex flex-col">
                                {filtered.map(item => {
                                    let isWatched = false;
                                    if (item.media_type === 'movie') isWatched = history[`movie-${item.id}`]?.is_watched;
                                    else isWatched = Object.keys(history).some(key => key.startsWith(`episode-${item.id}-`) && history[key].is_watched);

                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setSelectedItem(item)}
                                            className="flex items-center gap-4 p-3 border-b border-white/5 hover:bg-white/[0.02] cursor-pointer group"
                                        >
                                            <div className="w-10 h-14 bg-zinc-900 shrink-0 relative">
                                                <img src={getImageUrl(item.custom_poster_path || item.poster_path)} className={`w-full h-full object-cover ${isWatched ? 'grayscale opacity-50' : ''}`} loading="lazy" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h4 className={`text-sm font-bold truncate ${isWatched ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{item.name}</h4>
                                                    {isWatched && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                    <span>{item.media_type}</span>
                                                    <span className="w-1 h-1 rounded-full bg-zinc-800" />
                                                    <span>{item.first_air_date?.split('-')[0]}</span>
                                                    <span className="w-1 h-1 rounded-full bg-zinc-800" />
                                                    <span className="text-indigo-500">{item.vote_average.toFixed(1)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                                                <button onClick={(e) => { e.stopPropagation(); toggleWatched({ tmdb_id: item.id, media_type: 'movie', is_watched: isWatched }); }} className="text-zinc-500 hover:text-white"><Eye className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm("Remove?")) removeFromWatchlist(item.id); }} className="text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
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
