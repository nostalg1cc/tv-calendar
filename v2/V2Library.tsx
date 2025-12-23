
import React, { useState, useMemo } from 'react';
import { List, Trash2, LayoutGrid, Search, Star, AlertCircle, MoreHorizontal, X, Tv, Film, Check, EyeOff, Calendar, Filter } from 'lucide-react';
import { useStore } from '../store';
import { getImageUrl } from '../services/tmdb';
import { TVShow } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import { format, parseISO } from 'date-fns';
import { useCalendarEpisodes } from '../hooks/useQueries';

type SortMode = 'name' | 'next_up' | 'added' | 'rating' | 'release';
type FilterMode = 'all' | 'tv' | 'movie' | 'ended' | 'returning' | 'watched' | 'unwatched';

const V2Library: React.FC = () => {
    const { watchlist, history, removeFromWatchlist, settings, updateSettings } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterMode>('all');
    const [sort, setSort] = useState<SortMode>('name');
    const [layout, setLayout] = useState<'grid' | 'list'>(settings.v2LibraryLayout || 'grid');
    const [selectedItem, setSelectedItem] = useState<TVShow | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    // Fetch episodes for all watchlist items to calculate next episode
    const { episodes } = useCalendarEpisodes(new Date());

    const getNextEpisodeDate = (showId: number): string | null => {
        const today = new Date().toISOString().split('T')[0];
        const upcoming = episodes.filter(ep => ep.show_id === showId && ep.air_date && ep.air_date >= today);
        upcoming.sort((a, b) => a.air_date.localeCompare(b.air_date));
        return upcoming.length > 0 ? upcoming[0].air_date : null;
    };

    const isFullyWatched = (item: TVShow) => {
        // Simple check: for movies, check movie ID. For TV, this is approximate (users rarely mark every single ep in history map without sync)
        // A better check would require total ep count vs watched count.
        // For now, let's use the last interaction or a generic check.
        // If movie:
        if (item.media_type === 'movie') {
            return history[`movie-${item.id}`]?.is_watched;
        }
        // TV logic is complex without full episode list in store. 
        // We'll approximate by checking if 'ended' and no next episode? 
        // Or leave it manual. Let's return false for TV for now unless we implement full progress.
        return false; 
    };

    const filteredItems = useMemo(() => {
        let items = watchlist;

        if (searchQuery) {
            items = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        switch (filter) {
            case 'tv': items = items.filter(i => i.media_type === 'tv'); break;
            case 'movie': items = items.filter(i => i.media_type === 'movie'); break;
            case 'returning': items = items.filter(i => i.media_type === 'tv' && getNextEpisodeDate(i.id)); break;
            case 'ended': items = items.filter(i => i.media_type === 'tv' && !getNextEpisodeDate(i.id)); break;
            case 'watched': items = items.filter(i => isFullyWatched(i)); break;
            case 'unwatched': items = items.filter(i => !isFullyWatched(i)); break;
        }

        return items.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'rating') return b.vote_average - a.vote_average;
            if (sort === 'release') return (b.first_air_date || '').localeCompare(a.first_air_date || '');
            if (sort === 'next_up') {
                const dateA = getNextEpisodeDate(a.id) || '9999-99-99';
                const dateB = getNextEpisodeDate(b.id) || '9999-99-99';
                return dateA.localeCompare(dateB);
            }
            return a.name.localeCompare(b.name); // Default fallback
        });
    }, [watchlist, searchQuery, filter, sort, episodes, history]);

    const handleLayoutChange = (newLayout: 'grid' | 'list') => {
        setLayout(newLayout);
        updateSettings({ v2LibraryLayout: newLayout });
    };

    const StatPill = ({ label, count }: { label: string, count: number }) => (
        <div className="flex flex-col items-center justify-center px-4 py-2 bg-zinc-900/50 rounded-xl border border-white/5 min-w-[80px]">
            <span className="text-xl font-black text-white leading-none">{count}</span>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
        </div>
    );

    const FilterPill = ({ id, label, icon: Icon }: { id: FilterMode, label: string, icon?: any }) => (
        <button 
            onClick={() => setFilter(id)}
            className={`
                px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap border transition-all flex items-center gap-2
                ${filter === id ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-white/10 hover:border-white/30 hover:text-white'}
            `}
        >
            {Icon && <Icon className="w-3 h-3" />}
            {label}
        </button>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-hidden font-sans">
            
            {/* STICKY HEADER */}
            <header className="shrink-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-6 md:p-8">
                    
                    {/* Title & Search */}
                    <div className="flex-1 min-w-0 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">My Library</h1>
                            
                            {/* Mobile Search Toggle */}
                            <button onClick={() => setIsSearchExpanded(!isSearchExpanded)} className="md:hidden p-2 text-zinc-400 hover:text-white">
                                <Search className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className={`md:flex items-center gap-2 ${isSearchExpanded ? 'flex' : 'hidden'}`}>
                            <div className="relative flex-1 max-w-md group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="SEARCH COLLECTION..." 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all uppercase tracking-wide" 
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats & Controls */}
                    <div className="flex items-end gap-4 overflow-x-auto hide-scrollbar pb-1 md:pb-0">
                        <StatPill label="Total" count={watchlist.length} />
                        <StatPill label="Movies" count={watchlist.filter(i => i.media_type === 'movie').length} />
                        <StatPill label="Series" count={watchlist.filter(i => i.media_type === 'tv').length} />
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 md:px-8 pb-4 gap-4 overflow-x-auto hide-scrollbar">
                    <div className="flex items-center gap-2">
                        <FilterPill id="all" label="All" />
                        <FilterPill id="movie" label="Movies" icon={Film} />
                        <FilterPill id="tv" label="TV" icon={Tv} />
                        <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />
                        <FilterPill id="returning" label="Active" icon={Calendar} />
                        <FilterPill id="watched" label="Watched" icon={Check} />
                    </div>

                    <div className="flex items-center gap-3 pl-4 border-l border-white/10 ml-auto">
                         <div className="relative group">
                            <select 
                                value={sort} 
                                onChange={(e) => setSort(e.target.value as SortMode)} 
                                className="bg-transparent text-[10px] font-bold text-zinc-500 uppercase tracking-wider outline-none cursor-pointer hover:text-white transition-colors appearance-none pr-4 text-right"
                            >
                                <option value="name">A-Z Name</option>
                                <option value="rating">Top Rated</option>
                                <option value="release">Newest Release</option>
                                <option value="next_up">Next Episode</option>
                            </select>
                        </div>
                        
                        <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-white/5 shrink-0">
                            <button onClick={() => handleLayoutChange('grid')} className={`p-1.5 rounded-md transition-all ${layout === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleLayoutChange('list')} className={`p-1.5 rounded-md transition-all ${layout === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><List className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                </div>
            </header>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 pb-20">
                        <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800">
                             <Filter className="w-8 h-8 text-zinc-600 stroke-[1.5]" />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-1">No Items Found</h3>
                        <p className="text-xs text-zinc-500 font-medium">Try adjusting your filters or search</p>
                    </div>
                ) : (
                    layout === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 pb-20">
                            {filteredItems.map(item => {
                                const nextEp = getNextEpisodeDate(item.id);
                                const isWatched = isFullyWatched(item);
                                
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => setSelectedItem(item)} 
                                        className="group relative flex flex-col gap-3 cursor-pointer"
                                        data-context-type="show"
                                        data-context-meta={JSON.stringify(item)}
                                    >
                                        {/* Poster Card */}
                                        <div className="relative aspect-[2/3] w-full bg-zinc-900 rounded-sm overflow-hidden shadow-lg border border-white/5 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:border-white/20">
                                            <img 
                                                src={getImageUrl(item.poster_path)} 
                                                alt={item.name} 
                                                className={`w-full h-full object-cover transition-all duration-500 ${isWatched ? 'grayscale opacity-50' : 'opacity-80 group-hover:opacity-100'}`} 
                                                loading="lazy" 
                                            />
                                            
                                            {/* Badges */}
                                            <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                                                {item.media_type === 'tv' && nextEp && (
                                                    <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-sm shadow-md">New Ep</span>
                                                )}
                                                {isWatched && (
                                                    <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest rounded-sm shadow-md flex items-center gap-1"><Check className="w-2 h-2" /> Watched</span>
                                                )}
                                            </div>

                                            {/* Hover Actions */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} 
                                                    className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-black transition-colors"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Info Overlay on Hover */}
                                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent pt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
                                                <div className="flex items-center justify-between text-[9px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                                                    <span>{item.first_air_date?.split('-')[0] || 'TBA'}</span>
                                                    {item.vote_average > 0 && <span className="flex items-center gap-0.5 text-yellow-500"><Star className="w-2 h-2 fill-current" /> {item.vote_average.toFixed(1)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Title Block */}
                                        <div className="px-1">
                                            <h4 className={`text-xs font-bold leading-tight line-clamp-2 uppercase tracking-wide ${isWatched ? 'text-zinc-600 line-through' : 'text-zinc-300 group-hover:text-white transition-colors'}`}>
                                                {item.name}
                                            </h4>
                                            {nextEp && (
                                                <p className="text-[9px] font-bold text-indigo-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                                                    <Calendar className="w-2.5 h-2.5" /> {format(parseISO(nextEp), 'MMM d')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 pb-20 max-w-5xl mx-auto">
                            {filteredItems.map(item => {
                                const nextEp = getNextEpisodeDate(item.id);
                                const isWatched = isFullyWatched(item);
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => setSelectedItem(item)} 
                                        className="flex items-center gap-4 p-3 rounded-lg border border-transparent hover:bg-zinc-900 hover:border-white/5 transition-all cursor-pointer group"
                                        data-context-type="show"
                                        data-context-meta={JSON.stringify(item)}
                                    >
                                        {/* Thumb */}
                                        <div className="w-10 h-14 bg-zinc-800 rounded overflow-hidden shrink-0 shadow-sm relative">
                                            <img src={getImageUrl(item.poster_path)} className={`w-full h-full object-cover ${isWatched ? 'grayscale opacity-50' : ''}`} alt="" />
                                            {isWatched && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Check className="w-4 h-4 text-emerald-500" /></div>}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className={`text-sm font-bold truncate uppercase tracking-wide ${isWatched ? 'text-zinc-600 line-through' : 'text-white'}`}>{item.name}</h4>
                                                {item.media_type === 'movie' && <span className="text-[8px] px-1.5 py-0.5 rounded border border-white/10 text-zinc-500 font-bold uppercase">Movie</span>}
                                                {item.media_type === 'tv' && (nextEp ? <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase">Active</span> : <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-bold uppercase">Ended</span>)}
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                                <span>{item.first_air_date?.split('-')[0]}</span>
                                                <span className="w-0.5 h-0.5 bg-zinc-600 rounded-full" />
                                                <span>{item.vote_average.toFixed(1)} Rating</span>
                                                {nextEp && (
                                                    <>
                                                        <span className="w-0.5 h-0.5 bg-zinc-600 rounded-full" />
                                                        <span className="text-indigo-400">Next: {format(parseISO(nextEp), 'MMM d')}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }}
                                            className="p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Remove from Library"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>

            {selectedItem && (
                <ShowDetailsModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} showId={selectedItem.id} mediaType={selectedItem.media_type} />
            )}

            {deleteId && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteId(null)}>
                    <div className="bg-[#09090b] border border-white/10 p-8 rounded-3xl max-w-sm w-full shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-600/50" />
                        <div className="flex flex-col items-center text-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                <AlertCircle className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Remove Item?</h3>
                                <p className="text-xs text-zinc-500 font-medium mt-1">This will remove it from your library and calendar.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                            <button onClick={() => { if(deleteId) removeFromWatchlist(deleteId); setDeleteId(null); }} className="px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default V2Library;
