import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Bell, Trash2, Calendar, Tv, Film, Clock } from 'lucide-react';
import { getImageUrl } from '../services/tmdb';

const RemindersPage: React.FC = () => {
  const { reminders, removeReminder, allTrackedShows } = useAppContext();

  // Helper to get show details
  const getShow = (tmdbId: number) => allTrackedShows.find(s => s.id === tmdbId);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-8">
         <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
             <Bell className="w-8 h-8 text-amber-400" /> Reminders
         </h1>
         <p className="text-zinc-400">Manage your active push notifications.</p>
      </div>

      {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-zinc-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">No Active Reminders</h2>
              <p className="text-zinc-500 text-sm">Set a reminder from the Calendar or Library to see it here.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reminders.map(reminder => {
                  const show = getShow(reminder.tmdb_id);
                  const isSeries = reminder.scope === 'all';
                  const isMovie = reminder.media_type === 'movie';
                  
                  return (
                      <div key={reminder.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4 group hover:border-indigo-500/30 transition-all">
                          <div className="w-16 h-24 shrink-0 bg-black rounded-lg overflow-hidden relative">
                              {show ? (
                                  <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" alt="" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">?</div>
                              )}
                              
                              <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm p-1 rounded">
                                  {isMovie ? <Film className="w-3 h-3 text-white" /> : <Tv className="w-3 h-3 text-white" />}
                              </div>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <h3 className="text-lg font-bold text-white truncate mb-1">
                                  {reminder.show_name || show?.name || 'Unknown Show'}
                              </h3>
                              
                              <div className="flex flex-col gap-1 text-xs text-zinc-400">
                                  <div className="flex items-center gap-2">
                                      <span className={`px-1.5 py-0.5 rounded border ${isSeries ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-zinc-800 border-zinc-700'}`}>
                                          {isSeries ? 'Series Subscription' : isMovie ? (reminder.scope === 'movie_theatrical' ? 'Theatrical Release' : 'Digital Release') : `S${reminder.episode_season} E${reminder.episode_number}`}
                                      </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5 mt-1 text-amber-400">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>
                                          {reminder.offset_minutes === 0 ? 'On Day of Release' : `${Math.floor(reminder.offset_minutes / 1440)} Days Before`}
                                      </span>
                                  </div>
                              </div>
                          </div>

                          <button 
                            onClick={() => reminder.id && removeReminder(reminder.id)}
                            className="self-start p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete Reminder"
                          >
                              <Trash2 className="w-5 h-5" />
                          </button>
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  );
};

export default RemindersPage;