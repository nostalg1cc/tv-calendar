
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    LayoutGrid, List as ListIcon, Search, Star, Trash2, 
    Filter, ChevronDown, Tv, Film, 
    ArrowUpRight, X, Loader2,
    Calendar, Layers, Clock
} from 'lucide-react';
import { useStore } from '../store';
import { getImageUrl } from '../services/tmdb';
import { TVShow, Episode } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { useCalendarEpisodes } from '../hooks/useQueries';

// --- TYPES ---

type FilterMode = 'all' | 'tv' | 'movie';
type ViewMode = 'grid' | 'list';

// --- SIDEBAR AGENDA COMPONENT ---

const AgendaSidebar = ({ 
    episodes, 
    watchlist,
    onSelect 
}: { 
    episodes: Episode[], 
    watchlist: TVShow[],
    onSelect: (show: TVShow) => void 
}) => {
    const grouped = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);

        // 1. Filter future episodes
        const future = episodes.filter(ep => {
            if (!ep.air_date) return false;
            return parseISO(ep.air_date) >= today;
        });

        // 2. Group by Date
        const byDate: Record<string, Episode[]> = {};
        future.forEach(ep => {
            if (!byDate[ep.air_date]) byDate[ep.air_date] = [];
            byDate[ep.air_date].push(ep);
        });

        // 3. Sort dates and structure
        return Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, eps]) => {
                // Group by Show within Date
                const byShow: Record<number, { show: TVShow, eps: Episode[] }> = {};
                eps.forEach(ep => {
                    const s = watchlist.find(w => w.id === ep.show_id);
                    if (s) {
                        if (!byShow[s.id]) byShow[s.id] = { show: s, eps: [] };
                        byShow[s.id].eps.push(ep);
                    }
                });
                return { 
                    date: parseISO(date), 
                    items: Object.values(byShow) 
                };
            });
    }, [episodes, watchlist]);

    if (grouped.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 p-8 text-center opacity-50">
                <Calendar className="w-8 h-8 mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest">Nothing Upcoming</p>
                <p className="text-[10px] mt-1">Add ongoing shows to populate your agenda.</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar pb-10">
            {grouped.map((group) => {
                const isDayToday = isToday(group.date);
                const label = isDayToday ? 'Today' : isTomorrow(group.date) ? 'Tomorrow' : format(group.date, 'EEEE, MMM do');
                
                return (
                    <div key={group.date.toISOString()} className="flex flex-col">
                        <div className={`sticky top-0 z-10 px-4 py-2 border-y border-white/5 backdrop-blur-md flex items-center justify-between ${isDayToday ? 'bg-indigo-900/20 text-indigo-300' : 'bg-[#050505] text-zinc-500'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                            {isDayToday && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                        </div>
                        <div className="flex flex-col">
                            {group.items.map(({ show, eps }) => (
                                <button
                                    key={show.id}
                                    onClick={() => onSelect(show)}
                                    className="group flex gap-3 p-3 text-left hover:bg-white/[0.03] transition-colors border-b border-white/[0.02] last:border-0"
                                >
                                    <div className="w-10 h-14 bg-zinc-900 shrink-0 relative overflow-hidden border border-white/5">
                                        <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" loading="lazy" alt="" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                        <h4 className="text-xs font-bold text-zinc-300 group-hover:text-white truncate transition-colors">{show.name}</h4>
                                        <div className="flex items-center gap-2">
                                            {show.media_type === 'movie' ? (
                                                <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-tight">Movie Release</span>
                                            ) : (
                                                <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {eps.length > 1 
                                                        ? `${eps.length} Episodes`
                                                        : `S${eps[0].season_number} E${eps[0].episode_number}`
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ArrowUpRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 opacity-0 group-hover:opacity-100 transition-all self-center" />
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- MAIN LIBRARY COMPONENT ---

const V2Library: React.FC = () => {
    const { watchlist, removeFromWatchlist, settings, updateSettings } = useStore();
    
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterMode>('all');
    const [layout, setLayout] = useState<ViewMode>(settings.v2LibraryLayout === 'list' ? 'list' : 'grid');
    const [selectedItem, setSelectedItem] = useState<TVShow | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Infinite Scroll
    const [displayLimit, setDisplayLimit] = useState(40);
    const loaderRef = useRef<HTMLDivElement>(null);

    // Data for Agenda (Next 30 days window)
    const { episodes } = useCalendarEpisodes(new Date());

    // --- Process List ---
    const processedItems = useMemo(() => {
        let items = [...watchlist];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q));
        }

        if (filter === 'tv') items = items.filter(i => i.media_type === 'tv');
        if (filter === 'movie') items = items.filter(i => i.media_type === 'movie');

        // Default sort: Added (Reverse)
        return items.reverse();
    }, [watchlist, searchQuery, filter]);

    const visibleItems = processedItems.slice(0, displayLimit);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setDisplayLimit(prev => Math.min(prev + 40, processedItems.length));
            }
        }, { threshold: 0.1 });
        
        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [processedItems.length]);

    // Reset display limit when filter changes
    useEffect(() => { setDisplayLimit(40); }, [filter, searchQuery]);

    const toggleLayout = () => {
        const next = layout === 'grid' ? 'list' : 'grid';
        setLayout(next);
        updateSettings({ v2LibraryLayout: next });
    };

    return (
        <div className="flex-1 flex h-full bg-[#020202] overflow-hidden font-sans text-zinc-100">
            
            {/* AGENDA SIDEBAR (Desktop) */}
            <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-white/5 bg-[#050505]">
                <div className="h-14 flex items-center px-4 border-b border-white/5 shrink-0">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" /> Agenda
                    </h3>
                </div>
                <AgendaSidebar episodes={episodes} watchlist={watchlist} onSelect={setSelectedItem} />
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 relative bg-[#020202]">
                
                {/* TOOLBAR */}
                <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/5 bg-[#020202]/80 backdrop-blur-sm sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <h1 className="text-sm font-black text-white uppercase tracking-tight hidden sm:block">
                            Library <span className="text-zinc-600 font-medium ml-1">{watchlist.length}</span>
                        </h1>
                        <div className="h-4 w-px bg-white/10 hidden sm:block" />
                        
                        <div className="relative group">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-white transition-colors" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter collection..." 
                                className="bg-zinc-900/50 border border-white/5 rounded text-xs text-white pl-8 pr-3 py-1.5 w-40 focus:w-60 focus:bg-zinc-900 focus:border-zinc-700 transition-all focus:outline-none placeholder:text-zinc-600"
                            />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-zinc-900/50 rounded border border-white/5 p-0.5">
                            {(['all', 'tv', 'movie'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setFilter(m)}
                                    className={`px-3 py-1 rounded-[1px] text-[10px] font-bold uppercase tracking-wider transition-all ${filter === m ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    {m === 'all' ? 'All' : m === 'tv' ? 'Series' : 'Film'}
                                </button>
                            ))}
                        </div>
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <button 
                            onClick={toggleLayout} 
                            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                            title={layout === 'grid' ? "Switch to List" : "Switch to Grid"}
                        >
                            {layout === 'grid' ? <ListIcon className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                        </button>
                    </div>
                </header>

                {/* SCROLLABLE LIST */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {visibleItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] opacity-30">
                            <Filter className="w-12 h-12 text-zinc-500 mb-4" />
                            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No Items Found</p>
                        </div>
                    ) : (
                        <div className={layout === 'grid' ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-px bg-zinc-900 border-b border-zinc-900' : 'flex flex-col divide-y divide-white/5'}>
                            {visibleItems.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => setSelectedItem(item)}
                                    className={`group relative cursor-pointer bg-[#050505] hover:z-10 ${layout === 'grid' ? 'aspect-[2/3] overflow-hidden' : 'flex items-center gap-4 p-3 hover:bg-white/[0.02]'}`}
                                >
                                    {/* POSTER */}
                                    <div className={layout === 'grid' ? 'absolute inset-0' : 'w-10 h-14 bg-zinc-900 shrink-0 border border-white/5'}>
                                        <img 
                                            src={getImageUrl(item.poster_path)} 
                                            alt={item.name} 
                                            className={`w-full h-full object-cover transition-all duration-500 ${layout === 'grid' ? 'opacity-60 group-hover:opacity-100 group-hover:scale-105' : 'opacity-80 group-hover:opacity-100'}`}
                                            loading="lazy" 
                                        />
                                        
                                        {/* GRID OVERLAY */}
                                        {layout === 'grid' && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                                                <h4 className="text-[11px] font-bold text-white leading-tight line-clamp-2 mb-1">{item.name}</h4>
                                                <div className="flex items-center justify-between text-[9px] font-medium text-zinc-400">
                                                    <span>{item.first_air_date?.split('-')[0] || 'TBA'}</span>
                                                    {item.vote_average > 0 && <span className="text-yellow-500 font-bold flex items-center gap-0.5"><Star className="w-2 h-2 fill-current" /> {item.vote_average.toFixed(1)}</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* LIST METADATA */}
                                    {layout === 'list' && (
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-zinc-300 group-hover:text-white truncate transition-colors">{item.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1 rounded border ${item.media_type === 'movie' ? 'text-pink-500 border-pink-900/30 bg-pink-900/10' : 'text-indigo-500 border-indigo-900/30 bg-indigo-900/10'}`}>
                                                    {item.media_type === 'movie' ? 'Movie' : 'Series'}
                                                </span>
                                                <span className="text-[10px] font-mono text-zinc-600">{item.first_air_date?.split('-')[0] || 'TBA'}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* QUICK REMOVE BUTTON */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }}
                                        className={`
                                            text-zinc-500 hover:text-red-500 transition-colors 
                                            ${layout === 'grid' ? 'absolute top-1 right-1 p-1.5 opacity-0 group-hover:opacity-100 bg-black/50 backdrop-blur-sm rounded' : 'p-2 opacity-0 group-hover:opacity-100'}
                                        `}
                                    >
                                        <Trash2 className={layout === 'grid' ? "w-3 h-3" : "w-4 h-4"} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Infinite Scroll Trigger */}
                    {visibleItems.length < processedItems.length && (
                        <div ref={loaderRef} className="py-10 flex justify-center w-full">
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin opacity-50" />
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            {selectedItem && (
                <ShowDetailsModal 
                    isOpen={!!selectedItem} 
                    onClose={() => setSelectedItem(null)} 
                    showId={selectedItem.id} 
                    mediaType={selectedItem.media_type} 
                />
            )}

            {deleteId && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteId(null)}>
                    <div className="bg-[#09090b] border border-white/10 p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Remove Item?</h3>
                        <p className="text-xs text-zinc-500 font-medium mb-6">This will remove it from your library and calendar tracking.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors border border-white/5">Cancel</button>
                            <button onClick={() => { if(deleteId) removeFromWatchlist(deleteId); setDeleteId(null); }} className="px-4 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 text-xs font-bold uppercase tracking-wider shadow-lg transition-colors">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default V2Library;
