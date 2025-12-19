
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, isSameMonth, addMonths, subMonths, addDays, isSameDay, isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, LayoutGrid, Check, Tv, Film, MonitorPlay, Eye, EyeOff, Calendar as CalendarIcon, Clock, Ticket, List as ListIcon, Smartphone, Layers, Search, X } from 'lucide-react';
import { useStore } from '../store';
import { useCalendarEpisodes } from '../hooks/useQueries';
import { Episode } from '../types';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import CalendarSearchModal from '../components/CalendarSearchModal';

interface V2CalendarProps {
    selectedDay: Date;
    onSelectDay: (date: Date) => void;
}

type ViewMode = 'grid' | 'cards' | 'list';

const V2Calendar: React.FC<V2CalendarProps> = ({ selectedDay, onSelectDay }) => {
    const { settings, updateSettings, history: interactions, toggleWatched, calendarDate, setCalendarDate } = useStore();
    
    const { episodes: rawEpisodes, isLoading, isRefetching } = useCalendarEpisodes(calendarDate);
    
    const episodes = useMemo(() => {
        const map: Record<string, Episode[]> = {};
        rawEpisodes.forEach(ep => {
            if (!ep.air_date) return;
            const date = ep.air_date; 
            if (!map[date]) map[date] = [];
            map[date].push(ep);
        });
        return map;
    }, [rawEpisodes]);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false); // Local Calendar Search
    
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (window.innerWidth < 768) return 'cards';
        return (settings.viewMode as ViewMode) || 'grid';
    });
    
    // Local filters
    const [showTV, setShowTV] = useState(true);
    const [showMovies, setShowMovies] = useState(true);
    const [showHidden, setShowHidden] = useState(false);

    const filterRef = useRef<HTMLDivElement>(null);
    const cardScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768 && viewMode === 'grid') {
                setViewMode('cards');
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [viewMode]);

    const handleViewChange = (mode: ViewMode) => {
        setViewMode(mode);
        updateSettings({ viewMode: mode });
    };

    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(calendarDate);
    
    const gridDays = useMemo(() => {
        return eachDayOfInterval({
            start: startOfWeek(monthStart),
            end: endOfWeek(addDays(startOfWeek(monthStart), 41))
        }).slice(0, 42);
    }, [monthStart]);

    const activeDays = useMemo(() => {
        return eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEps = episodes[dateKey] || [];
            return dayEps.some(ep => {
                if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
                if (settings.ignoreSpecials && ep.season_number === 0) return false;
                if (!showTV && !ep.is_movie) return false;
                if (!showMovies && ep.is_movie) return false;
                if (settings.hiddenItems.includes(ep.show_id) && !showHidden) return false;
                return true;
            });
        });
    }, [monthStart, monthEnd, episodes, settings, showTV, showMovies, showHidden]);

    useEffect(() => {
        if (isLoading) return;
        if ((viewMode === 'cards' || viewMode === 'list') && cardScrollRef.current) {
            const timer = setTimeout(() => {
                const todayEl = document.getElementById('v2-today-anchor');
                if (todayEl) {
                    todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [viewMode, calendarDate, isLoading]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
        };
        if (isFilterOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterOpen]);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getEpisodesForDay = (day: Date) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayEps = episodes[dateKey] || [];
        
        return dayEps.filter(ep => {
            if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
            if (settings.ignoreSpecials && ep.season_number === 0) return false;
            if (!showTV && !ep.is_movie) return false;
            if (!showMovies && ep.is_movie) return false;
            if (settings.hiddenItems.includes(ep.show_id) && !showHidden) return false;
            return true;
        });
    };

    const groupEpisodes = (episodes: Episode[]) => {
        const groups: Record<number, Episode[]> = {};
        const order: number[] = [];
        episodes.forEach(ep => {
            const id = ep.show_id || (ep.id * -1); 
            if (!groups[id]) {
                groups[id] = [];
                order.push(id);
            }
            groups[id].push(ep);
        });
        return order.map(id => groups[id]);
    };

    const cycleViewMode = () => {
        if (viewMode === 'grid') handleViewChange('cards');
        else if (viewMode === 'cards') handleViewChange('list');
        else handleViewChange('grid');
    };

    const FilterToggle = ({ label, active, onClick, icon: Icon }: any) => (
        <button 
            onClick={onClick}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${active ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${active ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">{label}</span>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${active ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-700'}`}>
                {active && <Check className="w-3 h-3" />}
            </div>
        </button>
    );

    // --- SUB-COMPONENTS ---

    const ReleaseBadge = ({ ep }: { ep: Episode }) => {
        if (!ep.is_movie) {
            return (
                 <span className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[9px] font-black text-white uppercase tracking-wider">
                    S{ep.season_number} • E{ep.episode_number}
                </span>
            );
        }

        const isTheatrical = ep.release_type === 'theatrical';
        return (
            <span className={`
                flex items-center gap-1.5 px-2 py-1 rounded border backdrop-blur-md text-[9px] font-black uppercase tracking-wider
                ${isTheatrical 
                    ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
            `}>
                {isTheatrical ? <Ticket className="w-3 h-3" /> : <MonitorPlay className="w-3 h-3" />}
                {isTheatrical ? 'Cinema' : 'Digital'}
            </span>
        );
    };

    const SingleEpisodeCell = ({ ep }: { ep: Episode }) => {
        const imageUrl = getImageUrl(ep.poster_path);
        const watchedKey = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
        const isWatched = interactions[watchedKey]?.is_watched;

        return (
            <div className="absolute inset-0 w-full h-full bg-[#050505] overflow-hidden group/cell-item">
                <div 
                    className="absolute inset-0 bg-cover bg-center blur-xl opacity-30 scale-110" 
                    style={{ backgroundImage: `url(${imageUrl})` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <img 
                        src={imageUrl} 
                        className={`h-full w-auto max-w-full object-contain shadow-2xl relative z-10 transition-all duration-300 ${isWatched ? 'grayscale opacity-50' : 'opacity-100'}`}
                        alt=""
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent z-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col justify-end h-full z-30 pointer-events-none">
                    <h4 className={`text-[10px] font-black uppercase tracking-tight leading-tight line-clamp-2 mb-1 drop-shadow-md ${isWatched ? 'text-zinc-500 line-through' : 'text-white'}`}>
                        {ep.show_name}
                    </h4>
                    <div className="flex items-center gap-1.5">
                        {ep.is_movie ? (
                             <span className={`text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 ${ep.release_type === 'theatrical' ? 'text-pink-400' : 'text-emerald-400'}`}>
                                {ep.release_type === 'theatrical' ? <Ticket className="w-2 h-2" /> : <MonitorPlay className="w-2 h-2" />}
                                {ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                            </span>
                        ) : (
                            <span className={`text-[9px] font-mono font-bold ${isWatched ? 'text-zinc-600' : 'text-zinc-300'}`}>
                                S{ep.season_number} E{ep.episode_number}
                            </span>
                        )}
                        {isWatched && <Check className="w-3 h-3 text-emerald-500" />}
                    </div>
                </div>
            </div>
        );
    };

    const GroupedEpisodeCell = ({ groups }: { groups: Episode[][] }) => {
        return (
            <div className="absolute inset-0 p-2 pt-8 flex flex-col gap-1.5">
                {groups.slice(0, 3).map((group, idx) => {
                    const first = group[0];
                    const count = group.length;
                    const posterSrc = getImageUrl(first.poster_path);
                    
                    const allWatched = group.every(ep => {
                        const key = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                        return interactions[key]?.is_watched;
                    });

                    return (
                        <div key={`${first.show_id}-${idx}`} className="flex items-center gap-2 group/item">
                            <div className="w-5 h-7 rounded-[2px] bg-zinc-900 overflow-hidden shrink-0 border border-white/5 relative">
                                <img src={posterSrc} className={`w-full h-full object-cover ${allWatched ? 'grayscale opacity-50' : ''}`} alt="" />
                                {allWatched && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Check className="w-3 h-3 text-emerald-500" /></div>}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={`text-[9px] font-bold truncate leading-none mb-0.5 ${allWatched ? 'text-zinc-600 line-through' : 'text-zinc-300 group-hover/item:text-white'}`}>
                                    {first.show_name}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    {first.is_movie ? (
                                        <span className={`text-[7px] font-black uppercase tracking-wider ${first.release_type === 'theatrical' ? 'text-pink-500' : 'text-emerald-500'}`}>
                                            {first.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                                        </span>
                                    ) : (
                                        count > 1 ? (
                                            <span className="text-[7px] font-bold bg-white/10 text-white px-1 rounded flex items-center gap-1">
                                                <Layers className="w-2 h-2" /> {count} EP
                                            </span>
                                        ) : (
                                            <span className="text-[7px] font-mono text-zinc-500">S{first.season_number} E{first.episode_number}</span>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {groups.length > 3 && (
                    <div className="mt-auto pt-1 border-t border-white/5">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block text-center">
                            +{groups.length - 3} MORE
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#020202]">
            {/* Header */}
            <header className="h-16 shrink-0 border-b border-white/5 flex items-center bg-[#050505]/80 z-[60] backdrop-blur-md sticky top-0">
                {viewMode === 'grid' && (
                    <div className="flex-1 flex flex-col justify-center px-6 border-r border-white/5 h-full min-w-[120px]">
                         <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none mb-1">{format(calendarDate, 'yyyy')}</span>
                         <span className="text-xl font-black text-white uppercase tracking-tighter leading-none">{format(calendarDate, 'MMMM')}</span>
                    </div>
                )}

                <div className="flex h-full ml-auto">
                    <button 
                        onClick={() => setCalendarDate(subMonths(calendarDate, 1))} 
                        className="w-14 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors border-l border-white/5"
                        title="Previous Month"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <button 
                        onClick={() => { setCalendarDate(new Date()); onSelectDay(new Date()); }} 
                        className="px-4 h-full flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-indigo-400 hover:bg-white/5 transition-colors border-l border-white/5"
                    >
                        Today
                    </button>

                    <button 
                        onClick={() => setCalendarDate(addMonths(calendarDate, 1))} 
                        className="w-14 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors border-l border-white/5"
                        title="Next Month"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex h-full border-l border-white/5">
                     <button
                        onClick={cycleViewMode}
                        className="w-14 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                        title="Toggle View"
                    >
                        {viewMode === 'grid' && <LayoutGrid className="w-5 h-5" />}
                        {viewMode === 'cards' && <Smartphone className="w-5 h-5" />}
                        {viewMode === 'list' && <ListIcon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="w-14 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors border-l border-white/5"
                        title="Search in Calendar"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex h-full relative" ref={filterRef}>
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`w-14 h-full flex items-center justify-center border-l border-white/5 transition-colors ${isFilterOpen ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                        title="Filters"
                    >
                        <Filter className="w-4 h-4" />
                    </button>

                     {isFilterOpen && (
                        <div className="absolute top-full right-4 mt-4 w-72 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-[100] animate-enter overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-zinc-900/50">
                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Filter className="w-3 h-3" /> View Options
                                </h4>
                            </div>
                            <div className="p-3 space-y-2">
                                <FilterToggle label="TV Series" icon={Tv} active={showTV} onClick={() => setShowTV(!showTV)} />
                                <FilterToggle label="Movies" icon={Film} active={showMovies} onClick={() => setShowMovies(!showMovies)} />
                                
                                <div className="h-px bg-white/5 my-1" />
                                
                                <FilterToggle label="Digital Releases Only" icon={MonitorPlay} active={settings.hideTheatrical} onClick={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })} />
                                <FilterToggle label="Show Hidden Items" icon={EyeOff} active={showHidden} onClick={() => setShowHidden(!showHidden)} />
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* --- GRID VIEW (DESKTOP DEFAULT) --- */}
            {viewMode === 'grid' && (
                <>
                    <div className="grid grid-cols-7 border-b border-white/5 bg-zinc-950/10 shrink-0">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] border-r border-white/5 last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0 bg-[#020202]">
                        {gridDays.map((day, idx) => {
                            const isTodayDate = isSameDay(day, new Date());
                            const isActive = isSameDay(day, selectedDay);
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const dayEps = getEpisodesForDay(day);
                            const groupedEps = groupEpisodes(dayEps);
                            const totalGroups = groupedEps.length;

                            return (
                                <div key={day.toISOString()} onClick={() => onSelectDay(day)} className={`relative border-r border-b border-white/5 flex flex-col group/cell overflow-hidden transition-all duration-300 cursor-pointer ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''} ${idx >= 35 ? 'border-b-0' : ''} ${isCurrentMonth ? 'bg-transparent' : 'bg-white/[0.01] opacity-20'} ${isActive ? 'bg-white/[0.04]' : 'hover:z-10 hover:bg-white/[0.02]'}`}>
                                    <div className="absolute top-2 right-2 z-50">
                                        <span className={`text-[10px] font-mono font-black tracking-tighter px-1.5 py-0.5 rounded ${isTodayDate ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : isCurrentMonth ? (isActive ? 'text-white' : 'text-zinc-600 group-hover/cell:text-zinc-300') : 'text-zinc-800'} transition-colors`}>{format(day, 'dd')}</span>
                                    </div>
                                    
                                    {totalGroups === 1 && groupedEps[0].length === 1 ? (
                                        <SingleEpisodeCell ep={groupedEps[0][0]} />
                                    ) : totalGroups > 0 ? (
                                        <GroupedEpisodeCell groups={groupedEps} />
                                    ) : null}
                                    
                                    {isActive && <div className="absolute inset-0 border-[2px] border-indigo-500/80 pointer-events-none z-40 shadow-[inset_0_0_15px_rgba(99,102,241,0.1)]" />}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* --- CARD VIEW (FEED / MOBILE DEFAULT) --- */}
            {viewMode === 'cards' && (
                <div 
                    ref={cardScrollRef}
                    className="flex-1 overflow-y-auto custom-scrollbar"
                >
                    {activeDays.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-30">
                            <CalendarIcon className="w-16 h-16 text-zinc-500 mb-4" />
                            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No Events Found</p>
                        </div>
                    ) : (
                        <div className="pb-32 pt-0">
                            {activeDays.map(day => {
                                const dayEps = getEpisodesForDay(day);
                                const isTodayDate = isToday(day);
                                const groupedEps = groupEpisodes(dayEps);
                                
                                return (
                                    <div 
                                        key={day.toISOString()} 
                                        id={isTodayDate ? 'v2-today-anchor' : undefined}
                                        className="scroll-mt-32"
                                    >
                                        <div className="sticky top-0 z-40 bg-[#020202]/95 backdrop-blur-xl border-b border-white/5 py-2 px-6 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xl font-black tracking-tighter ${isTodayDate ? 'text-indigo-400' : 'text-white'}`}>{format(day, 'dd')}</span>
                                                <div className="flex flex-col leading-none">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isTodayDate ? 'text-indigo-500' : 'text-zinc-500'}`}>{format(day, 'EEEE')}</span>
                                                    <span className="text-[10px] text-zinc-600 font-mono uppercase">{format(day, 'MMM yyyy')}</span>
                                                </div>
                                            </div>
                                            {isTodayDate && <span className="text-[9px] font-bold bg-indigo-600 text-white px-2 py-1 rounded uppercase tracking-wide">Today</span>}
                                        </div>

                                        <div className="flex flex-col gap-px bg-zinc-900">
                                            {groupedEps.map((group, groupIdx) => {
                                                const firstEp = group[0];
                                                const bannerUrl = getBackdropUrl(firstEp.show_backdrop_path || firstEp.still_path || firstEp.poster_path);
                                                
                                                const allWatched = group.every(ep => {
                                                    const key = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                                                    return interactions[key]?.is_watched;
                                                });

                                                return (
                                                    <div 
                                                        key={`${firstEp.show_id}-${groupIdx}`} 
                                                        onClick={() => onSelectDay(day)}
                                                        className={`
                                                            relative w-full bg-[#09090b] group transition-all duration-300
                                                            ${allWatched ? 'opacity-60 grayscale' : ''}
                                                        `}
                                                    >
                                                        {/* Full Width Banner */}
                                                        <div className="w-full aspect-[21/9] sm:aspect-[3/1] relative overflow-hidden">
                                                            <img src={bannerUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/20 to-transparent" />
                                                            <div className="absolute top-3 right-3">
                                                                <ReleaseBadge ep={firstEp} />
                                                            </div>
                                                            <div className="absolute bottom-3 left-4">
                                                                <h3 className="text-xl sm:text-2xl font-black text-white leading-none drop-shadow-md">{firstEp.show_name}</h3>
                                                            </div>
                                                        </div>

                                                        {/* Episode List in Card */}
                                                        <div className="px-4 pb-4">
                                                            <div className="space-y-1">
                                                                {group.map(ep => {
                                                                    const watchedKey = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                                                                    const isWatched = interactions[watchedKey]?.is_watched;
                                                                    
                                                                    return (
                                                                        <div key={ep.id} className="flex items-center justify-between gap-4 py-2 border-t border-white/5 first:border-t-0">
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-2">
                                                                                    {!ep.is_movie && <span className="text-[10px] font-mono font-bold text-zinc-500">S{ep.season_number} E{ep.episode_number}</span>}
                                                                                    <span className="text-sm text-zinc-300 font-medium truncate">{ep.name}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                    <Clock className="w-3 h-3 text-zinc-500" />
                                                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                                                                        {format(new Date(ep.air_date), 'h:mm a')}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <button 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (ep.show_id) {
                                                                                        toggleWatched({
                                                                                            tmdb_id: ep.show_id,
                                                                                            media_type: ep.is_movie ? 'movie' : 'episode',
                                                                                            season_number: ep.season_number,
                                                                                            episode_number: ep.episode_number,
                                                                                            is_watched: isWatched
                                                                                        });
                                                                                    }
                                                                                }}
                                                                                className={`
                                                                                    w-8 h-8 rounded-full flex items-center justify-center transition-all border
                                                                                    ${isWatched ? 'bg-zinc-800 text-emerald-500 border-zinc-700' : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white hover:text-black'}
                                                                                `}
                                                                            >
                                                                                <Check className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        }
                        </div>
                    )}
                </div>
            )}

            {/* --- LIST VIEW (COMPACT) --- */}
            {viewMode === 'list' && (
                <div 
                    ref={cardScrollRef}
                    className="flex-1 overflow-y-auto custom-scrollbar bg-[#020202]"
                >
                    {activeDays.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-30">
                            <ListIcon className="w-16 h-16 text-zinc-500 mb-4" />
                            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Empty List</p>
                        </div>
                    ) : (
                        <div className="pb-32">
                            {activeDays.map(day => {
                                const eps = getEpisodesForDay(day);
                                const isTodayDate = isToday(day);
                                
                                return (
                                    <div 
                                        key={day.toISOString()} 
                                        id={isTodayDate ? 'v2-today-anchor' : undefined}
                                        className="scroll-mt-32"
                                    >
                                        <div className="sticky top-0 z-40 bg-[#020202] border-b border-white/5 py-2 px-4 flex items-center gap-4">
                                            <span className={`text-sm font-black w-8 text-center ${isTodayDate ? 'text-indigo-500' : 'text-zinc-500'}`}>{format(day, 'dd')}</span>
                                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{format(day, 'EEEE')}</span>
                                            {isTodayDate && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full ml-auto shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                                        </div>

                                        <div className="divide-y divide-white/5">
                                            {eps.map(ep => {
                                                const watchedKey = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                                                const isWatched = interactions[watchedKey]?.is_watched;
                                                const posterSrc = (settings.useSeason1Art && ep.season1_poster_path) ? ep.season1_poster_path : ep.poster_path;

                                                return (
                                                    <div 
                                                        key={`${ep.show_id}-${ep.id}`}
                                                        onClick={() => onSelectDay(day)}
                                                        className={`group flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors ${isWatched ? 'opacity-40' : ''}`}
                                                    >
                                                        <div className="w-10 h-14 bg-zinc-900 rounded border border-white/10 shrink-0 overflow-hidden">
                                                            <img src={getImageUrl(posterSrc)} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <h4 className="text-sm font-bold text-white truncate">{ep.show_name}</h4>
                                                                {ep.is_movie && (
                                                                    <div className={`w-2 h-2 rounded-full ${ep.release_type === 'theatrical' ? 'bg-pink-500' : 'bg-emerald-500'}`} />
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                                {!ep.is_movie && <span className="font-mono text-zinc-400">S{ep.season_number} E{ep.episode_number}</span>}
                                                                <span className="truncate">{ep.name}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {ep.is_movie && (
                                                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border hidden sm:block ${ep.release_type === 'theatrical' ? 'border-pink-500/30 text-pink-400' : 'border-emerald-500/30 text-emerald-400'}`}>
                                                                {ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                                                            </div>
                                                        )}

                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (ep.show_id) {
                                                                    toggleWatched({
                                                                        tmdb_id: ep.show_id,
                                                                        media_type: ep.is_movie ? 'movie' : 'episode',
                                                                        season_number: ep.season_number,
                                                                        episode_number: ep.episode_number,
                                                                        is_watched: isWatched
                                                                    });
                                                                }
                                                            }}
                                                            className={`p-2 rounded-full border transition-all ${isWatched ? 'bg-zinc-800 border-zinc-700 text-emerald-500' : 'border-white/10 text-zinc-500 hover:text-white hover:border-white/30'}`}
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Calendar Local Search Modal */}
            <CalendarSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </div>
    );
};

export default V2Calendar;
