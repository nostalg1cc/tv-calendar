
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LayoutGrid, List as ListIcon, Search, Filter, Tv, Film, Trash2, Check, Eye, EyeOff, SlidersHorizontal, ArrowUpDown, X, ChevronDown } from 'lucide-react';
import { useStore } from '../store';
import { getImageUrl } from '../services/tmdb';
import { TVShow } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import V2ShowDetailsModal from './V2ShowDetailsModal';
import RatingBadge from '../components/RatingBadge';
import toast from 'react-hot-toast';

const V2Library: React.FC = () => {
    const { watchlist, removeFromWatchlist, settings, history, toggleWatched } = useStore();
    
    // UI State
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'tv' | 'movie'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'watched' | 'unwatched'>('all');
    const [sort, setSort] = useState<'date_added' | 'rating' | 'name' | 'release'>('date_added');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [selectedItem, setSelectedItem] = useState<TVShow | null>(null);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    // Infinite Scroll State
    const [displayLimit, setDisplayLimit] = useState(24);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Optimization: Create a set of fully watched or in-progress shows for fast lookup
    const watchedShowIds = useMemo(() => {
        const ids = new Set<number>();
        Object.keys(history).forEach(key => {
            if (history[key].is_watched) {
                const parts = key.split('-');
                if (parts[1]) ids.add(parseInt(parts[1]));
            }
        });
        return ids;
    }, [history]);

    // Filtering Logic
    const filtered = useMemo(() => {
        let items = [...watchlist];
        
        if (typeFilter !== 'all') {
            items = items.filter(i => i.media_type === typeFilter);
        }
        
        if (statusFilter !== 'all') {
            items = items.filter(item => {
                const isWatched = watchedShowIds.has(item.id);
                return statusFilter === 'watched' ? isWatched : !isWatched;
            });
        }
        
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q));
        }

        return items.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
            if (sort === 'release') return (b.first_air_date || '').localeCompare(a.first_air_date || '');
            // date_added fallback (reverse array index)
            return watchlist.indexOf(b) - watchlist.indexOf(a);
        });
    }, [watchlist, typeFilter, statusFilter, search, sort, watchedShowIds]);

    // Lazy Loading Effect
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setDisplayLimit((prev) => Math.min(prev + 24, filtered.length));
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [filtered.length, displayLimit]);

    // Reset limit when filters change
    useEffect(() => {
        setDisplayLimit(24);
        // Scroll top on filter change for better UX
        const container = document.getElementById('library-scroll-container');
        if (container) container.scrollTop = 0;
    }, [typeFilter, statusFilter, search, sort]);

    // Helpers
    const visibleItems = filtered.slice(0, displayLimit);
    const stats = useMemo(() => ({
        total: watchlist.length,
        tv: watchlist.filter(i => i.media_type === 'tv').length,
        movie: watchlist.filter(i => i.media_type === 'movie').length
    }), [watchlist]);

    // --- Sub-components ---

    const FilterPill = ({ active, label, onClick, icon: Icon }: any) => (
        <button 
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap
                ${active 
                    ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]' 
                    : 'bg-zinc-900/50 text-zinc-500 border-white/5 hover:border-white/20 hover:text-zinc-300'}
            `}
        >
            {Icon && <Icon className="w-3 h-3" />}
            {label}
        </button>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-hidden relative">
            
            {/* --- STICKY HEADER --- */}
            <div className="z-30 bg-[#020202]/95 backdrop-blur-xl border-b border-white/5 sticky top-0 flex flex-col">
                
                {/* Top Row: Title & Search */}
                <div className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4 h-16">
                    {/* Left: Title or Mobile Search Input */}
                    {isMobileSearchOpen ? (
                         <div className="flex-1 flex items-center animate-fade-in gap-2">
                             <Search className="w-4 h-4 text-zinc-500" />
                             <input 
                                autoFocus
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Filter titles..."
                                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600 h-full"
                             />
                             <button onClick={() => { setSearch(''); setIsMobileSearchOpen(false); }} className="p-2 text-zinc-500">
                                 <X className="w-4 h-4" />
                             </button>
                         </div>
                    ) : (
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-xl font-black text-white tracking-tight uppercase">Library</h1>
                            <span className="text-xs font-mono text-zinc-600 hidden sm:inline-block">
                                {filtered.length} / {stats.total}
                            </span>
                        </div>
                    )}

                    {/* Right: Controls */}
                    {!isMobileSearchOpen && (
                        <div className="flex items-center gap-2">
                            {/* Desktop Search */}
                            <div className="hidden sm:flex items-center relative group mr-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-white transition-colors" />
                                <input 
                                    type="text" 
                                    value={search} 
                                    onChange={e => setSearch(e.target.value)} 
                                    placeholder="Filter..." 
                                    className="w-48 bg-zinc-900/50 border border-white/5 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-600 focus:w-64 focus:bg-zinc-900"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Mobile Search Toggle */}
                            <button onClick={() => setIsMobileSearchOpen(true)} className="sm:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900/50 rounded-full border border-white/5">
                                <Search className="w-4 h-4" />
                            </button>

                            <div className="w-px h-6 bg-white/10 mx-1" />

                            <button 
                                onClick={() => setView(view === 'grid' ? 'list' : 'grid')} 
                                className="p-2 text-zinc-400 hover:text-white bg-zinc-900/50 rounded-full border border-white/5 transition-colors"
                            >
                                {view === 'grid' ? <ListIcon className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Bottom Row: Scrollable Filters */}
                <div className="px-4 pb-3 md:px-8 overflow-x-auto hide-scrollbar flex items-center gap-2">
                    <FilterPill label="All" active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
                    <FilterPill label="Series" icon={Tv} active={typeFilter === 'tv'} onClick={() => setTypeFilter('tv')} />
                    <FilterPill label="Films" icon={Film} active={typeFilter === 'movie'} onClick={() => setTypeFilter('movie')} />
                    
                    <div className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />
                    
                    <FilterPill label="Unwatched" icon={EyeOff} active={statusFilter === 'unwatched'} onClick={() => setStatusFilter(statusFilter === 'unwatched' ? 'all' : 'unwatched')} />
                    <FilterPill label="Watched" icon={Eye} active={statusFilter === 'watched'} onClick={() => setStatusFilter(statusFilter === 'watched' ? 'all' : 'watched')} />
                    
                    <div className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />
                    
                    {/* Sort Dropdown as Pill */}
                    <div className="relative flex items-center">
                        <select 
                            value={sort} 
                            onChange={(e) => setSort(e.target.value as any)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-zinc-900/50 text-zinc-500 border-white/5 hover:border-white/20 hover:text-zinc-300`}>
                            <ArrowUpDown className="w-3 h-3" />
                            <span className="truncate max-w-[80px]">
                                {sort === 'date_added' ? 'Recent' : sort === 'rating' ? 'Rating' : sort === 'release' ? 'Release' : 'Name'}
                            </span>
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div 
                id="library-scroll-container"
                className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8"
            >
                {visibleItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 -mt-20">
                        <Filter className="w-16 h-16 text-zinc-700 mb-4 stroke-[1px]" />
                        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No Items Found</p>
                        {search && (
                             <button onClick={() => setSearch('')} className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 underline">Clear Search</button>
                        )}
                    </div>
                ) : (
                    <>
                        {view === 'grid' && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 md:gap-4">
                                {visibleItems.map(item => {
                                    const isWatched = watchedShowIds.has(item.id);
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setSelectedItem(item)}
                                            className="group relative aspect-[2/3] bg-zinc-900 rounded-lg overflow-hidden cursor-pointer border border-white/5 shadow-sm transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl hover:z-10 hover:border-white/20"
                                        >
                                            <img 
                                                src={getImageUrl(item.custom_poster_path || item.poster_path)} 
                                                className={`w-full h-full object-cover transition-all duration-500 ${isWatched ? 'grayscale opacity-50' : 'opacity-90 group-hover:opacity-100'}`} 
                                                loading="lazy" 
                                                alt="" 
                                            />
                                            
                                            {/* Top Icons */}
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-20">
                                                 {settings.showCalendarRatings && <RatingBadge rating={item.vote_average} className="static opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            </div>
                                            
                                            {isWatched && (
                                                <div className="absolute top-2 left-2 bg-black/60 p-1 rounded-full backdrop-blur-md z-20 border border-white/10">
                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                </div>
                                            )}

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 z-10">
                                                <h4 className="text-[11px] font-bold text-white line-clamp-2 leading-tight mb-1 drop-shadow-md">{item.name}</h4>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-mono text-zinc-400">{item.first_air_date?.split('-')[0]}</span>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleWatched({ tmdb_id: item.id, media_type: 'movie', is_watched: isWatched }); }}
                                                            className={`transition-colors p-1 rounded hover:bg-white/20 ${isWatched ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
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
                            <div className="flex flex-col gap-2 max-w-5xl mx-auto">
                                {visibleItems.map(item => {
                                    const isWatched = watchedShowIds.has(item.id);
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setSelectedItem(item)}
                                            className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-900 hover:border-white/10 cursor-pointer group transition-all"
                                        >
                                            <div className="w-12 h-16 bg-zinc-900 shrink-0 relative rounded-lg overflow-hidden border border-white/5">
                                                <img src={getImageUrl(item.custom_poster_path || item.poster_path)} className={`w-full h-full object-cover ${isWatched ? 'grayscale opacity-50' : ''}`} loading="lazy" alt="" />
                                                {isWatched && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                        <Check className="w-5 h-5 text-emerald-500 drop-shadow-lg" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className={`text-sm font-bold truncate ${isWatched ? 'text-zinc-500' : 'text-zinc-200 group-hover:text-white'}`}>{item.name}</h4>
                                                    {item.vote_average > 0 && <span className="text-[10px] text-yellow-500 font-bold hidden sm:inline">★ {item.vote_average.toFixed(1)}</span>}
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                                                    <span className={`px-1.5 py-0.5 rounded border ${item.media_type === 'movie' ? 'border-pink-500/20 text-pink-400/80 bg-pink-500/5' : 'border-blue-500/20 text-blue-400/80 bg-blue-500/5'}`}>
                                                        {item.media_type === 'movie' ? 'Film' : 'Series'}
                                                    </span>
                                                    <span className="font-mono">{item.first_air_date?.split('-')[0]}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 sm:px-4">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleWatched({ tmdb_id: item.id, media_type: 'movie', is_watched: isWatched }); }} 
                                                    className="p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white"
                                                    title={isWatched ? "Mark Unwatched" : "Mark Watched"}
                                                >
                                                    {isWatched ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); if(confirm("Remove?")) removeFromWatchlist(item.id); }} 
                                                    className="p-2 rounded-full hover:bg-red-500/10 text-zinc-500 hover:text-red-400"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        {/* Sentinel for Infinite Scroll */}
                        <div ref={observerTarget} className="h-20 w-full flex items-center justify-center pointer-events-none">
                            {visibleItems.length < filtered.length && (
                                <div className="w-2 h-2 bg-zinc-800 rounded-full animate-ping" />
                            )}
                        </div>
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
