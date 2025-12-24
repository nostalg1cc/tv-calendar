
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    LayoutGrid, List as ListIcon, Search, Star, Trash2, 
    Filter, Clock, ChevronDown, Check, Tv, Film, 
    MoreHorizontal, ArrowUpRight, AlertCircle, X, Loader2,
    Calendar, Layers
} from 'lucide-react';
import { useStore } from '../store';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import { TVShow, Episode } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import { format, parseISO, isToday, isTomorrow, isSameDay } from 'date-fns';
import { useCalendarEpisodes } from '../hooks/useQueries';

// --- TYPES ---

type SortMode = 'added' | 'name' | 'rating' | 'release';
type FilterMode = 'all' | 'tv' | 'movie';

// --- HELPER COMPONENTS ---

interface AgendaItemProps {
    date: Date;
    items: { show: TVShow, episodes: Episode[] }[];
    onSelect: (show: TVShow) => void;
}

const AgendaItem: React.FC<AgendaItemProps> = ({ 
    date, 
    items, 
    onSelect 
}) => {
    const dateLabel = isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEE • MMM d');
    const isTodayHighlight = isToday(date);

    return (
        <div className="flex flex-col">
            <div className={`sticky top-0 z-10 py-1.5 px-4 text-[10px] font-black uppercase tracking-widest border-y border-white/5 flex justify-between items-center ${isTodayHighlight ? 'bg-indigo-900/20 text-indigo-300' : 'bg-[#09090b] text-zinc-500'}`}>
                <span>{dateLabel}</span>
                {isTodayHighlight && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />}
            </div>
            
            <div className="flex flex-col divide-y divide-white/5 bg-black/20">
                {items.map(({ show, episodes }, idx) => {
                    const firstEp = episodes[0];
                    const isMovie = show.media_type === 'movie';
                    const poster = getImageUrl(show.poster_path);
                    
                    return (
                        <div 
                            key={`${show.id}-${idx}`}
                            onClick={() => onSelect(show)}
                            className="group flex gap-3 p-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                            <div className="w-10 h-14 shrink-0 bg-zinc-900 overflow-hidden relative border border-white/5">
                                <img src={poster} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h4 className="text-xs font-bold text-zinc-300 group-hover:text-white truncate transition-colors leading-tight mb-1">{show.name}</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {isMovie ? (
                                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">Movie</span>
                                    ) : (
                                        episodes.length === 1 ? (
                                            <span className="text-[9px] font-mono text-zinc-500">S{firstEp.season_number} E{firstEp.episode_number}</span>
                                        ) : (
                                            <span className="text-[9px] font-mono text-indigo-300 bg-indigo-500/10 px-1 rounded border border-indigo-500/20">{episodes.length} Episodes</span>
                                        )
                                    )}
                                    {/* Time if available */}
                                    {firstEp.air_date && firstEp.air_date.includes('T') && (
                                        <span className="text-[9px] font-mono text-zinc-600 border-l border-zinc-800 pl-1.5">
                                            {format(parseISO(firstEp.air_date), 'HH:mm')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

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
    const [displayLimit, setDisplayLimit] = useState(30);
    const loaderRef = useRef<HTMLDivElement>(null);

    // Data for Agenda (Next 30 days)
    // We use a window around "Today" to find upcoming stuff
    const today = useMemo(() => new Date(), []);
    const { episodes: calendarEpisodes } = useCalendarEpisodes(today);

    // --- COMPUTED DATA ---

    // 1. Process "Up Next" Agenda Data
    const agendaGroups = useMemo(() => {
        // Filter future episodes present in watchlist
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const futureEps = calendarEpisodes.filter(ep => {
            if (!ep.air_date) return false;
            const d = parseISO(ep.air_date.split('T')[0]);
            return d >= now;
        });

        // Group by Date -> Show
        const groups: Record<string, Record<number, { show: TVShow, episodes: Episode[] }>> = {};
        
        futureEps.forEach(ep => {
            const dateKey = ep.air_date.split('T')[0];
            const showId = ep.show_id;
            const originalShow = watchlist.find(s => s.id === showId);
            
            if (!originalShow) return;

            if (!groups[dateKey]) groups[dateKey] = {};
            if (!groups[dateKey][showId]) {
                groups[dateKey][showId] = { show: originalShow, episodes: [] };
            }
            groups[dateKey][showId].episodes.push(ep);
        });

        // Convert to array and sort
        return Object.entries(groups)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([dateStr, showMap]) => ({
                date: parseISO(dateStr),
                items: Object.values(showMap)
            }));
    }, [calendarEpisodes, watchlist]);

    // 2. Main List Processing
    const processedItems = useMemo(() => {
        let items = [...watchlist];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q));
        }

        if (filter === 'tv') items = items.filter(i => i.media_type === 'tv');
        if (filter === 'movie') items = items.filter(i => i.media_type === 'movie');

        return items.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'rating') return b.vote_average - a.vote_average;
            if (sort === 'release') return (b.first_air_date || '').localeCompare(a.first_air_date || '');
            // 'added' (reverse order usually implies newest first if array is appended)
            return 0; 
        });
    }, [watchlist, searchQuery, filter, sort]);

    const displayList = useMemo(() => {
        return sort === 'added' ? [...processedItems].reverse() : processedItems;
    }, [processedItems, sort]);

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setDisplayLimit(prev => Math.min(prev + 30, displayList.length));
            }
        }, { threshold: 0.1 });

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [displayList.length]);

    // Reset when filters change
    useEffect(() => { setDisplayLimit(30); }, [filter, sort, searchQuery]);

    const visibleItems = displayList.slice(0, displayLimit);

    const handleLayoutChange = (newLayout: 'grid' | 'list') => {
        setLayout(newLayout);
        updateSettings({ v2LibraryLayout: newLayout });
    };

    return (
        <div className="flex-1 flex h-full bg-[#020202] overflow-hidden font-sans text-zinc-100">
            
            {/* LEFT SIDEBAR: UP NEXT AGENDA (Desktop) */}
            <aside className="hidden lg:flex flex-col w-80 shrink-0 border-r border-white/5 bg-[#050505]">
                <div className="h-14 flex items-center px-4 border-b border-white/5 bg-[#050505] sticky top-0 z-20">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> Up Next
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {agendaGroups.length > 0 ? (
                        <div className="pb-10">
                            {agendaGroups.map((group, i) => (
                                <AgendaItem 
                                    key={i} 
                                    date={group.date} 
                                    items={group.items} 
                                    onSelect={setSelectedItem} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-zinc-600 gap-2">
                            <Layers className="w-8 h-8 opacity-20" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">No Upcoming Episodes</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                
                {/* TOOLBAR */}
                <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/5 bg-[#020202]/90 backdrop-blur-sm sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                         <span className="text-sm font-black text-white uppercase tracking-tight hidden sm:block">Library <span className="text-zinc-600">/</span> {watchlist.length}</span>
                         
                         {/* Mobile Filter Toggle could go here if needed, keeping it simple for now */}
                         
                         {/* Search */}
                         <div className="relative group">
                             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-white" />
                             <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter..." 
                                className="bg-zinc-900 border border-zinc-800 rounded text-xs text-white pl-8 pr-3 py-1.5 w-32 focus:w-48 transition-all focus:outline-none focus:border-zinc-600"
                             />
                         </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                            {(['all', 'tv', 'movie'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setFilter(m)}
                                    className={`px-3 py-1 rounded-[2px] text-[10px] font-bold uppercase tracking-wider transition-all ${filter === m ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    {m}
                                </button>
                            ))}
                         </div>
                         <div className="h-4 w-px bg-white/10" />
                         <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                             <button onClick={() => handleLayoutChange('grid')} className={`p-1.5 rounded-[2px] ${layout === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                             <button onClick={() => handleLayoutChange('list')} className={`p-1.5 rounded-[2px] ${layout === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><ListIcon className="w-3.5 h-3.5" /></button>
                         </div>
                    </div>
                </header>

                {/* LIST */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020202]">
                    {visibleItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 opacity-40">
                            <Filter className="w-12 h-12 text-zinc-700 mb-4" />
                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No Matches</h3>
                        </div>
                    ) : (
                        layout === 'grid' ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-px bg-zinc-900 border-b border-zinc-900">
                                {visibleItems.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => setSelectedItem(item)}
                                        className="group relative aspect-[2/3] bg-black cursor-pointer overflow-hidden"
                                    >
                                        <img 
                                            src={getImageUrl(item.poster_path)} 
                                            alt={item.name} 
                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                                            loading="lazy" 
                                        />
                                        
                                        {/* Minimal Hover Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                                            <h4 className="text-[11px] font-bold text-white leading-tight mb-1 line-clamp-2">{item.name}</h4>
                                            <div className="flex items-center justify-between">
                                                 <span className="text-[9px] font-mono text-zinc-400">{item.first_air_date?.split('-')[0]}</span>
                                                 {item.vote_average > 0 && (
                                                     <span className="flex items-center gap-0.5 text-[9px] font-bold text-yellow-500">
                                                         <Star className="w-2.5 h-2.5 fill-current" /> {item.vote_average.toFixed(1)}
                                                     </span>
                                                 )}
                                            </div>
                                        </div>

                                        {/* Quick Remove (Corner) */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }}
                                            className="absolute top-1 right-1 p-1.5 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-white/5">
                                {visibleItems.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => setSelectedItem(item)}
                                        className="group flex items-center gap-4 p-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                                    >
                                        <div className="w-10 h-14 bg-zinc-900 shrink-0 border border-white/5">
                                            <img src={getImageUrl(item.poster_path)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" alt="" loading="lazy" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-zinc-300 group-hover:text-white truncate">{item.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-mono text-zinc-500">{item.first_air_date?.split('-')[0] || 'TBA'}</span>
                                                <span className={`text-[9px] px-1 rounded border ${item.media_type === 'movie' ? 'border-pink-900/50 text-pink-500' : 'border-indigo-900/50 text-indigo-500'} uppercase font-bold tracking-wider`}>
                                                    {item.media_type === 'movie' ? 'Movie' : 'Series'}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }}
                                            className="p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                    
                    {/* Infinite Scroll Trigger */}
                    {visibleItems.length < displayList.length && (
                        <div ref={loaderRef} className="py-8 flex justify-center w-full">
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin opacity-50" />
                        </div>
                    )}
                </div>
            </main>

            {/* MOBILE: UP NEXT DRAWER/TAB could go here, but keeping cleaner for now. 
                Users can use Calendar or Agenda for up next on mobile. 
            */}

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
                    <div className="bg-[#09090b] border border-white/10 p-6 rounded-none w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Remove Item?</h3>
                        <p className="text-xs text-zinc-500 font-medium mb-6">This will remove it from your library and calendar tracking.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors border border-white/5">Cancel</button>
                            <button onClick={() => { if(deleteId) removeFromWatchlist(deleteId); setDeleteId(null); }} className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default V2Library;
