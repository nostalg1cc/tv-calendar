
import React, { useEffect, useState, useRef } from 'react';
import { X, Play, Plus, Check, Star, Loader2, MonitorPlay, Ticket, ChevronDown, Video, ExternalLink, Clock, Calendar, Hash, User, RefreshCw, Image, Layout, Download, Film, Tv, StarOff, Eye, CheckCircle, Info, Grid, Box } from 'lucide-react';
import { getShowDetails, getMovieDetails, getImageUrl, getBackdropUrl, getVideos, getSeasonDetails, getMovieReleaseDates, getShowImages } from '../services/tmdb';
import { getTVMazeEpisodes } from '../services/tvmaze';
import { TVShow, Episode, Season, Video as VideoType } from '../types';
import { useStore } from '../store';
import { format, parseISO, isFuture } from 'date-fns';
import { getTraktIdFromTmdbId, getTraktSeason, getTraktShowSummary } from '../services/trakt';
import RatingBadge from '../components/RatingBadge';
import toast from 'react-hot-toast';
import V2PersonDetailsModal from './V2PersonDetailsModal';

interface V2ShowDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    showId: number;
    mediaType: 'tv' | 'movie';
    initialSeason?: number;
    initialEpisode?: number;
    onSwitchShow?: (id: number, type: 'tv' | 'movie') => void;
    onOpenEpisodeDetails?: (showId: number, season: number, episode: number) => void;
}

