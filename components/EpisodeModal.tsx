import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Star, Bell, Eye, EyeOff, Film, Ticket, MonitorPlay, Globe, Check, CheckCheck, Loader2, PlayCircle } from 'lucide-react';
import { Episode } from '../types';
import { getImageUrl } from '../services/tmdb';
import { useAppContext } from '../context/AppContext';
import ReminderConfigModal from './ReminderConfigModal';
import TrailerModal from './TrailerModal';

interface EpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  episodes: Episode[];
  date: Date;
}

const EpisodeModal: React.FC<EpisodeModalProps> = ({ isOpen, onClose, episodes, date }) => {
  const { settings, updateSettings, toggleEpisodeWatched, markHistoryWatched, interactions } = useAppContext();
  const { hideSpoilers, timezone } = settings;
  const [reminderEp, setReminderEp] = useState<Episode | null>(null);
  const [trailerEp, setTrailerEp] = useState<Episode | null>(null);
  const [markingHistoryId, setMarkingHistoryId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Format date relative to user timezone
  const formatDate = (date: Date) => {
      try {
          return new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: timezone || undefined
          }).format(date);
      } catch {
          return date.toDateString();
      }
  };

  const handleMarkHistory = async (ep: Episode) => {
      if (!ep.show_id) return;
      const key = `${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
      setMarkingHistoryId(key);
      await markHistoryWatched(ep.show_id, ep.season_number, ep.episode_number);
      setMarkingHistoryId(null);
  };

  const formattedDate = formatDate(date);

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="surface-panel rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-[var(--border-color)] animate-enter" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-black/20">
          <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {formattedDate}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span>{episodes.length} releases</span>
                  {timezone && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <Globe className="w-3 h-3" />
                        <span>{timezone.split('/')[1] || timezone}</span>
                      </>
                  )}
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="italic opacity-70">Air time unknown</span>
              </p>
          </div>
          
          <div className="flex items-center gap-2">
             <button 
                onClick={() => updateSettings({ hideSpoilers: !hideSpoilers })}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                title="Toggle Spoilers"
             >
                {hideSpoilers ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
             </button>

             <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
               <X className="w-5 h-5" />
             </button>
          </div>
        </div>
        
        <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {episodes.map((ep) => {
              const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
              const isWatched = interactions[watchedKey]?.is_watched;
              const isMarking = markingHistoryId === `${ep.show_id}-${ep.season_number}-${ep.episode_number}`;

              return (
                <div key={`${ep.show_id}-${ep.id}`} className={`surface-card rounded-xl p-3 flex gap-4 group transition-all ${isWatched ? 'opacity-70 bg-zinc-900/30' : ''}`}>
                  {/* Image */}
                  <div className="shrink-0 w-32 hidden sm:block relative overflow-hidden rounded-lg bg-black/50 aspect-video group/image cursor-pointer" onClick={() => setTrailerEp(ep)}>
                    <img 
                      src={getImageUrl(ep.still_path || ep.poster_path)} 
                      alt={ep.name} 
                      className={`
                          w-full h-full object-cover transition-all duration-500
                          ${hideSpoilers ? 'blur-md opacity-30 grayscale' : 'opacity-100 group-hover:scale-105'}
                          ${isWatched ? 'grayscale' : ''}
                      `}
                    />
                    {hideSpoilers && !isWatched && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <EyeOff className="w-6 h-6 text-slate-600" />
                        </div>
                    )}
                    {isWatched && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                            <Check className="w-8 h-8 text-emerald-500 drop-shadow-lg" />
                        </div>
                    )}
                    
                    {/* Play Overlay */}
                    {!isWatched && !hideSpoilers && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity">
                            <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm border border-white/20">
                                <PlayCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="min-w-0">
                        <h3 className={`text-base font-bold leading-tight truncate ${isWatched ? 'text-zinc-500 line-through' : 'text-indigo-200'}`}>{ep.show_name}</h3>
                        <p className="text-white font-medium text-sm truncate mt-0.5">
                          {ep.is_movie ? ep.name : `${ep.episode_number}. ${ep.name}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 mb-2 text-xs text-slate-500">
                       {ep.is_movie ? (
                           <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${ep.release_type === 'theatrical' ? 'text-pink-400 border-pink-500/20' : 'text-emerald-400 border-emerald-500/20'}`}>
                               {ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                           </span>
                       ) : (
                           <span className="font-mono text-slate-400">S{ep.season_number} E{ep.episode_number}</span>
                       )}
                       <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-600" /> {ep.vote_average.toFixed(1)}</span>
                    </div>
                    
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed flex-1">
                      {ep.overview || "No overview available."}
                    </p>
  
                    <div className="mt-2 flex justify-end gap-2 sm:gap-3 flex-wrap">
                      {!ep.is_movie && (
                          <div className="flex bg-zinc-800/50 rounded-lg p-0.5 border border-zinc-700/50">
                              <button
                                  onClick={() => ep.show_id && toggleEpisodeWatched(ep.show_id, ep.season_number, ep.episode_number)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isWatched ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                  title={isWatched ? "Unmark Watched" : "Mark Watched"}
                              >
                                  {isWatched ? <Check className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  {isWatched ? 'Watched' : 'Mark'}
                              </button>
                              
                              <div className="w-px bg-zinc-700/50 my-1" />

                              <button 
                                  onClick={() => handleMarkHistory(ep)}
                                  disabled={isMarking}
                                  className="px-2 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                                  title="Mark all previous episodes as watched"
                              >
                                  {isMarking ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <CheckCheck className="w-3.5 h-3.5" />}
                              </button>
                          </div>
                      )}

                      <div className="flex gap-2">
                          <button 
                              onClick={() => setTrailerEp(ep)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                              title="Watch Trailer"
                          >
                              <PlayCircle className="w-3.5 h-3.5" />
                              Trailer
                          </button>

                          <button 
                              onClick={() => setReminderEp(ep)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                          >
                              <Bell className="w-3.5 h-3.5" />
                              Remind
                          </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
    
    {reminderEp && (
        <ReminderConfigModal 
            isOpen={!!reminderEp} 
            onClose={() => setReminderEp(null)} 
            item={reminderEp} 
        />
    )}

    {trailerEp && (
        <TrailerModal 
            isOpen={!!trailerEp}
            onClose={() => setTrailerEp(null)}
            item={trailerEp}
        />
    )}
    </>
  );
};

export default EpisodeModal;