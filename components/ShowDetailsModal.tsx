
import React, { useEffect, useState, useRef } from 'react';
import { X, Play, Plus, Check, Star, Loader2, MonitorPlay, Ticket, ChevronDown, Video, ExternalLink, Clock, Calendar, Hash, User } from 'lucide-react';
import { getShowDetails, getMovieDetails, getImageUrl, getBackdropUrl, getVideos, getSeasonDetails, getMovieReleaseDates } from '../services/tmdb';
import { getTVMazeEpisodes } from '../services/tvmaze';
import { TVShow, Episode, Season, Video as VideoType } from '../types';
import { useStore } from '../store';
import { format, parseISO, isFuture } from 'date-fns';
import { getTraktIdFromTmdbId, getTraktSeason, getTraktShowSummary } from '../services/trakt';

interface ShowDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    showId: number;
    mediaType: 'tv' | 'movie';
    initialSeason?: number;
    initialEpisode?: number;
}

const ShowDetailsModal: React.FC<ShowDetailsModalProps> = ({ isOpen, onClose, showId, mediaType, initialSeason, initialEpisode }) => {
    const { addToWatchlist, watchlist, history, toggleWatched, settings } = useStore();
    
    const [details, setDetails] = useState<TVShow | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(initialSeason || 1);
    const [seasonData, setSeasonData] = useState<Season | null>(null);
    const [loadingSeason, setLoadingSeason] = useState(false);
    const [videos, setVideos] = useState<VideoType[]>([]);
    const [playingVideo, setPlayingVideo] = useState<VideoType | null>(null);
    const [releases, setReleases] = useState<{ date: string, type: string, country: string }[]>([]);
    
    const [traktStatus, setTraktStatus] = useState<string | null>(null);
    const [traktOverrides, setTraktOverrides] = useState<Record<number, string>>({});
    const [tvmazeOverrides, setTvmazeOverrides] = useState<Record<number, { date: string, timestamp?: string }>>({});

    const episodesListRef = useRef<HTMLDivElement>(null);

    // Initial Data Fetch
    useEffect(() => {
        if (isOpen && showId) {
            setLoading(true);
            const fetchData = async () => {
                try {
                    const fetcher = mediaType === 'movie' ? getMovieDetails : getShowDetails;
                    const data = await fetcher(showId);
                    setDetails(data);
                    
                    getVideos(mediaType, showId).then(setVideos);

                    if (mediaType === 'movie') {
                        try {
                            let rels = await getMovieReleaseDates(showId, true);
                            if (rels.length === 0 && data.first_air_date) {
                                rels = [{ date: data.first_air_date, type: 'theatrical', country: 'US' }];
                            }
                            const userCountry = settings.country || 'US';
                            const unique = rels
                                .filter(r => r.country === userCountry || r.country === 'US')
                                .filter((v, i, a) => a.findIndex(t => (t.type === v.type && t.date === v.date)) === i)
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            setReleases(unique);
                        } catch (e) { console.warn("Release dates failed", e); }
                    }
                    
                    if (mediaType === 'tv') {
                        if (initialSeason) {
                            setSelectedSeasonNum(initialSeason);
                        } else if (data.seasons && data.seasons.length > 0) {
                            const firstSeason = data.seasons.find(s => s.season_number > 0) || data.seasons[0];
                            setSelectedSeasonNum(firstSeason.season_number);
                        }

                        // Trakt Status
                        try {
                            const traktId = await getTraktIdFromTmdbId(showId, 'show');
                            if (traktId) {
                                const traktInfo = await getTraktShowSummary(traktId);
                                if (traktInfo?.status) setTraktStatus(traktInfo.status);
                            }
                        } catch(e) {}
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
            setTraktStatus(null);
        }
    }, [isOpen, showId, mediaType]);

    // Season Data Fetch
    useEffect(() => {
        if (mediaType === 'tv' && details && selectedSeasonNum !== undefined) {
            setLoadingSeason(true);
            setTraktOverrides({}); 
            setTvmazeOverrides({});

            const fetchSeason = async () => {
                try {
                    const sData = await getSeasonDetails(details.id, selectedSeasonNum);
                    setSeasonData(sData);

                    // Parallel fetches for overrides
                    const [mazeMap, traktId] = await Promise.all([
                        getTVMazeEpisodes(details.external_ids?.imdb_id, details.external_ids?.tvdb_id, settings.country),
                        getTraktIdFromTmdbId(details.id, 'show')
                    ]);

                    if (mazeMap && mazeMap[selectedSeasonNum]) {
                        setTvmazeOverrides(mazeMap[selectedSeasonNum]);
                    }

                    if (traktId) {
                        const traktData = await getTraktSeason(traktId, selectedSeasonNum);
                        const tMap: Record<number, string> = {};
                        if (Array.isArray(traktData)) {
                            traktData.forEach((ep: any) => {
                                if (ep.number && ep.first_aired) tMap[ep.number] = ep.first_aired;
                            });
                        }
                        setTraktOverrides(tMap);
                    }
                } catch(e) {
                    console.error(e);
                } finally {
                    setLoadingSeason(false);
                }
            };
            fetchSeason();
        }
    }, [selectedSeasonNum, details, mediaType]);

    // Auto-scroll
    useEffect(() => {
        if (!loadingSeason && seasonData && initialEpisode) {
             const el = document.getElementById(`modal-episode-${initialEpisode}`);
             if (el) {
                 setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
             }
        }
    }, [loadingSeason, seasonData, initialEpisode]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const isAdded = details ? watchlist.some(s => s.id === details.id) : false;

    // --- Helper Components ---

    const StatusBadge = () => {
        const status = traktStatus || details?.status;
        if (!status) return null;
        const s = status.toLowerCase();
        let colorClass = 'bg-zinc-800 text-zinc-400'; 
        if (s.includes('returning')) colorClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';
        else if (s.includes('ended') || s.includes('canceled')) colorClass = 'bg-red-500/20 text-red-400 border border-red-500/20';
        else if (s.includes('production')) colorClass = 'bg-blue-500/20 text-blue-400 border border-blue-500/20';

        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            
            {/* Modal Container */}
            <div className="w-full h-full md:max-w-6xl md:h-[90vh] bg-[#09090b] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-white/10">
                
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/50 hover:bg-white/10 text-white backdrop-blur-md transition-all border border-white/10"
                >
                    <X className="w-5 h-5" />
                </button>

                {loading || !details ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        
                        {/* HERO SECTION */}
                        <div className="relative w-full h-[40vh] md:h-[50vh]">
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getBackdropUrl(details.backdrop_path)})` }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#09090b]/80 via-transparent to-transparent" />
                            
                            <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 flex flex-col justify-end">
                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                    <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                                        {mediaType === 'movie' ? 'Movie' : 'TV Series'}
                                    </span>
                                    <StatusBadge />
                                    <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                         <Star className="w-3 h-3 fill-current" /> {details.vote_average.toFixed(1)}
                                    </div>
                                </div>
                                
                                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight mb-4 drop-shadow-lg">
                                    {details.name}
                                </h1>

                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => !isAdded && addToWatchlist(details)}
                                        disabled={isAdded}
                                        className={`h-10 px-6 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${isAdded ? 'bg-zinc-800 text-zinc-400 cursor-default' : 'bg-white text-black hover:bg-zinc-200'}`}
                                    >
                                        {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        {isAdded ? 'Tracked' : 'Track'}
                                    </button>
                                    {videos.length > 0 && (
                                        <button 
                                            onClick={() => setPlayingVideo(videos.find(v => v.type === 'Trailer') || videos[0])}
                                            className="h-10 px-6 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"
                                        >
                                            <Play className="w-4 h-4 fill-current" /> Trailer
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CONTENT BODY */}
                        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 p-6 md:p-10 relative">
                            
                            {/* SIDEBAR (Metadata) - Moves to top on mobile via order if needed, but here we stack */}
                            <div className="lg:order-1 space-y-6">
                                {/* Poster */}
                                <div className="hidden lg:block aspect-[2/3] rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-zinc-900">
                                    <img src={getImageUrl(details.poster_path)} className="w-full h-full object-cover" alt="" />
                                </div>

                                {/* Facts */}
                                <div className="bg-zinc-900/30 rounded-xl p-5 border border-white/5 space-y-5">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Network</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {details.networks && details.networks.length > 0 ? (
                                                details.networks.map(n => (
                                                    n.logo_path ? (
                                                        <img key={n.id} src={getImageUrl(n.logo_path)} className="h-5 object-contain bg-white/10 rounded px-1" alt={n.name} />
                                                    ) : <span key={n.id} className="text-sm font-medium text-zinc-300">{n.name}</span>
                                                ))
                                            ) : <span className="text-sm text-zinc-400">Unknown</span>}
                                        </div>
                                    </div>

                                    {details.runtime && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Runtime</h4>
                                            <span className="text-sm font-medium text-zinc-200">{details.runtime} minutes</span>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Genres</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {details.genres?.map(g => (
                                                <span key={g.id} className="text-[10px] font-bold text-zinc-400 border border-zinc-700 px-2 py-1 rounded bg-zinc-800/50">{g.name}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {details.external_ids && (
                                        <div className="pt-4 border-t border-white/5 flex gap-4">
                                            {details.external_ids.imdb_id && (
                                                <a href={`https://www.imdb.com/title/${details.external_ids.imdb_id}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-[#f5c518] transition-colors"><ExternalLink className="w-5 h-5" /></a>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {mediaType === 'movie' && releases.length > 0 && (
                                    <div className="bg-zinc-900/30 rounded-xl p-5 border border-white/5">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Releases</h4>
                                        <div className="space-y-2">
                                            {releases.map((r, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <span className="text-zinc-400 flex items-center gap-2">
                                                        <span className={`fi fi-${r.country.toLowerCase()} rounded-[1px]`} />
                                                        {r.type === 'theatrical' ? 'Cinema' : 'Digital'}
                                                    </span>
                                                    <span className="text-white font-mono">{format(parseISO(r.date), 'MMM d, yyyy')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* MAIN COLUMN */}
                            <div className="lg:order-2 space-y-8 min-w-0">
                                
                                {/* Overview */}
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Overview</h3>
                                    <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                                        {details.overview || "No synopsis available."}
                                    </p>
                                </div>

                                {/* TV SEASONS */}
                                {mediaType === 'tv' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-white">Episodes</h3>
                                            <div className="relative">
                                                <select 
                                                    value={selectedSeasonNum}
                                                    onChange={(e) => setSelectedSeasonNum(Number(e.target.value))}
                                                    className="appearance-none bg-zinc-900 border border-zinc-700 text-white text-xs font-bold uppercase tracking-wider py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
                                                >
                                                    {details.seasons?.filter(s => s.season_number > 0).map(s => (
                                                        <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/20 border border-white/5 rounded-xl overflow-hidden min-h-[200px]" ref={episodesListRef}>
                                            {loadingSeason ? (
                                                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                                            ) : seasonData ? (
                                                <div className="divide-y divide-white/5">
                                                    {seasonData.episodes.map(ep => {
                                                        const mazeData = tvmazeOverrides[ep.episode_number];
                                                        const traktDate = traktOverrides[ep.episode_number];
                                                        
                                                        let displayDate = '';
                                                        let displayTime = '';
                                                        let dateObj: Date | null = null;
                                                        let isUpcoming = false;

                                                        if (traktDate) {
                                                            dateObj = parseISO(traktDate);
                                                            if (traktDate.includes('T')) displayTime = format(dateObj, 'h:mm a');
                                                        } else if (mazeData?.timestamp) {
                                                            dateObj = new Date(mazeData.timestamp);
                                                            displayTime = format(dateObj, 'h:mm a');
                                                        } else if (ep.air_date) {
                                                            dateObj = parseISO(ep.air_date);
                                                        }

                                                        if (dateObj) {
                                                            displayDate = format(dateObj, 'MMM d, yyyy');
                                                            isUpcoming = isFuture(dateObj);
                                                        }

                                                        const key = `episode-${details.id}-${ep.season_number}-${ep.episode_number}`;
                                                        const isWatched = history[key]?.is_watched;
                                                        const isHighlighted = ep.episode_number === initialEpisode && ep.season_number === initialSeason;

                                                        return (
                                                            <div 
                                                                key={ep.id}
                                                                id={`modal-episode-${ep.episode_number}`}
                                                                className={`
                                                                    flex gap-4 p-4 transition-colors relative group
                                                                    ${isHighlighted ? 'bg-indigo-500/10' : 'hover:bg-white/[0.02]'}
                                                                    ${isWatched ? 'opacity-50' : ''}
                                                                `}
                                                            >
                                                                {isHighlighted && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                                                                
                                                                <div className="w-8 pt-1 flex flex-col items-center gap-3 shrink-0">
                                                                    <span className="text-sm font-mono text-zinc-500 font-bold">{ep.episode_number}</span>
                                                                    <button 
                                                                        onClick={() => toggleWatched({ tmdb_id: details.id, media_type: 'episode', season_number: ep.season_number, episode_number: ep.episode_number, is_watched: isWatched })}
                                                                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isWatched ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-700 text-zinc-700 hover:border-zinc-500 hover:text-zinc-300'}`}
                                                                    >
                                                                        <Check className="w-3 h-3" />
                                                                    </button>
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                                                        <h4 className={`text-sm font-bold truncate ${isUpcoming ? 'text-indigo-400' : 'text-zinc-200'}`}>{ep.name}</h4>
                                                                        {displayDate && (
                                                                            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 shrink-0">
                                                                                <span>{displayDate}</span>
                                                                                {displayTime && (
                                                                                    <span className={`px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 ${isUpcoming ? 'text-indigo-300 bg-indigo-900/30' : ''}`}>
                                                                                        {displayTime}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{ep.overview || "No description."}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="p-10 text-center text-zinc-500">Select a season to view episodes</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* CAST SECTION (Moved to Bottom) */}
                                {details.credits?.cast && details.credits.cast.length > 0 && (
                                    <div className="pt-8 border-t border-white/5">
                                        <h3 className="text-lg font-bold text-white mb-4">Cast</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {details.credits.cast.slice(0, 10).map(person => (
                                                <div key={person.id} className="flex items-center gap-3 bg-zinc-900/40 p-2 rounded-lg border border-white/5">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                                                        {person.profile_path ? (
                                                            <img src={getImageUrl(person.profile_path, 'w185')} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-5 h-5" /></div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-zinc-200 truncate">{person.name}</p>
                                                        <p className="text-[10px] text-zinc-500 truncate">{person.character}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Video Overlay */}
            {playingVideo && (
                 <div className="absolute inset-0 z-[250] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in" onClick={() => setPlayingVideo(null)}>
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
