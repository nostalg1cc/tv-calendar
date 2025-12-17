
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths, addDays, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, MonitorPlay, Ticket, Star, Calendar as CalendarIcon, Clock, CheckCircle2, Film, Tv, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getImageUrl, getBackdropUrl } from '../../services/tmdb';
import { Episode } from '../../types';

// V2 Calendar Page: A Unified Dashboard
const V2CalendarPage: React.FC = () => {
  const { episodes, interactions, settings, calendarDate, setCalendarDate, toggleWatched, toggleEpisodeWatched } = useAppContext();
  
  // Use Context date for persistence, but local 'selectedDay' for the dashboard panel
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  
  // Update selected day if calendar changes drastically (optional, mostly keep them separate)
  useEffect(() => {
      if (!isSameMonth(selectedDay, calendarDate)) {
          // If user navigates month, maybe keep selection or reset? 
          // Let's keep selection until they click a new day to avoid jumping
      }
  }, [calendarDate]);

  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    // Ensure we fill enough rows
    const days = eachDayOfInterval({ start, end });
    // Pad to 42 if needed for consistent height
    const remaining = 42 - days.length;
    for(let i=0; i<remaining; i++) {
        days.push(addDays(days[days.length-1], 1));
    }
    return days;
  }, [monthStart, monthEnd]);

  const getEpisodesForDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEps = episodes[dateKey] || [];
    // Apply basic filters
    return dayEps.filter(ep => {
        if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
        if (settings.ignoreSpecials && ep.season_number === 0) return false;
        return true;
    });
  };

  const selectedDayEpisodes = useMemo(() => getEpisodesForDay(selectedDay), [selectedDay, episodes]);

  // Handle Month Nav
  const prevMonth = () => setCalendarDate(subMonths(calendarDate, 1));
  const nextMonth = () => setCalendarDate(addMonths(calendarDate, 1));
  const goToday = () => {
      const now = new Date();
      setCalendarDate(now);
      setSelectedDay(now);
  };

  return (
    <div className="flex h-full w-full">
        {/* LEFT: Main Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="h-24 flex items-center justify-between px-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight flex items-baseline gap-3">
                        {format(calendarDate, 'MMMM')} 
                        <span className="text-xl text-[var(--text-muted)] font-normal">{format(calendarDate, 'yyyy')}</span>
                    </h1>
                </div>
                
                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/5 backdrop-blur-md">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-[var(--text-muted)] hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={goToday} className="px-4 py-1.5 text-sm font-bold text-[var(--text-muted)] hover:text-white transition-colors">Today</button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-[var(--text-muted)] hover:text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col px-8 pb-8 min-h-0">
                {/* Days Header */}
                <div className="grid grid-cols-7 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider pl-2">{d}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2">
                    {calendarDays.map((day, idx) => {
                        const eps = getEpisodesForDay(day);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isSelected = isSameDay(day, selectedDay);
                        const isDayToday = isToday(day);
                        const hasEps = eps.length > 0;

                        return (
                            <div 
                                key={day.toString()}
                                onClick={() => setSelectedDay(day)}
                                className={`
                                    relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden group
                                    ${isSelected 
                                        ? 'bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500/50 z-10' 
                                        : 'bg-[var(--bg-panel)]/40 border-white/5 hover:border-white/20 hover:bg-white/5'}
                                    ${!isCurrentMonth ? 'opacity-30 grayscale' : ''}
                                `}
                            >
                                {/* Date Number */}
                                <div className={`
                                    absolute top-2 left-2 w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold z-20
                                    ${isDayToday ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40' : 'text-[var(--text-muted)]'}
                                `}>
                                    {format(day, 'd')}
                                </div>

                                {/* Content Preview (Posters) */}
                                {hasEps && (
                                    <div className="absolute inset-0 p-1 pt-8 flex flex-col gap-1">
                                        {eps.slice(0, 2).map((ep, i) => {
                                            const poster = getImageUrl(ep.poster_path);
                                            const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                                            const isWatched = interactions[watchedKey]?.is_watched;

                                            return (
                                                <div key={i} className="flex items-center gap-2 bg-black/40 p-1 rounded-lg backdrop-blur-sm border border-white/5">
                                                    <img src={poster} className={`w-6 h-8 rounded object-cover ${isWatched ? 'grayscale opacity-50' : ''}`} alt="" />
                                                    <div className="min-w-0">
                                                        <div className={`text-[9px] font-bold truncate leading-tight ${isWatched ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                                                            {ep.show_name}
                                                        </div>
                                                        <div className="text-[8px] text-zinc-500">
                                                            {ep.is_movie ? 'Movie' : `S${ep.season_number}E${ep.episode_number}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {eps.length > 2 && (
                                            <div className="mt-auto flex justify-center pb-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* Hover Glow */}
                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* RIGHT: Agenda / Details Panel (Always visible on desktop) */}
        <div className="w-96 border-l border-white/5 bg-[var(--bg-panel)]/30 backdrop-blur-2xl flex flex-col shrink-0">
            {/* Panel Header */}
            <div className="h-24 flex flex-col justify-center px-6 border-b border-white/5 shrink-0">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {isToday(selectedDay) ? "Today's Agenda" : format(selectedDay, 'EEEE, MMM do')}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    {selectedDayEpisodes.length} {selectedDayEpisodes.length === 1 ? 'Release' : 'Releases'} scheduled
                </p>
            </div>

            {/* Episodes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {selectedDayEpisodes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
                        <CalendarIcon className="w-12 h-12 mb-4 stroke-1" />
                        <p className="text-sm">No releases for this day.</p>
                    </div>
                ) : (
                    selectedDayEpisodes.map(ep => {
                        const poster = getImageUrl(ep.poster_path || ep.still_path);
                        const backdrop = getBackdropUrl(ep.backdrop_path || ep.show_backdrop_path);
                        const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                        const isWatched = interactions[watchedKey]?.is_watched;

                        return (
                            <div key={`${ep.id}`} className="group relative bg-[var(--bg-main)] border border-white/5 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-indigo-500/30">
                                {/* Cinematic Backdrop Header */}
                                <div className="h-24 relative">
                                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backdrop})` }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] to-transparent" />
                                    <div className="absolute top-2 right-2">
                                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${ep.is_movie ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20'}`}>
                                            {ep.is_movie ? 'Movie' : 'Episode'}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4 relative -mt-8">
                                    <div className="flex gap-4">
                                        <img src={poster} className="w-20 h-28 object-cover rounded-lg shadow-2xl border border-white/10 shrink-0 bg-black" alt="" />
                                        <div className="flex-1 min-w-0 pt-8">
                                            <h3 className={`font-bold text-white leading-tight line-clamp-2 ${isWatched ? 'line-through text-[var(--text-muted)]' : ''}`}>
                                                {ep.show_name}
                                            </h3>
                                            <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-2">
                                                {!ep.is_movie && <span className="font-mono text-indigo-400">S{ep.season_number} E{ep.episode_number}</span>}
                                                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {ep.vote_average.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h4 className="text-sm font-bold text-white mb-1">{ep.name}</h4>
                                        <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                                            {ep.overview || "No overview available."}
                                        </p>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                                        <button 
                                            onClick={() => {
                                                if (ep.show_id) {
                                                    if (ep.is_movie) toggleWatched(ep.show_id, 'movie');
                                                    else toggleEpisodeWatched(ep.show_id, ep.season_number, ep.episode_number);
                                                }
                                            }}
                                            className={`
                                                flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all
                                                ${isWatched 
                                                    ? 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10' 
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}
                                            `}
                                        >
                                            {isWatched ? <CheckCircle2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {isWatched ? 'Watched' : 'Mark Watched'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    </div>
  );
};

export default V2CalendarPage;
