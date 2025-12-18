
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, isSameMonth, addMonths, subMonths, addDays, isSameDay, isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, Layers, LayoutGrid, Check, Tv, Film, MonitorPlay, Eye, EyeOff, Calendar as CalendarIcon, Clock, AlignJustify } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Episode } from '../types';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';

interface V2CalendarProps {
    selectedDay: Date;
    onSelectDay: (date: Date) => void;
}

const V2Calendar: React.FC<V2CalendarProps> = ({ selectedDay, onSelectDay }) => {
    const { calendarDate, setCalendarDate, episodes, settings, updateSettings, interactions, toggleWatched, toggleEpisodeWatched } = useAppContext();
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');
    
    // Local filters
    const [showTV, setShowTV] = useState(true);
    const [showMovies, setShowMovies] = useState(true);
    const [showHidden, setShowHidden] = useState(false);

    const filterRef = useRef<HTMLDivElement>(null);
    const cardScrollRef = useRef<HTMLDivElement>(null);

    // Auto-switch to cards on mobile mount
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                // Only switch if user hasn't manually set it? For now enforce default as requested.
                // We'll just set it on mount or resize to mobile if it's 'grid'
                if (viewMode === 'grid') setViewMode('cards');
            }
        };
        // Initial check
        if (window.innerWidth < 768) setViewMode('cards');
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Scroll to today in Card View
    useEffect(() => {
        if (viewMode === 'cards' && cardScrollRef.current) {
            const todayEl = document.getElementById('v2-card-today');
            if (todayEl) {
                todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [viewMode, calendarDate]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
        };
        if (isFilterOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterOpen]);

    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(calendarDate);
    
    // Grid Days: 6 weeks (42 days)
    const gridDays = useMemo(() => {
        return eachDayOfInterval({
            start: startOfWeek(monthStart),
            end: endOfWeek(addDays(startOfWeek(monthStart), 41))
        }).slice(0, 42);
    }, [monthStart]);

    // Active Days for Card View (only days in month with episodes)
    const activeDays = useMemo(() => {
        return eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEps = episodes[dateKey] || [];
            return dayEps.some(ep => {
                if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
                if (settings.ignoreSpecials && ep.season_number === 0) return false;
                if (!showTV && !ep.is_movie) return false;
                if (!showMovies && ep.is_movie) return false;
                const isBlacklisted = (settings.hiddenItems || []).some(h => h.id === ep.show_id);
                if (isBlacklisted && !showHidden) return false;
                return true;
            });
        });
    }, [monthStart, monthEnd, episodes, settings, showTV, showMovies, showHidden]);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getEpisodesForDay = (day: Date) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayEps = episodes[dateKey] || [];
        
        return dayEps.filter(ep => {
            if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
            if (settings.ignoreSpecials && ep.season_number === 0) return false;
            if (!showTV && !ep.is_movie) return false;
            if (!showMovies && ep.is_movie) return false;
            const isBlacklisted = (settings.hiddenItems || []).some(h => h.id === ep.show_id);
            if (isBlacklisted && !showHidden) return false;
            return true;
        });
    };

    // --- GRID COMPONENTS ---
    const SingleEpisodeCell: React.FC<{ ep: Episode }> = ({ ep }) => {
        const imageUrl = getImageUrl(ep.poster_path);
        const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
        const isWatched = interactions[watchedKey]?.is_watched;

        return (
            <div className={`relative w-full h-full overflow-hidden transition-all duration-500 group/hero ${isWatched ? 'grayscale opacity-40' : ''}`}>
                <div className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-30" style={{ backgroundImage: `url(${imageUrl})` }} />
                <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain z-10 drop-shadow-2xl transition-opacity duration-700" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent z-20" />
                <div className="absolute bottom-0 left-0 right-0 p-3 z-30 pointer-events-none">
                    <h4 className="text-[10px] font-black text-white leading-tight line-clamp-1 uppercase tracking-tight mb-0.5 group-hover/hero:text-indigo-300 transition-colors">
                        {ep.show_name || ep.name}
                    </h4>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-zinc-500">
                            {ep.is_movie ? (ep.release_type === 'theatrical' ? 'Cinema' : 'Digital') : `S${ep.season_number} E${ep.episode_number}`}
                        </span>
                        {isWatched && <Check className="w-2 h-2 text-emerald-500" />}
                    </div>
                </div>
                {!isWatched && (
                    <div className={`absolute top-2 left-2 z-40 w-1 h-1 rounded-full ${ep.is_movie ? 'bg-pink-500' : 'bg-indigo-500'} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                )}
            </div>
        );
    };

    const MultiEpisodeItem: React.FC<{ ep: Episode }> = ({ ep }) => {
        const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
        const isWatched = interactions[watchedKey]?.is_watched;
        const imageUrl = getImageUrl(ep.poster_path);
        return (
            <div className={`flex items-center gap-2 py-0.5 px-1 rounded transition-all ${isWatched ? 'opacity-30' : 'hover:bg-white/[0.04]'}`}>
                <div className="w-4 h-6 rounded-sm overflow-hidden bg-zinc-900 shrink-0 border border-white/5">
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-zinc-400 truncate leading-none mb-0.5 group-hover/cell:text-zinc-200 transition-colors">{ep.show_name || ep.name}</p>
                    <div className="flex items-center gap-1">
                        <span className="text-[7px] font-mono text-zinc-600 uppercase">
                            {ep.is_movie ? 'Movie' : `S${ep.season_number}E${ep.episode_number}`}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#020202]">
            {/* Header */}
            <header className="h-16 shrink-0 border-b border-white/5 flex items-center bg-zinc-950/40 z-[60] backdrop-blur-md sticky top-0">
                {/* Date Display */}
                <div className="flex-1 flex flex-col justify-center px-6 border-r border-white/5 h-full min-w-[120px]">
                     <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none mb-1">{format(calendarDate, 'yyyy')}</span>
                     <span className="text-xl font-black text-white uppercase tracking-tighter leading-none">{format(calendarDate, 'MMMM')}</span>
                </div>

                {/* Navigation Group */}
                <div className="flex h-full">
                    <button 
                        onClick={() => setCalendarDate(subMonths(calendarDate, 1))} 
                        className="w-14 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors border-r border-white/5"
                        title="Previous Month"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <button 
                        onClick={() => { setCalendarDate(new Date()); onSelectDay(new Date()); }} 
                        className="px-4 h-full flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-indigo-400 hover:bg-white/5 transition-colors border-r border-white/5"
                    >
                        Today
                    </button>

                    <button 
                        onClick={() => setCalendarDate(addMonths(calendarDate, 1))} 
                        className="w-14 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors border-r border-white/5"
                        title="Next Month"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* View Switcher (Visible on Mobile) */}
                <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'cards' : 'grid')}
                    className="w-14 h-full flex items-center justify-center border-r border-white/5 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                    title="Toggle View"
                >
                    {viewMode === 'grid' ? <AlignJustify className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                </button>

                {/* Filter Toggles */}
                <div className="flex h-full relative" ref={filterRef}>
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`w-14 h-full flex items-center justify-center border-r border-white/5 transition-colors ${isFilterOpen ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                        title="Filters"
                    >
                        <Filter className="w-4 h-4" />
                    </button>

                     {isFilterOpen && (
                        <div className="absolute top-full right-0 mt-0 w-64 bg-zinc-950 border border-white/10 rounded-bl-2xl shadow-2xl p-2 z-[100] animate-enter">
                            <div className="p-2">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-3">Calendar Filters</h4>
                                <div className="space-y-1">
                                    <button onClick={() => setShowTV(!showTV)} className={`w-full flex items-center justify-between p-3 rounded-xl text-[11px] font-bold transition-all ${showTV ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:bg-white/5'}`}>
                                        <div className="flex items-center gap-3"><Tv className="w-3.5 h-3.5" /> TV Series</div>
                                        {showTV && <Check className="w-3 h-3" />}
                                    </button>
                                    <button onClick={() => setShowMovies(!showMovies)} className={`w-full flex items-center justify-between p-3 rounded-xl text-[11px] font-bold transition-all ${showMovies ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:bg-white/5'}`}>
                                        <div className="flex items-center gap-3"><Film className="w-3.5 h-3.5" /> Movies</div>
                                        {showMovies && <Check className="w-3 h-3" />}
                                    </button>
                                    
                                    <div className="h-px bg-white/5 my-2 mx-2" />
                                    
                                    <button onClick={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })} className={`w-full flex items-center justify-between p-3 rounded-xl text-[11px] font-bold transition-all ${!settings.hideTheatrical ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:bg-white/5'}`}>
                                        <div className="flex items-center gap-3"><MonitorPlay className="w-3.5 h-3.5" /> Digital Only</div>
                                        {!settings.hideTheatrical && <Check className="w-3 h-3" />}
                                    </button>
                                    
                                    <button onClick={() => setShowHidden(!showHidden)} className={`w-full flex items-center justify-between p-3 rounded-xl text-[11px] font-bold transition-all ${showHidden ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:bg-white/5'}`}>
                                        <div className="flex items-center gap-3">{showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Hidden Items</div>
                                        {showHidden && <Check className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* --- VIEW CONTENT --- */}
            {viewMode === 'grid' ? (
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
                            return (
                                <div key={day.toISOString()} onClick={() => onSelectDay(day)} className={`relative border-r border-b border-white/5 flex flex-col group/cell overflow-hidden transition-all duration-300 cursor-pointer ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''} ${idx >= 35 ? 'border-b-0' : ''} ${isCurrentMonth ? 'bg-transparent' : 'bg-white/[0.01] opacity-20'} ${isActive ? 'bg-white/[0.04]' : 'hover:z-10 hover:bg-white/[0.02]'}`}>
                                    <div className="absolute top-2 right-2 z-50">
                                        <span className={`text-[10px] font-mono font-black tracking-tighter px-1.5 py-0.5 rounded ${isTodayDate ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : isCurrentMonth ? (isActive ? 'text-white' : 'text-zinc-600 group-hover/cell:text-zinc-300') : 'text-zinc-800'} transition-colors`}>{format(day, 'dd')}</span>
                                    </div>
                                    {dayEps.length === 1 ? (
                                        <SingleEpisodeCell ep={dayEps[0]} />
                                    ) : dayEps.length > 1 ? (
                                        <div className="flex-1 flex flex-col p-2 pt-8">
                                            <div className="flex-1 space-y-0.5 overflow-hidden">{dayEps.slice(0, 4).map(ep => <MultiEpisodeItem key={`${ep.show_id}-${ep.id}`} ep={ep} />)}</div>
                                            {dayEps.length > 4 && <div className="mt-auto py-1 border-t border-white/5"><span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block text-center group-hover/cell:text-indigo-400 transition-colors">+{dayEps.length - 4} more</span></div>}
                                        </div>
                                    ) : (<div className="flex-1" />)}
                                    {isActive && <div className="absolute inset-0 border-[2px] border-indigo-500/80 pointer-events-none z-40 shadow-[inset_0_0_15px_rgba(99,102,241,0.1)]" />}
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                // --- CARD VIEW (FEED) ---
                <div 
                    ref={cardScrollRef}
                    className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32"
                >
                    {activeDays.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-30">
                            <CalendarIcon className="w-16 h-16 text-zinc-500 mb-4" />
                            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No Events Found</p>
                        </div>
                    ) : (
                        activeDays.map(day => {
                            const eps = getEpisodesForDay(day);
                            const isTodayDate = isToday(day);
                            
                            return (
                                <div key={day.toISOString()} id={isTodayDate ? 'v2-card-today' : undefined} className="space-y-4">
                                    {/* Sticky Day Header */}
                                    <div className={`sticky top-0 z-40 flex items-center justify-between py-2 backdrop-blur-xl border-b border-white/5 -mx-6 px-6 ${isTodayDate ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-[#020202]/80'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-2xl font-black tracking-tighter ${isTodayDate ? 'text-indigo-400' : 'text-zinc-200'}`}>{format(day, 'dd')}</span>
                                            <div className="flex flex-col leading-none">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${isTodayDate ? 'text-indigo-300' : 'text-zinc-500'}`}>{format(day, 'EEEE')}</span>
                                                <span className="text-[10px] text-zinc-600 font-mono">{format(day, 'MMMM')}</span>
                                            </div>
                                        </div>
                                        {isTodayDate && <span className="text-[9px] font-bold bg-indigo-600 text-white px-2 py-1 rounded uppercase tracking-wide">Today</span>}
                                    </div>

                                    {/* Cards */}
                                    <div className="grid gap-4">
                                        {eps.map(ep => {
                                            const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                                            const isWatched = interactions[watchedKey]?.is_watched;
                                            const imageUrl = getImageUrl(ep.show_backdrop_path || ep.still_path || ep.poster_path);

                                            return (
                                                <div 
                                                    key={`${ep.show_id}-${ep.id}`} 
                                                    onClick={() => onSelectDay(day)}
                                                    className={`
                                                        relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 group transition-all duration-300
                                                        ${isWatched ? 'opacity-50 grayscale' : 'hover:scale-[1.02] hover:border-white/10 hover:shadow-2xl'}
                                                    `}
                                                >
                                                    {/* Backdrop Image */}
                                                    <div className="aspect-[21/9] w-full relative">
                                                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                                        
                                                        {/* Top Badges */}
                                                        <div className="absolute top-3 right-3 flex gap-2">
                                                            {ep.is_movie && (
                                                                <span className="bg-black/50 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[9px] font-bold text-white uppercase tracking-wider">
                                                                    {ep.release_type === 'theatrical' ? 'Cinema' : 'Movie'}
                                                                </span>
                                                            )}
                                                            <div className="bg-black/50 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> {format(new Date(ep.air_date), 'MMM d')}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Content Body */}
                                                    <div className="p-4 relative">
                                                        <div className="flex justify-between items-start gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                                                    {ep.is_movie ? 'Premiere' : `S${ep.season_number} • E${ep.episode_number}`}
                                                                </div>
                                                                <h3 className="text-lg font-bold text-white leading-tight mb-1 truncate">{ep.show_name}</h3>
                                                                <p className="text-sm text-zinc-400 truncate">{ep.name}</p>
                                                            </div>
                                                            
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (ep.show_id) {
                                                                        ep.is_movie ? toggleWatched(ep.show_id, 'movie') : toggleEpisodeWatched(ep.show_id, ep.season_number, ep.episode_number);
                                                                    }
                                                                }}
                                                                className={`
                                                                    w-12 h-12 rounded-full flex items-center justify-center transition-all border
                                                                    ${isWatched ? 'bg-zinc-800 text-emerald-500 border-zinc-700' : 'bg-white text-black border-white hover:bg-zinc-200'}
                                                                `}
                                                            >
                                                                <Check className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                        
                                                        {/* Optional Overview if expanded or space permits? Keep minimal for cards. */}
                                                        {ep.overview && (
                                                            <p className="mt-3 text-xs text-zinc-500 line-clamp-2 leading-relaxed border-t border-white/5 pt-3">
                                                                {ep.overview}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default V2Calendar;
