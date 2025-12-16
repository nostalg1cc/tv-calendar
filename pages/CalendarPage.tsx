import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths, addDays, isSameDay, subYears
} from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Ticket, MonitorPlay, Calendar as CalendarIcon, LayoutGrid, List, RefreshCw, Filter, Tv, Film, Check, History, Layers } from 'lucide-react';
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

      if (calendarScrollPos > 0) {
          container.scrollTop = calendarScrollPos;
      } else {
          if (viewMode !== 'grid') {
              const el = document.getElementById('today-anchor');
              if (el) {
                  el.scrollIntoView({ behavior: 'auto', block: 'center' });
              }
          }
      }
  }, [viewMode, currentDate]);

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
      const isContain = settings.calendarPosterFillMode === 'contain';
      const imgClass = isContain ? 'object-contain' : 'object-cover';
      
      const posterSrc = (settings.useSeason1Art && ep.season1_poster_path) 
          ? ep.season1_poster_path 
          : (ep.poster_path || ep.still_path);

      const imageUrl = getImageUrl(posterSrc);
      const isWatched = interactions[`episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`]?.is_watched;

      return (
          <div className="absolute inset-0 flex flex-col justify-end p-1.5 overflow-hidden">
              <div className="absolute inset-0 z-0 bg-zinc-900">
                   {isContain && (
                       <div 
                         className="absolute inset-0 bg-cover bg-center blur-md opacity-30 scale-110" 
                         style={{ backgroundImage: `url(${imageUrl})` }}
                       />
                   )}
                  <img 
                      src={imageUrl} 
                      className={`w-full h-full ${imgClass} ${isContain ? 'opacity-100' : 'opacity-80'} ${isWatched ? 'grayscale opacity-50' : ''}`}
                      alt=""
                      loading="lazy"
                  />
                  {!settings.cleanGrid && (
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                  )}
              </div>

              {isWatched && (
                  <div className="absolute top-1 right-1 z-20">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                          <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                  </div>
              )}

              <div className="relative z-10 w-full pointer-events-none">
                  {!isMobile && !settings.cleanGrid && (
                      <h4 className={`text-[10px] font-bold leading-tight line-clamp-2 mb-0.5 drop-shadow-md text-white`}>
                          {ep.show_name}
                      </h4>
                  )}
                  
                  <div className={`flex items-center gap-1 ${settings.cleanGrid ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300' : ''}`}>
                      {ep.is_movie ? (
                          <div className={`
                              flex items-center gap-1 px-1 py-0.5 rounded text-[8px] font-bold border backdrop-blur-md
                              ${ep.release_type === 'theatrical' 
                                  ? 'bg-pink-500/30 text-pink-100 border-pink-500/20' 
                                  : 'bg-emerald-500/30 text-emerald-100 border-emerald-500/20'}
                          `}>
                              {ep.release_type === 'theatrical' ? <Ticket className="w-2.5 h-2.5" /> : <MonitorPlay className="w-2.5 h-2.5" />}
                              {!isMobile && !settings.cleanGrid && <span className="hidden sm:inline">{ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}</span>}
                          </div>
                      ) : (
                          <div className={`flex items-center gap-1 px-1 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-medium border border-white/10 ${isWatched ? 'text-zinc-400' : 'text-zinc-200'}`}>
                              <span>S{ep.season_number} E{ep.episode_number}</span>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className={`flex flex-col h-full ${settings.compactCalendar ? 'overflow-hidden' : ''}`}>
      
      {/* Calendar Toolbar */}
      <div className="shrink-0 p-4 md:p-6 pb-2">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Month Nav */}
              <div className="flex items-center gap-3 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 shadow-sm w-full md:w-auto justify-between md:justify-start">
                  <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-lg font-bold text-white min-w-[140px] text-center select-none">
                      {format(currentDate, 'MMMM yyyy')}
                  </h1>
                  <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                      <ChevronRight className="w-5 h-5" />
                  </button>
              </div>

              {/* Tools */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-center">
                  <button onClick={goToToday} className="px-4 py-2 text-xs font-bold bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors text-white uppercase tracking-wider">
                      Today
                  </button>
                  
                  {/* Filters */}
                  <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                      <button onClick={() => setShowTV(!showTV)} className={`p-2 rounded-md transition-all ${showTV ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} title="Toggle TV">
                          <Tv className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowMovies(!showMovies)} className={`p-2 rounded-md transition-all ${showMovies ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} title="Toggle Movies">
                          <Film className="w-4 h-4" />
                      </button>
                  </div>

                  {/* Actions */}
                  <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                      <button onClick={() => refreshEpisodes(true)} disabled={loading || isSyncing} className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-md transition-colors">
                          <RefreshCw className={`w-4 h-4 ${loading || isSyncing ? 'animate-spin' : ''}`} />
                      </button>
                      <div className="w-px bg-zinc-800 my-1 mx-1" />
                      <button onClick={cycleViewMode} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
                          <ViewIcon className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          </div>
      </div>
      
      {/* Archive Warning */}
      {isArchivedDate && activeDays.length === 0 && !loading && (
          <div className="m-4 md:m-6 flex-1 flex flex-col items-center justify-center surface-panel rounded-2xl border-dashed border-zinc-800 p-8 text-center">
             <History className="w-12 h-12 text-zinc-600 mb-4" />
             <h3 className="text-lg font-bold text-white mb-2">Archived History</h3>
             <button onClick={loadArchivedEvents} className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2">
                 <RefreshCw className="w-4 h-4" /> Load Archive
             </button>
          </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 px-4 md:px-6 pb-4 md:pb-6 flex flex-col">
          {loading && activeDays.length === 0 && !isArchivedDate ? (
              <div className="flex-1 flex flex-col items-center justify-center surface-panel rounded-2xl border-dashed border-zinc-800">
                 <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                 <p className="text-sm text-zinc-500">Syncing calendar...</p>
              </div>
          ) : (
              !isArchivedDate || activeDays.length > 0 ? (
              <>
                {/* --- GRID VIEW --- */}
                {viewMode === 'grid' && (
                    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                        {/* Days Header */}
                        <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/50">
                            {weekDays.map(day => (
                                <div key={day} className="py-2.5 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                    {day.substring(0, 3)}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="flex-1 overflow-y-auto bg-zinc-950 relative" ref={scrollContainerRef}>
                            <div className="grid grid-cols-7 auto-rows-fr min-h-full">
                                {calendarDays.map((day, idx) => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    const dayEpisodes = getEpisodesForDay(day);
                                    const isCurrentMonth = isSameMonth(day, monthStart);
                                    const isDayToday = isTodayInZone(day);
                                    const hasEpisodes = dayEpisodes.length > 0;
                                    
                                    // Borders calculation
                                    const borderClass = `border-b border-r border-zinc-800`;
                                    
                                    return (
                                        <div
                                            key={dateKey}
                                            onClick={() => hasEpisodes && setSelectedDate(day)}
                                            className={`
                                                relative flex flex-col min-h-[80px] md:min-h-[110px] transition-colors
                                                ${borderClass}
                                                ${!isCurrentMonth ? 'bg-black/40' : 'bg-zinc-900/20'}
                                                ${hasEpisodes ? 'cursor-pointer hover:bg-zinc-900/50' : ''}
                                                ${isDayToday ? 'bg-indigo-900/10' : ''}
                                            `}
                                        >
                                            {/* Date Number */}
                                            <div className="absolute top-1.5 right-1.5 z-20 pointer-events-none">
                                                <div className={`
                                                    w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold
                                                    ${isDayToday 
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                                        : (!isCurrentMonth ? 'text-zinc-600' : 'text-zinc-400')}
                                                `}>
                                                    {format(day, 'd')}
                                                </div>
                                            </div>

                                            {/* Grid Cell Content */}
                                            <div className="flex-1 relative w-full h-full">
                                                {hasEpisodes && (
                                                    dayEpisodes.length === 1 ? (
                                                        <CellContent ep={dayEpisodes[0]} isMobile={false} />
                                                    ) : (
                                                        <div className="absolute inset-0 p-1 flex flex-col gap-1 pt-7">
                                                            {dayEpisodes.slice(0, 2).map((ep, i) => (
                                                                <div key={i} className="flex items-center gap-1.5 p-1 rounded bg-zinc-800/80 border border-zinc-700/50 overflow-hidden">
                                                                    <div className="w-1 h-4 bg-indigo-500 rounded-full shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <div className="text-[8px] font-bold text-zinc-300 truncate leading-none">{ep.show_name}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {dayEpisodes.length > 2 && (
                                                                <div className="mt-auto text-[9px] text-center font-bold text-zinc-500 bg-zinc-900/80 py-0.5 rounded border border-zinc-800">
                                                                    +{dayEpisodes.length - 2} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                            
                                            {/* Today Border */}
                                            {isDayToday && (
                                                <div className="absolute inset-0 border-[2px] border-indigo-500 pointer-events-none z-30" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
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
                                                        : 'bg-zinc-800 border-zinc-700 text-zinc-300'}
                                                `}>
                                                    {format(day, 'd')}
                                                </div>
                                            </div>

                                            <div className="flex-1 space-y-3 pb-4 border-b border-zinc-800 min-w-0">
                                                {eps.map(ep => {
                                                    const posterSrc = (settings.useSeason1Art && ep.season1_poster_path) ? ep.season1_poster_path : ep.poster_path;
                                                    const isWatched = interactions[`episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`]?.is_watched;

                                                    return (
                                                        <div 
                                                            key={`${ep.show_id}-${ep.id}`}
                                                            onClick={() => setSelectedDate(day)}
                                                            className={`surface-card rounded-xl p-3 flex gap-3 cursor-pointer group border transition-colors ${isWatched ? 'bg-zinc-900/50 border-zinc-800/50 opacity-60 hover:opacity-100' : 'bg-zinc-900 border-zinc-800 hover:border-indigo-500/30'}`}
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
                                                    ${isDayToday ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}
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
                                                    const isWatched = interactions[`episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`]?.is_watched;

                                                    return (
                                                        <div 
                                                            key={`${ep.show_id}-${ep.id}`}
                                                            className={`
                                                                relative w-[85vw] max-w-sm aspect-[4/5] sm:aspect-video shrink-0 snap-center rounded-2xl overflow-hidden shadow-2xl border border-zinc-800
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
                                                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
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
                                                                            className={`py-2.5 rounded-xl text-xs font-bold backdrop-blur-md transition-colors text-center ${isWatched ? 'bg-zinc-800 text-zinc-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'}`}
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
                                                                            className={`py-2.5 rounded-xl text-xs font-bold backdrop-blur-md transition-colors text-center ${isWatched ? 'bg-zinc-800 text-zinc-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'}`}
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
    </div>
  );
};

export default CalendarPage;