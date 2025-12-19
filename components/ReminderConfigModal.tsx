
import React, { useState } from 'react';
import { Bell, Calendar, Film, Tv } from 'lucide-react';
import { Episode, Reminder, TVShow } from '../types';
import { useStore } from '../store';

interface ReminderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Episode | TVShow;
}

const ReminderConfigModal: React.FC<ReminderConfigModalProps> = ({ isOpen, onClose, item }) => {
  const addReminder = useStore(state => state.addReminder);
  const reminders = useStore(state => state.reminders);
  
  const isMovie = 'media_type' in item ? item.media_type === 'movie' : item.is_movie;
  const showId = 'show_id' in item && item.show_id ? item.show_id : item.id;
  const name = 'show_name' in item && item.show_name ? item.show_name : item.name;
  const isSpecificEpisode = 'season_number' in item && item.season_number !== undefined && item.season_number !== 0;

  const defaultScope = isMovie ? 'movie_digital' : (isSpecificEpisode ? 'episode' : 'all');
  const [scope, setScope] = useState<'all' | 'episode' | 'movie_theatrical' | 'movie_digital'>(defaultScope);
  const [offset, setOffset] = useState(0);

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
        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 text-indigo-400">
                <Bell className="w-6 h-6" />
                <h3 className="text-lg font-bold text-white">Set Reminder</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-6">Configure notifications for <strong className="text-white">{name}</strong>.</p>
            <div className="space-y-4 mb-6">
                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Notification Type</label>
                    <div className="space-y-2">
                        {!isMovie && (
                            <>
                                {isSpecificEpisode && (
                                    <button onClick={() => setScope('episode')} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm transition-all ${scope === 'episode' ? 'bg-indigo-600/10 border-indigo-600 text-indigo-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}><Calendar className="w-4 h-4" /> This Episode Only</button>
                                )}
                                <button onClick={() => setScope('all')} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm transition-all ${scope === 'all' ? 'bg-indigo-600/10 border-indigo-600 text-indigo-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}><Tv className="w-4 h-4" /> All Episodes for Series</button>
                            </>
                        )}
                        {isMovie && (
                             <>
                                <button onClick={() => setScope('movie_theatrical')} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm transition-all ${scope === 'movie_theatrical' ? 'bg-indigo-600/10 border-indigo-600 text-indigo-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}><Film className="w-4 h-4" /> Theatrical Release</button>
                                <button onClick={() => setScope('movie_digital')} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm transition-all ${scope === 'movie_digital' ? 'bg-indigo-600/10 border-indigo-600 text-indigo-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}><Tv className="w-4 h-4" /> Digital / Home Release</button>
                             </>
                        )}
                    </div>
                </div>
                <div>
                     <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">When to notify</label>
                     <div className="grid grid-cols-3 gap-2">
                         {[{ label: 'On Day', val: 0 }, { label: '1 Day Before', val: 1440 }, { label: '3 Days Before', val: 4320 }].map(opt => (
                             <button key={opt.val} onClick={() => setOffset(opt.val)} className={`p-2 rounded-lg text-xs font-medium border transition-colors ${offset === opt.val ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{opt.label}</button>
                         ))}
                     </div>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={isAlreadySet} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50">{isAlreadySet ? 'Already Set' : 'Save Reminder'}</button>
            </div>
        </div>
    </div>
  );
};

export default ReminderConfigModal;
