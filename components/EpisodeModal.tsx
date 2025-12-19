
import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Star, Bell, Eye, EyeOff, Film, Ticket, MonitorPlay, Globe, Check, CheckCheck, Loader2, PlayCircle, Lock, AlertTriangle, Ban } from 'lucide-react';
import { Episode, AppSettings, Interaction } from '../types';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import { useStore } from '../store';
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
    history: Record<string, Interaction>;
    onTrailer: (ep: Episode) => void;
    onReminder: (ep: Episode) => void;
    onToggleWatched: (ep: Episode) => void;
    onRemove: (ep: Episode) => void;
}> = ({ ep, settings, history, onTrailer, onReminder, onToggleWatched, onRemove }) => {
    const [revealed, setRevealed] = useState({ image: false, title: false, overview: false });
    const { spoilerConfig } = settings;

    const watchedKey = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
    const isWatched = history[watchedKey]?.is_watched;

    // Spoiler Logic
    // If it's a movie and includeMovies is false, skip blocking.
    const shouldBlock = !isWatched && (!ep.is_movie || spoilerConfig.includeMovies);

    const isImageBlocked = shouldBlock && spoilerConfig.images && !revealed.image;
    const isTextBlocked = shouldBlock && spoilerConfig.overview && !revealed.overview;
    const isNameBlocked = shouldBlock && spoilerConfig.title && !revealed.title;

    // Reveal handlers
    const revealImage = (e: React.MouseEvent) => { e.stopPropagation(); setRevealed(p => ({ ...p, image: true })); };
    const revealTitle = (e: React.MouseEvent) => { e.stopPropagation(); setRevealed(p => ({ ...p, title: true })); };
    const revealText = (e: React.MouseEvent) => { e.stopPropagation(); setRevealed(p => ({ ...p, overview: true })); };

    return (
        <div className={`flex gap-4 p-3 rounded-2xl transition-all border border-[var(--border-color)] bg-[var(--bg-panel)] hover:bg-white/5 group ${isWatched ? 'opacity-60 grayscale-[0.5]' : ''}`}>
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
                            className="bg-black/20 border border-[var(--border-color)] rounded-lg p-3 cursor-pointer group/spoiler hover:bg-black/40 transition-colors flex items-center justify-between"
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

                    <button 
                        onClick={() => onRemove(ep)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                        title="Hide Show"
                    >
                        <Ban className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => onToggleWatched(ep)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-1
                            ${isWatched 
                                ? 'bg-white/10 text-zinc-400 hover:bg-white/20' 
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
  const { settings, toggleWatched, history, removeFromWatchlist } = useStore();
  const { timezone, useSeason1Art, spoilerConfig } = settings;
  const [reminderEp, setReminderEp] = useState<Episode | null>(null);
  const [trailerEp, setTrailerEp] = useState<Episode | null>(null);

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

  const handleToggleWatched = (ep: Episode) => {
      if (!ep.show_id) return;
      const key = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
      const isWatched = history[key]?.is_watched;
      
      toggleWatched({
          tmdb_id: ep.show_id,
          media_type: ep.is_movie ? 'movie' : 'episode',
          season_number: ep.season_number,
          episode_number: ep.episode_number,
          is_watched: isWatched
      });
  };

  const handleRemove = (ep: Episode) => {
      if (!ep.show_id) return;
      if (confirm(`Are you sure you want to hide "${ep.show_name}" from your calendar?`)) {
          removeFromWatchlist(ep.show_id);
      }
  };

  const formattedDate = formatDate(date);
  
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
        className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col relative" 
        onClick={e => e.stopPropagation()}
      >
        {/* Cinematic Header */}
        <div className="relative h-40 shrink-0">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${headerBackdropUrl})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/60 to-transparent" />
            
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
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[var(--bg-main)]">
            <div className="flex flex-col gap-4">
                {episodes.map((ep) => (
                    <EpisodeRow 
                        key={`${ep.show_id}-${ep.id}`}
                        ep={ep}
                        settings={settings}
                        history={history}
                        onTrailer={setTrailerEp}
                        onReminder={setReminderEp}
                        onToggleWatched={handleToggleWatched}
                        onRemove={handleRemove}
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
