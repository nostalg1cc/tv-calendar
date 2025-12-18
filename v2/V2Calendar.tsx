
import React from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, addMonths, subMonths, addDays, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, Layers, LayoutGrid, Check, Tv, Film, Ticket, MonitorPlay } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Episode } from '../types';

const V2Calendar: React.FC = () => {
    const { calendarDate, setCalendarDate, episodes, settings, interactions } = useAppContext();
    
    const monthStart = startOfMonth(calendarDate);
    const dateRange = eachDayOfInterval({
        start: startOfWeek(monthStart),
        end: endOfWeek(addDays(startOfWeek(monthStart), 41)) // Ensure exactly 42 days (7x6)
    }).slice(0, 42);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getEpisodesForDay = (day: Date) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayEps = episodes[dateKey] || [];
        
        return dayEps.filter(ep => {
            if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
            if (settings.ignoreSpecials && ep.season_number === 0) return false;
            return true;
        });
    };

    const EpisodeItem: React.FC<{ ep: Episode }> = ({ ep }) => {
        const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
        const isWatched = interactions[watchedKey]?.is_watched;
        
        return (
            <div 
                className={`
                    group/item flex items-center gap-2 py-1 px-1.5 rounded-md transition-all cursor-pointer
                    ${isWatched ? 'opacity-30' : 'hover:bg-white/5'}
                `}
            >
                {/* Status indicator */}
                <div className={`w-1 h-1 rounded-full shrink-0 ${isWatched ? 'bg-zinc-600' : ep.is_movie ? 'bg-pink-500' : 'bg-indigo-500'}`} />
                
                <span className={`text-[10px] font-medium truncate flex-1 ${isWatched ? 'text-zinc-600' : 'text-zinc-300 group-hover/item:text-white'}`}>
                    {ep.show_name || ep.name}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    {isWatched ? (
                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                    ) : ep.is_movie ? (
                        ep.release_type === 'theatrical' ? <Ticket className="w-2.5 h-2.5 text-pink-500" /> : <MonitorPlay className="w-2.5 h-2.5 text-emerald-500" />
                    ) : (
                        <span className="text-[8px] font-mono text-zinc-500">S{ep.season_number}</span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#020202]">
            {/* Calendar Header / Toolbar */}
            <header className="h-20 shrink-0 border-b border-white/5 flex items-center justify-between px-8 bg-zinc-950/20 backdrop-blur-md z-10">
                <div className="flex items-center gap-6">
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-baseline">
                        {format(calendarDate, 'MMMM')} 
                        <span className="text-zinc-700 font-mono font-light ml-2 text-lg">{format(calendarDate, 'yyyy')}</span>
                    </h2>
                    <div className="flex items-center bg-zinc-900/50 rounded-xl p-1 border border-white/5">
                        <button 
                            onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                            className="p-2 hover:bg-white/5 text-zinc-500 hover:text-white transition-all rounded-lg"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => setCalendarDate(new Date())}
                            className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-400 transition-colors"
                        >
                            Today
                        </button>
                        <button 
                            onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
                            className="p-2 hover:bg-white/5 text-zinc-500 hover:text-white transition-all rounded-lg"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-zinc-900/50 rounded-xl p-1 border border-white/5">
                        <button className="p-2 bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20">
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors">
                            <Layers className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <button className="p-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all rounded-xl border border-white/5">
                        <Filter className="w-3.5 h-3.5" />
                    </button>
                </div>
            </header>

            {/* Weekdays Labels */}
            <div className="grid grid-cols-7 border-b border-white/5 bg-zinc-950/10">
                {weekDays.map(day => (
                    <div key={day} className="py-2.5 text-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] border-r border-white/5 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid Container */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 relative group/grid">
                {dateRange.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const dayEps = getEpisodesForDay(day);
                    
                    return (
                        <div 
                            key={day.toISOString()} 
                            className={`
                                relative border-r border-b border-white/5 flex flex-col group/cell overflow-hidden transition-all duration-300
                                ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}
                                ${idx >= 35 ? 'border-b-0' : ''}
                                ${isCurrentMonth ? 'bg-transparent' : 'bg-white/[0.01] opacity-30'}
                                hover:bg-white/[0.02]
                            `}
                        >
                            <div className="p-3 pb-1 flex items-start justify-between">
                                <span className={`
                                    text-[11px] font-mono font-black tracking-tighter px-1.5 py-0.5 rounded
                                    ${isToday 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                        : isCurrentMonth ? 'text-zinc-500 group-hover/cell:text-zinc-300' : 'text-zinc-800'}
                                    transition-colors
                                `}>
                                    {format(day, 'dd')}
                                </span>
                                {dayEps.length > 0 && !isToday && (
                                    <span className="text-[9px] font-black text-zinc-700 group-hover/cell:text-zinc-500 transition-colors">
                                        {dayEps.length}
                                    </span>
                                )}
                            </div>
                            
                            {/* Inner Content Area */}
                            <div className="flex-1 px-2 pb-2 mt-1 space-y-0.5 overflow-y-auto hide-scrollbar select-none">
                                {dayEps.slice(0, 5).map(ep => (
                                    <EpisodeItem key={`${ep.show_id}-${ep.id}`} ep={ep} />
                                ))}
                                {dayEps.length > 5 && (
                                    <div className="px-1.5 py-1 text-[8px] font-black text-zinc-600 uppercase tracking-widest text-center group-hover/cell:text-zinc-400">
                                        + {dayEps.length - 5} more
                                    </div>
                                )}
                            </div>

                            {/* Today Glow */}
                            {isToday && (
                                <div className="absolute inset-x-0 top-0 h-[2px] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default V2Calendar;
