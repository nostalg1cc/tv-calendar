
import React from 'react';
import { format } from 'date-fns';
import { Check, CalendarDays, Play, Info, MoreVertical, Ticket, MonitorPlay } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Episode } from '../types';
import { getImageUrl } from '../services/tmdb';

interface V2AgendaProps {
    selectedDay: Date;
}

const V2Agenda: React.FC<V2AgendaProps> = ({ selectedDay }) => {
    const { episodes, settings, interactions, toggleEpisodeWatched, toggleWatched } = useAppContext();
    
    const dateKey = format(selectedDay, 'yyyy-MM-dd');
    const dayEps = (episodes[dateKey] || []).filter(ep => {
        if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
        if (settings.ignoreSpecials && ep.season_number === 0) return false;
        return true;
    });

    const handleToggle = (ep: Episode) => {
        if (!ep.show_id) return;
        if (ep.is_movie) {
            toggleWatched(ep.show_id, 'movie');
        } else {
            toggleEpisodeWatched(ep.show_id, ep.season_number, ep.episode_number);
        }
    };

    const AgendaCard: React.FC<{ ep: Episode }> = ({ ep }) => {
        const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
        const isWatched = interactions[watchedKey]?.is_watched;
        const imageUrl = getImageUrl(ep.poster_path);

        return (
            <div className={`group relative bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 hover:bg-zinc-900/60 hover:border-white/10 ${isWatched ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                <div className="flex gap-4 p-3">
                    {/* Poster Thumb */}
                    <div className="w-20 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-white/5 shadow-2xl relative">
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                        {isWatched && (
                            <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-[2px] flex items-center justify-center">
                                <Check className="w-6 h-6 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="text-[13px] font-black text-white uppercase tracking-tight line-clamp-2 leading-tight">
                                    {ep.show_name || ep.name}
                                </h4>
                                <button className="p-1 text-zinc-600 hover:text-white transition-colors">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                {ep.is_movie ? (
                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${ep.release_type === 'theatrical' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                        {ep.release_type === 'theatrical' ? 'Theatrical' : 'Digital'}
                                    </div>
                                ) : (
                                    <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-mono text-zinc-400 uppercase tracking-widest">
                                        S{ep.season_number} E{ep.episode_number}
                                    </div>
                                )}
                            </div>
                            
                            {!ep.is_movie && (
                                <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">
                                    {ep.name}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 mt-3">
                            <button 
                                onClick={() => handleToggle(ep)}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isWatched ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-zinc-200'}`}
                            >
                                {isWatched ? 'Watched' : 'Mark Done'}
                            </button>
                            <button className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors">
                                <Play className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <aside className="w-[320px] hidden xl:flex flex-col bg-zinc-950/40 border-l border-white/5 backdrop-blur-3xl shrink-0">
            {/* Header */}
            <header className="h-20 shrink-0 border-b border-white/5 flex items-center px-6 bg-zinc-950/20">
                <div>
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1">Agenda</h3>
                    <p className="text-sm font-black text-white uppercase tracking-tighter">
                        {format(selectedDay, 'EEEE, MMM do')}
                    </p>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                {dayEps.length > 0 ? (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{dayEps.length} Releases</span>
                            <div className="h-px flex-1 bg-white/5 mx-4" />
                        </div>
                        {dayEps.map((ep) => (
                            <AgendaCard key={`${ep.show_id}-${ep.id}`} ep={ep} />
                        ))}
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
                        <CalendarDays className="w-12 h-12 text-zinc-700 mb-6 stroke-[1px]" />
                        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">No Releases</h4>
                        <p className="text-[10px] text-zinc-600 font-medium leading-relaxed">
                            There are no shows or movies scheduled for this date in your library.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer Summary */}
            <footer className="p-6 border-t border-white/5 bg-zinc-950/20">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase">
                    <span>Library Coverage</span>
                    <span className="text-indigo-400">100%</span>
                </div>
                <div className="mt-3 h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                </div>
            </footer>
        </aside>
    );
};

export default V2Agenda;
