
import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Star, Bell, Eye, EyeOff, Film, Ticket, MonitorPlay, Globe, Check, CheckCheck, Loader2, PlayCircle, Lock, AlertTriangle, Ban, Layout } from 'lucide-react';
import { Episode, AppSettings, Interaction } from '../types';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import { useAppContext } from '../context/AppContext';
import ReminderConfigModal from './ReminderConfigModal';
import TrailerModal from './TrailerModal';
// Added missing format import from date-fns
import { format } from 'date-fns';

interface EpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  episodes: Episode[];
  date: Date;
}

const EpisodeRow: React.FC<{
    ep: Episode;
    settings: AppSettings;
    interactions: Record<string, Interaction>;
    onTrailer: (ep: Episode) => void;
    onReminder: (ep: Episode) => void;
    onMarkHistory: (ep: Episode) => void;
    onToggleWatched: (ep: Episode) => void;
    onRemove: (ep: Episode) => void;
    isMarkingHistory: boolean;
}> = ({ ep, settings, interactions, onTrailer, onReminder, onMarkHistory, onToggleWatched, onRemove, isMarkingHistory }) => {
    const [revealed, setRevealed] = useState({ image: false, title: false, overview: false });
    const { spoilerConfig } = settings;

    const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
    const isWatched = interactions[watchedKey]?.is_watched;

    const shouldBlock = !isWatched && (!ep.is_movie || spoilerConfig.includeMovies);
    const isImageBlocked = shouldBlock && spoilerConfig.images && !revealed.image;
    const isTextBlocked = shouldBlock && spoilerConfig.overview && !revealed.overview;
    const isNameBlocked = shouldBlock && spoilerConfig.title && !revealed.title;

    const revealImage = (e: React.MouseEvent) => { e.stopPropagation(); setRevealed(p => ({ ...p, image: true })); };
    const revealTitle = (e: React.MouseEvent) => { e.stopPropagation(); setRevealed(p => ({ ...p, title: true })); };
    const revealText = (e: React.MouseEvent) => { e.stopPropagation(); setRevealed(p => ({ ...p, overview: true })); };

    // Image logic: if banner mode is enabled, show the series poster/backdrop instead of blurred still
    const stillUrl = getImageUrl(ep.still_path || ep.poster_path);
    const bannerUrl = getImageUrl(ep.show_backdrop_path || ep.poster_path);
    const displayImageUrl = (isImageBlocked && spoilerConfig.replacementMode === 'banner') ? bannerUrl : stillUrl;

    return (
        <div className={`flex gap-4 p-4 rounded-3xl transition-all border border-white/5 bg-zinc-900/40 hover:bg-white/[0.04] group ${isWatched ? 'opacity-40 grayscale-[0.5]' : ''}`}>
            <div 
                className="relative w-28 sm:w-40 aspect-video shrink-0 rounded-2xl overflow-hidden bg-black shadow-2xl cursor-pointer group/image border border-white/5"
                onClick={isImageBlocked ? revealImage : () => onTrailer(ep)}
            >
                <img 
                    src={displayImageUrl} 
                    alt="" 
                    className={`w-full h-full object-cover transition-all duration-700 ${isImageBlocked && spoilerConfig.replacementMode === 'blur' ? 'blur-2xl scale-110 opacity-40' : 'opacity-80'}`}
                />
                
                {isImageBlocked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 group-hover/image:scale-105 transition-transform bg-black/20">
                        {spoilerConfig.replacementMode === 'blur' ? <EyeOff className="w-6 h-6 text-zinc-400" /> : <Layout className="w-6 h-6 text-indigo-400 opacity-50" />}
                        <span className="text-[8px] font-black uppercase tracking-widest text-white bg-black/60 px-2 py-0.5 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity">Reveal</span>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity">
                        <PlayCircle className="w-10 h-10 text-white drop-shadow-2xl" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0 flex-1">
                        {isNameBlocked ? (
                            <h3 
                                onClick={revealTitle}
                                className="text-sm font-black text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors flex items-center gap-2 select-none uppercase tracking-tight"
                            >
                                <span className="font-mono">EPISODE {ep.episode_number}</span>
                                <EyeOff className="w-3.5 h-3.5 opacity-50" />
                            </h3>
                        ) : (
                            <h3 className="text-base font-black text-white truncate leading-tight mb-0.5 uppercase tracking-tighter">
                                {ep.show_name}
                            </h3>
                        )}
                        
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">
                            {ep.is_movie ? (
                                <span className={`flex items-center gap-1 ${ep.release_type === 'theatrical' ? 'text-pink-500' : 'text-emerald-500'}`}>
                                    {ep.release_type === 'theatrical' ? <Ticket className="w-3 h-3" /> : <MonitorPlay className="w-3 h-3" />}
                                    {ep.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                                </span>
                            ) : (
                                <span className="font-mono opacity-60">S{ep.season_number} E{ep.episode_number}</span>
                            )}
                            
                            {!isNameBlocked && (
                                <span className="truncate text-zinc-400">• {ep.name}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 mt-2">
                    {isTextBlocked ? (
                        <div 
                            onClick={revealText}
                            className="bg-black/20 border border-white/5 rounded-xl p-2 cursor-pointer group/spoiler hover:bg-black/40 transition-colors flex items-center justify-between"
                        >
                            <span className="text-[10px] font-bold text-zinc-600 italic px-2">Description Redacted</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500/0 group-hover/spoiler:text-indigo-400 transition-colors px-2">Reveal</span>
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed font-medium">
                            {ep.overview || "No overview available."}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-1 mt-3">
                    <button onClick={() => onReminder(ep)} className="p-2 text-zinc-600 hover:text-indigo-400 transition-colors"><Bell className="w-3.5 h-3.5" /></button>
                    {!ep.is_movie && (
                        <button onClick={() => onMarkHistory(ep)} disabled={isMarkingHistory || isWatched} className="p-2 text-zinc-600 hover:text-emerald-400 transition-colors"><CheckCheck className="w-3.5 h-3.5" /></button>
                    )}
                    <button 
                        onClick={() => onToggleWatched(ep)}
                        className={`p-2 rounded-xl transition-all ${isWatched ? 'text-emerald-500' : 'text-zinc-600 hover:text-white'}`}
                    >
                        <Check className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const EpisodeModal: React.FC<EpisodeModalProps> = ({ isOpen, onClose, episodes, date }) => {
  const { settings, toggleEpisodeWatched, toggleWatched, markHistoryWatched, interactions, removeFromWatchlist } = useAppContext();
  const [reminderEp, setReminderEp] = useState<Episode | null>(null);
  const [trailerEp, setTrailerEp] = useState<Episode | null>(null);
  const [markingHistoryId, setMarkingHistoryId] = useState<string | null>(null);

  if (!isOpen) return null;

  const headerItem = episodes[0];
  const headerBackdropUrl = getBackdropUrl(headerItem?.show_backdrop_path || headerItem?.still_path);

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={onClose}>
      <div 
        className="bg-[#050505] border border-white/5 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col relative" 
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-48 shrink-0">
            <div className="absolute inset-0 bg-cover bg-center grayscale opacity-30" style={{ backgroundImage: `url(${headerBackdropUrl})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
            
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-full text-white transition-colors border border-white/10 z-20"><X className="w-5 h-5" /></button>

            <div className="absolute bottom-0 left-0 right-0 p-8">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">{format(date, 'MMMM d')}</h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{episodes.length} Releases Today</span>
                </div>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-transparent">
            <div className="flex flex-col gap-3">
                {episodes.map((ep) => (
                    <EpisodeRow 
                        key={`${ep.show_id}-${ep.id}`}
                        ep={ep}
                        settings={settings}
                        interactions={interactions}
                        onTrailer={setTrailerEp}
                        onReminder={setReminderEp}
                        onMarkHistory={async (ep) => { setMarkingHistoryId(`${ep.show_id}-${ep.season_number}-${ep.episode_number}`); await markHistoryWatched(ep.show_id!, ep.season_number, ep.episode_number); setMarkingHistoryId(null); }}
                        onToggleWatched={(ep) => ep.show_id && (ep.is_movie ? toggleWatched(ep.show_id, 'movie') : toggleEpisodeWatched(ep.show_id, ep.season_number, ep.episode_number))}
                        onRemove={(ep) => ep.show_id && removeFromWatchlist(ep.show_id)}
                        isMarkingHistory={markingHistoryId === `${ep.show_id}-${ep.season_number}-${ep.episode_number}`}
                    />
                ))}
            </div>
        </div>
      </div>
    </div>
    
    {reminderEp && <ReminderConfigModal isOpen={!!reminderEp} onClose={() => setReminderEp(null)} item={reminderEp} />}
    {trailerEp && <TrailerModal isOpen={!!trailerEp} onClose={() => setTrailerEp(null)} item={trailerEp} />}
    </>
  );
};

export default EpisodeModal;
