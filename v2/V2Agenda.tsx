
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Check, CalendarDays, History, EyeOff, Ticket, MonitorPlay, PlayCircle, X, ChevronDown, RefreshCw, Cloud, HardDrive } from 'lucide-react';
import { useStore } from '../store';
import { Episode } from '../types';
import { getImageUrl } from '../services/tmdb';
import { useCalendarEpisodes } from '../hooks/useQueries';

interface V2AgendaProps {
    selectedDay: Date;
    onPlayTrailer?: (showId: number, mediaType: 'tv' | 'movie', episode?: Episode) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

const V2Agenda: React.FC<V2AgendaProps> = ({ selectedDay, onPlayTrailer, isOpen, onClose }) => {
    const { settings, history: interactions, toggleWatched, isSyncing, user, triggerCloudSync } = useStore();
    const { episodes } = useCalendarEpisodes(selectedDay);
    
    // Prevent body scroll when drawer is open on mobile
    useEffect(() => {
        if (window.innerWidth < 1280) { // xl breakpoint
            document.body.style.overflow = isOpen ? 'hidden' : '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const dateKey = format(selectedDay, 'yyyy-MM-dd');
    const dayEps = episodes.filter(ep => ep.air_date === dateKey).filter(ep => {
        if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
        if (settings.ignoreSpecials && ep.season_number === 0) return false;
        return true;
    });

    const groupedEps = dayEps.reduce((acc, ep) => {
        const key = ep.show_id || ep.id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(ep);
        return acc;
    }, {} as Record<number, Episode[]>);

    const GroupedShowCard: React.FC<{ eps: Episode[] }> = ({ eps }) => {
        const firstEp = eps[0];
        const { spoilerConfig } = settings;
        const hasUnwatched = eps.some(ep => {
            const key = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
            return !interactions[key]?.is_watched;
        });
        
        const stillUrl = getImageUrl(firstEp.still_path || firstEp.poster_path);
        const bannerUrl = getImageUrl(firstEp.show_backdrop_path || firstEp.poster_path);
        
        const isSpoilerProtected = hasUnwatched && spoilerConfig.images;
        const displayImageUrl = (isSpoilerProtected && spoilerConfig.replacementMode === 'banner') ? bannerUrl : stillUrl;

        return (
            <div className="w-full bg-zinc-950 border-b border-white/5 flex flex-col group/card first:border-t-0">
                <div className="bg-zinc-900/40 px-4 py-2 border-y border-white/5 flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.15em] truncate pr-4">
                        {firstEp.show_name || firstEp.name}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                         {firstEp.is_movie ? (
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border mr-2 flex items-center gap-1 ${firstEp.release_type === 'theatrical' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                {firstEp.release_type === 'theatrical' ? <Ticket className="w-2.5 h-2.5" /> : <MonitorPlay className="w-2.5 h-2.5" />}
                                {firstEp.release_type === 'theatrical' ? 'Cinema' : 'Digital'}
                            </span>
                         ) : (
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 bg-white/5 px-1.5 py-0.5 border border-white/5 rounded mr-2">{eps.length} EP</span>
                         )}
                         <button 
                            onClick={() => onPlayTrailer?.(firstEp.show_id || firstEp.id, firstEp.is_movie ? 'movie' : 'tv')}
                            className="p-1.5 text-zinc-600 hover:text-white transition-colors"
                            title="Play Trailer"
                         >
                            <PlayCircle className="w-3.5 h-3.5" />
                         </button>
                    </div>
                </div>

                <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                    <img 
                        src={displayImageUrl} 
                        alt="" 
                        className={`w-full h-full object-cover transition-all duration-700 
                            ${isSpoilerProtected && spoilerConfig.replacementMode === 'blur' ? 'blur-2xl scale-110 opacity-30' : 'opacity-60 group-hover/card:opacity-90'}
                        `}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    {isSpoilerProtected && spoilerConfig.replacementMode === 'blur' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <EyeOff className="w-6 h-6 text-zinc-800" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col">
                    {eps.map((ep) => {
                        const watchedKey = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                        const isWatched = interactions[watchedKey]?.is_watched;
                        const isTextCensored = !isWatched && spoilerConfig.title;
                        const isDescCensored = !isWatched && spoilerConfig.overview;
                        const titleText = isTextCensored ? `Episode ${ep.episode_number}` : (ep.is_movie ? (ep.release_type === 'theatrical' ? 'Cinema Premiere' : 'Digital Release') : ep.name);
                        const subText = isDescCensored ? 'Description hidden' : (ep.is_movie ? ep.overview : `S${ep.season_number} E${ep.episode_number}`);

                        return (
                            <div 
                                key={`${ep.show_id}-${ep.id}`}
                                className={`px-4 py-3 border-b border-white/[0.03] last:border-b-0 flex items-center justify-between gap-4 ${isWatched ? 'opacity-30' : 'hover:bg-white/[0.02]'} transition-all`}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className={`text-[11px] font-bold truncate leading-none ${isTextCensored ? 'text-zinc-600' : 'text-zinc-200'}`}>{titleText}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {ep.is_movie ? (
                                            ep.release_type === 'theatrical' ? <Ticket className="w-2.5 h-2.5 text-pink-400" /> : <MonitorPlay className="w-2.5 h-2.5 text-emerald-400" />
                                        ) : null}
                                        <p className={`text-[9px] font-mono uppercase tracking-tighter truncate ${isDescCensored ? 'text-zinc-700 italic' : 'text-zinc-500'}`}>{subText}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => ep.show_id && toggleWatched({ tmdb_id: ep.show_id, media_type: ep.is_movie ? 'movie' : 'episode', season_number: ep.season_number, episode_number: ep.episode_number, is_watched: isWatched })} className={`p-2 transition-all ${isWatched ? 'text-emerald-500' : 'text-zinc-600 hover:text-white'}`}>
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
        <>
            {/* Backdrop for Mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] xl:hidden animate-fade-in"
                    onClick={onClose}
                />
            )}

            {/* Agenda Container (Drawer on Mobile, Sidebar on Desktop) */}
            <aside className={`
                flex flex-col bg-[#050505] z-[100] overflow-hidden
                
                /* Desktop: Static Right Sidebar */
                xl:w-[320px] xl:border-l xl:border-white/5 xl:shrink-0 xl:relative xl:h-full xl:translate-y-0 xl:rounded-none xl:border-t-0

                /* Mobile: Fixed Bottom Drawer */
                fixed bottom-0 left-0 right-0 h-[80vh] rounded-t-[2.5rem] border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] transition-transform duration-300 cubic-bezier(0.2, 0, 0, 1)
                ${isOpen ? 'translate-y-0' : 'translate-y-[110%] xl:translate-y-0'}
            `}>
                {/* Mobile Drawer Handle/Header */}
                <div className="xl:hidden shrink-0 pt-4 pb-2 px-6 flex items-center justify-between bg-zinc-950 border-b border-white/5 relative">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-800 rounded-full" />
                    <div className="mt-4">
                        <h2 className="text-lg font-black text-white">{format(selectedDay, 'EEEE')}</h2>
                        <p className="text-xs text-zinc-500 font-medium">{format(selectedDay, 'MMMM do')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full text-zinc-400 mt-2">
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#050505]">
                    {dayEps.length > 0 ? (
                        <div className="flex flex-col pb-10 xl:pb-0">
                            {Object.values(groupedEps).map((group, idx) => (
                                <GroupedShowCard key={idx} eps={group} />
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-50">
                            <CalendarDays className="w-12 h-12 text-zinc-800 mb-4 stroke-[1px]" />
                            <h4 className="text-xs font-black text-zinc-700 uppercase tracking-widest mb-1">Clear Horizon</h4>
                            <p className="text-[10px] text-zinc-800 font-medium uppercase tracking-tighter">
                                No scheduled tracking for {format(selectedDay, 'MMMM d')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Desktop Status Bar (Hidden on Mobile) */}
                <footer className="hidden xl:flex items-center justify-between px-6 py-4 border-t border-white/5 bg-zinc-950/40">
                    <div className="flex items-center gap-2.5">
                        {user?.is_cloud ? (
                            <div className={`p-1.5 rounded-full ${isSyncing ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                <Cloud className={`w-3 h-3 ${isSyncing ? 'animate-pulse' : ''}`} />
                            </div>
                        ) : (
                            <div className="p-1.5 rounded-full bg-orange-500/10 text-orange-400">
                                <HardDrive className="w-3 h-3" />
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                {user?.is_cloud ? 'Cloud Sync' : 'Local Storage'}
                            </span>
                            <span className="text-[9px] font-medium text-zinc-600">
                                {isSyncing ? 'Syncing...' : (user?.is_cloud ? 'Up to date' : 'Device Only')}
                            </span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => user?.is_cloud ? triggerCloudSync() : window.location.reload()}
                        disabled={isSyncing}
                        className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                </footer>
            </aside>
        </>
    );
};

export default V2Agenda;
