import React from 'react';
import { X, Calendar as CalendarIcon, Star, Bell, Eye, EyeOff, Film, Ticket, MonitorPlay } from 'lucide-react';
import { Episode } from '../types';
import { getImageUrl } from '../services/tmdb';
import { useAppContext } from '../context/AppContext';

interface EpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  episodes: Episode[];
  date: Date;
}

const EpisodeModal: React.FC<EpisodeModalProps> = ({ isOpen, onClose, episodes, date }) => {
  const { scheduleNotification, settings, updateSettings } = useAppContext();
  const { hideSpoilers } = settings;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-white/10" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex flex-col">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                <span className="tracking-wide">{date.toDateString()}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">{episodes.length} releases for this day</p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={() => updateSettings({ hideSpoilers: !hideSpoilers })}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                    ${hideSpoilers 
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' 
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}
                `}
                title="Toggle Spoiler Protection"
             >
                {hideSpoilers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {hideSpoilers ? 'Spoilers Hidden' : 'Show Images'}
             </button>

             <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
               <X className="w-5 h-5" />
             </button>
          </div>
        </div>
        
        <div className="overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {episodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <CalendarIcon className="w-12 h-12 mb-3 opacity-20" />
                <p>No episodes airing on this day.</p>
            </div>
          ) : (
            episodes.map((ep) => (
              <div key={`${ep.show_id}-${ep.id}`} className="group bg-white/5 rounded-xl p-4 flex gap-4 transition hover:bg-white/10 border border-white/5 hover:border-white/10">
                <div className="shrink-0 w-32 hidden sm:block relative overflow-hidden rounded-lg bg-black">
                  <img 
                    src={getImageUrl(ep.still_path || ep.poster_path)} 
                    alt={ep.name} 
                    className={`
                        w-full h-24 object-cover transition-all duration-500
                        ${hideSpoilers ? 'blur-xl opacity-50 grayscale scale-110' : 'blur-0 opacity-100 group-hover:scale-105'}
                    `}
                  />
                  {hideSpoilers && (
                      <div className="absolute inset-0 flex items-center justify-center">
                          <EyeOff className="w-6 h-6 text-white/50" />
                      </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-indigo-300 leading-tight truncate">{ep.show_name}</h3>
                      <p className="text-white font-medium mt-0.5 truncate">
                        {ep.is_movie ? ep.name : `${ep.episode_number}. ${ep.name}`}
                      </p>
                    </div>
                    {ep.vote_average > 0 && (
                        <div className="shrink-0 flex items-center gap-1 text-yellow-500 text-xs font-bold bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20">
                            <Star className="w-3 h-3 fill-current" />
                            {ep.vote_average.toFixed(1)}
                        </div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-xs text-slate-400 font-mono flex items-center gap-3">
                    {ep.is_movie ? (
                        <>
                             {ep.release_type === 'theatrical' ? (
                                 <span className="bg-pink-900/30 border border-pink-500/30 px-2 py-0.5 rounded text-pink-300 flex items-center gap-1">
                                    <Ticket className="w-3 h-3" /> Theatrical Release
                                 </span>
                             ) : (
                                <span className="bg-emerald-900/30 border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-300 flex items-center gap-1">
                                    <MonitorPlay className="w-3 h-3" /> Home Release
                                 </span>
                             )}
                        </>
                    ) : (
                        <span className="bg-black/40 border border-white/10 px-2 py-0.5 rounded text-slate-300">S{ep.season_number} E{ep.episode_number}</span>
                    )}
                  </div>
                  
                  <p className="text-slate-300 text-sm line-clamp-2 mt-2 leading-relaxed">
                    {ep.overview || "No overview available."}
                  </p>

                  <div className="mt-4 flex justify-end">
                    <button 
                        onClick={() => scheduleNotification(ep)}
                        className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-indigo-500/20"
                    >
                        <Bell className="w-3.5 h-3.5" />
                        Remind Me
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EpisodeModal;