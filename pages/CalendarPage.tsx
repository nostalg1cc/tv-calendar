import React, { useState, useMemo, useEffect } from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths, addDays, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Ticket, MonitorPlay, Calendar as CalendarIcon, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import EpisodeModal from '../components/EpisodeModal';
import { getImageUrl } from '../services/tmdb';
import { Episode } from '../types';

const CalendarPage: React.FC = () => {
  const { episodes, loading, settings, updateSettings, refreshEpisodes } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

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
          if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') {
              return false;
          }
          return true;
      });
  };

  const getEpisodesForDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return filterEpisodes(episodes[dateKey]);
  };

  const activeDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(day => getEpisodesForDay(day).length > 0);
  const isGridView = settings.viewMode !== 'list';

  // Auto-scroll to today in list view
  useEffect(() => {
      if (!isGridView) {
          // Delay slightly to ensure render
          setTimeout(() => {
              const el = document.getElementById('today-list-item');
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
          }, 100);
      }
  }, [isGridView, currentDate]); // Trigger on mode switch or month change

  // --- Components ---

  const CellContent = ({ ep, isMobile = false }: { ep: Episode, isMobile?: boolean }) => {
      // Determine image style based on settings. 
      // Remove bg-black for contain mode so blur shows through.
      const isContain = settings.calendarPosterFillMode === 'contain';
      const imgClass = isContain ? 'object-contain' : 'object-cover';

      return (
          <div className="absolute inset-0 flex flex-col justify-end p-2 sm:p-3 overflow-hidden">
              {/* Image Bg */}
              <div className="absolute inset-0 z-0">
                   {/* Optional Blur BG for Contain Mode */}
                   {isContain && (
                       <div 
                         className="absolute inset-0 bg-cover bg-center blur-md opacity-40 scale-110" 
                         style={{ backgroundImage: `url(${getImageUrl(ep.poster_path || ep.still_path)})` }}
                       />
                   )}
                  <img 
                      src={getImageUrl(ep.poster_path || ep.still_path)} 
                      className={`w-full h-full ${imgClass} ${isContain ? 'opacity-100 drop-shadow-xl' : 'opacity-60'}`}
                      alt=""
                  />
                  {/* Heavy Gradient for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/50 to-transparent" />
              </div>

              {/* Content - Desktop gets Text, Mobile gets minimal icons */}
              <div className="relative z-10 w-full pointer-events-none">
                  {!isMobile && (
                      <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight line-clamp-2 mb-1 drop-shadow-md">
                          {ep.show_name}
                      </h4>
                  )}
                  
                  <div className="flex items-center gap-2">
                      {ep.is_movie ? (
                          <div className={`
                              flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold border
                              ${ep.release_type === 'theatrical' 
                                  ? 'bg-pink-500/10 text-pink-300 border-pink-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}
                          `}>
                              {ep.release_type === 'theatrical' ? <Ticket className="w-3 h-3" /> : <MonitorPlay className="w-3 h-3" />}
                              {!isMobile && <span className="hidden sm:inline">{ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}</span>}
                          </div>
                      ) : (
                          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white/10 text-slate-200 text-[10px] font-medium border border-white/5">
                              <span>S{ep.season_number} E{ep.episode_number}</span>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className={`flex flex-col h-full gap-4 ${settings.compactCalendar ? 'overflow-hidden' : ''}`}>
      
      {/* Header Toolbar */}
      <div className="flex items-center justify-between gap-2 pt-2 shrink-0 md:pb-0 pb-2">
        <div className="flex items-center gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                {format(currentDate, 'MMMM yyyy')}
            </h2>
            
            {/* View Toggle */}
            <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
                <button 
                    onClick={() => updateSettings({ viewMode: 'grid' })}
                    className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${isGridView ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                >
                    <LayoutGrid className="w-3.5 h-3.5" /> <span className="hidden md:inline">Grid</span>
                </button>
                <button 
                    onClick={() => updateSettings({ viewMode: 'list' })}
                    className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${!isGridView ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                >
                    <List className="w-3.5 h-3.5" /> <span className="hidden md:inline">List</span>
                </button>
            </div>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2">
           <button 
                onClick={() => refreshEpisodes(true)}
                disabled={loading}
                className="p-2 text-zinc-400 hover:text-indigo-400 transition-colors"
                title="Refresh"
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="h-6 w-px bg-zinc-800 mx-1" />
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToToday} className="text-xs font-bold text-zinc-400 hover:text-white px-2 uppercase tracking-wider hidden md:block">
                Today
            </button>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
      </div>
      
      {/* Loading State */}
      {loading && activeDays.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center surface-panel rounded-2xl border-dashed border-zinc-800">
             <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
             <p className="text-sm text-zinc-500">Syncing your calendar...</p>
          </div>
      ) : (
          <>
            {/* GRID VIEW */}
            {isGridView && (
                <div className={`
                    flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl
                    ${settings.compactCalendar ? 'flex-1 h-full min-h-0' : 'aspect-[16/10]'}
                `}>
                    {/* Weekday Header */}
                    <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/80">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                {day.charAt(0)}
                            </div>
                        ))}
                    </div>

                    {/* Cells - Responsive Grid */}
                    <div className="grid grid-cols-7 flex-1 bg-zinc-950 overflow-y-auto">
                        {calendarDays.map((day, idx) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const dayEpisodes = getEpisodesForDay(day);
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isDayToday = isToday(day);
                            const hasEpisodes = dayEpisodes.length > 0;
                            
                            // Borders logic
                            const isLastCol = (idx + 1) % 7 === 0;
                            const isLastRow = idx >= 35;
                            const borderClasses = `
                                ${!isLastCol ? 'border-r border-zinc-800/50' : ''}
                                ${!isLastRow ? 'border-b border-zinc-800/50' : ''}
                            `;

                            return (
                                <div
                                    key={dateKey}
                                    onClick={() => hasEpisodes && setSelectedDate(day)}
                                    className={`
                                        relative group flex flex-col transition-colors
                                        min-h-[60px] md:min-h-0
                                        ${borderClasses}
                                        ${!isCurrentMonth ? 'bg-black/40 opacity-50' : ''}
                                        ${hasEpisodes ? 'cursor-pointer hover:bg-zinc-900/30' : ''}
                                    `}
                                >
                                    {/* Date Label */}
                                    <div className={`
                                        absolute top-1 md:top-2 right-1 md:right-2 text-[10px] md:text-xs font-medium z-20 px-1.5 py-0.5 rounded
                                        ${isDayToday ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-zinc-500'}
                                    `}>
                                        {format(day, 'd')}
                                    </div>

                                    {/* Content Render */}
                                    {hasEpisodes && (
                                        dayEpisodes.length === 1 ? (
                                            <>
                                                {/* Desktop Render */}
                                                <div className="hidden md:block h-full">
                                                    <CellContent ep={dayEpisodes[0]} />
                                                </div>
                                                {/* Mobile Render (Simplified) */}
                                                <div className="md:hidden h-full">
                                                    <CellContent ep={dayEpisodes[0]} isMobile={true} />
                                                </div>
                                            </>
                                        ) : (
                                            // Stacked View for Multiple Episodes
                                            <div className="absolute inset-0 p-1 flex flex-col gap-1 overflow-hidden z-10 pt-6 md:pt-8">
                                                {/* Unified Stack (Desktop & Mobile) */}
                                                <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-hidden">
                                                    {dayEpisodes.slice(0, 3).map((ep, i) => (
                                                        <div key={i} className="flex items-center gap-2 bg-zinc-900/90 p-1.5 rounded border border-zinc-800/50 truncate shrink-0">
                                                            <div className="relative shrink-0 w-5 h-7">
                                                                <img src={getImageUrl(ep.poster_path)} className="w-full h-full object-cover rounded-[2px] opacity-90" alt="" />
                                                            </div>
                                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                                <div className="text-[9px] text-zinc-200 font-medium truncate leading-none mb-0.5">{ep.show_name}</div>
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
                                                    ))}
                                                </div>
                                                
                                                {/* Footer "+X more" */}
                                                {dayEpisodes.length > 3 && (
                                                    <div className="mt-auto text-[9px] text-center text-zinc-500 font-medium bg-zinc-900/50 py-0.5 shrink-0">
                                                        +{dayEpisodes.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                    
                                    {/* Active Day Outline */}
                                    {isDayToday && (
                                        <div className="absolute inset-0 border-[2px] border-indigo-500 pointer-events-none z-30 shadow-[inset_0_0_10px_rgba(99,102,241,0.2)]" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* LIST VIEW */}
            {!isGridView && (
                <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
                    {activeDays.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-2" />
                            <p>No episodes this month</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 pb-20 max-w-3xl mx-auto">
                            {activeDays.map(day => {
                                const eps = getEpisodesForDay(day);
                                const isDayToday = isToday(day);

                                return (
                                    <div 
                                        key={day.toString()} 
                                        id={isDayToday ? 'today-list-item' : undefined}
                                        className="flex gap-4"
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
                                            {eps.map(ep => (
                                                <div 
                                                    key={`${ep.show_id}-${ep.id}`}
                                                    onClick={() => setSelectedDate(day)}
                                                    className="surface-card rounded-xl p-3 flex gap-3 cursor-pointer group bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 transition-colors"
                                                >
                                                    <div className="relative w-12 h-16 shrink-0 rounded-md overflow-hidden bg-black shadow-sm">
                                                        <img src={getImageUrl(ep.poster_path)} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <h4 className="font-bold text-zinc-200 text-sm truncate group-hover:text-indigo-400 transition-colors">
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
                                                    <div className="self-center pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
          </>
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