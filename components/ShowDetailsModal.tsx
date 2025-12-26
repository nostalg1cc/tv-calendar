
import React, { useEffect, useState, useRef } from 'react';
import { X, Play, Plus, Check, Star, Loader2, MonitorPlay, Ticket, ChevronDown, Video, ExternalLink, Clock, Calendar, Hash, User, RefreshCw, Image, Layout, Download } from 'lucide-react';
import { getShowDetails, getMovieDetails, getImageUrl, getBackdropUrl, getVideos, getSeasonDetails, getMovieReleaseDates, getShowImages } from '../services/tmdb';
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
    
    const [activeTab, setActiveTab] = useState<'overview' | 'extras'>('overview');
    const [details, setDetails] = useState<TVShow | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(initialSeason || 1);
    const [seasonData, setSeasonData] = useState<Season | null>(null);
    const [loadingSeason, setLoadingSeason] = useState(false);
    
    // Extras Data
    const [videos, setVideos] = useState<VideoType[]>([]);
    const [images, setImages] = useState<{posters: any[], backdrops: any[]}>({ posters: [], backdrops: [] });
    const [playingVideo, setPlayingVideo] = useState<VideoType | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [releases, setReleases] = useState<{ date: string, type: string, country: string }[]>([]);
    
    // Third Party Data
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
                    
                    // Parallel fetches for standard data
                    const [vids, imgs] = await Promise.all([
                         getVideos(mediaType, showId),
                         getShowImages(mediaType, showId)
                    ]);
                    setVideos(vids);
                    setImages(imgs);

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
            // Reset
            setDetails(null);
            setVideos([]);
            setSeasonData(null);
            setTraktStatus(null);
            setTraktOverrides({});
            setTvmazeOverrides({});
            setPreviewImage(null);
            setActiveTab('overview');
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

                    // Fetch season specific videos if in extras tab (optimization)
                    if (activeTab === 'extras') {
                         getVideos('tv', details.id, selectedSeasonNum).then(seasonVids => {
                             setVideos(prev => {
                                 const existingIds = new Set(prev.map(v => v.id));
                                 const newVids = seasonVids.filter(v => !existingIds.has(v.id));
                                 return [...prev, ...newVids];
                             });
                         });
                    }

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
    }, [selectedSeasonNum, details, mediaType, activeTab]);

    // Auto-scroll
    useEffect(() => {
        if (!loadingSeason && seasonData && initialEpisode && activeTab === 'overview') {
             const el = document.getElementById(`modal-episode-${initialEpisode}`);
             if (el) {
                 setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
             }
        }
    }, [loadingSeason, seasonData, initialEpisode, activeTab]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleDownload = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `tmdb-image-${showId}-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.warn("Direct download failed, opening in new tab", e);
            window.open(url, '_blank');
        }
    };

    if (!isOpen) return null;

    const isAdded = details ? watchlist.some(s => s.id === details.id) : false;

    // --- Helper Components ---

    const StatusBadge = () => {
        const status = traktStatus || details?.status;
        if (!status) return null;
        const s = status.toLowerCase();
        let colorClass = 'bg-zinc-800 text-zinc-400 border-zinc-700'; 
        
        if (s.includes('returning')) colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        else if (s.includes('ended') || s.includes('canceled')) colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
        else if (s.includes('production')) colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';

        return (
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${colorClass}`}>
                {status}
            </span>
        );
    };

    const TabButton = ({ id, label, icon: Icon }: { id: 'overview' | 'extras', label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === id ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
            <Icon className="w-4 h-4" /> {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            
            {/* Modal Container */}
            <div className="w-full h-full md:max-w-6xl md:h-[90vh] bg-[#09090b] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-white/10 group/modal">
                
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
                    <div className="flex-1 flex flex-col min-h-0">
                        
                        {/* HERO SECTION */}
                        <div className="relative w-full h-[40vh] md:h-[45vh] shrink-0">
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
                                    <span className="text-xs font-bold text-zinc-300 ml-2">
                                        {details.first_air_date?.split('-')[0]}
                                    </span>
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

                        {/* TABS */}
                        <div className="flex px-6 md:px-10 border-b border-white/5 bg-[#09090b] sticky top-0 z-20">
                            <TabButton id="overview" label="Overview" icon={Layout} />
                            <TabButton id="extras" label="Trailers & Art" icon={Image} />
                        </div>

                        {/* CONTENT BODY */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#09090b]">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 p-6 md:p-10 relative min-h-full">
                                
                                {/* MAIN COLUMN */}
                                <div className="min-w-0">
                                    {activeTab === 'overview' && (
                                        <div className="space-y-10 animate-fade-in">
                                            {/* Overview */}
                                            <div>
                                                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-3">Synopsis</h3>
                                                <p className="text-zinc-300 leading-relaxed text-sm md:text-base font-medium">
                                                    {details.overview || "No synopsis available."}
                                                </p>
                                            </div>

                                            {/* TV SEASONS */}
                                            {mediaType === 'tv' && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Episodes</h3>
                                                        <div className="relative">
                                                            <select 
                                                                value={selectedSeasonNum}
                                                                onChange={(e) => setSelectedSeasonNum(Number(e.target.value))}
                                                                className="appearance-none bg-zinc-900 border border-zinc-800 text-white text-xs font-bold uppercase tracking-wider py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer hover:bg-zinc-800 transition-colors"
                                                            >
                                                                {details.seasons?.filter(s => s.season_number > 0).map(s => (
                                                                    <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                                                        </div>
                                                    </div>

                                                    <div className="bg-zinc-950 rounded-2xl border border-white/5 overflow-hidden min-h-[200px]" ref={episodesListRef}>
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

                                                                    // Priority: Trakt -> TVMaze -> TMDB
                                                                    if (traktDate) {
                                                                        dateObj = parseISO(traktDate); // parseISO handles timezone offset in string correctly
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
                                                                                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isWatched ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-zinc-700 text-zinc-700 hover:border-zinc-500 hover:text-zinc-300'}`}
                                                                                >
                                                                                    <Check className="w-3 h-3" />
                                                                                </button>
                                                                            </div>

                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                                                                    <h4 className={`text-sm font-bold truncate ${isUpcoming ? 'text-indigo-400' : 'text-zinc-200'}`}>{ep.name}</h4>
                                                                                    {displayDate && (
                                                                                        <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 shrink-0">
                                                                                            <span>{displayDate}</span>
                                                                                            {displayTime && (
                                                                                                <span className={`px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold ${isUpcoming ? 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10' : ''}`}>
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

                                            {/* CAST SECTION */}
                                            {details.credits?.cast && details.credits.cast.length > 0 && (
                                                <div className="pt-8 border-t border-white/5">
                                                    <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-6">Top Cast</h3>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                        {details.credits.cast.slice(0, 12).map(person => (
                                                            <div key={person.id} className="flex items-center gap-3 bg-zinc-900/40 p-2 rounded-xl border border-white/5 hover:bg-zinc-800/60 transition-colors group">
                                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/5">
                                                                    {person.profile_path ? (
                                                                        <img src={getImageUrl(person.profile_path, 'w185')} className="w-full h-full object-cover" alt="" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-4 h-4" /></div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-zinc-200 truncate group-hover:text-white">{person.name}</p>
                                                                    <p className="text-[10px] text-zinc-500 truncate">{person.character}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'extras' && (
                                        <div className="space-y-10 animate-fade-in">
                                            {/* Trailers */}
                                            <div>
                                                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Trailers & Clips</h3>
                                                {videos.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {videos.slice(0, 6).map(video => (
                                                            <div 
                                                                key={video.id} 
                                                                onClick={() => setPlayingVideo(video)}
                                                                className="group relative aspect-video bg-zinc-900 rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-indigo-500/50 transition-all"
                                                            >
                                                                <img 
                                                                    src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`} 
                                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                                    alt={video.name} 
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                                                        <Play className="w-5 h-5 text-white fill-current" />
                                                                    </div>
                                                                </div>
                                                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                                                    <p className="text-xs font-bold text-white truncate">{video.name}</p>
                                                                    <p className="text-[10px] text-zinc-400">{video.type}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <div className="text-sm text-zinc-500 italic">No videos available.</div>}
                                            </div>

                                            {/* Posters */}
                                            <div>
                                                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Posters</h3>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                    {images.posters.slice(0, 10).map((img, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => setPreviewImage(getImageUrl(img.file_path, 'original'))}
                                                            className="aspect-[2/3] bg-zinc-900 rounded-lg overflow-hidden border border-white/5 hover:scale-105 transition-transform cursor-pointer"
                                                        >
                                                            <img src={getImageUrl(img.file_path, 'w342')} className="w-full h-full object-cover" loading="lazy" alt="" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                             {/* Backdrops */}
                                             <div>
                                                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Backdrops</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {images.backdrops.slice(0, 6).map((img, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => setPreviewImage(getImageUrl(img.file_path, 'original'))}
                                                            className="aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-white/5 hover:opacity-100 opacity-80 transition-opacity cursor-pointer"
                                                        >
                                                            <img src={getImageUrl(img.file_path, 'w780')} className="w-full h-full object-cover" loading="lazy" alt="" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT SIDEBAR (Facts) */}
                                <div className="space-y-6 hidden lg:block">
                                    {/* Poster */}
                                    <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-zinc-900 relative group/poster">
                                        <img src={getImageUrl(details.poster_path)} className="w-full h-full object-cover transition-opacity duration-500 group-hover/poster:opacity-75" alt="" />
                                        {isAdded && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/poster:opacity-100 transition-opacity">
                                                <div className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold shadow-xl flex items-center gap-2">
                                                    <Check className="w-4 h-4" /> Tracking
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-zinc-900/30 rounded-xl p-6 border border-white/5 space-y-6">
                                        <div>
                                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Network</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {details.networks && details.networks.length > 0 ? (
                                                    details.networks.map(n => (
                                                        n.logo_path ? (
                                                            <img key={n.id} src={getImageUrl(n.logo_path)} className="h-6 object-contain bg-white/10 rounded px-2 py-1" alt={n.name} />
                                                        ) : <span key={n.id} className="text-xs font-bold text-zinc-300">{n.name}</span>
                                                    ))
                                                ) : <span className="text-xs text-zinc-500">Unknown</span>}
                                            </div>
                                        </div>

                                        {details.runtime && (
                                            <div>
                                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Runtime</h4>
                                                <span className="text-sm font-bold text-white">{details.runtime} minutes</span>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Genres</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {details.genres?.map(g => (
                                                    <span key={g.id} className="text-[10px] font-bold text-zinc-400 border border-zinc-700 px-2 py-1 rounded bg-zinc-900/50">{g.name}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {mediaType === 'movie' && releases.length > 0 && (
                                            <div className="pt-4 border-t border-white/5">
                                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Releases</h4>
                                                <div className="space-y-2">
                                                    {releases.map((r, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`fi fi-${r.country.toLowerCase()} rounded-[1px]`} />
                                                                <span className="text-zinc-400 font-bold uppercase tracking-wide text-[10px]">{r.type === 'theatrical' ? 'Cinema' : 'Digital'}</span>
                                                            </div>
                                                            <span className="text-white font-mono">{format(parseISO(r.date), 'MMM d, yyyy')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {details.external_ids && (
                                            <div className="pt-4 border-t border-white/5 flex gap-4">
                                                {details.external_ids.imdb_id && (
                                                    <a href={`https://www.imdb.com/title/${details.external_ids.imdb_id}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-[#f5c518] transition-colors"><ExternalLink className="w-5 h-5" /></a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
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

            {/* Image Preview Overlay */}
            {previewImage && (
                <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col animate-fade-in" onClick={() => setPreviewImage(null)}>
                    <div className="absolute top-4 right-4 flex gap-4 z-50">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDownload(previewImage); }}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/5"
                            title="Download"
                        >
                            <Download className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={() => setPreviewImage(null)}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/5"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 sm:p-10">
                        <img 
                            src={previewImage} 
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" 
                            alt="Preview"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShowDetailsModal;
