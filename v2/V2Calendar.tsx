import React, { useState, useMemo, useEffect } from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths, addDays, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { Episode } from '../types';
import { useCalendarEpisodes } from '../hooks/useQueries';

interface V2CalendarProps {
    selectedDay: Date;
    onSelectDay: (date: Date) => void;
}

const V2Calendar: React.FC<V2CalendarProps> = ({ selectedDay, onSelectDay }) => {
    const [currentMonth, setCurrentMonth] = useState(selectedDay);
    
    // Sync local view if selected day changes externally (e.g. searching)
    useEffect(() => {
        if (!isSameMonth(selectedDay, currentMonth)) {
            setCurrentMonth(selectedDay);
        }
    }, [selectedDay]);

    const { history } = useStore();
    const { episodes: rawEpisodes } = useCalendarEpisodes(currentMonth);

    const episodes = useMemo(() => {
        const map: Record<string, Episode[]> = {};
        rawEpisodes.forEach(ep => {
            if (!ep.air_date) return;
            if (!map[ep.air_date]) map[ep.air_date] = [];
            map[ep.air_date].push(ep);
        });
        return map;
    }, [rawEpisodes]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = useMemo(() => {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const remaining = 42 - days.length;
        if (remaining > 0) {
            const last = days[days.length - 1];
            for (let i = 1; i <= remaining; i++) {
                days.push(addDays(last, i));
            }
        }
        return days;
    }, [startDate, endDate]);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="flex flex-col h-full bg-[#020202]">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-950/30 shrink-0">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                
                <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => { setCurrentMonth(new Date()); onSelectDay(new Date()); }} className="px-3 py-1 text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest hover:bg-white/5 rounded transition-colors">
                        Today
                    </button>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-white/5 shrink-0">
                {weekDays.map(day => (
                    <div key={day} className="py-2 text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0">
                {calendarDays.map((day, idx) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEpisodes = episodes[dateKey] || [];
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isSelected = isSameDay(day, selectedDay);
                    const isTodayDate = isToday(day);

                    const isRightEdge = (idx + 1) % 7 === 0;
                    const isBottomEdge = idx >= 35;
                    const borderClasses = `
                        ${!isRightEdge ? 'border-r border-white/[0.03]' : ''} 
                        ${!isBottomEdge ? 'border-b border-white/[0.03]' : ''}
                    `;

                    return (
                        <div 
                            key={dateKey}
                            onClick={() => onSelectDay(day)}
                            className={`
                                relative flex flex-col p-1 transition-colors cursor-pointer group
                                ${borderClasses}
                                ${!isCurrentMonth ? 'bg-zinc-950/30 text-zinc-600' : 'bg-transparent text-zinc-300'}
                                ${isSelected ? 'bg-white/[0.03] shadow-[inset_0_0_0_2px_rgba(99,102,241,0.5)]' : 'hover:bg-white/[0.02]'}
                            `}
                        >
                            <div className="flex justify-between items-start p-1">
                                <span className={`text-[10px] font-bold ${isTodayDate ? 'text-indigo-400' : ''}`}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden px-1 pb-1">
                                {dayEpisodes.slice(0, 4).map((ep, i) => {
                                    const key = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                                    const isWatched = history[key]?.is_watched;
                                    
                                    return (
                                        <div key={i} className="flex items-center gap-2 overflow-hidden">
                                            <div className="w-1 h-4 rounded-full bg-zinc-800 shrink-0 relative overflow-hidden">
                                                <div className={`absolute inset-0 ${ep.is_movie ? 'bg-pink-500' : 'bg-indigo-500'} ${isWatched ? 'opacity-30' : ''}`} />
                                            </div>
                                            <span className={`text-[9px] font-medium truncate ${isWatched ? 'text-zinc-600 line-through' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                                {ep.show_name}
                                            </span>
                                        </div>
                                    )
                                })}
                                {dayEpisodes.length > 4 && (
                                    <div className="mt-auto text-[8px] font-bold text-zinc-600 uppercase tracking-wide text-center">
                                        +{dayEpisodes.length - 4} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default V2Calendar;