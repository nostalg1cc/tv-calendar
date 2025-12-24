
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
    LayoutGrid, List, Search, Star, Trash2, Calendar, 
    Filter, Clock, ChevronDown, Check, Tv, Film, 
    MoreHorizontal, ArrowUpRight, AlertCircle, X, Loader2,
    ArrowDownAZ, CalendarDays
} from 'lucide-react';
import { useStore } from '../store';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import { TVShow } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useCalendarEpisodes, useShowData } from '../hooks/useQueries';

// --- TYPES ---

type SortMode = 'added' | 'name' | 'rating' | 'release';
type FilterMode = 'all' | 'tv' | 'movie' | 'ended';

interface LibraryItemProps {
    item: TVShow;
    onClick: () => void;
    onRemove: () => void;
}

// --- HELPER COMPONENTS ---

// 1. Horizon Card - Uses Calendar Context
const HorizonCard: React.FC<{ item: TVShow, episode: any }> = ({ item, episode }) => {
    const [isHovered, setIsHovered] = useState(false);
    const days = differenceInDays(parseISO(episode.air_date), new Date());
    
    // Format: "Today", "Tomorrow", "In 3 Days"
    const timeLabel = days === 0 ? 'Today' : (days === 1 ? 'Tomorrow' : `In ${days} Days`);
    
    return (
        <div 
            className="relative min-w-[260px] h-[160px] rounded-2xl overflow-hidden cursor-pointer group border border-white/5 hover:border-indigo-500/50 transition-all shadow-lg shrink-0"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path)})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            
            <div className="absolute top-3 right-3 z-10">
                <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg border border-white/10 transition-colors ${days <= 1 ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'}`}>
                    {timeLabel}
                </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4">
                <h4 className="text-white font-bold text-lg leading-none truncate mb-1">{item.name}</h4>
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                    <span className="text-indigo-300">S{episode.season_number} E{episode.episode_number}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-500" />
                    <span>{format(parseISO(episode.air_date), 'MMM do')}</span>
                </div>
            </div>
            
            {/* Click Handler Overlay */}
            {/* We pass specific props up, so we handle click in parent if needed, or simple overlay here */}
        </div>
    );
};

