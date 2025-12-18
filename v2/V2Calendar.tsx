
import React from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, addMonths, subMonths, addDays, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Layers, LayoutGrid } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const V2Calendar: React.FC = () => {
    const { calendarDate, setCalendarDate, settings } = useAppContext();
    
    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(calendarDate);
    const dateRange = eachDayOfInterval({
        start: startOfWeek(monthStart),
        end: endOfWeek(addDays(startOfWeek(monthStart), 41)) // Ensure exactly 42 days (7x6)
    }).slice(0, 42);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#020202]">
            {/* Calendar Header / Toolbar */}
            <header className="h-20 shrink-0 border-b border-white/5 flex items-center justify-between px-8 bg-zinc-950/20">
                <div className="flex items-center gap-6">
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">
                        {format(calendarDate, 'MMMM')} <span className="text-zinc-700 font-mono font-light ml-1">{format(calendarDate, 'yyyy')}</span>
                    </h2>
                    <div className="flex items-center bg-zinc-900/50 rounded-xl p-1 border border-white/5">
                        <button 
                            onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                            className="p-2 hover:bg-white/5 text-zinc-500 hover:text-white transition-all rounded-lg"
                        >
                            <ChevronLeft className="w-4 h-4" />
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
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-zinc-900/50 rounded-xl p-1 border border-white/5">
                        <button className="p-2 bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20">
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors">
                            <Layers className="w-4 h-4" />
                        </button>
                    </div>
                    <button className="p-3 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all rounded-xl border border-white/5">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Weekdays Labels */}
            <div className="grid grid-cols-7 border-b border-white/5 bg-zinc-950/10">
                {weekDays.map(day => (
                    <div key={day} className="py-3 text-center text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] border-r border-white/5 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid Container */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 relative group/grid">
                {dateRange.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    
                    return (
                        <div 
                            key={day.toISOString()} 
                            className={`
                                relative border-r border-b border-white/5 flex flex-col group/cell overflow-hidden transition-colors
                                ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}
                                ${idx >= 35 ? 'border-b-0' : ''}
                                ${isCurrentMonth ? 'bg-transparent' : 'bg-white/[0.01] opacity-30'}
                                hover:bg-white/[0.02]
                            `}
                        >
                            <div className="p-4 flex items-start justify-between">
                                <span className={`
                                    text-sm font-mono font-medium tracking-tighter
                                    ${isToday ? 'text-indigo-400' : isCurrentMonth ? 'text-zinc-600 group-hover/cell:text-zinc-400' : 'text-zinc-800'}
                                    transition-colors
                                `}>
                                    {format(day, 'dd')}
                                </span>
                                {isToday && (
                                    <div className="w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]" />
                                )}
                            </div>
                            
                            {/* Inner Content Area */}
                            <div className="flex-1 px-3 pb-3 flex flex-col gap-1 overflow-y-auto hide-scrollbar select-none">
                                {/* Future: Map episodes here */}
                            </div>

                            {/* Active Cell Highlight */}
                            {isToday && (
                                <div className="absolute inset-x-0 top-0 h-0.5 bg-indigo-500/50" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default V2Calendar;
