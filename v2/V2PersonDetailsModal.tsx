
import React, { useEffect, useState } from 'react';
import { X, Loader2, MapPin, Star, Plus, Check, Eye, EyeOff } from 'lucide-react';
import { getPersonDetails, getPersonCredits, getImageUrl } from '../services/tmdb';
import { TVShow, WatchedItem } from '../types';
import { useStore } from '../store';
import toast from 'react-hot-toast';

interface V2PersonDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    personId: number;
    onSelectShow?: (showId: number, mediaType: 'tv' | 'movie') => void;
}

const V2PersonDetailsModal: React.FC<V2PersonDetailsModalProps> = ({ isOpen, onClose, personId, onSelectShow }) => {
    const { watchlist, addToWatchlist, history, toggleWatched } = useStore();
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<any>(null);
    const [credits, setCredits] = useState<TVShow[]>([]);

    useEffect(() => {
        if (isOpen && personId) {
            setLoading(true);
            Promise.all([
                getPersonDetails(personId),
                getPersonCredits(personId)
            ]).then(([d, c]) => {
                setDetails(d);
                setCredits(c);
            }).catch(console.error).finally(() => setLoading(false));
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, personId]);

    const handleAdd = (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        addToWatchlist(show);
        toast.success("Added to Library");
    };

    const handleWatch = (e: React.MouseEvent, show: TVShow, isWatched: boolean) => {
        e.stopPropagation();
        if (!watchlist.some(w => w.id === show.id)) {
            addToWatchlist(show);
        }

        if (show.media_type === 'movie') {
            toggleWatched({ 
                tmdb_id: show.id, 
                media_type: 'movie', 
                is_watched: isWatched 
            });
            toast.success(isWatched ? "Marked unwatched" : "Marked watched");
        } else {
            // For TV, basic toggle on show object isn't fully precise but fits the "Quick Mark" context
            // Ideally this would open the detailed progress modal, but here we just mark as tracking
            toast("Tracked in library. Use show details for episode progress.");
        }
    };

    const handleShowClick = (show: TVShow) => {
        if (onSelectShow) {
            onSelectShow(show.id, show.media_type);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-0 md:p-6 bg-black/95 backdrop-blur-xl animate-fade-in">
            <div className="w-full h-full md:max-w-6xl md:h-[90vh] bg-[#020202] md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative border border-white/10">
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 z-50 p-3 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-xl transition-all border border-white/5"
                >
                    <X className="w-6 h-6" />
                </button>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    </div>
                ) : details ? (
                    <div className="flex-1 flex flex-col md:flex-row min-h-0">
                        {/* Sidebar Info */}
                        <div className="w-full md:w-96 shrink-0 bg-[#050505] border-b md:border-b-0 md:border-r border-white/5 overflow-y-auto custom-scrollbar p-8">
                            <div className="aspect-[2/3] rounded-2xl overflow-hidden mb-8 border border-white/5 shadow-2xl relative group">
                                <img src={getImageUrl(details.profile_path, 'h632')} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={details.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                            </div>
                            
                            <h1 className="text-3xl font-black text-white mb-2 leading-none">{details.name}</h1>
                            {details.place_of_birth && <p className="text-xs text-zinc-500 flex items-center gap-1.5 mb-6"><MapPin className="w-3 h-3" /> {details.place_of_birth}</p>}
                            
                            <div className="space-y-6 text-sm text-zinc-400">
                                {details.birthday && (
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Born</p>
                                        <p className="text-white font-medium">{details.birthday}</p>
                                    </div>
                                )}
                                {details.known_for_department && (
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Known For</p>
                                        <p className="text-white font-medium">{details.known_for_department}</p>
                                    </div>
                                )}
                                {details.biography && (
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Biography</p>
                                        <p className="text-xs leading-relaxed text-zinc-400 whitespace-pre-line">{details.biography}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Credits Grid */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-[#020202]">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                                <Star className="w-6 h-6 text-indigo-500 fill-current" /> Filmography
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                {credits.map(show => {
                                    const isAdded = watchlist.some(w => w.id === show.id);
                                    let isWatched = false;
                                    if (show.media_type === 'movie') isWatched = history[`movie-${show.id}`]?.is_watched;
                                    else isWatched = Object.values(history).some((h: WatchedItem) => h.tmdb_id === show.id && h.is_watched);

                                    return (
                                        <div 
                                            key={show.id} 
                                            className="group relative cursor-pointer flex flex-col gap-3"
                                            onClick={() => handleShowClick(show)}
                                        >
                                            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900 border border-white/5 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:border-white/20">
                                                <img 
                                                    src={getImageUrl(show.poster_path)} 
                                                    alt={show.name} 
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    loading="lazy"
                                                />
                                                
                                                {/* Overlay Actions */}
                                                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                                                    <button 
                                                        onClick={(e) => !isAdded && handleAdd(e, show)}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-full shadow-xl transition-transform hover:scale-110 ${isAdded ? 'bg-zinc-900 text-zinc-500 cursor-default' : 'bg-white text-black'}`}
                                                        title={isAdded ? "In Library" : "Add to Library"}
                                                    >
                                                        {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleWatch(e, show, isWatched)} 
                                                        className={`w-8 h-8 flex items-center justify-center rounded-full shadow-xl transition-transform hover:scale-110 ${isWatched ? 'bg-emerald-500 text-white' : 'bg-black/50 backdrop-blur-md text-white hover:bg-black/70'}`}
                                                        title={isWatched ? "Mark Unwatched" : "Mark Watched"}
                                                    >
                                                        {isWatched ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="px-1">
                                                <h3 className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors leading-tight line-clamp-2">{show.name}</h3>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[9px] font-bold text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">{show.media_type === 'movie' ? 'Film' : 'TV'}</span>
                                                    <span className="text-[10px] font-mono text-zinc-600">{show.first_air_date?.split('-')[0] || 'TBA'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-500">Person not found</div>
                )}
            </div>
        </div>
    );
};

export default V2PersonDetailsModal;
