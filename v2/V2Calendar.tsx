
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, isSameMonth, addMonths, subMonths, addDays, isSameDay, isToday, parseISO, isValid
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
    
    // Safety check for calendarDate
    const safeCalendarDate = isValid(calendarDate) ? calendarDate : new Date();

    const { episodes: rawEpisodes, isLoading, isRefetching } = useCalendarEpisodes(safeCalendarDate);
    
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

    // Derive user region to compare against release country
    const userRegion = useMemo(() => {
        try {
            return (navigator.language.split('-')[1] || 'US').toUpperCase();
        } catch { return 'US'; }
    }, []);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const isMobile = window.innerWidth < 768;
        const pref = (settings.viewMode as ViewMode) || 'grid';
        if (isMobile && pref === 'grid') return 'cards';
        return pref;
    });
    
    const showTV = settings.calendarFilterTv !== false; 
    const showMovies = settings.calendarFilterMovies !== false; 
    const [showHidden, setShowHidden] = useState(false);

    const filterRef = useRef<HTMLDivElement>(null);
    const cardScrollRef = useRef<HTMLDivElement>(null);

    const isViewingCurrentMonth = isSameMonth(safeCalendarDate, new Date());

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

    const monthStart = startOfMonth(safeCalendarDate);
    const monthEnd = endOfMonth(safeCalendarDate);
    
    const gridDays = useMemo(() => {
        if (!isValid(monthStart)) return [];
        return eachDayOfInterval({
            start: startOfWeek(monthStart),
            end: endOfWeek(addDays(startOfWeek(monthStart), 41))
        }).slice(0, 42);
    }, [monthStart]);

    const activeDays = useMemo(() => {
        if (!isValid(monthStart) || !isValid(monthEnd)) return [];
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
                    todayEl.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [viewMode, safeCalendarDate, isLoading]);

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
        const isMobile = window.innerWidth < 768;
        if (viewMode === 'grid') handleViewChange('cards');
        else if (viewMode === 'cards') handleViewChange('list');
        else handleViewChange(isMobile ? 'cards' : 'grid');
    };

    const FilterToggle = ({ label, active, onClick, icon: Icon }: any) => (
        <button 
            onClick={onClick}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${active ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300' : 'bg-background border-border text-text-muted hover:bg-card hover:text-text-main'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${active ? 'bg-indigo-500/20 text-indigo-400' : 'bg-card text-text-muted'}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">{label}</span>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${active ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-border'}`}>
                {active && <Check className="w-3 h-3" />}
            </div>
        </button>
    );

    // --- SUB-COMPONENTS ---
    const DateHeader = ({ day }: { day: Date }) => {
        const isTodayDate = isToday(day);
        return (
             <div className="sticky top-0 z-40 bg-panel/95 backdrop-blur-xl border-b border-border py-2 px-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className={`text-3xl font-black tracking-tighter ${isTodayDate ? 'text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'text-text-main'}`}>
                        {format(day, 'dd')}
                    </div>
                    <div className="flex flex-col leading-none h-8 justify-center border-l border-border pl-3">
                        <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${isTodayDate ? 'text-text-main' : 'text-text-muted'}`}>
                            {format(day, 'EEEE')}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono uppercase tracking-wide">
                            {format(day, 'MMMM yyyy')}
                        </span>
                    </div>
                </div>
                {isTodayDate && (
                    <span className="text-[9px] font-bold bg-indigo-600/20 border border-indigo-500/50 text-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wide shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                        Today
                    </span>
                )}
            </div>
        );
    };

    const SingleEpisodeCell = ({ ep }: { ep: Episode }) => {
        const imageUrl = getImageUrl(ep.poster_path);
        const watchedKey = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
        const isWatched = interactions[watchedKey]?.is_watched;
        const showFlag = ep.is_movie && ep.release_country && ep.release_country !== userRegion;

        return (
            <div 
                className="absolute inset-0 w-full h-full bg-background overflow-hidden group/cell-item"
                data-context-type="episode"
                data-context-meta={JSON.stringify(ep)}
            >
                <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-30 scale-110" style={{ backgroundImage: `url(${imageUrl})` }} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <img src={imageUrl} className={`h-full w-auto max-w-full object-contain shadow-2xl relative z-10 transition-all duration-300 ${isWatched ? 'grayscale opacity-50' : 'opacity-100'}`} alt="" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent z-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col justify-end h-full z-30 pointer-events-none">
                    <h4 className={`text-[10px] font-black uppercase tracking-tight leading-tight line-clamp-2 mb-1 drop-shadow-md ${isWatched ? 'text-zinc-500 line-through' : 'text-white'}`}>{ep.show_name}</h4>
                    <div className="flex items-center gap-1.5">
                        {ep.is_movie ? (
                            <div className="flex items-center gap-1.5">
                                 <span className={`text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 ${ep.release_type === 'theatrical' ? 'text-pink-400' : 'text-emerald-400'}`}>
                                    {ep.release_type === 'theatrical' ? <Ticket className="w-2 h-2" /> : <MonitorPlay className="w-2 h-2" />}
                                    {ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                                </span>
                                {showFlag && <span className={`fi fi-${ep.release_country!.toLowerCase()} rounded-[1px] text-[10px]`} />}
                            </div>
                        ) : (
                            <span className={`text-[9px] font-mono font-bold ${isWatched ? 'text-zinc-600' : 'text-zinc-300'}`}>S{ep.season_number} E{ep.episode_number}</span>
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
                    const allWatched = group.every(ep => interactions[ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`]?.is_watched);
                    const showFlag = first.is_movie && first.release_country && first.release_country !== userRegion;

                    return (
                        <div 
                            key={`${first.show_id}-${idx}`} 
                            className="flex items-center gap-2 group/item"
                            data-context-type="episode"
                            data-context-meta={JSON.stringify(first)}
                        >
                            <div className="w-5 h-7 rounded-[2px] bg-card overflow-hidden shrink-0 border border-white/5 relative">
                                <img src={posterSrc} className={`w-full h-full object-cover ${allWatched ? 'grayscale opacity-50' : ''}`} alt="" />
                                {allWatched && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Check className="w-3 h-3 text-emerald-500" /></div>}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={`text-[9px] font-bold truncate leading-none mb-0.5 ${allWatched ? 'text-text-muted line-through' : 'text-text-muted group-hover/item:text-text-main'}`}>{first.show_name}</p>
                                <div className="flex items-center gap-1.5">
                                    {first.is_movie ? (
                                        <div className="flex items-center gap-1">
                                            <span className={`text-[7px] font-black uppercase tracking-wider ${first.release_type === 'theatrical' ? 'text-pink-500' : 'text-emerald-500'}`}>{first.release_type === 'theatrical' ? 'Cinema' : 'Digital'}</span>
                                            {showFlag && <span className={`fi fi-${first.release_country!.toLowerCase()} rounded-[1px] w-2 h-1.5`} />}
                                        </div>
                                    ) : (
                                        count > 1 ? (
                                            <span className="text-[7px] font-bold bg-white/10 text-white px-1 rounded flex items-center gap-1"><Layers className="w-2 h-2" /> {count} EP</span>
                                        ) : (
                                            <span className="text-[7px] font-mono text-text-muted">S{first.season_number} E{first.episode_number}</span>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {groups.length > 3 && <div className="mt-auto pt-1 border-t border-white/5"><span className="text-[8px] font-black text-text-muted uppercase tracking-widest block text-center">+{groups.length - 3} MORE</span></div>}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            {/* Header */}
            <header className="h-16 shrink-0 border-b border-border flex items-center bg-panel/80 z-[60] backdrop-blur-md sticky top-0 justify-between">
                
                {/* Desktop Title */}
                <div className="hidden md:flex flex-1 flex-col justify-center px-6 border-r border-border h-full min-w-[120px]">
                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest leading-none mb-1">{isValid(safeCalendarDate) ? format(safeCalendarDate, 'yyyy') : ''}</span>
                    <span className="text-xl font-black text-text-main uppercase tracking-tighter leading-none">{isValid(safeCalendarDate) ? format(safeCalendarDate, 'MMMM') : ''}</span>
                </div>

                {/* Navigation */}
                <div className="flex flex-1 h-full md:ml-auto md:w-auto w-full">
                    <button onClick={() => setCalendarDate(subMonths(safeCalendarDate, 1))} className="flex-1 md:w-14 h-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-white/5 transition-colors border-r md:border-l border-border" title="Previous Month">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => {
                            const now = new Date();
                            if (isViewingCurrentMonth) {
                                onSelectDay(now);
                            } else {
                                setCalendarDate(now);
                            }
                        }} 
                        className="flex-[2] md:px-4 h-full flex flex-col items-center justify-center hover:text-indigo-400 hover:bg-white/5 transition-colors border-r border-border"
                    >
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-main">{isValid(safeCalendarDate) ? format(safeCalendarDate, 'MMM') : ''}</span>
                         <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            {isViewingCurrentMonth ? 'Today' : 'This Month'}
                         </span>
                    </button>
                    <button onClick={() => setCalendarDate(addMonths(safeCalendarDate, 1))} className="flex-1 md:w-14 h-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-white/5 transition-colors" title="Next Month">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Controls */}
                <div className="flex h-full border-l border-border">
                     <button onClick={cycleViewMode} className="w-14 h-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-white/5 transition-colors" title="Toggle View">
                        <span className="md:hidden">
                             {viewMode === 'cards' ? <Smartphone className="w-5 h-5" /> : <ListIcon className="w-5 h-5" />}
                        </span>
                        <span className="hidden md:block">
                            {viewMode === 'grid' && <LayoutGrid className="w-5 h-5" />}
                            {viewMode === 'cards' && <Smartphone className="w-5 h-5" />}
                            {viewMode === 'list' && <ListIcon className="w-5 h-5" />}
                        </span>
                    </button>
                    
                    <button onClick={() => setIsSearchOpen(true)} className="w-14 h-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-white/5 transition-colors border-l border-border" title="Search in Calendar">
                        <Search className="w-5 h-5" />
                    </button>

                    <div className="flex h-full relative" ref={filterRef}>
                        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`w-14 h-full flex items-center justify-center border-l border-border transition-colors ${isFilterOpen ? 'bg-indigo-600 text-white' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`} title="Filters">
                            <Filter className="w-4 h-4" />
                        </button>
                         {isFilterOpen && (
                            <div className="absolute top-full right-4 mt-4 w-72 bg-panel border border-border rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-[100] animate-enter overflow-hidden">
                                <div className="p-4 border-b border-border bg-card/50"><h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2"><Filter className="w-3 h-3" /> View Options</h4></div>
                                <div className="p-3 space-y-2">
                                    <FilterToggle label="TV Series" icon={Tv} active={showTV} onClick={() => updateSettings({ calendarFilterTv: !settings.calendarFilterTv })} />
                                    <FilterToggle label="Movies" icon={Film} active={showMovies} onClick={() => updateSettings({ calendarFilterMovies: !settings.calendarFilterMovies })} />
                                    <div className="h-px bg-border my-1" />
                                    <FilterToggle label="Digital Releases Only" icon={MonitorPlay} active={settings.hideTheatrical} onClick={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })} />
                                    <FilterToggle label="Show Hidden Items" icon={EyeOff} active={showHidden} onClick={() => setShowHidden(!showHidden)} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* --- GRID VIEW --- */}
            {viewMode === 'grid' && (
                <div className="hidden md:flex flex-col h-full min-h-0" data-context-type="calendar_bg">
                    <div className="grid grid-cols-7 border-b border-border bg-card/30 shrink-0">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-[9px] font-black text-text-muted uppercase tracking-[0.25em] border-r border-border last:border-r-0">{day}</div>
                        ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0 bg-background">
                        {gridDays.map((day, idx) => {
                            const isTodayDate = isSameDay(day, new Date());
                            const isActive = isSameDay(day, selectedDay);
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const dayEps = getEpisodesForDay(day);
                            const groupedEps = groupEpisodes(dayEps);
                            const totalGroups = groupedEps.length;

                            return (
                                <div key={day.toISOString()} onClick={() => onSelectDay(day)} className={`relative border-r border-b border-border flex flex-col group/cell overflow-hidden transition-all duration-300 cursor-pointer ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''} ${idx >= 35 ? 'border-b-0' : ''} ${isCurrentMonth ? 'bg-transparent' : 'bg-white/[0.01] opacity-40'} ${isActive ? 'bg-white/[0.04]' : 'hover:z-10 hover:bg-white/[0.02]'}`}>
                                    <div className="absolute top-2 right-2 z-50">
                                        <span className={`text-[10px] font-mono font-black tracking-tighter px-1.5 py-0.5 rounded ${isTodayDate ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : isCurrentMonth ? (isActive ? 'text-text-main' : 'text-text-muted group-hover/cell:text-text-main') : 'text-zinc-600'} transition-colors`}>{format(day, 'dd')}</span>
                                    </div>
                                    {totalGroups === 1 && groupedEps[0].length === 1 ? (<SingleEpisodeCell ep={groupedEps[0][0]} />) : totalGroups > 0 ? (<GroupedEpisodeCell groups={groupedEps} />) : null}
                                    {isActive && <div className="absolute inset-0 border-[2px] border-indigo-500/80 pointer-events-none z-40 shadow-[inset_0_0_15px_rgba(99,102,241,0.1)]" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* --- CARDS & LIST VIEW (Restored) --- */}
            {(viewMode === 'cards' || viewMode === 'list') && (
                <div ref={cardScrollRef} className="flex-1 overflow-y-auto custom-scrollbar" data-context-type="calendar_bg">
                     {activeDays.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-30">
                            <CalendarIcon className="w-16 h-16 text-text-muted mb-4" />
                            <p className="text-sm font-bold text-text-muted uppercase tracking-widest">No Events Found</p>
                        </div>
                    ) : (
                         <div className="pb-32 pt-0">
                             {activeDays.map(day => {
                                const dayEps = getEpisodesForDay(day);
                                const isTodayDate = isToday(day);
                                const groupedEps = groupEpisodes(dayEps);
                                return (
                                    <div key={day.toISOString()} id={isTodayDate ? 'v2-today-anchor' : undefined} className="scroll-mt-0">
                                        <DateHeader day={day} />
                                        
                                        <div className="flex flex-col gap-px bg-panel">
                                            {groupedEps.map((group, groupIdx) => {
                                                 const firstEp = group[0];
                                                 const showFlag = firstEp.is_movie && firstEp.release_country && firstEp.release_country !== userRegion;
                                                 const isWatched = interactions[firstEp.is_movie ? `movie-${firstEp.show_id}` : `episode-${firstEp.show_id}-${firstEp.season_number}-${firstEp.episode_number}`]?.is_watched;
                                                 
                                                 return (
                                                     <div 
                                                        key={groupIdx} 
                                                        className="p-4 bg-background border-b border-border flex items-center gap-4 cursor-pointer hover:bg-white/[0.02]"
                                                        onClick={() => onSelectDay(day)}
                                                     >
                                                         <div className="w-10 h-14 bg-zinc-800 rounded shrink-0 overflow-hidden border border-white/5 relative">
                                                            <img src={getImageUrl(firstEp.poster_path)} className={`w-full h-full object-cover ${isWatched ? 'grayscale opacity-50' : ''}`} alt=""/>
                                                            {isWatched && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Check className="w-4 h-4 text-emerald-500" /></div>}
                                                         </div>
                                                         
                                                         <div className="min-w-0 flex-1">
                                                             <div className="flex items-center gap-2 mb-0.5">
                                                                <h4 className={`text-sm font-bold truncate ${isWatched ? 'text-text-muted line-through' : 'text-text-main'}`}>{firstEp.show_name}</h4>
                                                             </div>
                                                             
                                                             <div className="flex items-center gap-2 text-xs text-text-muted">
                                                                 {firstEp.is_movie ? (
                                                                     <div className="flex items-center gap-1.5">
                                                                        <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-black uppercase tracking-wider border ${firstEp.release_type === 'theatrical' ? 'text-pink-400 border-pink-500/20 bg-pink-500/5' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'}`}>
                                                                            {firstEp.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                                                                        </span>
                                                                        {showFlag && <span className={`fi fi-${firstEp.release_country!.toLowerCase()} rounded-[1px]`} />}
                                                                     </div>
                                                                 ) : (
                                                                     <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-zinc-500">S{firstEp.season_number} E{firstEp.episode_number}</span>
                                                                        {group.length > 1 && <span className="text-[10px] bg-white/10 px-1.5 rounded text-white font-bold">+{group.length - 1}</span>}
                                                                     </div>
                                                                 )}
                                                                 <span className="truncate opacity-70 hidden sm:block">• {firstEp.name}</span>
                                                             </div>
                                                         </div>
                                                         
                                                         {firstEp.air_date_iso && (
                                                             <div className="text-[10px] font-mono text-zinc-600 font-bold shrink-0">
                                                                 {format(parseISO(firstEp.air_date_iso), 'h:mm a')}
                                                             </div>
                                                         )}
                                                     </div>
                                                 )
                                            })}
                                        </div>
                                    </div>
                                )
                             })}
                         </div>
                    )}
                </div>
            )}

            <CalendarSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </div>
    );
};

export default V2Calendar;
