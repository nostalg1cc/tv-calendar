import React, { useState, useEffect } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, addDays 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarEpisodes } from '../hooks/useQueries';
import { getImageUrl } from '../services/tmdb';
import { useStore } from '../store';
import { Episode } from '../types';

interface V2CalendarProps {
    selectedDay: Date;
    onSelectDay: (date: Date) => void;
}

const V2Calendar: React.FC<V2CalendarProps> = ({ selectedDay, onSelectDay }) => {
    const { settings, history } = useStore();
    const [currentDate, setCurrentDate] = useState(selectedDay);
    
    // When selectedDay changes externally (e.g. searching), we could sync it here
    // but for now, we keep the view independent unless explicitly reset.

    const { episodes } = useCalendarEpisodes(currentDate);

    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    // 6 weeks fixed grid (42 days)
    const calendarDays = eachDayOfInterval({ start: startDate, end: addDays(startDate, 41) });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    
    const isViewingCurrentMonth = isSameMonth(new Date(), currentDate);

    // Group episodes by date for efficient rendering
    const episodesByDate = episodes.reduce((acc, ep) => {
        if (!ep.air_date) return acc;
        if (!acc[ep.air_date]) acc[ep.air_date] = [];
        
        // Filter Logic
        if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return acc;
        if (settings.ignoreSpecials && ep.season_number === 0) return acc;
        
        acc[ep.air_date].push(ep);
        return acc;
    }, {} as Record<string, Episode[]>);

    return (
        <div className="flex flex-col h-full bg-[#020202]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl shrink-0 h-20">
                <div className="flex items-center gap-6 h-full">
                    <div className="flex flex-col justify-center min-w-[140px]">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                            {format(currentDate, 'MMMM')}
                        </h2>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em]">
                            {format(currentDate, 'yyyy')}
                        </span>
                    </div>
                    
                    <div className="h-10 w-px bg-white/10 mx-2 hidden sm:block" />

                    <div className="flex items-center gap-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center h-full">
                     <button 
                        onClick={() => {
                            const now = new Date();
                            setCurrentDate(now);
                            onSelectDay(now);
                        }} 
                        className={`
                            px-4 sm:px-6 h-10 sm:h-12 flex items-center justify-center gap-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all
                            ${isViewingCurrentMonth ? 'text-zinc-600 cursor-default' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500'}
                        `}
                        disabled={isViewingCurrentMonth}
                    >
                         {isViewingCurrentMonth ? 'Current' : 'Return'}
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 p-2 gap-1 overflow-hidden min-h-0">
                {calendarDays.map((day, idx) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEps = episodesByDate[dateKey] || [];
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isSelected = isSameDay(day, selectedDay);
                    const isTodayDate = isToday(day);

                    return (
                        <div 
                            key={day.toString()}
                            onClick={() => {
                                if (!isSameMonth(day, currentDate)) {
                                    setCurrentDate(day);
                                }
                                onSelectDay(day);
                            }}
                            className={`
                                relative group flex flex-col p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer border overflow-hidden
                                ${!isCurrentMonth ? 'opacity-20 hover:opacity-50 border-transparent' : ''}
                                ${isSelected ? 'bg-white/5 border-indigo-500/50 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]' : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'}
                            `}
                        >
                            <div className="flex items-center justify-between mb-1 sm:mb-2 shrink-0">
                                <span className={`text-[10px] sm:text-xs font-bold ${isTodayDate ? 'text-indigo-400' : 'text-zinc-500'}`}>
                                    {format(day, 'd')}
                                </span>
                                {isTodayDate && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_indigo]" />}
                            </div>

                            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                {dayEps.slice(0, 4).map((ep, i) => {
                                    const watchedKey = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                                    const isWatched = history[watchedKey]?.is_watched;
                                    
                                    return (
                                        <div key={i} className="flex items-center gap-1.5 group/item min-h-[14px]">
                                            <div className="h-full w-0.5 sm:w-1 shrink-0 rounded-full bg-zinc-800 overflow-hidden relative">
                                                <div className={`absolute inset-0 ${isWatched ? 'bg-emerald-500' : (ep.is_movie ? 'bg-pink-500' : 'bg-indigo-500')}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-[8px] sm:text-[9px] font-medium truncate leading-none ${isWatched ? 'text-zinc-600 line-through' : 'text-zinc-300 group-hover/item:text-white'}`}>
                                                    {ep.show_name}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {dayEps.length > 4 && (
                                    <span className="text-[8px] text-zinc-600 font-bold pl-2">+{dayEps.length - 4}</span>
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