
import React, { useState, useRef, useEffect } from 'react';
import { startOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, isSameMonth, addMonths, subMonths, addDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, Tv, Film, MonitorPlay, Eye, EyeOff, Check, CalendarDays, History, Ticket, PlayCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Episode } from '../types';
import { getImageUrl } from '../services/tmdb';

// --- SUB-COMPONENT: V2CALENDAR (The Grid) ---
const V2Calendar: React.FC = () => {
    const { calendarDate, setCalendarDate, episodes, settings, updateSettings, interactions } = useAppContext();
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    
    // Local visibility filters for the current view
    const [showTV, setShowTV] = useState(true);
    const [showMovies, setShowMovies] = useState(true);
    const [showHidden, setShowHidden] = useState(false);

    const filterRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
        };
        if (isFilterOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterOpen]);

    const monthStart = startOfMonth(calendarDate);
    const dateRange = eachDayOfInterval({
        start: startOfWeek(monthStart),
        end: endOfWeek(addDays(startOfWeek(monthStart), 41))
    }).slice(0, 42);

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
            <header className="h-16 shrink-0 border-b border-white/5 flex items-center bg-zinc-950/40 z-[60]">
                <div className="flex-1 flex flex-col justify-center px-6 border-r border-white/5 h-full">
                     <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none mb-1">{format(calendarDate, 'yyyy')}</span>
                     <span className="text-xl font-black text-white uppercase tracking-tighter leading-none">{format(calendarDate, 'MMMM')}</span>
                </div>
                <div className="flex h-full">
                    <button onClick={() => setCalendarDate(subMonths(calendarDate, 1))} className="w-16 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors border-r border-white/5"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => setCalendarDate(new Date())} className="px-6 h-full flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-indigo-400 hover:bg-white/5 transition-colors border-r border-white/5">Today</button>
                    <button onClick={() => setCalendarDate(addMonths(calendarDate, 1))} className="w-16 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors border-r border-white/5"><ChevronRight className="w-5 h-5" /></button>
                </div>
                <div className="flex h-full relative" ref={filterRef}>
                    <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`w-16 h-full flex items-center justify-center border-r border-white/5 transition-colors ${isFilterOpen ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}><Filter className="w-4 h-4" /></button>
                     {isFilterOpen && (
                        <div className="absolute top-full right-0 mt-0 w-64 bg-zinc-950 border border-white/10 rounded-bl-2xl shadow-2xl p-2 z-[100] animate-enter">
                            <div className="p-2 space-y-1">
                                <button onClick={() => setShowTV(!showTV)} className={`w-full flex items-center justify-between p-3 rounded-xl text-[11px] font-bold transition-all ${showTV ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:bg-white/5'}`}><div className="flex items-center gap-3"><Tv className="w-3.5 h-3.5" /> TV Series</div>{showTV && <Check className="w-3 h-3" />}</button>
                                <button onClick={() => setShowMovies(!showMovies)} className={`w-full flex items-center justify-between p-3 rounded-xl text-[11px] font-bold transition-all ${showMovies ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:bg-white/5'}`}><div className="flex items-center gap-3"><Film className="w-3.5 h-3.5" /> Movies</div>{showMovies && <Check className="w-3 h-3" />}</button>
                                <div className="h-px bg-white/5 my-2 mx-2" />
                                <button onClick={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })} className={`w-full flex items-center justify-between p-3 rounded-xl text-[11px] font-bold transition-all ${!settings.hideTheatrical ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:bg-white/5'}`}><div className="flex items-center gap-3"><MonitorPlay className="w-3.5 h-3.5" /> Digital Only</div>{!settings.hideTheatrical && <Check className="w-3 h-3" />}</button>
                            </div>
                        </div>
                    )}
                </div>
            </header>
            <div className="grid grid-cols-7 border-b border-white/5 bg-zinc-950/10 shrink-0">
                {weekDays.map(day => <div key={day} className="py-2 text-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] border-r border-white/5 last:border-r-0">{day}</div>)}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0 bg-[#020202]">
                {dateRange.map((day, idx) => {
                    const isActive = isSameDay(day, calendarDate);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const dayEps = getEpisodesForDay(day);
                    return (
                        <div key={day.toISOString()} onClick={() => setCalendarDate(day)} className={`relative border-r border-b border-white/5 flex flex-col group/cell overflow-hidden transition-all duration-300 cursor-pointer ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''} ${idx >= 35 ? 'border-b-0' : ''} ${isCurrentMonth ? 'bg-transparent' : 'bg-white/[0.01] opacity-20'} ${isActive ? 'bg-white/[0.04]' : 'hover:z-10 hover:bg-white/[0.02]'}`}>
                            <div className="absolute top-2 right-2 z-50"><span className={`text-[10px] font-mono font-black tracking-tighter px-1.5 py-0.5 rounded ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white shadow-lg' : isCurrentMonth ? (isActive ? 'text-white' : 'text-zinc-600') : 'text-zinc-800'}`}>{format(day, 'dd')}</span></div>
                            {dayEps.length === 1 ? <SingleEpisodeCell ep={dayEps[0]} /> : dayEps.length > 1 ? (
                                <div className="flex-1 flex flex-col p-2 pt-8"><div className="flex-1 space-y-0.5 overflow-hidden">{dayEps.slice(0, 4).map(ep => <MultiEpisodeItem key={`${ep.show_id}-${ep.id}`} ep={ep} />)}</div>{dayEps.length > 4 && <div className="mt-auto py-1 border-t border-white/5"><span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block text-center">+ {dayEps.length - 4} more</span></div>}</div>
                            ) : <div className="flex-1" />}
                            {isActive && <div className="absolute inset-0 border-[2px] border-indigo-500/80 pointer-events-none z-40 shadow-[inset_0_0_15px_rgba(99,102,241,0.1)]" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: V2AGENDA (The Side Panel) ---
const V2Agenda: React.FC = () => {
    const { calendarDate, episodes, settings, interactions, toggleEpisodeWatched, toggleWatched, markHistoryWatched, setTrailerTarget } = useAppContext();
    const dateKey = format(calendarDate, 'yyyy-MM-dd');
    const dayEps = (episodes[dateKey] || []).filter(ep => {
        if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
        if (settings.ignoreSpecials && ep.season_number === 0) return false;
        return true;
    });
    
    const groupedEps = dayEps.reduce((acc, ep) => {
        const key = ep.show_id || ep.id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(ep);
        return acc;
    }, {} as Record<number, Episode[]>);

    return (
        <aside className="hidden xl:flex flex-col w-[350px] bg-[#050505] border-l border-white/5 shrink-0 z-20">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {dayEps.length > 0 ? (
                    <div className="flex flex-col">
                        {Object.values(groupedEps).map((eps, idx) => {
                            const firstEp = eps[0];
                            const isWatched = interactions[`${firstEp.is_movie ? 'movie' : 'episode'}-${firstEp.show_id}-${firstEp.season_number}-${firstEp.episode_number}`]?.is_watched; // Simplified check
                            const imgUrl = getImageUrl(settings.spoilerConfig.images && !isWatched && settings.spoilerConfig.replacementMode === 'banner' ? firstEp.poster_path : firstEp.still_path || firstEp.poster_path);
                            
                            return (
                                <div key={idx} className="w-full bg-zinc-950 border-b border-white/5 flex flex-col group/card">
                                    <div className="bg-zinc-900/40 px-4 py-2 border-y border-white/5 flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.15em] truncate pr-4">{firstEp.show_name || firstEp.name}</h4>
                                        <button onClick={() => setTrailerTarget({ showId: firstEp.show_id!, mediaType: firstEp.is_movie ? 'movie' : 'tv', episode: firstEp })} className="p-1.5 text-zinc-600 hover:text-white transition-colors"><PlayCircle className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                                        <img src={imgUrl} alt="" className={`w-full h-full object-cover transition-all duration-700 ${settings.spoilerConfig.images && !isWatched && settings.spoilerConfig.replacementMode === 'blur' ? 'blur-2xl opacity-30' : 'opacity-60'}`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        {settings.spoilerConfig.images && !isWatched && settings.spoilerConfig.replacementMode === 'blur' && <div className="absolute inset-0 flex items-center justify-center"><EyeOff className="w-6 h-6 text-zinc-800" /></div>}
                                    </div>
                                    <div className="flex flex-col">
                                        {eps.map(ep => {
                                            const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                                            const isEpWatched = interactions[watchedKey]?.is_watched;
                                            return (
                                                <div key={ep.id} className={`px-4 py-3 border-b border-white/[0.03] last:border-b-0 flex items-center justify-between gap-4 ${isEpWatched ? 'opacity-30' : 'hover:bg-white/[0.02]'} transition-all`}>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1"><p className="text-[11px] font-bold truncate leading-none text-zinc-200">{settings.spoilerConfig.title && !isEpWatched ? `Episode ${ep.episode_number}` : ep.name}</p></div>
                                                        <div className="flex items-center gap-2"><p className="text-[9px] font-mono uppercase tracking-tighter truncate text-zinc-500">{ep.is_movie ? ep.overview : `S${ep.season_number} E${ep.episode_number}`}</p></div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {!ep.is_movie && <button onClick={() => ep.show_id && markHistoryWatched(ep.show_id, ep.season_number, ep.episode_number)} className="p-2 text-zinc-700 hover:text-emerald-500 transition-colors"><History className="w-3.5 h-3.5" /></button>}
                                                        <button onClick={() => ep.show_id && (ep.is_movie ? toggleWatched(ep.show_id, 'movie') : toggleEpisodeWatched(ep.show_id, ep.season_number, ep.episode_number))} className={`p-2 transition-all ${isEpWatched ? 'text-emerald-500' : 'text-zinc-600 hover:text-white'}`}><Check className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-50"><CalendarDays className="w-8 h-8 text-zinc-800 mb-4 stroke-[1px]" /><h4 className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mb-1">Clear Horizon</h4><p className="text-[9px] text-zinc-800 font-medium uppercase tracking-tighter">No scheduled tracking for this day</p></div>
                )}
            </div>
            <footer className="px-6 py-4 border-t border-white/5 bg-zinc-950/40">
                <div className="flex items-center justify-between mb-2"><span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Database Pulse</span><span className="text-[9px] font-mono text-emerald-600">LIVE</span></div>
                <div className="h-[2px] w-full bg-zinc-900 overflow-hidden rounded-full"><div className="h-full bg-indigo-500 w-[85%] shadow-[0_0_10px_rgba(99,102,241,0.4)] animate-pulse" /></div>
            </footer>
        </aside>
    );
}

// --- PAGE WRAPPER ---
const CalendarPage: React.FC = () => {
  return (
    <div className="flex h-full w-full">
        <main className="flex-1 min-w-0 h-full">
            <V2Calendar />
        </main>
        <V2Agenda />
    </div>
  );
};

export default CalendarPage;
