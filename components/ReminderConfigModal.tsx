import React, { useState } from 'react';
import { Bell, Clock, X, Check, Calendar, Film, Tv } from 'lucide-react';
import { Episode, Reminder, TVShow } from '../types';
import { useAppContext } from '../context/AppContext';

interface ReminderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Episode | TVShow;
}

const ReminderConfigModal: React.FC<ReminderConfigModalProps> = ({ isOpen, onClose, item }) => {
  const { addReminder, reminders } = useAppContext();
  
  // Normalize Item Data
  const isMovie = 'media_type' in item ? item.media_type === 'movie' : item.is_movie;
  const showId = 'show_id' in item && item.show_id ? item.show_id : item.id;
  const name = 'show_name' in item && item.show_name ? item.show_name : item.name;
  
  // Determine if it is a specific episode context (has season/episode numbers)
  const isSpecificEpisode = 'season_number' in item && item.season_number !== undefined && item.season_number !== 0;

  // Default Scope Logic
  const defaultScope = isMovie 
    ? 'movie_digital' 
    : (isSpecificEpisode ? 'episode' : 'all');

  const [scope, setScope] = useState<'all' | 'episode' | 'movie_theatrical' | 'movie_digital'>(defaultScope);
  const [offset, setOffset] = useState(0); // Minutes

  if (!isOpen) return null;

  const handleSave = async () => {
      const newReminder: Reminder = {
          tmdb_id: showId,
          media_type: isMovie ? 'movie' : 'tv',
          show_name: name,
          scope,
          episode_season: 'season_number' in item ? item.season_number : undefined,
          episode_number: 'episode_number' in item ? item.episode_number : undefined,
          offset_minutes: offset
      };
      await addReminder(newReminder);
      onClose();
  };

  const isAlreadySet = reminders.some(r => {
      if (r.tmdb_id !== showId) return false;
      if (scope === 'all' && r.scope === 'all') return true;
      if (scope === 'episode' && 'season_number' in item && r.scope === 'episode' && r.episode_season === item.season_number && r.episode_number === item.episode_number) return true;
      if (isMovie && r.scope.startsWith('movie')) return true;
      return false;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div 
          className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 relative overflow-hidden" 
          onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 ring-1 ring-indigo-500/20">
                    <Bell className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Configure</h3>
                    <p className="text-xs text-zinc-400">For <span className="text-zinc-200">{name}</span></p>
                </div>
                <button onClick={onClose} className="ml-auto p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-6 mb-8">
                {/* Scope Selection */}
                <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-3 ml-1">Alert Type</label>
                    <div className="space-y-2">
                        {!isMovie && (
                            <>
                                {isSpecificEpisode && (
                                    <button 
                                        onClick={() => setScope('episode')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${scope === 'episode' ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                                    >
                                        <Calendar className="w-4 h-4" />
                                        This Episode Only
                                    </button>
                                )}
                                <button 
                                    onClick={() => setScope('all')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${scope === 'all' ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                                >
                                    <Tv className="w-4 h-4" />
                                    All Episodes for Series
                                </button>
                            </>
                        )}
                        
                        {isMovie && (
                             <>
                                <button 
                                    onClick={() => setScope('movie_theatrical')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${scope === 'movie_theatrical' ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                                >
                                    <Film className="w-4 h-4" />
                                    Theatrical Release
                                </button>
                                <button 
                                    onClick={() => setScope('movie_digital')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${scope === 'movie_digital' ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                                >
                                    <Tv className="w-4 h-4" />
                                    Digital / Home Release
                                </button>
                             </>
                        )}
                    </div>
                </div>

                {/* Timing Selection */}
                <div>
                     <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-3 ml-1">Notify Me</label>
                     <div className="grid grid-cols-3 gap-2">
                         {[
                             { label: 'On Day', val: 0 },
                             { label: '1 Day Before', val: 1440 },
                             { label: '3 Days Before', val: 4320 },
                         ].map(opt => (
                             <button
                                key={opt.val}
                                onClick={() => setOffset(opt.val)}
                                className={`p-3 rounded-xl text-xs font-bold border transition-all ${offset === opt.val ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'}`}
                             >
                                 {opt.label}
                             </button>
                         ))}
                     </div>
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={isAlreadySet}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isAlreadySet ? <><Check className="w-5 h-5" /> Already Set</> : 'Confirm Reminder'}
            </button>
        </div>
    </div>
  );
};

export default ReminderConfigModal;