
import React, { useEffect, useState } from 'react';
import { X, Play, Plus, Check, Star, Loader2 } from 'lucide-react';
import { getShowDetails, getMovieDetails, getImageUrl, getBackdropUrl, getVideos } from '../services/tmdb';
import { TVShow } from '../types';
import { useStore } from '../store';
import TrailerModal from './TrailerModal';

interface ShowDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    showId: number;
    mediaType: 'tv' | 'movie';
}

const ShowDetailsModal: React.FC<ShowDetailsModalProps> = ({ isOpen, onClose, showId, mediaType }) => {
    const { addToWatchlist, watchlist } = useStore();
    const [details, setDetails] = useState<TVShow | null>(null);
    const [loading, setLoading] = useState(true);
    const [videoKey, setVideoKey] = useState<string | null>(null);
    const [showTrailer, setShowTrailer] = useState(false);

    useEffect(() => {
        if (isOpen && showId) {
            setLoading(true);
            const fetchData = async () => {
                try {
                    const fetcher = mediaType === 'movie' ? getMovieDetails : getShowDetails;
                    const data = await fetcher(showId);
                    setDetails(data);
                    
                    const videos = await getVideos(mediaType, showId);
                    if (videos.length > 0) {
                        const trailer = videos.find(v => v.type === 'Trailer') || videos[0];
                        setVideoKey(trailer.key);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        } else {
            setDetails(null);
            setVideoKey(null);
        }
    }, [isOpen, showId, mediaType]);

    if (!isOpen) return null;

    const isAdded = details ? watchlist.some(s => s.id === details.id) : false;

    const handleAdd = async () => {
        if (details) {
            await addToWatchlist(details);
        }
    };

    return (
        <>
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div 
                className="bg-[#050505] border border-white/5 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {loading ? (
                    <div className="h-96 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    </div>
                ) : details && (
                    <>
                        {/* Hero Header */}
                        <div className="relative h-64 md:h-80 shrink-0">
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getBackdropUrl(details.backdrop_path)})` }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/20 to-transparent" />
                            
                            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors border border-white/10 z-20">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="absolute -bottom-16 left-6 md:left-8 w-32 md:w-40 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 hidden sm:block z-20 bg-zinc-900">
                                <img src={getImageUrl(details.poster_path)} className="w-full h-full object-cover" alt="" />
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 pl-6 sm:pl-44 md:pl-56 flex flex-col gap-2 z-10">
                                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-xl line-clamp-2">
                                    {details.name}
                                </h2>
                                <div className="flex items-center gap-3 text-sm font-medium text-white/90 drop-shadow-md">
                                    <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                                        {details.media_type === 'movie' ? 'Movie' : 'TV Series'}
                                    </span>
                                    <span>{details.first_air_date?.split('-')[0]}</span>
                                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400 fill-current" /> {details.vote_average.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto bg-[#050505] p-6 md:p-8 pt-6 sm:pt-20 custom-scrollbar">
                            <div className="sm:hidden w-32 aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-zinc-800 mb-6 mx-auto">
                                <img src={getImageUrl(details.poster_path)} className="w-full h-full object-cover" alt="" />
                            </div>

                            <div className="grid md:grid-cols-[2fr_1fr] gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-2">Synopsis</h3>
                                        <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                                            {details.overview || "No overview available."}
                                        </p>
                                    </div>

                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleAdd}
                                            disabled={isAdded}
                                            className={`
                                                flex-1 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                                                ${isAdded 
                                                    ? 'bg-zinc-800 text-zinc-400 cursor-default border border-zinc-700' 
                                                    : 'bg-white text-black hover:bg-zinc-200 shadow-white/10'}
                                            `}
                                        >
                                            {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                            {isAdded ? 'In Library' : 'Add to Library'}
                                        </button>
                                        
                                        {videoKey && (
                                            <button 
                                                onClick={() => setShowTrailer(true)}
                                                className="flex-1 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-white/5 hover:bg-white/10 text-white border border-white/10"
                                            >
                                                <Play className="w-5 h-5 fill-current" />
                                                Trailer
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5 h-fit">
                                    <div>
                                        <span className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Status</span>
                                        <span className="text-sm text-white font-medium">
                                            {mediaType === 'movie' ? 'Released' : 'Returning Series'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Original Title</span>
                                        <span className="text-sm text-white font-medium">{details.name}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>

        {showTrailer && details && (
            <TrailerModal 
                isOpen={showTrailer} 
                onClose={() => setShowTrailer(false)} 
                item={{
                    ...details,
                    season_number: 0,
                    episode_number: 0,
                    show_id: details.id,
                    show_name: details.name,
                    is_movie: mediaType === 'movie'
                } as any} 
            />
        )}
        </>
    );
};

export default ShowDetailsModal;
