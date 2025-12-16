import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Star, Bell, Eye, EyeOff, Film, Ticket, MonitorPlay, Globe, Check, CheckCheck, Loader2, PlayCircle, Lock, AlertTriangle } from 'lucide-react';
import { Episode, AppSettings, Interaction } from '../types';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import { useAppContext } from '../context/AppContext';
import ReminderConfigModal from './ReminderConfigModal';
import TrailerModal from './TrailerModal';

interface EpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  episodes: Episode[];
  date: Date;
}

// Sub-component to handle local state for spoiler revealing
const EpisodeRow: React.FC<{
    ep: Episode;
    settings: AppSettings;
    interactions: Record<string, Interaction>;
    onTrailer: (ep: Episode) => void;
    onReminder: (ep: Episode) => void;
    onMarkHistory: (ep: Episode) => void;
    onToggleWatched: (ep: Episode) => void;
    isMarkingHistory: boolean;
}> = ({ ep, settings, interactions, onTrailer, onReminder, onMarkHistory, onToggleWatched, isMarkingHistory }) => {
    const [revealed, setRevealed] = useState({ image: false, title: false, overview: false });
    const { spoilerConfig } = settings;

    const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
    const isWatched = interactions[watchedKey]?.is_watched;

    // Spoiler Logic: Block if not watched, specific flag is active, and not locally revealed
    const isImageBlocked = !isWatched && spoilerConfig.images && !revealed.image;
    const isTextBlocked = !isWatched && spoilerConfig.overview && !revealed.overview;
    const isNameBlocked = !isWatched && spoilerConfig.title && !revealed.title;

    // Reveal handlers
    const revealImage = (e: React.MouseEvent) => { e.stopPropagation(); setRevealed(p => ({ ...p, image: true })); };
    const revealTitle = (e: React.MouseEvent) => { e.stopPropagation(); setRevealed(p => ({ ...p, title: true })); };
    const revealText = (e: React.MouseEvent) => { e.stopPropagation(); setRevealed(p => ({ ...p, overview: true })); };

    return (
        <div className={`flex gap-4 p-3 rounded-2xl transition-all border border-zinc-800/50 bg-zinc-900/40 hover:bg-zinc-900 group ${isWatched ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            {/* Thumbnail Column */}
            <div 
                className="relative w-28 sm:w-36 aspect-video shrink-0 rounded-xl overflow-hidden bg-black shadow-lg cursor-pointer group/image"
                onClick={isImageBlocked ? revealImage : () => onTrailer(ep)}
            >
                <img 
                    src={getImageUrl(ep.still_path || ep.poster_path)} 
                    alt="" 
                    className={`w-full h-full object-cover transition-all duration-500 ${isImageBlocked ? 'blur-xl scale-110 opacity-50' : ''}`}
                />
                
                {isImageBlocked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 group-hover/image:scale-105 transition-transform">
                        <EyeOff className="w-6 h-6 text-zinc-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 bg-black/50 px-2 py-0.5 rounded opacity-0 group-hover/image:opacity-100 transition-opacity">Click to Reveal</span>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity">
                        <PlayCircle className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                )}
            </div>

            {/* Content Column */}
            <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0 flex-1">
                        {isNameBlocked ? (
                            <h3 
                                onClick={revealTitle}
                                className="text-base font-bold text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors flex items-center gap-2 select-none"
                                title="Click to reveal title"
                            >
                                <span className="font-mono">Episode {ep.episode_number}</span>
                                <EyeOff className="w-3.5 h-3.5 opacity-50" />
                            </h3>
                        ) : (
                            <h3 className="text-base font-bold text-white truncate leading-tight mb-0.5">
                                {ep.show_name}
                            </h3>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mt-0.5">
                            {ep.is_movie ? (
                                <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${ep.release_type === 'theatrical' ? 'text-pink-400 border-pink-500/20 bg-pink-500/5' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'}`}>
                                    {ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                                </span>
                            ) : (
                                <span className="font-mono text-zinc-500">S{ep.season_number} E{ep.episode_number}</span>
                            )}
                            
                            {!isNameBlocked && (
                                <span className="truncate text-zinc-300">• {ep.name}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 mt-2 text-xs leading-relaxed">
                    {isTextBlocked ? (
                        <div 
                            onClick={revealText}
                            className="bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-3 cursor-pointer group/spoiler hover:bg-zinc-900 transition-colors flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2 text-zinc-500 italic group-hover/spoiler:text-zinc-400">
                                <Lock className="w-3 h-3" /> 
                                <span>Description hidden</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500/0 group-hover/spoiler:text-indigo-400 transition-colors">Reveal</span>
                        </div>
                    ) : (
                        <p className="text-zinc-400 line-clamp-3">
                            {ep.overview || "No overview available."}
                        </p>
                    )}
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-white/5">
                    <button 
                        onClick={() => onTrailer(ep)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Watch Trailer"
                    >
                        <PlayCircle className="w-4 h-4" />
                    </button>
                    
                    <button 
                        onClick={() => onReminder(ep)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-white/5 transition-colors"
                        title="Set Reminder"
                    >
                        <Bell className="w-4 h-4" />
                    </button>

                    <div className="w-px h-4 bg-white/10 mx-1" />

                    {!ep.is_movie && (
                        <button 
                            onClick={() => onMarkHistory(ep)}
                            disabled={isMarkingHistory || isWatched}
                            className="p-2 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-white/5 transition-colors disabled:opacity-30"
                            title="Mark Previous Watched"
                        >
                            {isMarkingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                        </button>
                    )}

                    <button
                        onClick={() => onToggleWatched(ep)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-1
                            ${isWatched 
                                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' 
                                : 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5'}
                        `}
                    >
                        {isWatched ? <Check className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        {isWatched ? 'Watched' : 'Mark Watched'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EpisodeModal: React.FC<EpisodeModalProps> = ({ isOpen, onClose, episodes, date }) => {
  const { settings, toggleEpisodeWatched, toggleWatched, markHistoryWatched, interactions } = useAppContext();
  const { timezone, useSeason1Art } = settings;
  const [reminderEp, setReminderEp] = useState<Episode | null>(null);
  const [trailerEp, setTrailerEp] = useState<Episode | null>(null);
  const [markingHistoryId, setMarkingHistoryId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Format date relative to user timezone
  const formatDate = (date: Date) => {
      try {
          return new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
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

  const handleToggleWatched = (ep: Episode) => {
      if (!ep.show_id) return;
      if (ep.is_movie) {
          toggleWatched(ep.show_id, 'movie');
      } else {
          toggleEpisodeWatched(ep.show_id, ep.season_number, ep.episode_number);
      }
  };

  const formattedDate = formatDate(date);
  
  // Header Logic:
  // 1. Prefer Movie (horizontal backdrops are native)
  // 2. Fallback to first item.
  // 3. Image Source:
  //    - If useSeason1Art is ON: Use show_backdrop_path (if available) or season1_poster_path (if backdrop missing, unlikely for cached items)
  //    - If OFF: Use show_backdrop_path if available (standard horizontal art).
  //    - Avoid using 'still_path' (Episode Image) for the header to prevent spoilers, unless it's a movie where still_path IS the backdrop.
  
  const headerItem = episodes.find(e => e.is_movie) || episodes[0];
  
  let headerImage = '';
  
  if (headerItem) {
      if (headerItem.is_movie) {
          // For movies, still_path is the backdrop
          headerImage = headerItem.still_path || headerItem.poster_path || '';
      } else {
          // For TV
          if (useSeason1Art) {
              headerImage = headerItem.show_backdrop_path || headerItem.season1_poster_path || '';
          } else {
              // Prefer show backdrop over episode still to avoid spoilers in header
              headerImage = headerItem.show_backdrop_path || headerItem.still_path || ''; 
          }
      }
  }

  // Fallback if empty (though getBackdropUrl handles nulls)
  const headerBackdropUrl = getBackdropUrl(headerImage);

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col relative" 
        onClick={e => e.stopPropagation()}
      >
        {/* Cinematic Header */}
        <div className="relative h-40 shrink-0">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${headerBackdropUrl})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
            
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-white/10 backdrop-blur-md rounded-full text-white transition-colors border border-white/5 z-20"
            >
               <X className="w-5 h-5" />
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">
                        {formattedDate}
                    </h2>
                    <p className="text-sm text-zinc-300 font-medium drop-shadow-md flex items-center gap-2">
                        <span>{episodes.length} Releases</span>
                    </p>
                </div>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-zinc-950">
            <div className="flex flex-col gap-4">
                {episodes.map((ep) => (
                    <EpisodeRow 
                        key={`${ep.show_id}-${ep.id}`}
                        ep={ep}
                        settings={settings}
                        interactions={interactions}
                        onTrailer={setTrailerEp}
                        onReminder={setReminderEp}
                        onMarkHistory={handleMarkHistory}
                        onToggleWatched={handleToggleWatched}
                        isMarkingHistory={markingHistoryId === `${ep.show_id}-${ep.season_number}-${ep.episode_number}`}
                    />
                ))}
            </div>
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