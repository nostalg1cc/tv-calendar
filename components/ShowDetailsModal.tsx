
import React, { useEffect, useState, useRef } from 'react';
import { X, Play, Plus, Check, Star, Loader2, Calendar, Clock, MonitorPlay, Ticket, ChevronDown, Video, Youtube, ExternalLink, Disc, Trophy, Globe, MapPin, Building, Users } from 'lucide-react';
import { getShowDetails, getMovieDetails, getImageUrl, getBackdropUrl, getVideos, getSeasonDetails, getMovieReleaseDates } from '../services/tmdb';
import { getTVMazeEpisodes } from '../services/tvmaze';
import { TVShow, Episode, Season, Video as VideoType } from '../types';
import { useStore } from '../store';
import { format, parseISO, isFuture } from 'date-fns';
import { getTraktCalendar, getTraktIdFromTmdbId, getTraktSeason, getTraktShowSummary } from '../services/trakt';

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
    const episodesListRef = useRef<HTMLDivElement>(null);
    
    // Trakt Data
    const [traktStatus, setTraktStatus] = useState<string | null>(null);
    const [traktOverrides, setTraktOverrides] = useState<Record<number, string>>({});
    const [tvmazeOverrides, setTvmazeOverrides] = useState<Record<number, { date: string, timestamp?: string }>>({});

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
                            const sorted = rels.sort((a, b) => {
                                const aIsUser = a.country === userCountry;
                                const bIsUser = b.country === userCountry;
                                if (aIsUser && !bIsUser) return -1;
                                if (!aIsUser && bIsUser) return 1;
                                return new Date(a.date).getTime() - new Date(b.date).getTime();
                            });
                            const unique = sorted.filter((v, i, a) => a.findIndex(t => (t.type === v.type && t.date === v.date && t.country === v.country)) === i);
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

                        // Fetch Trakt Status
                        try {
                            const traktId = await getTraktIdFromTmdbId(showId, 'show');
                            if (traktId) {
                                const traktInfo = await getTraktShowSummary(traktId);
                                if (traktInfo && traktInfo.status) {
                                    setTraktStatus(traktInfo.status);
                                }
                            }
                        } catch(e) { console.warn("Trakt status fetch failed", e); }
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        } else {
            // Reset
            setDetails(null);
            setVideos([]);
            setSeasonData(null);
            setReleases([]);
            setTraktStatus(null);
        }
    }, [isOpen, showId, mediaType, settings.country]);

    useEffect(() => {
        if (mediaType === 'tv' && details && selectedSeasonNum !== undefined) {
            setLoadingSeason(true);
            setTraktOverrides({}); 
            setTvmazeOverrides({});

            const fetchSeason = async () => {
                try {
                    const sData = await getSeasonDetails(details.id, selectedSeasonNum);
                    setSeasonData(sData);

                    getTVMazeEpisodes(
                        details.external_ids?.imdb_id, 
                        details.external_ids?.tvdb_id,
                        settings.country 
                    ).then(mazeMap => {
                        if (mazeMap && mazeMap[selectedSeasonNum]) {
                            setTvmazeOverrides(mazeMap[selectedSeasonNum]);
                        }
                    });

                    try {
                        const traktId = await getTraktIdFromTmdbId(details.id, 'show');
                        if (traktId) {
                            const traktData = await getTraktSeason(traktId, selectedSeasonNum);
                            const tMap: Record<number, string> = {};
                            if (Array.isArray(traktData)) {
                                traktData.forEach((ep: any) => {
                                    if (ep.number && ep.first_aired) {
                                        tMap[ep.number] = ep.first_aired;
                                    }
                                });
                            }
                            setTraktOverrides(tMap);
                        }
                    } catch (err) {}

                } catch(e) {
                    console.error(e);
                } finally {
                    setLoadingSeason(false);
                }
            };
            fetchSeason();
        }
    }, [selectedSeasonNum, details, mediaType, settings.country]);

    // Auto-scroll logic
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

    // --- RENDER HELPERS ---

    const StatusBadge = () => {
        const status = traktStatus || details?.status;
        if (!status) return null;

        const s = status.toLowerCase();
        let colorClass = 'bg-zinc-800 text-zinc-400 border-zinc-700'; // Default
        
        if (s === 'returning series') colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        else if (s === 'ended') colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
        else if (s === 'canceled') colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        else if (s === 'in production') colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        else if (s === 'released') colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

        return (
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${colorClass}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#020202] overflow-y-auto animate-fade-in custom-scrollbar">
            <button 
                onClick={onClose} 
                className="fixed top-6 right-6 z-50 p-3 rounded-full bg-black/40 hover:bg-zinc-800 text-white backdrop-blur-xl transition-all border border-white/10 group shadow-2xl"
            >
                <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>

            {loading || !details ? (
                <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest animate-pulse">Loading Details...</p>
                </div>
            ) : (
                <div className="min-h-screen w-full pb-20">
                    
                    {/* HERO HEADER */}
                    <div className="relative w-full h-[60vh] lg:h-[70vh]">
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getBackdropUrl(details.backdrop_path)})` }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#020202]/90 via-[#020202]/30 to-transparent" />
                        
                        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 lg:p-16 max-w-7xl mx-auto">
                            <div className="flex flex-col gap-4 max-w-3xl">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                                        {mediaType === 'movie' ? 'Film' : 'Series'}
                                    </span>
                                    <StatusBadge />
                                    <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                                         <Star className="w-3.5 h-3.5 fill-current" /> {details.vote_average.toFixed(1)}
                                    </div>
                                    <span className="text-xs font-bold text-zinc-300">
                                        {details.first_air_date?.split('-')[0]}
                                    </span>
                                </div>
                                
                                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter drop-shadow-2xl">
                                    {details.name}
                                </h1>
                                
                                <div className="flex flex-wrap gap-4 mt-2">
                                    <button 
                                        onClick={() => !isAdded && addToWatchlist(details)}
                                        disabled={isAdded}
                                        className={`h-12 px-8 rounded-lg font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${isAdded ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-default' : 'bg-white text-black hover:bg-zinc-200 hover:scale-105'}`}
                                    >
                                        {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        {isAdded ? 'Tracking' : 'Add to List'}
                                    </button>
                                    {videos.length > 0 && (
                                        <button 
                                            onClick={() => setPlayingVideo(videos.find(v => v.type === 'Trailer') || videos[0])}
                                            className="h-12 px-8 rounded-lg font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all border border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md hover:scale-105"
                                        >
                                            <Play className="w-4 h-4 fill-current" /> Trailer
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MAIN CONTENT GRID */}
                    <div className="max-w-7xl mx-auto px-6 md:px-12 -mt-10 relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
                        
                        {/* LEFT COLUMN */}
                        <div className="space-y-12">
                            
                            {/* Overview */}
                            <div className="bg-[#020202]/50 backdrop-blur-xl p-6 rounded-2xl border border-white/5">
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Synopsis</h3>
                                <p className="text-zinc-300 text-base md:text-lg leading-relaxed font-medium">
                                    {details.overview || "No description available."}
                                </p>
                            </div>

                            {/* Cast */}
                            {details.credits?.cast && details.credits.cast.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Top Cast</h3>
                                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                                        {details.credits.cast.slice(0, 15).map(person => (
                                            <div key={person.id} className="w-24 shrink-0 flex flex-col gap-2">
                                                <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 border border-white/10">
                                                    {person.profile_path ? (
                                                        <img src={getImageUrl(person.profile_path, 'w185')} className="w-full h-full object-cover" alt={person.name} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-xs">{person.name.charAt(0)}</div>
                                                    )}
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-bold text-white truncate">{person.name}</p>
                                                    <p className="text-[9px] text-zinc-500 truncate">{person.character}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Seasons/Episodes */}
                            {mediaType === 'tv' && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Episodes</h3>
                                        <div className="relative">
                                            <select 
                                                value={selectedSeasonNum}
                                                onChange={(e) => setSelectedSeasonNum(Number(e.target.value))}
                                                className="appearance-none bg-zinc-900 border border-zinc-800 text-white text-xs font-bold uppercase tracking-wider py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
                                            >
                                                {details.seasons?.filter(s => s.season_number > 0).map(s => (
                                                    <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/30 rounded-2xl border border-white/5 overflow-hidden" ref={episodesListRef}>
                                        {loadingSeason ? (
                                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                                        ) : seasonData ? (
                                            <div className="divide-y divide-white/5">
                                                {seasonData.episodes.map(ep => {
                                                    const mazeData = tvmazeOverrides[ep.episode_number];
                                                    const traktDate = traktOverrides[ep.episode_number];
                                                    let displayDate = '';
                                                    let dateObj: Date | null = null;

                                                    if (traktDate) dateObj = parseISO(traktDate);
                                                    else if (mazeData?.date) dateObj = parseISO(mazeData.date);
                                                    else if (ep.air_date) dateObj = parseISO(ep.air_date);

                                                    if (dateObj) displayDate = format(dateObj, 'MMM d, yyyy');
                                                    
                                                    const isUpcoming = dateObj ? isFuture(dateObj) : false;
                                                    const key = `episode-${details.id}-${ep.season_number}-${ep.episode_number}`;
                                                    const isWatched = history[key]?.is_watched;
                                                    const isHighlighted = ep.episode_number === initialEpisode && ep.season_number === initialSeason;

                                                    return (
                                                        <div 
                                                            key={ep.id}
                                                            id={`modal-episode-${ep.episode_number}`}
                                                            className={`flex items-start gap-4 p-4 transition-colors ${isHighlighted ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'hover:bg-white/[0.02]'} ${isWatched ? 'opacity-50' : ''}`}
                                                        >
                                                            <div className="mt-1">
                                                                <button 
                                                                    onClick={() => toggleWatched({ tmdb_id: details.id, media_type: 'episode', season_number: ep.season_number, episode_number: ep.episode_number, is_watched: isWatched })}
                                                                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isWatched ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-zinc-700 text-zinc-600 hover:border-white hover:text-white'}`}
                                                                >
                                                                    <Check className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-baseline mb-1">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xs font-mono font-bold text-zinc-500">{ep.episode_number}</span>
                                                                        <h4 className={`text-sm font-bold truncate ${isUpcoming ? 'text-indigo-400' : 'text-zinc-200'}`}>{ep.name}</h4>
                                                                    </div>
                                                                    {displayDate && <span className="text-[10px] font-mono text-zinc-500">{displayDate}</span>}
                                                                </div>
                                                                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{ep.overview || "No description."}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : <div className="p-8 text-center text-zinc-500">No episodes found.</div>}
                                    </div>
                                </div>
                            )}

                             {/* Movie Releases */}
                             {mediaType === 'movie' && releases.length > 0 && (
                                <div className="bg-zinc-900/30 rounded-2xl border border-white/5 p-6">
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Release Schedule</h3>
                                    <div className="space-y-3">
                                        {releases.map((r, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#09090b] border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <span className={`fi fi-${r.country.toLowerCase()} shadow-sm rounded-sm`} />
                                                    <span className="text-xs font-bold text-white uppercase tracking-wide">
                                                        {r.type === 'premiere' ? 'Premiere' : (r.type === 'physical' ? 'Physical Media' : (r.type === 'theatrical' ? 'Theatrical' : 'Digital Release'))}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-mono text-zinc-400">{format(parseISO(r.date), 'MMMM do, yyyy')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             )}

                        </div>

                        {/* RIGHT SIDEBAR (Facts) */}
                        <div className="space-y-8">
                            
                            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Network / Studio</h4>
                                    {details.networks && details.networks.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {details.networks.map(n => (
                                                n.logo_path ? (
                                                    <img key={n.id} src={getImageUrl(n.logo_path)} className="h-6 object-contain bg-white/10 rounded px-1" alt={n.name} />
                                                ) : <span key={n.id} className="text-xs font-bold text-white">{n.name}</span>
                                            ))}
                                        </div>
                                    ) : <span className="text-xs text-zinc-500">Unknown</span>}
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Genres</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {details.genres?.map(g => (
                                            <span key={g.id} className="text-[10px] font-bold text-zinc-400 border border-zinc-700 px-2 py-1 rounded bg-zinc-900/50">{g.name}</span>
                                        ))}
                                    </div>
                                </div>
                                
                                {details.runtime && (
                                    <div>
                                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Runtime</h4>
                                        <span className="text-sm font-bold text-white">{details.runtime} minutes</span>
                                    </div>
                                )}

                                {details.external_ids && (
                                    <div className="pt-4 border-t border-white/5 flex gap-4">
                                        {details.external_ids.imdb_id && (
                                            <a href={`https://www.imdb.com/title/${details.external_ids.imdb_id}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-[#f5c518] transition-colors"><ExternalLink className="w-5 h-5" /></a>
                                        )}
                                        {/* Add more icons if needed */}
                                    </div>
                                )}
                            </div>
                            
                            {/* Poster (Mobile Hidden, Desktop Sidebar) */}
                            <div className="hidden lg:block aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl">
                                <img src={getImageUrl(details.poster_path)} className="w-full h-full object-cover" alt="" />
                            </div>

                        </div>
                    </div>
                </div>
            )}
            
            {/* VIDEO MODAL OVERLAY */}
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