const V2ShowDetailsModal: React.FC<V2ShowDetailsModalProps> = ({ isOpen, onClose, showId, mediaType, initialSeason, initialEpisode, onSwitchShow, onOpenEpisodeDetails }) => {
    const { addToWatchlist, watchlist, history, toggleWatched, setRating, setReminderCandidate, settings } = useStore();
    
    const [activeTab, setActiveTab] = useState<'overview' | 'episodes' | 'media' | 'releases'>('overview');
    const [details, setDetails] = useState<TVShow | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(initialSeason || 1);
    const [seasonData, setSeasonData] = useState<Season | null>(null);
    const [loadingSeason, setLoadingSeason] = useState(false);
    
    // Extras Data
    const [videos, setVideos] = useState<VideoType[]>([]);
    const [images, setImages] = useState<{posters: any[], backdrops: any[], logos: any[]}>({ posters: [], backdrops: [], logos: [] });
    const [releases, setReleases] = useState<{ date: string, type: string, country: string }[]>([]);
    
    // Media Tab State
    const [mediaFilter, setMediaFilter] = useState<'all' | 'posters' | 'backdrops' | 'logos' | 'videos'>('all');
    
    // Preview States
    const [playingVideo, setPlayingVideo] = useState<VideoType | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

    // Third Party Data
    const [traktStatus, setTraktStatus] = useState<string | null>(null);
    const [traktOverrides, setTraktOverrides] = useState<Record<number, string>>({});
    const [tvmazeOverrides, setTvmazeOverrides] = useState<Record<number, { date: string, timestamp?: string }>>({});

    const episodesListRef = useRef<HTMLDivElement>(null);

    // Initial Data Fetch
    useEffect(() => {
        if (isOpen && showId) {
            setLoading(true);
            setDetails(null);
            setVideos([]);
            setImages({ posters: [], backdrops: [], logos: [] });
            setSeasonData(null);
            setTraktStatus(null);
            
            const fetchData = async () => {
                try {
                    const fetcher = mediaType === 'movie' ? getMovieDetails : getShowDetails;
                    const data = await fetcher(showId);
                    setDetails(data);
                    
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
                        let seasonToLoad = 1;
                        if (initialSeason) {
                            seasonToLoad = initialSeason;
                        } else if (data.seasons && data.seasons.length > 0) {
                            const firstSeason = data.seasons.find(s => s.season_number > 0) || data.seasons[0];
                            seasonToLoad = firstSeason.season_number;
                        }
                        setSelectedSeasonNum(seasonToLoad);
                        setActiveTab(initialSeason ? 'episodes' : 'overview');

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
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
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
                    if (activeTab === 'media') {
                         getVideos('tv', details.id, selectedSeasonNum).then(seasonVids => {
                             setVideos(prev => {
                                 const existingIds = new Set(prev.map(v => v.id));
                                 const newVids = seasonVids.filter(v => !existingIds.has(v.id));
                                 return [...prev, ...newVids];
                             });
                         });
                    }

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
        if (!loadingSeason && seasonData && initialEpisode && activeTab === 'episodes') {
             const el = document.getElementById(`v2-episode-${initialEpisode}`);
             if (el) {
                 setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
             }
        }
    }, [loadingSeason, seasonData, initialEpisode, activeTab]);

    const isAdded = details ? watchlist.some(s => s.id === details.id) : false;
    
    // Watched Logic
    const isWatched = () => {
        if (mediaType === 'movie') return history[`movie-${showId}`]?.is_watched;
        return Object.keys(history).some(key => key.startsWith(`episode-${showId}-`) && history[key].is_watched);
    };

    const handleHeaderWatch = () => {
         if (!details) return;
         if (!isAdded) {
             addToWatchlist(details);
         }
         
         if (mediaType === 'movie') {
             const currentlyWatched = history[`movie-${showId}`]?.is_watched;
             toggleWatched({ tmdb_id: showId, media_type: 'movie', is_watched: currentlyWatched });
             toast.success(currentlyWatched ? "Marked unwatched" : "Marked watched");
         } else {
             setReminderCandidate(details);
         }
    };

    const handleSwitchShow = (id: number, type: 'tv' | 'movie') => {
        setSelectedPersonId(null);
        if (onSwitchShow) {
            onSwitchShow(id, type);
        }
    };

    // --- RATING LOGIC ---
    const getMyRating = () => {
        const key = `${mediaType}-${showId}`;
        return history[key]?.rating || 0;
    };

    const handleRate = (rating: number) => {
        if (!details) return;
        const currentWatched = isWatched();
        if (!isAdded) { addToWatchlist(details); toast.success("Added to library"); }
        setRating(showId, mediaType, rating);
        if (!currentWatched) {
            if (mediaType === 'movie') { toggleWatched({ tmdb_id: showId, media_type: 'movie', is_watched: false }); toast.success("Marked as watched & rated"); }
            else { setReminderCandidate(details); toast.success("Rated! Have you seen all episodes?"); }
        } else { toast.success(`Rated ${rating} stars`); }
    };

    const handleEpisodeClick = (season: number, episode: number) => {
        if (onOpenEpisodeDetails) {
            onOpenEpisodeDetails(showId, season, episode);
        }
    };

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

    const UserRatingStars = () => {
        const rating = getMyRating();
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => handleRate(star)} className={`transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-zinc-600 hover:text-yellow-200'}`}>
                        <Star className={`w-6 h-6 ${star <= rating ? 'fill-current' : ''}`} strokeWidth={2} />
                    </button>
                ))}
                {rating > 0 && <button onClick={() => handleRate(0)} className="ml-2 text-zinc-600 hover:text-red-400"><StarOff className="w-4 h-4" /></button>}
            </div>
        );
    };

    const TabButton = ({ id, label, icon: Icon }: { id: 'overview' | 'episodes' | 'media' | 'releases', label: string, icon: any }) => (
        <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === id ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
            <Icon className="w-4 h-4" /> {label}
        </button>
    );

    // Filtered Media List
    const getFilteredMedia = () => {
        if (mediaFilter === 'videos') return videos.map(v => ({ type: 'video', data: v }));
        const allImages = [
            ...(mediaFilter === 'all' || mediaFilter === 'posters' ? images.posters.map(p => ({ type: 'poster', data: p })) : []),
            ...(mediaFilter === 'all' || mediaFilter === 'backdrops' ? images.backdrops.map(b => ({ type: 'backdrop', data: b })) : []),
            ...(mediaFilter === 'all' || mediaFilter === 'logos' ? images.logos.map(l => ({ type: 'logo', data: l })) : [])
        ];
        return allImages;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6 bg-black/90 backdrop-blur-xl animate-fade-in">
             <div className="w-full h-full md:max-w-6xl md:h-[90vh] bg-[#020202] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative border border-white/5 group/modal">
                 
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 z-50 p-3 rounded-full bg-black/40 hover:bg-white/10 text-white backdrop-blur-xl transition-all border border-white/5 group-hover/modal:border-white/20"
                >
                    <X className="w-6 h-6" />
                </button>

                {loading || !details ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-700 animate-pulse">Loading Data...</span>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                         {/* CINEMATIC HERO */}
                         <div className="relative w-full h-[45vh] md:h-[50vh] shrink-0">
                             <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getBackdropUrl(details.backdrop_path)})` }} />
                             <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/30 to-transparent" />
                             <div className="absolute inset-0 bg-gradient-to-r from-[#020202]/90 via-transparent to-transparent" />
                             
                             <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 flex flex-col justify-end">
                                  <div className="flex flex-wrap items-center gap-3 mb-4 animate-fade-in-up">
                                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                          {mediaType === 'movie' ? <Film className="w-3 h-3 text-white" /> : <Tv className="w-3 h-3 text-white" />}
                                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">{mediaType === 'movie' ? 'Film' : 'Series'}</span>
                                      </div>
                                      {details.status && (
                                          <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-black/40 backdrop-blur-md ${details.status.includes('Ending') || details.status.includes('Canceled') ? 'border-red-500/30 text-red-400' : 'border-emerald-500/30 text-emerald-400'}`}>
                                              {traktStatus || details.status}
                                          </span>
                                      )}
                                      <div className="flex items-center gap-1.5 text-yellow-400 text-sm font-bold bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
                                           <Star className="w-3.5 h-3.5 fill-current" /> {details.vote_average.toFixed(1)}
                                      </div>
                                  </div>

                                  <h1 className="text-4xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter mb-6 drop-shadow-2xl max-w-4xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                      {details.name}
                                  </h1>

                                  <div className="flex items-center gap-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                      <button 
                                          onClick={() => !isAdded && addToWatchlist(details)}
                                          disabled={isAdded}
                                          className={`h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${isAdded ? 'bg-zinc-900 border border-zinc-700 text-zinc-400 cursor-default' : 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10'}`}
                                      >
                                          {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                          {isAdded ? 'In Library' : 'Add to Library'}
                                      </button>
                                      
                                      <button 
                                          onClick={handleHeaderWatch}
                                          className={`h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all border ${mediaType === 'movie' && isWatched() ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-black/40 border-white/10 text-white hover:bg-white/10 backdrop-blur-md'}`}
                                      >
                                          {mediaType === 'movie' && isWatched() ? <CheckCircle className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                          {mediaType === 'movie' && isWatched() ? 'Seen' : 'Mark Seen'}
                                      </button>

                                      <div className="flex flex-col gap-1 ml-4 border-l border-white/10 pl-6">
                                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Your Rating</span>
                                          <UserRatingStars />
                                      </div>
                                  </div>
                             </div>
                         </div>

                         {/* NAVIGATION */}
                         <div className="flex items-center gap-6 px-8 md:px-12 border-b border-white/5 bg-[#020202] sticky top-0 z-20 overflow-x-auto hide-scrollbar shrink-0">
                             {['overview', ...(mediaType === 'tv' ? ['episodes'] : []), 'media', ...(mediaType === 'movie' ? ['releases'] : [])].map((tab: any) => (
                                 <button
                                     key={tab}
                                     onClick={() => setActiveTab(tab)}
                                     className={`py-5 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                 >
                                     {tab}
                                 </button>
                             ))}
                         </div>

                         {/* CONTENT AREA */}
                         <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020202] p-8 md:p-12">
                             
                             {/* OVERVIEW TAB */}
                             {activeTab === 'overview' && (
                                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-fade-in">
                                     <div className="lg:col-span-2 space-y-12">
                                         <div>
                                             <h3 className="text-sm font-black text-zinc-600 uppercase tracking-widest mb-4">Synopsis</h3>
                                             <p className="text-zinc-300 text-lg leading-relaxed font-medium max-w-3xl">
                                                 {details.overview || "No synopsis available."}
                                             </p>
                                         </div>
                                         
                                         {details.credits?.cast && details.credits.cast.length > 0 && (
                                             <div>
                                                 <h3 className="text-sm font-black text-zinc-600 uppercase tracking-widest mb-6">Starring</h3>
                                                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                     {details.credits.cast.slice(0, 8).map(person => (
                                                         <div 
                                                            key={person.id} 
                                                            onClick={() => setSelectedPersonId(person.id)}
                                                            className="flex items-center gap-3 bg-zinc-900/30 p-2 rounded-xl border border-white/5 cursor-pointer hover:bg-zinc-800 hover:border-white/20 transition-all group"
                                                         >
                                                             <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                                                                 {person.profile_path ? <img src={getImageUrl(person.profile_path, 'w185')} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" /> : <User className="w-full h-full p-2 text-zinc-600" />}
                                                             </div>
                                                             <div className="min-w-0">
                                                                 <p className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{person.name}</p>
                                                                 <p className="text-[10px] text-zinc-500 truncate">{person.character}</p>
                                                             </div>
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}
                                     </div>

                                     <div className="space-y-6">
                                         <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 space-y-6">
                                             {details.genres && (
                                                 <div>
                                                     <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Genres</h4>
                                                     <div className="flex flex-wrap gap-2">
                                                         {details.genres.map(g => (
                                                             <span key={g.id} className="text-[10px] font-bold text-zinc-300 border border-white/10 px-2 py-1 rounded bg-white/5">{g.name}</span>
                                                         ))}
                                                     </div>
                                                 </div>
                                             )}
                                             
                                             <div className="grid grid-cols-2 gap-4">
                                                 {details.runtime && (
                                                     <div>
                                                         <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Runtime</h4>
                                                         <span className="text-sm font-mono text-white">{details.runtime} min</span>
                                                     </div>
                                                 )}
                                                 {details.networks && details.networks.length > 0 && (
                                                     <div>
                                                         <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Network</h4>
                                                         <span className="text-sm font-bold text-white">{details.networks[0].name}</span>
                                                     </div>
                                                 )}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {/* EPISODES TAB */}
                             {activeTab === 'episodes' && mediaType === 'tv' && (
                                 <div className="max-w-4xl mx-auto animate-fade-in">
                                     <div className="flex items-center justify-between mb-8">
                                         <h3 className="text-xl font-black text-white uppercase tracking-tight">Season Guide</h3>
                                         <div className="relative">
                                             <select 
                                                 value={selectedSeasonNum}
                                                 onChange={(e) => setSelectedSeasonNum(Number(e.target.value))}
                                                 className="appearance-none bg-zinc-900 border border-zinc-800 text-white text-xs font-bold uppercase tracking-wider py-3 pl-5 pr-12 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer hover:bg-zinc-800 transition-colors"
                                             >
                                                 {details.seasons?.filter(s => s.season_number > 0).map(s => (
                                                     <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                                                 ))}
                                             </select>
                                             <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                         </div>
                                     </div>

                                     {loadingSeason ? (
                                         <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                                     ) : seasonData ? (
                                         <div className="space-y-4">
                                             {seasonData.episodes.map(ep => {
                                                 const mazeData = tvmazeOverrides[ep.episode_number];
                                                 const traktDate = traktOverrides[ep.episode_number];
                                                 let displayDate = '', displayTime = '', dateObj: Date | null = null, isUpcoming = false;

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
                                                 const isTarget = ep.episode_number === initialEpisode && ep.season_number === initialSeason;

                                                 return (
                                                     <div 
                                                         key={ep.id}
                                                         id={`v2-episode-${ep.episode_number}`}
                                                         onClick={() => handleEpisodeClick(ep.season_number, ep.episode_number)}
                                                         className={`
                                                             flex gap-6 p-4 rounded-2xl border transition-all duration-300 group cursor-pointer
                                                             ${isTarget ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-zinc-900/20 border-white/5 hover:bg-zinc-900/40'}
                                                             ${isWatched ? 'opacity-60' : ''}
                                                         `}
                                                     >
                                                         <div className="hidden sm:block w-32 aspect-video bg-black rounded-lg overflow-hidden shrink-0 border border-white/5 relative">
                                                             <img src={getImageUrl(ep.still_path)} className={`w-full h-full object-cover transition-all ${isWatched ? 'grayscale' : ''}`} alt="" loading="lazy" />
                                                             {isWatched && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Check className="w-6 h-6 text-emerald-500" /></div>}
                                                         </div>

                                                         <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                             <div className="flex items-center gap-3 mb-1">
                                                                 <span className="text-xs font-mono text-zinc-500">E{ep.episode_number}</span>
                                                                 <h4 className={`text-base font-bold truncate ${isUpcoming ? 'text-indigo-400' : 'text-white'}`}>{ep.name}</h4>
                                                                 <Info className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                             </div>
                                                             <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">{ep.overview || "No description available."}</p>
                                                             
                                                             {displayDate && (
                                                                 <div className="flex items-center gap-3">
                                                                     <span className="text-[10px] font-bold text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">{displayDate}</span>
                                                                     {displayTime && <span className="text-[10px] font-mono text-zinc-600">{displayTime}</span>}
                                                                 </div>
                                                             )}
                                                         </div>

                                                         <button 
                                                             onClick={(e) => { e.stopPropagation(); toggleWatched({ tmdb_id: details.id, media_type: 'episode', season_number: ep.season_number, episode_number: ep.episode_number, is_watched: isWatched }); }}
                                                             className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all shrink-0 self-center ${isWatched ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-white hover:text-black'}`}
                                                         >
                                                             <Check className="w-5 h-5" />
                                                         </button>
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     ) : (
                                         <div className="py-20 text-center text-zinc-500">Select a season to view episodes</div>
                                     )}
                                 </div>
                             )}

                             {/* MEDIA TAB (Updated) */}
                             {activeTab === 'media' && (
                                 <div className="space-y-8 animate-fade-in">
                                     <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2">
                                         {['all', 'videos', 'posters', 'backdrops', 'logos'].map((f: any) => (
                                             <button 
                                                key={f} 
                                                onClick={() => setMediaFilter(f)} 
                                                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${mediaFilter === f ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                             >
                                                 {f}
                                             </button>
                                         ))}
                                     </div>

                                     <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                                         {/* Videos */}
                                         {(mediaFilter === 'all' || mediaFilter === 'videos') && videos.map(video => (
                                             <div 
                                                key={video.id} 
                                                onClick={() => setPlayingVideo(video)}
                                                className="break-inside-avoid relative rounded-xl overflow-hidden cursor-pointer group mb-4 border border-white/10"
                                             >
                                                 <img src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`} className="w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={video.name} />
                                                 <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                                     <div className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                                                         <Play className="w-4 h-4 text-white fill-current" />
                                                     </div>
                                                 </div>
                                                 <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                                     <p className="text-[10px] font-bold text-white truncate">{video.name}</p>
                                                     <p className="text-[9px] text-zinc-400">{video.type}</p>
                                                 </div>
                                             </div>
                                         ))}

                                         {/* Images */}
                                         {getFilteredMedia().map((item, idx) => (
                                             <div 
                                                key={`${item.type}-${idx}`} 
                                                onClick={() => setPreviewImage(getImageUrl(item.data.file_path, 'original'))}
                                                className="break-inside-avoid relative rounded-xl overflow-hidden cursor-pointer group mb-4 border border-white/10 bg-zinc-900"
                                             >
                                                 <img 
                                                     src={getImageUrl(item.data.file_path, 'w500')} 
                                                     className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" 
                                                     alt="" 
                                                     loading="lazy" 
                                                 />
                                                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                                                 <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest text-white/80 border border-white/10">
                                                     {item.type}
                                                 </span>
                                             </div>
                                         ))}
                                     </div>
                                     {getFilteredMedia().length === 0 && videos.length === 0 && <div className="text-center py-20 text-zinc-500">No media found for this filter.</div>}
                                 </div>
                             )}
                             
                             {activeTab === 'releases' && mediaType === 'movie' && (
                                 <div className="max-w-2xl mx-auto animate-fade-in">
                                     <h3 className="text-sm font-black text-zinc-600 uppercase tracking-widest mb-6">Global Release Dates</h3>
                                     {releases.length > 0 ? (
                                         <div className="bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden">
                                             {releases.map((r, idx) => (
                                                 <div key={idx} className="flex items-center justify-between p-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                                                     <div className="flex items-center gap-4">
                                                         <span className={`fi fi-${r.country.toLowerCase()} rounded-[2px] shadow-sm`} />
                                                         <span className="text-sm font-bold text-zinc-300">{r.country}</span>
                                                     </div>
                                                     <div className="flex items-center gap-4">
                                                         <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${r.type === 'theatrical' ? 'text-pink-400 border-pink-500/20 bg-pink-500/5' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'}`}>
                                                             {r.type === 'theatrical' ? 'Cinema' : 'Digital'}
                                                         </span>
                                                         <span className="text-sm font-mono text-white min-w-[100px] text-right">{format(parseISO(r.date), 'MMM d, yyyy')}</span>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     ) : <div className="text-center py-12 text-zinc-500">No release dates found.</div>}
                                 </div>
                             )}
                         </div>
                    </div>
                )}
             </div>

             {playingVideo && (
                 <div className="absolute inset-0 z-[250] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-20 animate-fade-in" onClick={() => setPlayingVideo(null)}>
                     <div className="w-full h-full bg-black relative shadow-2xl rounded-3xl overflow-hidden border border-white/10 max-w-7xl max-h-[80vh]">
                         <iframe 
                            src={`https://www.youtube.com/embed/${playingVideo.key}?autoplay=1&modestbranding=1&rel=0`}
                            className="w-full h-full"
                            allowFullScreen
                            allow="autoplay"
                         />
                         <button onClick={() => setPlayingVideo(null)} className="absolute top-6 right-6 p-3 bg-black/50 hover:bg-zinc-800 text-white rounded-full transition-colors backdrop-blur-md border border-white/10">
                             <X className="w-6 h-6" />
                         </button>
                     </div>
                 </div>
             )}
             
             {previewImage && (
                 <div className="absolute inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col animate-fade-in" onClick={() => setPreviewImage(null)}>
                     <div className="absolute top-6 right-6 flex gap-4 z-50">
                         <button 
                             onClick={() => setPreviewImage(null)}
                             className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/5 backdrop-blur-md"
                         >
                             <X className="w-6 h-6" />
                         </button>
                     </div>
                     <div className="flex-1 flex items-center justify-center p-4 md:p-12">
                         <img src={previewImage} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="Preview" onClick={(e) => e.stopPropagation()} />
                     </div>
                 </div>
             )}

            {selectedPersonId && (
                <V2PersonDetailsModal 
                    isOpen={!!selectedPersonId}
                    onClose={() => setSelectedPersonId(null)}
                    personId={selectedPersonId}
                    onSelectShow={(id, type) => handleSwitchShow(id, type)}
                />
            )}
        </div>
    );
};

export default V2ShowDetailsModal;