// 2. Library Item Card (Grid) - Lazy Loads its own metadata
const LibraryCard: React.FC<LibraryItemProps> = ({ item, onClick, onRemove }) => {
    // Only fetch details if we need them for "Next Up" status
    // For rate limiting reasons, we rely mostly on the static 'item' prop
    // But we can enable a query if we want dynamic status updates.
    // For now, let's stick to a purely visual card to be FAST.
    // Use 'item' data directly.
    
    return (
        <div 
            className="group relative flex flex-col gap-3 cursor-pointer animate-fade-in"
            onClick={onClick}
        >
            <div className="relative aspect-[2/3] w-full bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-white/5 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:border-white/20">
                <img 
                    src={getImageUrl(item.poster_path)} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-60"
                    loading="lazy" 
                />
                
                {/* Type Badge */}
                <div className="absolute top-2 left-2">
                     {item.media_type === 'movie' ? (
                        <div className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[9px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1">
                            <Film className="w-2.5 h-2.5" /> Movie
                        </div>
                    ) : (
                        <div className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[9px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                            <Tv className="w-2.5 h-2.5" /> Series
                        </div>
                    )}
                </div>

                {/* Quick Actions Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500/80 hover:text-white border border-white/10 transition-colors shadow-xl"
                        title="Remove from Library"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 bg-black/80 rounded-full text-[9px] font-bold text-white uppercase tracking-wider">
                        View Details
                    </span>
                </div>
            </div>

            <div className="px-1">
                <h4 className="text-sm font-bold text-zinc-200 truncate group-hover:text-white transition-colors">{item.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                     <span className="text-[10px] text-zinc-500 font-mono">{item.first_air_date?.split('-')[0] || 'TBA'}</span>
                     <div className="flex items-center gap-0.5 text-yellow-500/80 text-[10px] font-bold">
                         <Star className="w-2.5 h-2.5 fill-current" /> {item.vote_average.toFixed(1)}
                     </div>
                </div>
            </div>
        </div>
    );
};

// 3. Library List Row
const LibraryRow: React.FC<LibraryItemProps> = ({ item, onClick, onRemove }) => {
    return (
        <div 
            onClick={onClick}
            className="group flex items-center gap-4 p-3 rounded-xl border border-transparent hover:bg-zinc-900/60 hover:border-white/5 transition-all cursor-pointer animate-fade-in"
        >
            <div className="w-12 h-16 bg-zinc-800 rounded-lg overflow-hidden shrink-0 shadow-sm relative border border-white/5">
                <img src={getImageUrl(item.poster_path)} className="w-full h-full object-cover" alt="" loading="lazy" />
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-2">
                     <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{item.name}</h4>
                     <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.first_air_date?.split('-')[0] || 'Unknown Year'}</p>
                </div>

                <div className="hidden md:flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Rating</span>
                    <div className="flex items-center gap-1 text-xs text-zinc-300 font-medium">
                         <Star className="w-3 h-3 text-yellow-500 fill-current" /> {item.vote_average.toFixed(1)}
                    </div>
                </div>

                <div className="hidden md:flex items-center justify-end gap-2">
                     {item.media_type === 'movie' ? (
                         <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-white/10 text-zinc-400 bg-white/5">Movie</span>
                     ) : (
                         <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-white/5 text-zinc-400 border border-white/10">TV Show</span>
                     )}
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-4 border-l border-white/5">
                <button 
                     onClick={(e) => { e.stopPropagation(); onRemove(); }}
                     className="p-2 text-zinc-500 hover:text-red-500 hover:bg-white/5 rounded-lg transition-colors"
                     title="Remove"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};


// --- MAIN PAGE ---

const V2Library: React.FC = () => {
    const { watchlist, removeFromWatchlist, settings, updateSettings } = useStore();
    
    // Local State
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterMode>('all');
    const [sort, setSort] = useState<SortMode>('added'); 
    const [layout, setLayout] = useState<'grid' | 'list'>(settings.v2LibraryLayout || 'grid');
    const [selectedItem, setSelectedItem] = useState<TVShow | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Infinite Scroll State
    const [displayLimit, setDisplayLimit] = useState(24);
    const loaderRef = useRef<HTMLDivElement>(null);

    // Fetch episodes for "Horizon" rail only (Next 14 days)
    // We leverage the calendar logic but pass 'today'
    const today = useMemo(() => new Date(), []);
    const { episodes: calendarEpisodes } = useCalendarEpisodes(today);

    // --- DERIVED DATA ---

    // 1. Calculate Horizon Items (Available from cached calendar data)
    const horizonData = useMemo(() => {
        const horizonLimit = new Date();
        horizonLimit.setDate(horizonLimit.getDate() + 14);
        const nowStr = today.toISOString().split('T')[0];
        const limitStr = horizonLimit.toISOString().split('T')[0];

        // Find episodes in range [today, today+14]
        const upcoming = calendarEpisodes.filter(ep => 
            ep.air_date && ep.air_date >= nowStr && ep.air_date <= limitStr
        );

        // Map back to shows. Handle duplicates (multiple eps for same show in 2 weeks)
        const uniqueMap = new Map();
        upcoming.forEach(ep => {
            if (!uniqueMap.has(ep.show_id)) {
                // Find original show object to get backdrop/name correctly
                const originalShow = watchlist.find(s => s.id === ep.show_id);
                if (originalShow) {
                    uniqueMap.set(ep.show_id, { show: originalShow, ep });
                }
            }
        });

        return Array.from(uniqueMap.values()).sort((a, b) => a.ep.air_date.localeCompare(b.ep.air_date));
    }, [calendarEpisodes, watchlist, today]);

    // 2. Filter & Sort Main List
    const processedItems = useMemo(() => {
        let items = [...watchlist];

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q));
        }

        // Filter
        switch (filter) {
            case 'tv': items = items.filter(i => i.media_type === 'tv'); break;
            case 'movie': items = items.filter(i => i.media_type === 'movie'); break;
        }

        // Sort
        // Note: 'next_up' sorting is removed from client-side simple sort because we don't have that data for everyone yet without massive fetching.
        // We rely on 'On The Horizon' for next up visibility.
        return items.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'rating') return b.vote_average - a.vote_average;
            if (sort === 'release') return (b.first_air_date || '').localeCompare(a.first_air_date || '');
            // 'added' (Reverse index / implicit order)
            return 0; 
        });
    }, [watchlist, searchQuery, filter, sort]);

    // Reverse if 'added' sort (assuming watchlist is appended to)
    const displayList = useMemo(() => {
        return sort === 'added' ? [...processedItems].reverse() : processedItems;
    }, [processedItems, sort]);

    // --- INFINITE SCROLL LOGIC ---
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setDisplayLimit(prev => Math.min(prev + 24, displayList.length));
            }
        }, { threshold: 0.1 });

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [displayList.length]);

    // Reset limit when filters change
    useEffect(() => {
        setDisplayLimit(24);
    }, [filter, sort, searchQuery]);

    const visibleItems = displayList.slice(0, displayLimit);

    const handleLayoutChange = (newLayout: 'grid' | 'list') => {
        setLayout(newLayout);
        updateSettings({ v2LibraryLayout: newLayout });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-hidden font-sans relative text-zinc-100">
            
            {/* BACKGROUND AMBIENCE */}
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-900/10 via-[#050505]/50 to-[#020202] pointer-events-none z-0" />

            {/* STICKY HEADER */}
            <header className="shrink-0 z-40 bg-[#020202]/80 backdrop-blur-xl border-b border-white/5 transition-all">
                <div className="px-6 py-4 flex flex-col gap-4 max-w-[1920px] mx-auto w-full">
                    {/* Top Row: Title & Layout */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-3">
                             <h1 className="text-2xl font-black text-white uppercase tracking-tight">My Library</h1>
                             <span className="text-zinc-500 text-sm font-bold">{watchlist.length} Items</span>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="hidden sm:flex bg-zinc-900 rounded-lg p-0.5 border border-white/5">
                                <button onClick={() => handleLayoutChange('grid')} className={`p-2 rounded-md transition-all ${layout === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid className="w-4 h-4" /></button>
                                <button onClick={() => handleLayoutChange('list')} className={`p-2 rounded-md transition-all ${layout === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><List className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Controls */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search your collection..." 
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-900 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-600"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                            )}
                        </div>

                        {/* Filters & Sorting */}
                        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 md:pb-0">
                            <div className="flex bg-zinc-900/50 border border-white/5 rounded-xl p-1 shrink-0">
                                {['all', 'tv', 'movie'].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setFilter(m as FilterMode)}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                    >
                                        {m === 'all' ? 'All' : (m === 'tv' ? 'Series' : 'Movies')}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="h-6 w-px bg-white/10 shrink-0 mx-2" />

                            <div className="relative group shrink-0">
                                <select 
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value as SortMode)}
                                    className="appearance-none bg-zinc-900/50 border border-white/5 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-zinc-300 focus:outline-none hover:bg-zinc-800 transition-colors cursor-pointer focus:border-indigo-500/50"
                                >
                                    <option value="added">Recently Added</option>
                                    <option value="name">Name (A-Z)</option>
                                    <option value="rating">Highest Rated</option>
                                    <option value="release">Release Date</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-6 md:p-8">
                <div className="max-w-[1920px] mx-auto space-y-10">
                    
                    {/* 1. HORIZON RAIL (Only if items exist & no search) */}
                    {!searchQuery && horizonData.length > 0 && filter !== 'movie' && (
                        <div className="animate-fade-in-up">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ArrowUpRight className="w-4 h-4 text-indigo-500" /> On The Horizon
                            </h3>
                            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6 md:mx-0 md:px-0">
                                {horizonData.map(({ show, ep }) => (
                                    <div key={`${show.id}-${ep.id}`} onClick={() => setSelectedItem(show)}>
                                        <HorizonCard item={show} episode={ep} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. MAIN COLLECTION */}
                    <div>
                        {/* Section Title (Only if Horizon is present to separate) */}
                        {!searchQuery && horizonData.length > 0 && filter !== 'movie' && (
                            <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4 mt-8 flex items-center gap-2">
                                <List className="w-4 h-4" /> All Items
                            </h3>
                        )}

                        {visibleItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 opacity-40">
                                <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800 shadow-xl">
                                    <Filter className="w-10 h-10 text-zinc-600" />
                                </div>
                                <h3 className="text-lg font-bold text-zinc-400 uppercase tracking-widest">No Items Found</h3>
                                <p className="text-sm text-zinc-600 mt-2">Try adjusting your filters or search query.</p>
                            </div>
                        ) : (
                            layout === 'grid' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-6 gap-y-10 pb-20">
                                    {visibleItems.map(item => (
                                        <LibraryCard 
                                            key={item.id} 
                                            item={item} 
                                            onClick={() => setSelectedItem(item)} 
                                            onRemove={() => setDeleteId(item.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 pb-20 max-w-5xl mx-auto">
                                    {visibleItems.map(item => (
                                        <LibraryRow 
                                            key={item.id} 
                                            item={item} 
                                            onClick={() => setSelectedItem(item)} 
                                            onRemove={() => setDeleteId(item.id)}
                                        />
                                    ))}
                                </div>
                            )
                        )}

                        {/* Infinite Scroll Trigger */}
                        {visibleItems.length < displayList.length && (
                            <div ref={loaderRef} className="py-10 flex justify-center w-full">
                                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin opacity-50" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}
            
            {/* Details Modal */}
            {selectedItem && (
                <ShowDetailsModal 
                    isOpen={!!selectedItem} 
                    onClose={() => setSelectedItem(null)} 
                    showId={selectedItem.id} 
                    mediaType={selectedItem.media_type} 
                />
            )}

            {/* Delete Confirmation */}
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
