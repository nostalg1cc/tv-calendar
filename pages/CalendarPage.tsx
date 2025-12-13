import React, { useState } from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Ticket, MonitorPlay } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import EpisodeModal from '../components/EpisodeModal';
import { getImageUrl } from '../services/tmdb';
import { Episode } from '../types';

const CalendarPage: React.FC = () => {
  const { episodes, loading, settings } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate number of weeks to properly set grid rows in compact mode
  const weeksCount = Math.ceil(calendarDays.length / 7);

  // Helper to filter episodes based on settings
  const filterEpisodes = (eps: Episode[]) => {
      if (!eps) return [];
      return eps.filter(ep => {
          if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') {
              return false;
          }
          return true;
      });
  };

  const handleDayClick = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEpisodes = filterEpisodes(episodes[dateKey]);
    if (dayEpisodes.length > 0) {
      setSelectedDate(day);
    }
  };

  const getEpisodesForDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return filterEpisodes(episodes[dateKey]);
  };

  // --- Render Helpers ---

  // Used when there is exactly 1 show on this day
  const RenderFeaturedCell = ({ ep }: { ep: Episode }) => (
    <>
      <div className="absolute inset-0 z-0">
        <img 
            src={getImageUrl(ep.poster_path || ep.still_path)} 
            alt={ep.name}
            className="w-full h-full object-cover opacity-90 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
      </div>
      
      <div className="relative z-10 mt-auto p-2">
         <h3 className="text-xs font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
            {ep.show_name}
         </h3>
         <div className="flex justify-between items-center mt-0.5">
            {ep.is_movie ? (
                // Replaced generic MOVIE badge with subtle specific type icons if desired, or nothing as requested
                <div className="flex items-center gap-1.5 opacity-90">
                    {ep.release_type === 'theatrical' ? (
                        <Ticket className="w-3 h-3 text-pink-400" />
                    ) : (
                        <MonitorPlay className="w-3 h-3 text-emerald-400" />
                    )}
                </div>
            ) : (
                <p className="text-[10px] text-slate-300 font-medium opacity-90">
                    S{ep.season_number} E{ep.episode_number}
                </p>
            )}
         </div>
      </div>
    </>
  );

  // Used when there are > 1 shows on this day
  const RenderListCell = ({ eps }: { eps: Episode[] }) => {
    // In compact mode, we try to show up to 3, but if it overflows, flexbox handles it.
    // However, if we simply render fixed 3, it might push the footer out.
    // Instead of fixed slice, we render everything in a flex container and use hidden overflow,
    // but the "+X more" calculation logic needs to be aware of what's ACTUALLY shown vs hidden.
    // Since CSS can't easily tell JS "I hid 1 item", we stick to a logical slice for now, 
    // BUT we ensure the footer is flex-shrink-0 and the list is flex-shrink-1.
    // Ideally, for very small screens, we might only show 1 or 2 items.
    
    const displayEps = eps.slice(0, 4); // Try to show up to 4
    const remainder = Math.max(0, eps.length - 4); // Logic for simple remainder

    // Refined logic: If screen is small, we rely on flex-shrink/overflow-hidden to cut off the LIST, 
    // but we want to make sure the "Footer" (if exists) is always visible.
    // We'll structure it as: [Header] [List (Flex-1, Overflow-Hidden)] [Footer (Shrink-0)]

    return (
      <div className="w-full h-full bg-slate-900/90 p-1 flex flex-col overflow-hidden border-2 border-slate-700/50 rounded-xl relative">
        <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden">
            {displayEps.map((ep) => (
                <div key={`${ep.show_id}-${ep.id}`} className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/5 shrink-0">
                    <img 
                        src={getImageUrl(ep.poster_path)} 
                        className="w-4 h-6 object-cover rounded-[2px] shrink-0" 
                        alt=""
                    />
                    <div className="overflow-hidden min-w-0">
                        <p className="text-[9px] font-bold text-slate-200 truncate leading-none">{ep.show_name}</p>
                        {ep.is_movie ? (
                            <div className="mt-0.5 flex items-center">
                                {ep.release_type === 'theatrical' ? <Ticket className="w-2 h-2 text-pink-500" /> : <MonitorPlay className="w-2 h-2 text-emerald-500" />}
                            </div>
                        ) : (
                            <p className="text-[8px] text-slate-400 truncate leading-none mt-0.5">S{ep.season_number}E{ep.episode_number}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
        
        {remainder > 0 ? (
            <div className="shrink-0 text-[9px] text-center text-indigo-400 font-bold bg-slate-900/95 pt-0.5 mt-0.5 border-t border-white/5">
                +{remainder} more
            </div>
        ) : (
             null
        )}
      </div>
    );
  };

  return (
    <div className={`
        mx-auto 
        ${settings.compactCalendar ? 'h-full flex flex-col w-full' : 'max-w-[1400px] pb-12'}
    `}>
      {/* Decorative background */}
      <div className="fixed top-20 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 px-2 shrink-0">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          {format(currentDate, 'MMMM yyyy')}
        </h1>
        
        <div className="flex items-center gap-2">
           {loading && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mr-2" />}
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={goToToday} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
            Today
          </button>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className={`
        bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl
        ${settings.compactCalendar ? 'flex-1 flex flex-col min-h-0' : 'sm:p-6'}
      `}>
        {/* Days Header */}
        <div className="grid grid-cols-7 mb-2 shrink-0">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div 
            className={`
                grid grid-cols-7 gap-2 
                ${settings.compactCalendar ? 'h-full' : 'sm:gap-3'}
            `}
            style={settings.compactCalendar ? { gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` } : {}}
        >
          {calendarDays.map((day) => {
            const dayEpisodes = getEpisodesForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isDayToday = isToday(day);
            const hasEpisodes = dayEpisodes.length > 0;
            const isSingle = dayEpisodes.length === 1;

            return (
              <div
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                style={!settings.compactCalendar ? { aspectRatio: '2/3' } : {}}
                className={`
                  relative w-full rounded-xl flex flex-col transition-all duration-300 group overflow-hidden border
                  ${!isCurrentMonth ? 'opacity-30 border-transparent bg-slate-900/20 grayscale' : 'bg-slate-800 border-white/5'}
                  ${hasEpisodes ? 'cursor-pointer hover:z-10 hover:shadow-2xl' : ''}
                `}
              >
                {/* Date Number */}
                <div className={`
                  absolute top-1 left-1 z-20 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold pointer-events-none
                  ${isDayToday 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' 
                    : 'bg-black/40 backdrop-blur-md text-white/80'}
                `}>
                  {format(day, 'd')}
                </div>

                {hasEpisodes ? (
                    <>
                        {/* New Hover Border: Indigo, 2px */}
                        <div className="absolute inset-0 z-50 pointer-events-none rounded-xl border-2 border-[#4f46e5] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        {isSingle ? (
                            <RenderFeaturedCell ep={dayEpisodes[0]} />
                        ) : (
                            <RenderListCell eps={dayEpisodes} />
                        )}
                    </>
                ) : (
                    // Empty State
                    <div className="w-full h-full opacity-0 group-hover:opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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