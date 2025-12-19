
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, isSameMonth, addMonths, subMonths, addDays, isSameDay, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon, Check, RefreshCw, Tv, Film, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { useStore } from '../store';
import { useCalendarEpisodes } from '../hooks/useQueries';
import { Episode } from '../types';
import { getImageUrl } from '../services/tmdb';

interface V2CalendarProps {
    selectedDay: Date;
    onSelectDay: (date: Date) => void;
}

const V2Calendar: React.FC<V2CalendarProps> = ({ selectedDay, onSelectDay }) => {
    const { settings, history, toggleWatched, updateSettings } = useStore();
    const { episodes, isLoading, isRefetching } = useCalendarEpisodes(selectedDay);
    
    // Local State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(settings.viewMode === 'list' ? 'list' : 'grid');
    const [showTV, setShowTV] = useState(true);
    const [showMovies, setShowMovies] = useState(true);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Persist view mode preference
    const handleViewChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        updateSettings({ viewMode: mode === 'list' ? 'list' : 'grid' });
    };

    // Filtering
    const filteredEpisodes = useMemo(() => {
        return episodes.filter(ep => {
            if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
            if (settings.ignoreSpecials && ep.season_number === 0) return false;
            if (settings.hiddenItems.includes(ep.show_id)) return false;
            
            // Local Toggles
            if (!showTV && !ep.is_movie) return false;
            if (!showMovies && ep.is_movie) return false;
            
            return true;
        });
    }, [episodes, settings, showTV, showMovies]);

    // Grouping
    const episodesByDate = useMemo(() => {
        const map: Record<string, Episode[]> = {};
        filteredEpisodes.forEach(ep => {
            if (!ep.air_date) return;
            const date = ep.air_date; 
            if (!map[date]) map[date] = [];
            map[date].push(ep);
        });
        return map;
    }, [filteredEpisodes]);

    const monthStart = startOfMonth(selectedDay);
    const monthEnd = endOfMonth(selectedDay);
    const gridDays = useMemo(() => {
        const start = startOfWeek(monthStart);
        const end = endOfWeek(addDays(startOfWeek(monthStart), 35));
        return eachDayOfInterval({ start, end }).slice(0, 42); // Ensure exactly 6 rows
    }, [monthStart]);

    const getEpisodesForDay = (date: Date) => episodesByDate[format(date, 'yyyy-MM-dd')] || [];

    const isWatched = (ep: Episode) => {
        const key = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
        return history[key]?.is_watched || false;
    };

    const handleToggle = (e: React.MouseEvent, ep: Episode) => {
        e.stopPropagation();
        toggleWatched({
            tmdb_id: ep.show_id,
            media_type: ep.is_movie ? 'movie' : 'episode',
            season_number: ep.season_number,
            episode_number: ep.episode_number,
            is_watched: isWatched(ep)
        });
    };

    // Scroll to today in list view
    useEffect(() => {
        if (viewMode === 'list' && scrollRef.current) {
            const todayEl = document.getElementById('v2-today-anchor');
            if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [viewMode, selectedDay]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#020202]">
            {/* Header Toolbar */}
            <header className="h-16 shrink-0 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-[#050505]/80 z-[60] backdrop-blur-md sticky top-0">
                
                {/* Date Navigation */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-zinc-900/50 rounded-lg p-1 border border-white/5">
                        <button onClick={() => onSelectDay(subMonths(selectedDay, 1))} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => onSelectDay(new Date())} className="px-3 text-[10px] font-black uppercase text-zinc-300 hover:text-white transition-colors">Today</button>
                        <button onClick={() => onSelectDay(addMonths(selectedDay, 1))} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="hidden md:flex flex-col justify-center">
                         <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            {format(selectedDay, 'yyyy')}
                            {(isLoading || isRefetching) && <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />}
                         </span>
                         <span className="text-lg font-black text-white uppercase tracking-tight">{format(selectedDay, 'MMMM')}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                    {/* Filter Toggles */}
                    <div className="hidden md:flex items-center gap-1 bg-zinc-900/50 rounded-lg p-1 border border-white/5 mr-2">
                        <button onClick={() => setShowTV(!showTV)} className={`p-1.5 rounded-md transition-all ${showTV ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="TV Shows"><Tv className="w-4 h-4" /></button>
                        <button onClick={() => setShowMovies(!showMovies)} className={`p-1.5 rounded-md transition-all ${showMovies ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Movies"><Film className="w-4 h-4" /></button>
                    </div>

                    {/* View Switcher */}
                    <div className="flex items-center bg-zinc-900/50 rounded-lg p-1 border border-white/5">
                        <button 
                            onClick={() => handleViewChange('grid')} 
                            className={`p-1.5 rounded-md transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase hidden xl:inline">Grid</span>
                        </button>
                        <button 
                            onClick={() => handleViewChange('list')} 
                            className={`p-1.5 rounded-md transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase hidden xl:inline">List</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020202] relative" ref={scrollRef}>
                
                {/* --- GRID VIEW --- */}
                {viewMode === 'grid' && (
                    <div className="min-h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="py-3 text-center text-[9px] font-black text-zinc-600 uppercase tracking-widest border-r border-white/5 last:border-r-0">{d}</div>
                            ))}
                        </div>
                        <div className="flex-1 grid grid-cols-7 grid-rows-6 auto-rows-fr">
                            {gridDays.map((day) => {
                                const dayEps = getEpisodesForDay(day);
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isSelected = isSameDay(day, selectedDay);
                                const isDayToday = isToday(day);
                                
                                return (
                                    <div 
                                        key={day.toISOString()} 
                                        onClick={() => onSelectDay(day)}
                                        className={`
                                            relative border-r border-b border-white/5 flex flex-col group min-h-[100px] md:min-h-[120px] transition-colors
                                            ${!isCurrentMonth ? 'bg-zinc-950/30' : ''} 
                                            ${isSelected ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start p-2">
                                            <span className={`text-[10px] font-mono font-bold ${isDayToday ? 'bg-indigo-600 text-white px-1.5 py-0.5 rounded' : (isCurrentMonth ? 'text-zinc-400' : 'text-zinc-700')}`}>
                                                {format(day, 'dd')}
                                            </span>
                                        </div>

                                        <div className="flex-1 p-1 flex flex-col gap-1 overflow-hidden">
                                            {dayEps.slice(0, 3).map(ep => {
                                                 const poster = getImageUrl(settings.useSeason1Art ? ep.season1_poster_path : ep.poster_path);
                                                 const watched = isWatched(ep);
                                                 return (
                                                    <div 
                                                        key={ep.id} 
                                                        className="relative h-8 md:h-10 w-full rounded bg-zinc-900 overflow-hidden border border-white/5 group/item cursor-pointer"
                                                        onClick={(e) => handleToggle(e, ep)}
                                                        title={`${ep.show_name} - ${ep.name}`}
                                                    >
                                                        {/* Background Image */}
                                                        <img src={poster} className={`absolute inset-0 w-full h-full object-cover opacity-60 group-hover/item:opacity-100 transition-opacity ${watched ? 'grayscale' : ''}`} alt="" loading="lazy" />
                                                        
                                                        {/* Gradient & Content */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-transparent flex items-center px-2">
                                                            <div className="min-w-0">
                                                                <p className={`text-[9px] font-bold truncate ${watched ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{ep.show_name}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Watched Indicator */}
                                                        {watched && (
                                                            <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                                                <Check className="w-3 h-3 text-emerald-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                 );
                                            })}
                                            {dayEps.length > 3 && (
                                                <div className="text-[8px] font-bold text-zinc-600 text-center py-0.5 bg-white/5 rounded">
                                                    +{dayEps.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Selection Marker */}
                                        {isSelected && <div className="absolute inset-0 border-2 border-indigo-500/50 pointer-events-none" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- LIST VIEW --- */}
                {viewMode === 'list' && (
                    <div className="max-w-3xl mx-auto py-8 px-4 pb-24">
                        {gridDays.filter(d => isSameMonth(d, monthStart)).map(day => {
                            const dayEps = getEpisodesForDay(day);
                            if (dayEps.length === 0) return null;
                            
                            const isDayToday = isToday(day);
                            
                            return (
                                <div key={day.toISOString()} id={isDayToday ? 'v2-today-anchor' : undefined} className="mb-8 animate-fade-in-up">
                                    <div className="flex items-center gap-4 mb-4 sticky top-0 bg-[#020202]/95 backdrop-blur py-2 z-10">
                                        <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border ${isDayToday ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900 border-white/10 text-zinc-400'}`}>
                                            <span className="text-xs font-black uppercase">{format(day, 'MMM')}</span>
                                            <span className="text-lg font-bold leading-none">{format(day, 'dd')}</span>
                                        </div>
                                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                        <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">{format(day, 'EEEE')}</span>
                                    </div>

                                    <div className="space-y-3 pl-4 border-l-2 border-white/5 ml-6">
                                        {dayEps.map(ep => {
                                            const watched = isWatched(ep);
                                            const poster = getImageUrl(ep.still_path || ep.poster_path);
                                            return (
                                                <div 
                                                    key={`${ep.show_id}-${ep.id}`}
                                                    onClick={() => onSelectDay(day)}
                                                    className={`
                                                        group flex items-center gap-4 p-3 rounded-xl bg-zinc-900/40 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer
                                                        ${watched ? 'opacity-50 grayscale' : ''}
                                                    `}
                                                >
                                                    <div className="w-24 aspect-video rounded-lg overflow-hidden bg-black shrink-0 relative">
                                                        <img src={poster} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" loading="lazy" />
                                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-white truncate">{ep.show_name}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {ep.is_movie ? (
                                                                <span className="text-[9px] font-black bg-pink-500/10 text-pink-500 border border-pink-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Movie</span>
                                                            ) : (
                                                                <span className="text-[9px] font-mono text-zinc-400">S{ep.season_number} E{ep.episode_number}</span>
                                                            )}
                                                            <span className="text-[10px] text-zinc-500 truncate">• {ep.name}</span>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={(e) => handleToggle(e, ep)}
                                                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${watched ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-transparent border-zinc-700 text-zinc-600 hover:border-white hover:text-white'}`}
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
                        {filteredEpisodes.length === 0 && (
                            <div className="text-center py-20 opacity-40">
                                <CalendarIcon className="w-16 h-16 mx-auto mb-4 stroke-1 text-zinc-500" />
                                <p className="text-zinc-500 font-bold uppercase tracking-widest">No Episodes Found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default V2Calendar;
