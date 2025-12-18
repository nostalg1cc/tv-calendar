
import React from 'react';
import { format } from 'date-fns';
import { Check, CalendarDays, Play, History, MoreVertical, Eye, EyeOff, Ticket, MonitorPlay } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Episode } from '../types';
import { getImageUrl } from '../services/tmdb';

interface V2AgendaProps {
    selectedDay: Date;
}

const V2Agenda: React.FC<V2AgendaProps> = ({ selectedDay }) => {
    const { episodes, settings, interactions, toggleEpisodeWatched, toggleWatched, markHistoryWatched } = useAppContext();
    
    const dateKey = format(selectedDay, 'yyyy-MM-dd');
    const dayEps = (episodes[dateKey] || []).filter(ep => {
        if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
        if (settings.ignoreSpecials && ep.season_number === 0) return false;
        return true;
    });

    // Group episodes by show_id
    const groupedEps = dayEps.reduce((acc, ep) => {
        const key = ep.show_id || ep.id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(ep);
        return acc;
    }, {} as Record<number, Episode[]>);

    const GroupedShowCard: React.FC<{ eps: Episode[] }> = ({ eps }) => {
        const firstEp = eps[0];
        const { spoilerConfig } = settings;
        
        // Determine preview image based on spoiler replacement mode
        const episodeImageUrl = getImageUrl(firstEp.still_path || firstEp.poster_path);
        const bannerImageUrl = getImageUrl(firstEp.show_backdrop_path || firstEp.poster_path);
        
        return (
            <div className="w-full bg-zinc-950 border-b border-white/5 flex flex-col group/card">
                {/* Horizontal Banner Header */}
                <div className="bg-zinc-900/50 px-4 py-2 border-y border-white/5 flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-zinc-100 uppercase tracking-[0.15em] truncate pr-4">
                        {firstEp.show_name || firstEp.name}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                         {firstEp.is_movie ? (
                            <span className="text-[8px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 border border-indigo-500/20">MOVIE</span>
                         ) : (
                            <span className="text-[8px] font-mono text-zinc-600 bg-white/5 px-1.5 py-0.5 border border-white/5">{eps.length} EP</span>
                         )}
                    </div>
                </div>

                {/* Episode Preview with Blur vs Banner Option */}
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                    {eps.some(ep => !interactions[`episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`]?.is_watched) && spoilerConfig.images ? (
                        spoilerConfig.replacementMode === 'banner' ? (
                            <img src={bannerImageUrl} alt="" className="w-full h-full object-cover opacity-60 transition-opacity" />
                        ) : (
                            <img src={episodeImageUrl} alt="" className="w-full h-full object-cover blur-2xl scale-110 opacity-30 transition-opacity" />
                        )
                    ) : (
                        <img src={episodeImageUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover/card:opacity-80 transition-opacity duration-500" />
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    
                    {eps.some(ep => !interactions[`episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`]?.is_watched) && spoilerConfig.images && spoilerConfig.replacementMode === 'blur' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <EyeOff className="w-6 h-6 text-zinc-700 opacity-50" />
                        </div>
                    )}
                </div>

                {/* Episodes List */}
                <div className="flex flex-col">
                    {eps.map((ep) => {
                        const watchedKey = `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                        const isWatched = interactions[watchedKey]?.is_watched;
                        
                        // Respect Spoiler Settings
                        const displayName = (!isWatched && spoilerConfig.title) 
                            ? (ep.is_movie ? 'Movie Content' : `Episode ${ep.episode_number}`) 
                            : (ep.is_movie ? (ep.release_type === 'theatrical' ? 'Cinema Release' : 'Digital Release') : ep.name);
                        
                        const displayOverview = (!isWatched && spoilerConfig.overview)
                            ? 'Overview hidden to prevent spoilers.'
                            : (ep.is_movie ? (ep.overview || '2024 Feature Release') : `Season ${ep.season_number} • Episode ${ep.episode_number}`);

                        return (
                            <div 
                                key={`${ep.show_id}-${ep.id}`}
                                className={`
                                    px-4 py-3 border-b border-white/[0.03] last:border-b-0 flex items-center justify-between gap-4
                                    ${isWatched ? 'opacity-30' : 'hover:bg-white/[0.02]'}
                                    transition-all
                                `}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className={`text-[11px] font-bold truncate leading-none mb-1.5 ${(!isWatched && spoilerConfig.title) ? 'text-zinc-500' : 'text-zinc-200'}`}>
                                        {displayName}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {ep.is_movie && (
                                            ep.release_type === 'theatrical' 
                                                ? <Ticket className="w-2.5 h-2.5 text-pink-500" />
                                                : <MonitorPlay className="w-2.5 h-2.5 text-emerald-500" />
                                        )}
                                        <p className={`text-[9px] font-mono uppercase tracking-tighter truncate ${(!isWatched && spoilerConfig.overview) ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                            {displayOverview}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Bar */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {!ep.is_movie && (
                                        <button 
                                            onClick={() => markHistoryWatched(ep.show_id!, ep.season_number, ep.episode_number)}
                                            className="p-2 text-zinc-600 hover:text-emerald-400 transition-colors"
                                            title="Mark all previous as watched"
                                        >
                                            <History className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button 
                                        className="p-2 text-zinc-600 hover:text-white transition-colors"
                                        title="Watch Trailer"
                                    >
                                        <Play className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => ep.show_id && (ep.is_movie ? toggleWatched(ep.show_id, 'movie') : toggleEpisodeWatched(ep.show_id, ep.season_number, ep.episode_number))}
                                        className={`p-2 transition-all ${isWatched ? 'text-emerald-500' : 'text-zinc-600 hover:text-indigo-400'}`}
                                        title={isWatched ? "Unwatch" : "Mark Watched"}
                                    >
                                        <Check className={`w-4 h-4 ${isWatched ? 'stroke-[3px]' : 'stroke-2'}`} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <aside className="w-[320px] hidden xl:flex flex-col bg-[#050505] border-l border-white/5 shrink-0 z-20">
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {dayEps.length > 0 ? (
                    <div className="flex flex-col">
                        {Object.values(groupedEps).map((group, idx) => (
                            <GroupedShowCard key={idx} eps={group} />
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                        <CalendarDays className="w-8 h-8 text-zinc-800 mb-4 stroke-[1px]" />
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">No Activity</h4>
                        <p className="text-[9px] text-zinc-700 font-medium leading-relaxed uppercase tracking-tighter">
                            Your library is clear for this date
                        </p>
                    </div>
                )}
            </div>

            {/* Footer Summary (Slim) */}
            <footer className="px-6 py-4 border-t border-white/5 bg-zinc-950/40">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Library Health</span>
                    <span className="text-[9px] font-mono text-zinc-400">SYNCED</span>
                </div>
                <div className="h-[2px] w-full bg-zinc-900">
                    <div className="h-full bg-indigo-500 w-[70%] shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" />
                </div>
            </footer>
        </aside>
    );
};

export default V2Agenda;
