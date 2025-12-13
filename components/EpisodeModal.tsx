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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="surface-panel rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-[var(--border-color)] animate-enter" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-black/20">
          <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {date.toDateString()}
              </h2>
              <p className="text-xs text-slate-400">{episodes.length} releases</p>
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
            {episodes.map((ep) => (
              <div key={`${ep.show_id}-${ep.id}`} className="surface-card rounded-xl p-3 flex gap-4 group">
                {/* Image */}
                <div className="shrink-0 w-32 hidden sm:block relative overflow-hidden rounded-lg bg-black/50 aspect-video">
                  <img 
                    src={getImageUrl(ep.still_path || ep.poster_path)} 
                    alt={ep.name} 
                    className={`
                        w-full h-full object-cover transition-all duration-500
                        ${hideSpoilers ? 'blur-md opacity-30 grayscale' : 'opacity-100 group-hover:scale-105'}
                    `}
                  />
                  {hideSpoilers && (
                      <div className="absolute inset-0 flex items-center justify-center">
                          <EyeOff className="w-6 h-6 text-slate-600" />
                      </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-indigo-200 leading-tight truncate">{ep.show_name}</h3>
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

                  <div className="mt-2 flex justify-end">
                    <button 
                        onClick={() => scheduleNotification(ep)}
                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        <Bell className="w-3.5 h-3.5" />
                        Set Reminder
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default EpisodeModal;