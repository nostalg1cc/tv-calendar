
import React, { useEffect, useState } from 'react';
import { X, Play, Plus, Check, Star, Loader2, Calendar, Clock, MonitorPlay, Ticket, ChevronDown, Video, Youtube, ExternalLink } from 'lucide-react';
import { getShowDetails, getMovieDetails, getImageUrl, getBackdropUrl, getVideos, getSeasonDetails } from '../services/tmdb';
import { TVShow, Episode, Season, Video as VideoType } from '../types';
import { useStore } from '../store';
import { format, parseISO, isFuture } from 'date-fns';

interface ShowDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    showId: number;
    mediaType: 'tv' | 'movie';
}

const ShowDetailsModal: React.FC<ShowDetailsModalProps> = ({ isOpen, onClose, showId, mediaType }) => {
    const { addToWatchlist, watchlist, history, toggleWatched } = useStore();
    
    // Data State
    const [details, setDetails] = useState<TVShow | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Episode/Season State
    const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(1);
    const [seasonData, setSeasonData] = useState<Season | null>(null);
    const [loadingSeason, setLoadingSeason] = useState(false);

    // Video State
    const [videos, setVideos] = useState<VideoType[]>([]);
    const [playingVideo, setPlayingVideo] = useState<VideoType | null>(null);

    // Initial Fetch
    useEffect(() => {
        if (isOpen && showId) {
            setLoading(true);
            const fetchData = async () => {
                try {
                    const fetcher = mediaType === 'movie' ? getMovieDetails : getShowDetails;
                    const data = await fetcher(showId);
                    setDetails(data);
                    
                    // Fetch Videos
                    getVideos(mediaType, showId).then(setVideos);
                    
                    // Setup default season
                    if (mediaType === 'tv' && data.seasons && data.seasons.length > 0) {
                        const firstSeason = data.seasons.find(s => s.season_number > 0) || data.seasons[0];
                        setSelectedSeasonNum(firstSeason.season_number);
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
            setVideos([]);
            setSeasonData(null);
        }
    }, [isOpen, showId, mediaType]);

    // Fetch Season Data when selector changes
    useEffect(() => {
        if (mediaType === 'tv' && details && selectedSeasonNum !== undefined) {
            setLoadingSeason(true);
            getSeasonDetails(details.id, selectedSeasonNum)
                .then(setSeasonData)
                .catch(console.error)
                .finally(() => setLoadingSeason(false));
        }
    }, [selectedSeasonNum, details, mediaType]);

    // Prevent body scroll
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const isAdded = details ? watchlist.some(s => s.id === details.id) : false;

    // --- SUB COMPONENTS ---

    const EpisodeItem: React.FC<{ ep: Episode }> = ({ ep }) => {
        const isUpcoming = ep.air_date ? isFuture(parseISO(ep.air_date)) : false;
        const key = `episode-${details?.id}-${ep.season_number}-${ep.episode_number}`;
        const isWatched = history[key]?.is_watched;

        return (
            <div className={`group flex gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${isWatched ? 'opacity-50' : ''}`}>
                <div className="w-8 shrink-0 pt-1 flex flex-col items-center gap-2">
                    <span className="text-zinc-500 font-mono text-sm">{ep.episode_number}</span>
                    <button 
                        onClick={() => toggleWatched({ tmdb_id: details!.id, media_type: 'episode', season_number: ep.season_number, episode_number: ep.episode_number, is_watched: isWatched })}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isWatched ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-zinc-700 text-zinc-700 hover:border-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Check className="w-3 h-3" />
                    </button>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-bold text-sm ${isUpcoming ? 'text-indigo-300' : 'text-zinc-200'}`}>{ep.name}</h4>
                        {ep.air_date && (
                            <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap ml-4 uppercase tracking-wide">
                                {format(parseISO(ep.air_date), 'MMM d, yyyy')}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{ep.overview || "No description available."}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#020202] overflow-y-auto animate-fade-in custom-scrollbar">
            
            {/* CLOSE BUTTON */}
            <button 
                onClick={onClose} 
                className="fixed top-6 right-6 z-50 p-3 rounded-full bg-black/50 hover:bg-zinc-800 text-white backdrop-blur-md transition-all border border-white/10 group shadow-2xl"
            >
                <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>

            {loading || !details ? (
                <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest animate-pulse">Loading Details...</p>
                </div>
            ) : (
                <div className="min-h-screen w-full relative">
                    
                    {/* HERO SECTION */}
                    <div className="relative w-full h-[60vh] lg:h-[70vh]">
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getBackdropUrl(details.backdrop_path)})` }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/40 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#020202]/80 via-transparent to-transparent" />
                        
                        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 lg:p-16 max-w-7xl mx-auto flex flex-col md:flex-row items-end gap-8">
                            {/* Poster */}
                            <div className="hidden md:block w-48 lg:w-56 aspect-[2/3] rounded-lg shadow-2xl overflow-hidden border border-white/10 shrink-0 transform translate-y-12 bg-zinc-900">
                                <img src={getImageUrl(details.poster_path)} className="w-full h-full object-cover" alt="" />
                            </div>

                            <div className="flex-1 min-w-0 pb-4">
                                <div className="flex flex-wrap items-center gap-3 mb-4 text-xs font-bold uppercase tracking-widest text-zinc-300">
                                    <span className="bg-white/10 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-white">
                                        {mediaType === 'movie' ? 'Feature Film' : 'TV Series'}
                                    </span>
                                    <span>{details.first_air_date?.split('-')[0]}</span>
                                    <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3.5 h-3.5 fill-current" /> {details.vote_average.toFixed(1)}</span>
                                    <span>{details.original_language?.toUpperCase()}</span>
                                </div>
                                
                                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter mb-6 line-clamp-2">
                                    {details.name}
                                </h1>

                                <div className="flex flex-wrap gap-4">
                                    <button 
                                        onClick={() => !isAdded && addToWatchlist(details)}
                                        disabled={isAdded}
                                        className={`
                                            h-12 px-8 rounded-lg font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg
                                            ${isAdded 
                                                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-default' 
                                                : 'bg-white text-black hover:bg-zinc-200 hover:scale-105'}
                                        `}
                                    >
                                        {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        {isAdded ? 'Tracking' : 'Track Show'}
                                    </button>
                                    {videos.length > 0 && (
                                        <button 
                                            onClick={() => setPlayingVideo(videos.find(v => v.type === 'Trailer') || videos[0])}
                                            className="h-12 px-8 rounded-lg font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all border border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md hover:scale-105"
                                        >
                                            <Play className="w-4 h-4 fill-current" /> Watch Trailer
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CONTENT GRID */}
                    <div className="max-w-7xl mx-auto p-6 md:p-12 lg:p-16 pt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                        
                        {/* LEFT COLUMN: Overview & Episodes */}
                        <div className="lg:col-span-2 space-y-12">
                            
                            {/* Synopsis */}
                            <section>
                                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Overview</h3>
                                <p className="text-zinc-300 text-lg leading-relaxed font-medium">
                                    {details.overview || "No synopsis available for this title."}
                                </p>
                            </section>

                            {/* Seasons & Episodes (TV Only) */}
                            {mediaType === 'tv' && (
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Episodes</h3>
                                        <div className="relative">
                                            <select 
                                                value={selectedSeasonNum}
                                                onChange={(e) => setSelectedSeasonNum(Number(e.target.value))}
                                                className="appearance-none bg-zinc-900 border border-zinc-700 text-white text-xs font-bold uppercase tracking-wider py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer hover:bg-zinc-800 transition-colors"
                                            >
                                                {details.seasons?.filter(s => s.season_number > 0).map(s => (
                                                    <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-zinc-900/30 rounded-2xl border border-white/5 overflow-hidden min-h-[200px]">
                                        {loadingSeason ? (
                                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                                        ) : seasonData ? (
                                            <div className="divide-y divide-white/5">
                                                {seasonData.episodes.map(ep => <EpisodeItem key={ep.id} ep={ep} />)}
                                            </div>
                                        ) : (
                                            <div className="p-10 text-center text-zinc-500">Select a season to view episodes</div>
                                        )}
                                    </div>
                                </section>
                            )}

                        </div>

                        {/* RIGHT COLUMN: Sidebar (Media & Info) */}
                        <div className="space-y-10">
                            
                            {/* Media Section */}
                            <section>
                                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Video className="w-4 h-4" /> Media & Clips
                                </h3>
                                <div className="space-y-4">
                                    {videos.slice(0, 5).map(video => (
                                        <button 
                                            key={video.id}
                                            onClick={() => setPlayingVideo(video)}
                                            className="group w-full flex gap-4 text-left p-3 rounded-xl hover:bg-zinc-900 transition-colors border border-transparent hover:border-white/5"
                                        >
                                            <div className="relative w-32 aspect-video bg-black rounded-lg overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300">
                                                <img 
                                                    src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`} 
                                                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                                    alt="" 
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-indigo-600 transition-colors">
                                                        <Play className="w-3 h-3 text-white fill-current" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
                                                <h4 className="text-xs font-bold text-zinc-200 line-clamp-2 leading-snug group-hover:text-white mb-1">{video.name}</h4>
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider border border-zinc-800 px-1.5 py-0.5 rounded">{video.type}</span>
                                            </div>
                                        </button>
                                    ))}
                                    {videos.length === 0 && (
                                        <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl">
                                            <p className="text-xs text-zinc-600">No clips available</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Info Section */}
                            <section>
                                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <ExternalLink className="w-4 h-4" /> Information
                                </h3>
                                <div className="bg-zinc-900/30 rounded-xl p-6 border border-white/5 space-y-4">
                                    <div>
                                        <span className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Status</span>
                                        <span className="text-sm font-medium text-white">{mediaType === 'movie' ? 'Released' : 'Returning Series'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Original Name</span>
                                        <span className="text-sm font-medium text-white">{details.original_language === 'en' ? details.name : 'Unknown'}</span>
                                    </div>
                                    {details.origin_country && (
                                        <div>
                                            <span className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Country</span>
                                            <span className="text-sm font-medium text-white">{details.origin_country.join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            </section>

                        </div>
                    </div>
                </div>
            )}
            
            {/* VIDEO OVERLAY */}
            {playingVideo && (
                 <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in" onClick={() => setPlayingVideo(null)}>
                     <div className="w-full max-w-7xl aspect-video bg-black relative shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                         <iframe 
                            src={`https://www.youtube.com/embed/${playingVideo.key}?autoplay=1`}
                            className="w-full h-full"
                            allowFullScreen
                            allow="autoplay"
                         />
                         <button onClick={() => setPlayingVideo(null)} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-zinc-800 text-white rounded-full transition-colors backdrop-blur-md">
                             <X className="w-6 h-6" />
                         </button>
                     </div>
                 </div>
            )}
        </div>
    );
};

export default ShowDetailsModal;
