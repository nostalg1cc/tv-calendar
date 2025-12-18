
import React from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, addMonths, subMonths, addDays, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, Layers, LayoutGrid, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Episode } from '../types';
import { getImageUrl } from '../services/tmdb';

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

    const SingleEpisodeCell: React.FC<{ ep: Episode; isToday: boolean }> = ({ ep }) => {
        const imageUrl = getImageUrl(ep.poster_path);
        const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
        const isWatched = interactions[watchedKey]?.is_watched;

        return (
            <div className={`relative w-full h-full overflow-hidden transition-all duration-500 group/hero ${isWatched ? 'grayscale opacity-40' : ''}`}>
                {/* Background Pillar Fill (Blurred) */}
                <div 
                    className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-30" 
                    style={{ backgroundImage: `url(${imageUrl})` }}
                />
                
                {/* Sharp Poster (Contained) - Removed hover scale */}
                <img 
                    src={imageUrl} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-contain z-10 drop-shadow-2xl transition-opacity duration-700"
                />

                {/* Bottom Info Gradient */}
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

                {/* Status Indicator */}
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
            <div className="grid grid-cols-7 border-b border-white/5 bg-zinc-950/10 shrink-0">
                {weekDays.map(day => (
                    <div key={day} className="py-2.5 text-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] border-r border-white/5 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid Container - Flex 1 and Grid Rows ensure it fits viewport */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0 bg-[#020202]">
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
                                ${isCurrentMonth ? 'bg-transparent' : 'bg-white/[0.01] opacity-20'}
                                hover:z-10 hover:bg-white/[0.02]
                            `}
                        >
                            {/* Cell Header (Always visible) */}
                            <div className="absolute top-2 right-2 z-50">
                                <span className={`
                                    text-[10px] font-mono font-black tracking-tighter px-1.5 py-0.5 rounded
                                    ${isToday 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' 
                                        : isCurrentMonth ? 'text-zinc-600 group-hover/cell:text-zinc-300' : 'text-zinc-800'}
                                    transition-colors
                                `}>
                                    {format(day, 'dd')}
                                </span>
                            </div>

                            {dayEps.length === 1 ? (
                                <SingleEpisodeCell ep={dayEps[0]} isToday={isToday} />
                            ) : dayEps.length > 1 ? (
                                <div className="flex-1 flex flex-col p-2 pt-8">
                                    <div className="flex-1 space-y-0.5 overflow-hidden">
                                        {dayEps.slice(0, 4).map(ep => (
                                            <MultiEpisodeItem key={`${ep.show_id}-${ep.id}`} ep={ep} />
                                        ))}
                                    </div>
                                    {dayEps.length > 4 && (
                                        <div className="mt-auto py-1 border-t border-white/5">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block text-center group-hover/cell:text-indigo-400 transition-colors">
                                                +{dayEps.length - 4} more
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Empty state
                                <div className="flex-1" />
                            )}

                            {/* Today Active Indicator */}
                            {isToday && (
                                <div className="absolute inset-0 border-[1.5px] border-indigo-500/50 pointer-events-none z-40" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default V2Calendar;
