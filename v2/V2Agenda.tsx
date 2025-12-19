
import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { Check, CalendarDays, Ticket, MonitorPlay, PlayCircle, ChevronDown, X } from 'lucide-react';
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
    const { settings, history, toggleWatched } = useStore();
    const { episodes } = useCalendarEpisodes(selectedDay);
    
    // Lock scroll on body when mobile agenda is open
    useEffect(() => {
        if (window.innerWidth < 1280 && isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
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
        
        const isWatched = (ep: Episode) => {
            const key = ep.is_movie 
                ? `movie-${ep.show_id}` 
                : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
            return history[key]?.is_watched || false;
        };

        const hasUnwatched = eps.some(ep => !isWatched(ep));
        
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
                            onClick={() => onPlayTrailer?.(firstEp.show_id || firstEp.id, firstEp.is_movie ? 'movie' : 'tv', firstEp)}
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
                </div>

                <div className="flex flex-col">
                    {eps.map((ep) => {
                        const watched = isWatched(ep);
                        const isTextCensored = !watched && spoilerConfig.title;
                        const isDescCensored = !watched && spoilerConfig.overview;
                        const titleText = isTextCensored ? `Episode ${ep.episode_number}` : (ep.is_movie ? (ep.release_type === 'theatrical' ? 'Cinema Premiere' : 'Digital Release') : ep.name);
                        const subText = isDescCensored ? 'Description hidden' : (ep.is_movie ? ep.overview : `S${ep.season_number} E${ep.episode_number}`);

                        return (
                            <div 
                                key={`${ep.show_id}-${ep.id}`}
                                className={`px-4 py-3 border-b border-white/[0.03] last:border-b-0 flex items-center justify-between gap-4 ${watched ? 'opacity-30' : 'hover:bg-white/[0.02]'} transition-all`}
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
                                    <button 
                                        onClick={() => toggleWatched({
                                            tmdb_id: ep.show_id,
                                            media_type: ep.is_movie ? 'movie' : 'episode',
                                            season_number: ep.season_number,
                                            episode_number: ep.episode_number,
                                            is_watched: watched
                                        })} 
                                        className={`p-2 transition-all ${watched ? 'text-emerald-500' : 'text-zinc-600 hover:text-white'}`}
                                    >
                                        <Check className={`w-4 h-4 ${watched ? 'stroke-[3px]' : 'stroke-2'}`} />
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
            {/* Mobile Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] xl:hidden animate-fade-in"
                    onClick={onClose}
                />
            )}

            {/* Agenda Panel */}
            <aside className={`
                flex flex-col bg-[#050505] z-[100] overflow-hidden
                xl:w-[320px] xl:border-l xl:border-white/5 xl:shrink-0 xl:relative xl:h-full xl:translate-y-0 xl:rounded-none xl:border-t-0
                fixed bottom-0 left-0 right-0 h-[85vh] rounded-t-[2rem] border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] 
                transition-transform duration-300 cubic-bezier(0.2, 0, 0, 1)
                ${isOpen ? 'translate-y-0' : 'translate-y-[110%] xl:translate-y-0'}
            `}>
                {/* Mobile Header */}
                <div className="xl:hidden shrink-0 pt-4 pb-2 px-6 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-10">
                    <div className="w-10 h-1 rounded-full bg-white/10 absolute top-2 left-1/2 -translate-x-1/2" />
                    <div className="mt-2">
                        <h2 className="text-lg font-black text-white leading-tight">{format(selectedDay, 'EEEE')}</h2>
                        <p className="text-xs text-zinc-500 font-medium">{format(selectedDay, 'MMMM do')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white mt-2">
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Desktop Header */}
                <div className="hidden xl:flex shrink-0 h-16 border-b border-white/5 items-center justify-between px-6 bg-[#050505]/80 backdrop-blur-md">
                     <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-wider">{format(selectedDay, 'EEEE')}</h2>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{format(selectedDay, 'MMM do')}</p>
                     </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#050505]">
                    {dayEps.length > 0 ? (
                        <div className="flex flex-col pb-20 xl:pb-0">
                            {Object.values(groupedEps).map((group, idx) => (
                                <GroupedShowCard key={idx} eps={group} />
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-40">
                            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-white/5">
                                <CalendarDays className="w-8 h-8 text-zinc-700" />
                            </div>
                            <h4 className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-1">No Events</h4>
                            <p className="text-[10px] text-zinc-700 font-medium max-w-[150px] leading-relaxed">
                                Nothing scheduled for {format(selectedDay, 'MMM d')}
                            </p>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};

export default V2Agenda;
