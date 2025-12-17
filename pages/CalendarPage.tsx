
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths, addDays, isSameDay, subYears
} from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Ticket, MonitorPlay, Calendar as CalendarIcon, LayoutGrid, List, RefreshCw, Filter, Tv, Film, Check, History, GalleryVertical, Layers } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import EpisodeModal from '../components/EpisodeModal';
import { getImageUrl } from '../services/tmdb';
import { Episode } from '../types';

const CalendarPage: React.FC = () => {
  const { episodes, loading, isSyncing, settings, updateSettings, refreshEpisodes, loadArchivedEvents, interactions, toggleEpisodeWatched, toggleWatched, calendarScrollPos, setCalendarScrollPos } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  // Local Filter State
  const [showTV, setShowTV] = useState(true);
  const [showMovies, setShowMovies] = useState(true);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Check if we are in "Archived" territory (more than 1 year ago)
  const isArchivedDate = currentDate < subYears(new Date(), 1);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart);
    const days = [];
    let day = start;
    // 6 weeks * 7 days = 42 cells fixed
    for (let i = 0; i < 42; i++) {
        days.push(day);
        day = addDays(day, 1);
    }
    return days;
  }, [monthStart]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const filterEpisodes = (eps: Episode[]) => {
      if (!eps) return [];
      return eps.filter(ep => {
          // Global Settings Filters
          if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
          if (settings.ignoreSpecials && ep.season_number === 0) return false;

          // Local Type Filters
          if (!showTV && !ep.is_movie) return false;
          if (!showMovies && ep.is_movie) return false;

          return true;
      });
  };

  const getEpisodesForDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return filterEpisodes(episodes[dateKey]);
  };

  const activeDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(day => getEpisodesForDay(day).length > 0);
  const viewMode = settings.viewMode || 'grid';

  // Helper to cycle view modes
  const cycleViewMode = () => {
      const modes: ('grid' | 'list' | 'stack')[] = ['grid', 'list', 'stack'];
      const currentIdx = modes.indexOf(viewMode);
      const nextMode = modes[(currentIdx + 1) % modes.length];
      updateSettings({ viewMode: nextMode });
  };

  const ViewIcon = viewMode === 'grid' ? LayoutGrid : (viewMode === 'list' ? List : Layers);

  // Helper to check if a calendar date matches "Today" in the user's selected timezone
  const isTodayInZone = (date: Date) => {
      try {
          const tz = settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
          const now = new Date();
          
          // Get "Now" date string in target timezone
          const options: Intl.DateTimeFormatOptions = { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' };
          const formatter = new Intl.DateTimeFormat('en-US', options);
          const parts = formatter.formatToParts(now);
          const year = parts.find(p => p.type === 'year')?.value;
          const month = parts.find(p => p.type === 'month')?.value;
          const dayVal = parts.find(p => p.type === 'day')?.value;

          if (!year || !month || !dayVal) return isToday(date); // Fallback

          const targetDateStr = `${year}-${month.padStart(2,'0')}-${dayVal.padStart(2,'0')}`;
          return format(date, 'yyyy-MM-dd') === targetDateStr;
      } catch (e) {
          // Fallback if timezone invalid
          return isToday(date);
      }
  };

  // Scroll Persistence Logic
  useLayoutEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // 1. If we have a saved position, restore it
      if (calendarScrollPos > 0) {
          container.scrollTop = calendarScrollPos;
      } else {
          // 2. If no saved position (first load or manually cleared), scroll to Today
          // Only for List/Stack views where scrolling is primary interaction
          if (viewMode !== 'grid') {
              const el = document.getElementById('today-anchor');
              if (el) {
                  el.scrollIntoView({ behavior: 'auto', block: 'center' });
              }
          }
      }
  }, [viewMode, currentDate]); // Re-run on view change or month change

  // Save Scroll Position on Unmount
  useEffect(() => {
      const container = scrollContainerRef.current;
      const handleScroll = () => {
          if (container) {
              setCalendarScrollPos(container.scrollTop);
          }
      };

      if (container) {
          container.addEventListener('scroll', handleScroll, { passive: true });
      }

      return () => {
          if (container) {
              container.removeEventListener('scroll', handleScroll);
          }
      };
  }, [viewMode, setCalendarScrollPos]);


  // --- Components ---

  const CellContent = ({ ep, isMobile = false }: { ep: Episode, isMobile?: boolean }) => {
      // Determine image style based on settings. 
      const isContain = settings.calendarPosterFillMode === 'contain';
      const imgClass = isContain ? 'object-contain' : 'object-cover';
      
      const posterSrc = (settings.useSeason1Art && ep.season1_poster_path) 
          ? ep.season1_poster_path 
          : (ep.poster_path || ep.still_path);

      const imageUrl = getImageUrl(posterSrc);
      const isWatched = interactions[`episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`]?.is_watched;

      return (
          <div className="absolute inset-0 flex flex-col justify-end p-2 sm:p-3 overflow-hidden">
              <div className="absolute inset-0 z-0">
                   {isContain && (
                       <div 
                         className="absolute inset-0 bg-cover bg-center blur-md opacity-40 scale-110" 
                         style={{ backgroundImage: `url(${imageUrl})` }}
                       />
                   )}
                  <img 
                      src={imageUrl} 
                      className={`w-full h-full ${imgClass} ${isContain ? 'opacity-100 drop-shadow-xl' : 'opacity-80'} ${isWatched ? 'grayscale opacity-50' : ''}`}
                      alt=""
                      loading="lazy"
                  />
                  {!settings.cleanGrid && (
                       <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/50 to-transparent" />
                  )}
              </div>

              {isWatched && (
                  <div className="absolute top-2 right-2 z-20">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                          <Check className="w-3 h-3 text-white" />
                      </div>
                  </div>
              )}

              <div className="relative z-10 w-full pointer-events-none">
                  {!isMobile && !settings.cleanGrid && (
                      <h4 className={`text-[11px] sm:text-xs font-bold leading-tight line-clamp-2 mb-1 drop-shadow-md ${isWatched ? 'text-zinc-400 line-through decoration-zinc-500' : 'text-white'}`}>
                          {ep.show_name}
                      </h4>
                  )}
                  
                  <div className={`flex items-center gap-2 ${settings.cleanGrid ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300' : ''}`}>
                      {ep.is_movie ? (
                          <div className={`
                              flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold border backdrop-blur-md
                              ${ep.release_type === 'theatrical' 
                                  ? 'bg-pink-500/30 text-pink-200 border-pink-500/20' 
                                  : 'bg-emerald-500/30 text-emerald-200 border-emerald-500/20'}
                          `}>
                              {ep.release_type === 'theatrical' ? <Ticket className="w-3 h-3" /> : <MonitorPlay className="w-3 h-3" />}
                              {!isMobile && !settings.cleanGrid && <span className="hidden sm:inline">{ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}</span>}
                          </div>
                      ) : (
                          <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-medium border border-white/10 shadow-sm ${isWatched ? 'text-zinc-500' : 'text-slate-200'}`}>
                              <span>S{ep.season_number} E{ep.episode_number}</span>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className={`flex flex-col h-full gap-2 p-4 md:p-0 ${settings.compactCalendar ? 'overflow-hidden' : ''}`}>
      
      {/* Header Toolbar */}
      <div className="shrink-0 pb-2">
      
          {/* DESKTOP HEADER */}
          <div className="hidden md:flex items-center justify-between">
              <h2 className="text-3xl font-bold text-white tracking-tighter">
                  {format(currentDate, 'MMMM yyyy')}
              </h2>

              <div className="flex items-center gap-4">
                   <button onClick={() => refreshEpisodes(true)} disabled={loading || isSyncing} className="p-1 text-zinc-500 hover:text-indigo-400 transition-colors group" title="Force Refresh">
                      <RefreshCw className={`w-5 h-5 ${loading || isSyncing ? 'animate-spin text-indigo-500' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  </button>
                  <div className="w-px h-5 bg-[var(--border-color)]" />
                  <div className="flex items-center gap-6">
                      <button onClick={() => setShowTV(!showTV)} className={`transition-colors ${showTV ? 'text-white' : 'text-zinc-700 hover:text-zinc-500'}`} title="Toggle TV Shows"><Tv className="w-5 h-5" /></button>
                      <button onClick={() => setShowMovies(!showMovies)} className={`transition-colors ${showMovies ? 'text-white' : 'text-zinc-700 hover:text-zinc-500'}`} title="Toggle Movies"><Film className="w-5 h-5" /></button>
                  </div>
                  <div className="w-px h-5 bg-[var(--border-color)]" />
                  <button onClick={cycleViewMode} className="p-1 text-zinc-500 hover:text-white transition-colors" title="Toggle View">
                      <ViewIcon className="w-5 h-5" />
                  </button>
                   <div className="w-px h-5 bg-[var(--border-color)]" />
                   <div className="flex items-center gap-1">
                      <button onClick={prevMonth} className="p-2 text-zinc-500 hover:text-white transition-colors" title="Previous Month"><ChevronLeft className="w-5 h-5" /></button>
                      <button onClick={goToToday} className="px-2 text-sm font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider">This Week</button>
                      <button onClick={nextMonth} className="p-2 text-zinc-500 hover:text-white transition-colors" title="Next Month"><ChevronRight className="w-5 h-5" /></button>
                  </div>
              </div>
          </div>

          {/* MOBILE HEADER */}
          <div className="md:hidden flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                      {format(currentDate, 'MMMM yyyy')}
                  </h2>
                  <div className="flex items-center gap-6">
                      <button onClick={() => setShowTV(!showTV)} className={`transition-colors ${showTV ? 'text-white' : 'text-zinc-700'}`}><Tv className="w-5 h-5" /></button>
                      <button onClick={() => setShowMovies(!showMovies)} className={`transition-colors ${showMovies ? 'text-white' : 'text-zinc-700'}`}><Film className="w-5 h-5" /></button>
                  </div>
              </div>
              <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1">
                        <button onClick={prevMonth} className="p-1 text-zinc-500 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={goToToday} className="px-2 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider">This Week</button>
                        <button onClick={nextMonth} className="p-1 text-zinc-500 hover:text-white"><ChevronRight className="w-5 h-5" /></button>
                   </div>
                   <div className="flex items-center gap-3">
                        <div className="w-px h-4 bg-[var(--border-color)]" />
                        <button onClick={() => refreshEpisodes(true)} className={`text-zinc-500 ${loading || isSyncing ? 'animate-spin text-indigo-400' : ''}`}><RefreshCw className="w-5 h-5" /></button>
                        <div className="w-px h-4 bg-[var(--border-color)]" />
                        <button onClick={cycleViewMode} className="text-zinc-500 hover:text-white">
                            <ViewIcon className="w-5 h-5" />
                        </button>
                   </div>
              </div>
          </div>
      </div>
      
      {/* Archive Warning */}
      {isArchivedDate && activeDays.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center surface-panel rounded-2xl border-dashed border-[var(--border-color)] p-8 text-center bg-[var(--bg-panel)]">
             <History className="w-12 h-12 text-zinc-600 mb-4" />
             <h3 className="text-lg font-bold text-white mb-2">Archived History</h3>
             <p className="text-sm text-zinc-500 mb-6 max-w-sm">
                 To improve performance, older history is archived. Load it manually to view this month.
             </p>
             <button onClick={loadArchivedEvents} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                 <RefreshCw className="w-4 h-4" /> Load Archive
             </button>
          </div>
      )}

      {/* Loading State */}
      {loading && activeDays.length === 0 && !isArchivedDate ? (
          <div className="flex-1 flex flex-col items-center justify-center surface-panel rounded-2xl border-dashed border-[var(--border-color)] bg-[var(--bg-panel)]">
             <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
             <p className="text-sm text-zinc-500">Syncing your calendar...</p>
          </div>
      ) : (
          !isArchivedDate || activeDays.length > 0 ? (
          <>
            {/* --- GRID VIEW --- */}
            {viewMode === 'grid' && (
                <div className={`
                    flex flex-col bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl
                    ${settings.compactCalendar ? 'flex-1 h-full min-h-0' : 'aspect-[16/10]'}
                `}>
                    <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-panel)]">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                {day.charAt(0)}
                            </div>
                        ))}
                    </div>

                    <div 
                        className="grid grid-cols-7 flex-1 bg-[var(--bg-main)] overflow-y-auto"
                        ref={scrollContainerRef}
                    >
                        {calendarDays.map((day, idx) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const dayEpisodes = getEpisodesForDay(day);
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isDayToday = isTodayInZone(day);
                            const hasEpisodes = dayEpisodes.length > 0;
                            
                            const isLastCol = (idx + 1) % 7 === 0;
                            const isLastRow = idx >= 35;
                            const borderClasses = `
                                ${!isLastCol ? 'border-r border-[var(--border-color)]' : ''}
                                ${!isLastRow ? 'border-b border-[var(--border-color)]' : ''}
                            `;

                            return (
                                <div
                                    key={dateKey}
                                    onClick={() => hasEpisodes && setSelectedDate(day)}
                                    className={`
                                        relative group flex flex-col transition-colors
                                        min-h-[60px] md:min-h-0
                                        ${borderClasses}
                                        ${!isCurrentMonth ? 'bg-black/20 opacity-50' : ''}
                                        ${hasEpisodes ? 'cursor-pointer hover:bg-white/5' : ''}
                                    `}
                                >
                                    <div className={`
                                        absolute top-1 md:top-2 right-1 md:right-2 text-[10px] md:text-xs font-medium z-20 px-1.5 py-0.5 rounded
                                        ${isDayToday ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-zinc-500'}
                                    `}>
                                        {format(day, 'd')}
                                    </div>

                                    {hasEpisodes && (
                                        dayEpisodes.length === 1 ? (
                                            <>
                                                <div className="hidden md:block h-full">
                                                    <CellContent ep={dayEpisodes[0]} />
                                                </div>
                                                <div className="md:hidden h-full">
                                                    <CellContent ep={dayEpisodes[0]} isMobile={true} />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 p-1 flex flex-col gap-1 overflow-hidden z-10 pt-6 md:pt-8">
                                                <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-hidden">
                                                    {dayEpisodes.slice(0, 3).map((ep, i) => {
                                                        const posterSrc = (settings.useSeason1Art && ep.season1_poster_path) ? ep.season1_poster_path : ep.poster_path;
                                                        const isWatched = interactions[`episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`]?.is_watched;
                                                        
                                                        return (
                                                            <div key={i} className={`flex items-center gap-2 p-1.5 rounded border border-white/5 truncate shrink-0 ${isWatched ? 'bg-[var(--bg-panel)] opacity-60' : 'bg-[var(--bg-panel)]'}`}>
                                                                <div className="relative shrink-0 w-5 h-7">
                                                                    <img 
                                                                        src={getImageUrl(posterSrc)} 
                                                                        className={`w-full h-full object-cover rounded-[2px] opacity-90 ${isWatched ? 'grayscale' : ''}`}
                                                                        alt=""
                                                                        loading="lazy"
                                                                    />
                                                                    {isWatched && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Check className="w-3 h-3 text-emerald-500" /></div>}
                                                                </div>
                                                                <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                                    {!settings.cleanGrid && (
                                                                        <div className={`text-[9px] font-medium truncate leading-none mb-0.5 ${isWatched ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{ep.show_name}</div>
                                                                    )}
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[8px] text-zinc-500 truncate leading-none">
                                                                            {ep.is_movie ? (ep.release_type === 'theatrical' ? 'Cinema' : 'Digital') : `S${ep.season_number}E${ep.episode_number}`}
                                                                        </span>
                                                                        {ep.is_movie && (
                                                                            ep.release_type === 'theatrical' 
                                                                            ? <Ticket className="w-2.5 h-2.5 text-pink-400" />
                                                                            : <MonitorPlay className="w-2.5 h-2.5 text-emerald-400" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                
                                                {dayEpisodes.length > 3 && (
                                                    <div className="mt-auto text-[9px] text-center text-zinc-500 font-medium bg-black/20 py-0.5 shrink-0">
                                                        +{dayEpisodes.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                    
                                    {isDayToday && (
                                        <div className="absolute inset-0 border-[2px] border-indigo-500 pointer-events-none z-30 shadow-[inset_0_0_10px_rgba(99,102,241,0.2)]" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- LIST VIEW --- */}
            {viewMode === 'list' && (
                <div 
                    className="flex-1 overflow-y-auto px-1 custom-scrollbar"
                    ref={scrollContainerRef}
                >
                    {activeDays.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-2" />
                            <p>No episodes this month</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 pb-20 max-w-3xl mx-auto">
                            {activeDays.map(day => {
                                const eps = getEpisodesForDay(day);
                                const isDayToday = isTodayInZone(day); 

                                return (
                                    <div 
                                        key={day.toString()} 
                                        id={isDayToday ? 'today-anchor' : undefined}
                                        className="flex gap-4 scroll-mt-4"
                                    >
                                        <div className="w-12 md:w-14 flex flex-col items-center pt-1 shrink-0">
                                            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">{format(day, 'EEE')}</span>
                                            <div className={`
                                                w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-base md:text-lg font-bold border
                                                ${isDayToday 
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' 
                                                    : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-zinc-300'}
                                            `}>
                                                {format(day, 'd')}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-3 pb-4 border-b border-[var(--border-color)] min-w-0">
                                            {eps.map(ep => {
                                                const posterSrc = (settings.useSeason1Art && ep.season1_poster_path) ? ep.season1_poster_path : ep.poster_path;
                                                const isWatched = interactions[`episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`]?.is_watched;

                                                return (
                                                    <div 
                                                        key={`${ep.show_id}-${ep.id}`}
                                                        onClick={() => setSelectedDate(day)}
                                                        className={`surface-card rounded-xl p-3 flex gap-3 cursor-pointer group border transition-colors ${isWatched ? 'bg-[var(--bg-panel)] border-[var(--border-color)] opacity-60 hover:opacity-100' : 'bg-[var(--bg-panel)] border-[var(--border-color)] hover:border-indigo-500/30'}`}
                                                    >
                                                        <div className="relative w-12 h-16 shrink-0 rounded-md overflow-hidden bg-black shadow-sm">
                                                            <img 
                                                                src={getImageUrl(posterSrc)} 
                                                                className={`w-full h-full object-cover ${isWatched ? 'grayscale' : ''}`}
                                                                alt=""
                                                                loading="lazy"
                                                            />
                                                            {isWatched && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Check className="w-5 h-5 text-emerald-500" /></div>}
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            <h4 className={`font-bold text-sm truncate group-hover:text-indigo-400 transition-colors ${isWatched ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                                                                {ep.show_name}
                                                            </h4>
                                                            
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {ep.is_movie ? (
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${ep.release_type === 'theatrical' ? 'text-pink-300 border-pink-500/20 bg-pink-500/5' : 'text-emerald-300 border-emerald-500/20 bg-emerald-500/5'}`}>
                                                                        {ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-mono text-zinc-400">
                                                                        S{ep.season_number} E{ep.episode_number}
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] text-zinc-500 truncate hidden sm:inline">• {ep.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-zinc-500 truncate sm:hidden mt-0.5">{ep.name}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* --- STACK VIEW (Feed & Carousel) --- */}
            {viewMode === 'stack' && (
                <div 
                    className="flex-1 overflow-y-auto px-2 pb-24 custom-scrollbar snap-y snap-mandatory"
                    ref={scrollContainerRef}
                >
                    {activeDays.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <Layers className="w-12 h-12 mx-auto mb-2" />
                            <p>No episodes to stack</p>
                        </div>
                    ) : (
                        <div className="space-y-8 max-w-md mx-auto py-4">
                            {activeDays.map(day => {
                                const eps = getEpisodesForDay(day);
                                const isDayToday = isTodayInZone(day);

                                return (
                                    <div 
                                        key={day.toString()} 
                                        id={isDayToday ? 'today-anchor' : undefined}
                                        className="snap-start scroll-mt-4"
                                    >
                                        <div className="flex items-center gap-3 mb-3 px-2">
                                            <div className={`
                                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                                ${isDayToday ? 'bg-indigo-600 text-white' : 'bg-[var(--bg-panel)] text-zinc-400 border border-[var(--border-color)]'}
                                            `}>
                                                {format(day, 'd')}
                                            </div>
                                            <div className="flex flex-col leading-none">
                                                <span className={`text-xs font-bold uppercase tracking-wider ${isDayToday ? 'text-indigo-400' : 'text-zinc-500'}`}>
                                                    {format(day, 'EEEE')}
                                                </span>
                                                <span className="text-xs text-zinc-600 font-medium">
                                                    {format(day, 'MMMM yyyy')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Horizontal Swipe Container if > 1, else Single Card */}
                                        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar pr-4">
                                            {eps.map(ep => {
                                                const posterSrc = (settings.useSeason1Art && ep.season1_poster_path) ? ep.season1_poster_path : ep.poster_path;
                                                const backdropSrc = ep.still_path;
                                                const isWatched = interactions[`episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`]?.is_watched;

                                                return (
                                                    <div 
                                                        key={`${ep.show_id}-${ep.id}`}
                                                        className={`
                                                            relative w-[85vw] max-w-sm aspect-[4/5] sm:aspect-video shrink-0 snap-center rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color)]
                                                            group transition-all
                                                        `}
                                                    >
                                                        {/* Background Art */}
                                                        <div className="absolute inset-0">
                                                            <img 
                                                                src={getImageUrl(posterSrc)} 
                                                                className={`w-full h-full object-cover transition-all duration-700 ${isWatched ? 'grayscale opacity-30' : 'opacity-80'}`}
                                                                alt=""
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/40 to-transparent" />
                                                        </div>

                                                        {/* Content Overlay */}
                                                        <div className="absolute inset-0 flex flex-col justify-end p-5">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {ep.is_movie ? (
                                                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${ep.release_type === 'theatrical' ? 'bg-pink-500/20 text-pink-200 border-pink-500/30' : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'}`}>
                                                                            {ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-1 rounded-md bg-white/10 text-white text-[10px] font-bold backdrop-blur-md border border-white/10">
                                                                            S{ep.season_number} E{ep.episode_number}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                {isWatched && (
                                                                    <div className="bg-emerald-500/20 p-1.5 rounded-full backdrop-blur-md border border-emerald-500/30">
                                                                        <Check className="w-4 h-4 text-emerald-400" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <h3 className={`text-2xl font-bold leading-tight mb-1 ${isWatched ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                                                {ep.show_name}
                                                            </h3>
                                                            <p className="text-sm text-zinc-300 font-medium line-clamp-1 mb-4">
                                                                {ep.name}
                                                            </p>

                                                            {/* Action Bar */}
                                                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                                                <button 
                                                                    onClick={() => setSelectedDate(day)}
                                                                    className="py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-md transition-colors text-center"
                                                                >
                                                                    Details
                                                                </button>
                                                                {!ep.is_movie && (
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if(ep.show_id) toggleEpisodeWatched(ep.show_id, ep.season_number, ep.episode_number);
                                                                        }}
                                                                        className={`py-2.5 rounded-xl text-xs font-bold backdrop-blur-md transition-colors text-center ${isWatched ? 'bg-[var(--bg-panel)] text-zinc-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'}`}
                                                                    >
                                                                        {isWatched ? 'Unwatch' : 'Mark Watched'}
                                                                    </button>
                                                                )}
                                                                {ep.is_movie && (
                                                                     <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if(ep.show_id) toggleWatched(ep.show_id, 'movie');
                                                                        }}
                                                                        className={`py-2.5 rounded-xl text-xs font-bold backdrop-blur-md transition-colors text-center ${isWatched ? 'bg-[var(--bg-panel)] text-zinc-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'}`}
                                                                    >
                                                                        {isWatched ? 'Unwatch' : 'Mark Watched'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* Spacer for right padding */}
                                            <div className="w-2 shrink-0" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
          </>
          ) : null
      )}

      {selectedDate && (
        <EpisodeModal 
          isOpen={!!selectedDate} 
          onClose={() => setSelectedDate(null)} 
          episodes={getEpisodesForDay(selectedDate)}
          date={selectedDate}
        />
      )}
    </div>
  );
};

export default CalendarPage;
