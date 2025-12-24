
import React, { useEffect, useState, useMemo } from 'react';
import { X, Play, Plus, Check, Star, Loader2, Calendar, Clock, MonitorPlay, Ticket, ChevronDown } from 'lucide-react';
import { getShowDetails, getMovieDetails, getImageUrl, getBackdropUrl, getVideos, getSeasonDetails } from '../services/tmdb';
import { TVShow, Episode, Season, Video } from '../types';
import { useStore } from '../store';
import { format, parseISO, isFuture } from 'date-fns';
import TrailerModal from './TrailerModal';

interface ShowDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    showId: number;
    mediaType: 'tv' | 'movie';
}

const ShowDetailsModal: React.FC<ShowDetailsModalProps> = ({ isOpen, onClose, showId, mediaType }) => {
    const { addToWatchlist, watchlist, history } = useStore();
    
    // Data State
    const [details, setDetails] = useState<TVShow | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'overview' | 'episodes' | 'videos'>('overview');
    
    // Episode/Season State
    const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(1);
    const [seasonData, setSeasonData] = useState<Season | null>(null);
    const [loadingSeason, setLoadingSeason] = useState(false);

    // Video State
    const [videos, setVideos] = useState<Video[]>([]);
    const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

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
                    
                    // If TV, set default season to 1 or last season?
                    // Let's set to season 1 for now, user can switch
                    if (mediaType === 'tv' && data.seasons && data.seasons.length > 0) {
                        // Find first non-zero season
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
            setActiveTab('overview');
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

    if (!isOpen) return null;

    const isAdded = details ? watchlist.some(s => s.id === details.id) : false;

    // --- RENDER HELPERS ---

    const EpisodeRow: React.FC<{ ep: Episode }> = ({ ep }) => {
        const isUpcoming = ep.air_date ? isFuture(parseISO(ep.air_date)) : false;
        const key = `episode-${details?.id}-${ep.season_number}-${ep.episode_number}`;
        const isWatched = history[key]?.is_watched;

        return (
            <div className={`flex gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${isWatched ? 'opacity-50' : ''}`}>
                <div className="w-8 shrink-0 text-zinc-500 font-mono text-sm pt-1">{ep.episode_number}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-bold text-sm ${isUpcoming ? 'text-indigo-300' : 'text-zinc-200'}`}>{ep.name}</h4>
                        {ep.air_date && (
                            <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap ml-4">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in p-4 md:p-8" onClick={onClose}>
            <div 
                className="bg-[#09090b] border border-white/10 w-full max-w-5xl h-full md:h-[85vh] shadow-2xl flex flex-col overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                {/* CLOSE BUTTON */}
                <button onClick={onClose} className="absolute top-0 right-0 p-4 z-50 text-white/50 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>

                {loading || !details ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        
                        {/* HERO HEADER */}
                        <div className="relative shrink-0 h-64 md:h-80 bg-zinc-900">
                            <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url(${getBackdropUrl(details.backdrop_path)})` }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/40 to-transparent" />
                            
                            <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full flex flex-col md:flex-row gap-6 md:items-end">
                                {/* POSTER (Hidden on mobile to save space, or small) */}
                                <div className="hidden md:block w-32 aspect-[2/3] bg-black border border-white/10 shadow-2xl shrink-0">
                                    <img src={getImageUrl(details.poster_path)} className="w-full h-full object-cover" alt="" />
                                </div>
                                
                                <div className="flex-1 min-w-0 mb-2">
                                    <div className="flex items-center gap-3 mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        <span className="bg-white/10 px-2 py-0.5 text-white">{mediaType === 'movie' ? 'Film' : 'Series'}</span>
                                        <span>{details.first_air_date?.split('-')[0]}</span>
                                        <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-current" /> {details.vote_average.toFixed(1)}</span>
                                    </div>
                                    <h1 className="text-3xl md:text-5xl font-black text-white leading-none tracking-tight line-clamp-2 mb-4">{details.name}</h1>
                                    
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => !isAdded && addToWatchlist(details)}
                                            disabled={isAdded}
                                            className={`
                                                h-10 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all
                                                ${isAdded ? 'bg-zinc-800 text-zinc-500 cursor-default' : 'bg-white text-black hover:bg-zinc-200'}
                                            `}
                                        >
                                            {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                            {isAdded ? 'In Library' : 'Add to Library'}
                                        </button>
                                        
                                        {videos.length > 0 && (
                                            <button 
                                                onClick={() => setActiveTab('videos')}
                                                className="h-10 px-6 border border-white/20 text-white hover:bg-white/10 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                                            >
                                                <Play className="w-4 h-4" /> Trailer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TABS */}
                        <div className="flex border-b border-white/10 px-6 md:px-10 bg-[#09090b]">
                            {['overview', ...(mediaType === 'tv' ? ['episodes'] : []), 'videos'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`
                                        px-6 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors
                                        ${activeTab === tab ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}
                                    `}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* TAB CONTENT */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#09090b]">
                            
                            {/* OVERVIEW */}
                            {activeTab === 'overview' && (
                                <div className="p-6 md:p-10 max-w-4xl">
                                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">Synopsis</h3>
                                    <p className="text-zinc-300 leading-relaxed text-sm md:text-base mb-8">
                                        {details.overview || "No synopsis available."}
                                    </p>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div>
                                            <span className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Original Language</span>
                                            <span className="text-sm font-mono text-zinc-300 uppercase">{details.original_language || 'EN'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Status</span>
                                            <span className="text-sm font-mono text-zinc-300">{mediaType === 'movie' ? 'Released' : 'Returning Series'}</span>
                                        </div>
                                        {/* Additional metadata could go here */}
                                    </div>
                                </div>
                            )}

                            {/* EPISODES (TV Only) */}
                            {activeTab === 'episodes' && mediaType === 'tv' && (
                                <div className="flex flex-col h-full">
                                    {/* Season Selector */}
                                    <div className="px-6 py-4 border-b border-white/5 flex items-center gap-4 bg-zinc-900/30">
                                        <label className="text-xs font-bold text-zinc-500 uppercase">Season</label>
                                        <div className="relative">
                                            <select 
                                                value={selectedSeasonNum}
                                                onChange={(e) => setSelectedSeasonNum(Number(e.target.value))}
                                                className="appearance-none bg-black border border-white/10 text-white text-sm py-2 pl-4 pr-10 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer min-w-[120px]"
                                            >
                                                {details.seasons?.filter(s => s.season_number > 0).map(s => (
                                                    <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                        </div>
                                        {seasonData && <span className="text-xs text-zinc-500 ml-auto">{seasonData.episodes.length} Episodes</span>}
                                    </div>

                                    {/* Episodes List */}
                                    <div className="flex-1">
                                        {loadingSeason ? (
                                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                                        ) : seasonData ? (
                                            <div className="pb-10">
                                                {seasonData.episodes.map(ep => <EpisodeRow key={ep.id} ep={ep} />)}
                                            </div>
                                        ) : (
                                            <div className="p-10 text-center text-zinc-500">Select a season</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* VIDEOS */}
                            {activeTab === 'videos' && (
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {videos.map(video => (
                                        <button 
                                            key={video.id}
                                            onClick={() => setPlayingVideo(video)}
                                            className="group relative aspect-video bg-zinc-900 overflow-hidden border border-white/5 text-left"
                                        >
                                            <img 
                                                src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`} 
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                alt="" 
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                <Play className="w-10 h-10 text-white fill-current drop-shadow-xl" />
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                                                <p className="text-xs font-bold text-white truncate">{video.name}</p>
                                                <p className="text-[10px] text-zinc-400">{video.type}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {videos.length === 0 && (
                                        <div className="col-span-full text-center py-20 text-zinc-500">No videos available</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Trailer Overlay */}
            {playingVideo && (
                 <div className="fixed inset-0 z-[150] bg-black flex items-center justify-center p-4" onClick={() => setPlayingVideo(null)}>
                     <div className="w-full max-w-6xl aspect-video bg-black relative shadow-2xl border border-white/10">
                         <iframe 
                            src={`https://www.youtube.com/embed/${playingVideo.key}?autoplay=1`}
                            className="w-full h-full"
                            allowFullScreen
                            allow="autoplay"
                         />
                         <button onClick={() => setPlayingVideo(null)} className="absolute -top-10 right-0 text-white hover:text-zinc-300 flex items-center gap-2 text-sm font-bold">
                             CLOSE <X className="w-4 h-4" />
                         </button>
                     </div>
                 </div>
            )}
        </div>
    );
};

export default ShowDetailsModal;
