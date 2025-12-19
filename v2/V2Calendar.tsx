
import React, { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, isSameMonth, addMonths, subMonths, addDays, isSameDay, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, LayoutGrid, Check, List as ListIcon, Smartphone, RefreshCw } from 'lucide-react';
import { useStore } from '../store';
import { useCalendarEpisodes } from '../hooks/useQueries';
import { Episode } from '../types';
import { getImageUrl } from '../services/tmdb';

interface V2CalendarProps {
    selectedDay: Date;
    onSelectDay: (date: Date) => void;
}

const V2Calendar: React.FC<V2CalendarProps> = ({ selectedDay, onSelectDay }) => {
    const { settings, history, toggleWatched } = useStore();
    const { episodes, isLoading, isRefetching } = useCalendarEpisodes(selectedDay);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Filtering
    const filteredEpisodes = useMemo(() => {
        return episodes.filter(ep => {
            if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
            if (settings.ignoreSpecials && ep.season_number === 0) return false;
            if (settings.hiddenItems.includes(ep.show_id)) return false;
            return true;
        });
    }, [episodes, settings]);

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
    const gridDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(addDays(startOfWeek(monthStart), 35)) }).slice(0, 42), [monthStart]);

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

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#020202]">
            <header className="h-16 shrink-0 border-b border-white/5 flex items-center bg-[#050505]/80 z-[60] backdrop-blur-md sticky top-0">
                <div className="flex-1 flex flex-col justify-center px-6">
                     <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        {format(selectedDay, 'yyyy')}
                        {(isLoading || isRefetching) && <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />}
                     </span>
                     <span className="text-xl font-black text-white uppercase tracking-tighter">{format(selectedDay, 'MMMM')}</span>
                </div>
                <div className="flex h-full">
                    <button onClick={() => onSelectDay(subMonths(selectedDay, 1))} className="w-14 h-full flex items-center justify-center text-zinc-500 hover:text-white border-r border-white/5"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => onSelectDay(new Date())} className="px-4 h-full flex items-center justify-center text-[10px] font-black uppercase text-zinc-400 hover:text-white border-r border-white/5">Today</button>
                    <button onClick={() => onSelectDay(addMonths(selectedDay, 1))} className="w-14 h-full flex items-center justify-center text-zinc-500 hover:text-white border-r border-white/5"><ChevronRight className="w-5 h-5" /></button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020202]">
                <div className="grid grid-cols-7 border-b border-white/5 bg-zinc-950/10 shrink-0">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="py-2 text-center text-[9px] font-black text-zinc-600 border-r border-white/5 last:border-r-0">{d}</div>
                    ))}
                </div>
                <div className="flex-1 grid grid-cols-7 grid-rows-6">
                    {gridDays.map((day) => {
                        const dayEps = getEpisodesForDay(day);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isSelected = isSameDay(day, selectedDay);
                        
                        return (
                            <div 
                                key={day.toISOString()} 
                                onClick={() => onSelectDay(day)}
                                className={`relative border-r border-b border-white/5 flex flex-col p-1 cursor-pointer min-h-[80px] ${!isCurrentMonth ? 'opacity-20 bg-white/[0.01]' : ''} ${isSelected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'}`}
                            >
                                <span className={`text-[10px] font-mono font-bold mb-1 ${isToday(day) ? 'text-indigo-400' : 'text-zinc-700'}`}>{format(day, 'dd')}</span>
                                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                    {dayEps.slice(0, 3).map(ep => (
                                        <div key={ep.id} onClick={(e) => handleToggle(e, ep)} className="text-[9px] text-zinc-400 truncate bg-white/5 rounded px-1 py-0.5 flex items-center gap-1 hover:bg-white/10 transition-colors">
                                            {isWatched(ep) && <Check className="w-2 h-2 text-emerald-500" />}
                                            <span className={isWatched(ep) ? 'line-through opacity-50' : ''}>{ep.show_name}</span>
                                        </div>
                                    ))}
                                    {dayEps.length > 3 && <div className="text-[8px] text-zinc-600 pl-1">+{dayEps.length - 3} more</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default V2Calendar;
