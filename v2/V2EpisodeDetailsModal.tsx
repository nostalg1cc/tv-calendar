
import React, { useEffect, useState } from 'react';
import { X, Loader2, Play, Check, Bell, Calendar, Clock, Star, User, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';
import { getEpisodeDetails, getImageUrl, getBackdropUrl } from '../services/tmdb';
import { useStore } from '../store';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface V2EpisodeDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    showId: number;
    seasonNumber: number;
    episodeNumber: number;
}

const V2EpisodeDetailsModal: React.FC<V2EpisodeDetailsModalProps> = ({ isOpen, onClose, showId, seasonNumber, episodeNumber }) => {
    const { history, toggleWatched, setReminderCandidate, settings } = useStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [spoilerRevealed, setSpoilerRevealed] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setSpoilerRevealed(false);
            getEpisodeDetails(showId, seasonNumber, episodeNumber)
                .then(res => setData(res))
                .catch(console.error)
                .finally(() => setLoading(false));
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, showId, seasonNumber, episodeNumber]);

    if (!isOpen) return null;

    const watchedKey = `episode-${showId}-${seasonNumber}-${episodeNumber}`;
    const isWatched = history[watchedKey]?.is_watched;
    
    // Spoiler Logic
    const isHidden = !isWatched && !spoilerRevealed && (settings.spoilerConfig.images || settings.spoilerConfig.overview);

    const handleToggleWatched = () => {
        toggleWatched({
            tmdb_id: showId,
            media_type: 'episode',
            season_number: seasonNumber,
            episode_number: episodeNumber,
            is_watched: isWatched
        });
        toast.success(isWatched ? "Marked Unwatched" : "Marked Watched");
    };

    const handleReminder = () => {
        // Construct mock item for reminder modal
        const mockItem = {
            id: data.id,
            name: data.name,
            show_id: showId,
            show_name: 'This Show', // Ideally pass show name in props, but generic is ok
            season_number: seasonNumber,
            episode_number: episodeNumber,
            is_movie: false,
            overview: data.overview,
            vote_average: data.vote_average,
            first_air_date: data.air_date
        };
        setReminderCandidate(mockItem as any);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-8 bg-black/95 backdrop-blur-2xl animate-fade-in">
             <div className="bg-[#09090b] w-full h-full md:max-w-4xl md:h-auto md:max-h-[90vh] md:rounded-3xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden group/modal">
                 
                 <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-white/10 text-white rounded-full transition-colors backdrop-blur-md border border-white/5">
                     <X className="w-6 h-6" />
                 </button>

                 {loading || !data ? (
                     <div className="flex-1 flex items-center justify-center">
                         <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                     </div>
                 ) : (
                     <div className="flex-1 overflow-y-auto custom-scrollbar">
                         {/* Header Image */}
                         <div className="relative w-full h-64 md:h-80 shrink-0">
                             <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getImageUrl(data.still_path || data.show_backdrop_path, 'original')})` }}>
                                 {isHidden && settings.spoilerConfig.images && (
                                     <div className="absolute inset-0 backdrop-blur-2xl bg-black/40 flex items-center justify-center">
                                         <div className="flex flex-col items-center gap-2 text-zinc-400">
                                             <EyeOff className="w-10 h-10" />
                                             <span className="text-xs font-bold uppercase tracking-widest">Spoiler Hidden</span>
                                             <button onClick={() => setSpoilerRevealed(true)} className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors">Reveal</button>
                                         </div>
                                     </div>
                                 )}
                             </div>
                             <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
                         </div>

                         <div className="p-8 -mt-20 relative z-10">
                             <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                                 <div>
                                     <div className="flex items-center gap-3 mb-2 text-indigo-400 font-mono text-sm font-bold">
                                         <span className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">S{seasonNumber} E{episodeNumber}</span>
                                         {data.air_date && <span>{format(parseISO(data.air_date), 'MMMM d, yyyy')}</span>}
                                     </div>
                                     <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">{data.name}</h2>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">
                                         <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                         <span className="text-sm font-bold text-white">{data.vote_average.toFixed(1)}</span>
                                     </div>
                                     <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">
                                         <Clock className="w-4 h-4 text-zinc-400" />
                                         <span className="text-sm font-bold text-white">{data.runtime}m</span>
                                     </div>
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                 <div className="lg:col-span-2 space-y-8">
                                     <p className={`text-zinc-300 leading-relaxed text-lg ${isHidden && settings.spoilerConfig.overview ? 'blur-sm select-none opacity-50' : ''}`} onClick={() => isHidden && setSpoilerRevealed(true)}>
                                         {data.overview || "No description available."}
                                     </p>
                                     
                                     {/* Guest Stars */}
                                     {data.credits?.guest_stars?.length > 0 && (
                                         <div>
                                             <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Guest Stars</h4>
                                             <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                                                 {data.credits.guest_stars.map((star: any) => (
                                                     <div key={star.id} className="flex items-center gap-3 bg-zinc-900/50 p-2 pr-4 rounded-full border border-white/5 shrink-0">
                                                         <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                                                             {star.profile_path ? <img src={getImageUrl(star.profile_path, 'w185')} className="w-full h-full object-cover" alt="" /> : <User className="w-full h-full p-2 text-zinc-600" />}
                                                         </div>
                                                         <div>
                                                             <p className="text-xs font-bold text-white">{star.name}</p>
                                                             <p className="text-[10px] text-zinc-500">{star.character}</p>
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                     )}

                                     {/* Images */}
                                     {data.images?.stills?.length > 0 && (
                                         <div>
                                             <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Gallery</h4>
                                             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                 {data.images.stills.slice(0, 6).map((img: any, i: number) => (
                                                     <div key={i} className="aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-white/5 group relative">
                                                         <img 
                                                             src={getImageUrl(img.file_path, 'w300')} 
                                                             className={`w-full h-full object-cover ${isHidden && settings.spoilerConfig.images ? 'blur-md' : ''}`} 
                                                             alt="" 
                                                         />
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                     )}
                                 </div>

                                 <div className="space-y-4">
                                     <div className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5 space-y-3">
                                         <button 
                                            onClick={handleToggleWatched}
                                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isWatched ? 'bg-emerald-600 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
                                         >
                                             {isWatched ? <Check className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                             {isWatched ? 'Watched' : 'Mark Watched'}
                                         </button>
                                         <button 
                                            onClick={handleReminder}
                                            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                                         >
                                             <Bell className="w-4 h-4" /> Set Reminder
                                         </button>
                                     </div>
                                     
                                     {/* Crew */}
                                     <div className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5">
                                          <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Crew</h4>
                                          <div className="space-y-3">
                                              {data.crew?.filter((c: any) => ['Director', 'Writer', 'Teleplay', 'Story'].includes(c.job)).slice(0, 5).map((c: any, i: number) => (
                                                  <div key={i} className="flex justify-between items-center text-sm">
                                                      <span className="text-zinc-300 font-medium">{c.name}</span>
                                                      <span className="text-zinc-600 text-xs">{c.job}</span>
                                                  </div>
                                              ))}
                                          </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}
             </div>
        </div>
    );
};

export default V2EpisodeDetailsModal;
