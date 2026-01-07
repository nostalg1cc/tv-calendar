
import React, { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { Check, CalendarDays, Ticket, MonitorPlay, PlayCircle, ChevronDown, RefreshCw, Cloud, HardDrive, CheckCheck, Loader2, Sparkles, Plus, ThumbsDown, Flame, CalendarClock, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import { Episode, WatchedItem, TVShow } from '../types';
import { getImageUrl, getShowDetails, getCollection, getRecommendations } from '../services/tmdb';
import { useCalendarEpisodes } from '../hooks/useQueries';
import toast from 'react-hot-toast';

interface V2AgendaProps {
    selectedDay: Date;
    onPlayTrailer?: (showId: number, mediaType: 'tv' | 'movie', episode?: Episode) => void;
    onOpenDetails?: (showId: number, mediaType: 'tv' | 'movie', season?: number, episode?: number) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

// Extended type for internal logic
type SuggestionCategory = 'for_you' | 'viral' | 'upcoming';

interface SuggestionItem extends TVShow {
    _category: SuggestionCategory;
    _reason: string;
}

const V2Agenda: React.FC<V2AgendaProps> = ({ selectedDay, onPlayTrailer, onOpenDetails, isOpen, onClose }) => {
    const { settings, history: interactions, toggleWatched, markManyWatched, isSyncing, user, triggerCloudSync, watchlist, addToWatchlist, updateSettings, setReminderCandidate } = useStore();
    const { episodes } = useCalendarEpisodes(selectedDay);
    const [markingShowId, setMarkingShowId] = useState<number | null>(null);
    
    // Suggestion State
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const loadedIds = useRef<Set<number>>(new Set());
    const loadingRef = useRef(false);
    
    // Prevent body scroll when drawer is open on mobile
    useEffect(() => {
        if (window.innerWidth < 1280) { // xl breakpoint
            document.body.style.overflow = isOpen ? 'hidden' : '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Endless Fetching Logic
    const loadSuggestions = async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setIsLoadingSuggestions(true);

        try {
            let candidates: TVShow[] = [];
            let reason = "";
            let category: SuggestionCategory = 'viral';

            // Random Strategy Selection
            const rand = Math.random();
            const canDoPersonal = watchlist.length > 0;
            
            // 40% Personal (if possible), 30% Viral, 30% Upcoming
            if (canDoPersonal && rand < 0.4) {
                // --- STRATEGY 1: FOR YOU ---
                const seed = watchlist[Math.floor(Math.random() * watchlist.length)];
                try {
                     const recs = await getRecommendations(seed.id, seed.media_type);
                     if (recs.length > 0) {
                         candidates = recs;
                         reason = `Because you track ${seed.name}`;
                         category = 'for_you';
                     }
                } catch {}
            } else if (rand < 0.7) {
                // --- STRATEGY 2: VIRAL HITS ---
                const endpoints = [
                    { url: '/trending/all/day', label: 'Trending Today' },
                    { url: '/tv/on_the_air', label: 'Airing Now' },
                    { url: '/movie/now_playing', label: 'In Cinemas' }
                ];
                const pick = endpoints[Math.floor(Math.random() * endpoints.length)];
                try {
                    candidates = await getCollection(pick.url, pick.url.includes('movie') ? 'movie' : 'tv', 1);
                    reason = pick.label;
                    category = 'viral';
                } catch {}
            } else {
                // --- STRATEGY 3: UPCOMING ---
                const type = Math.random() > 0.5 ? 'movie' : 'tv';
                const today = new Date().toISOString().split('T')[0];
                try {
                    // Using discover to filter for future dates
                    candidates = await getCollection(`/discover/${type}`, type, 1, {
                        'primary_release_date.gte': today, // For movies
                        'first_air_date.gte': today,       // For TV
                        'sort_by': 'popularity.desc',
                        'with_original_language': 'en'
                    });
                    reason = type === 'movie' ? 'Coming Soon to Theaters' : 'Upcoming Series';
                    category = 'upcoming';
                } catch {}
            }

            // Fallback if strategy failed (e.g. empty result)
            if (candidates.length === 0) {
                const trending = await getCollection('/trending/all/week', 'tv'); // Safe fallback
                candidates = trending;
                reason = "Popular Right Now";
                category = 'viral';
            }

            // Deduplication & Filtering
            const valid = candidates.filter(show => {
                if (watchlist.some(w => w.id === show.id)) return false;
                if (loadedIds.current.has(show.id)) return false;
                if (!show.poster_path) return false;
                return true;
            });

            // Shuffle valid items
            const shuffled = valid.sort(() => 0.5 - Math.random());

            if (shuffled.length > 0) {
                shuffled.forEach(s => loadedIds.current.add(s.id));
                const labeledItems = shuffled.map(s => ({
                    ...s,
                    _category: category,
                    _reason: reason
                }));
                setSuggestions(prev => [...prev, ...labeledItems]);
            }
        } catch (e) {
            console.error("Suggestion fetch failed", e);
        } finally {
            setIsLoadingSuggestions(false);
            loadingRef.current = false;
        }
    };

    // Monitor Index to Load More
    useEffect(() => {
        if (!settings.agendaSuggestions) return;
        
        // Load if queue is running low (buffer < 3)
        if (suggestions.length - suggestionIndex < 3 && !loadingRef.current) {
            loadSuggestions();
        }
    }, [settings.agendaSuggestions, suggestionIndex, suggestions.length]);

    const dateKey = format(selectedDay, 'yyyy-MM-dd');
    const dayEps = episodes.filter(ep => ep.air_date === dateKey).filter(ep => {
        if (settings.hideTheatrical && ep.is_movie && ep.release_type === 'theatrical') return false;
        if (settings.ignoreSpecials && ep.season_number === 0) return false;
        return true;
    });

    const groupedEps: Record<number, Episode[]> = {};
    dayEps.forEach(ep => {
        const key = ep.show_id || ep.id;
        if (!groupedEps[key]) groupedEps[key] = [];
        groupedEps[key].push(ep);
    });

    const handleMarkPrevious = async (ep: Episode) => {
        if (!ep.show_id || markingShowId) return;
        setMarkingShowId(ep.show_id);
        
        try {
            const details = await getShowDetails(ep.show_id);
            const itemsToMark: WatchedItem[] = [];
            const targetSeason = ep.season_number;
            const targetEpisode = ep.episode_number;

            details.seasons?.forEach(s => {
                if (s.season_number === 0 && settings.ignoreSpecials) return;
                
                if (s.season_number < targetSeason) {
                    for(let i=1; i <= s.episode_count; i++) {
                        itemsToMark.push({ tmdb_id: ep.show_id!, media_type: 'episode', season_number: s.season_number, episode_number: i, is_watched: true });
                    }
                } else if (s.season_number === targetSeason) {
                    for(let i=1; i <= targetEpisode; i++) {
                        itemsToMark.push({ tmdb_id: ep.show_id!, media_type: 'episode', season_number: s.season_number, episode_number: i, is_watched: true });
                    }
                }
            });

            markManyWatched(itemsToMark);
            toast.success(`Marked ${itemsToMark.length} episodes as watched`);
        } catch (e) {
            toast.error("Failed to update history");
        } finally {
            setMarkingShowId(null);
        }
    };

    const GroupedShowCard: React.FC<{ eps: Episode[] }> = ({ eps }) => {
        const firstEp = eps[0];
        const { spoilerConfig } = settings;
        
        const hasUnwatched = eps.some(ep => {
            const key = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
            return !interactions[key]?.is_watched;
        });

        const isMovie = firstEp.is_movie;
        const shouldApplySpoilerRules = !isMovie || spoilerConfig.includeMovies;
        const isSpoilerProtected = hasUnwatched && shouldApplySpoilerRules && spoilerConfig.images;
        
        const stillUrl = getImageUrl(firstEp.still_path || firstEp.poster_path);
        const bannerUrl = getImageUrl(firstEp.show_backdrop_path || firstEp.poster_path);
        const displayImageUrl = (isSpoilerProtected && spoilerConfig.replacementMode === 'banner') ? bannerUrl : stillUrl;

        const handleTitleClick = () => {
             if (onOpenDetails) onOpenDetails(firstEp.show_id || firstEp.id, firstEp.is_movie ? 'movie' : 'tv', firstEp.season_number, firstEp.episode_number);
        };

        return (
            <div className="w-full bg-zinc-950 border-b border-white/5 flex flex-col group/card first:border-t-0">
                <div className="bg-zinc-900/40 px-4 py-2 border-y border-white/5 flex items-center justify-between">
                    <h4 
                        onClick={handleTitleClick}
                        className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.15em] truncate pr-4 cursor-pointer hover:text-white hover:underline transition-all"
                    >
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
                         <button onClick={() => onPlayTrailer?.(firstEp.show_id || firstEp.id, firstEp.is_movie ? 'movie' : 'tv')} className="p-1.5 text-zinc-600 hover:text-white transition-colors"><PlayCircle className="w-3.5 h-3.5" /></button>
                    </div>
                </div>

                <div className="relative aspect-video w-full overflow-hidden bg-zinc-900 cursor-pointer" onClick={handleTitleClick}>
                    <img src={displayImageUrl} alt="" className={`w-full h-full object-cover transition-all duration-700 ${isSpoilerProtected && spoilerConfig.replacementMode === 'blur' ? 'blur-2xl scale-110 opacity-30' : 'opacity-60 group-hover/card:opacity-90'}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    {isSpoilerProtected && spoilerConfig.replacementMode === 'blur' && (
                        <div className="absolute inset-0 flex items-center justify-center"><EyeOff className="w-6 h-6 text-zinc-800" /></div>
                    )}
                </div>

                <div className="flex flex-col">
                    {eps.map((ep) => {
                        const watchedKey = ep.is_movie ? `movie-${ep.show_id}` : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
                        const isWatched = interactions[watchedKey]?.is_watched;
                        const isTextCensored = !isWatched && shouldApplySpoilerRules && spoilerConfig.title;
                        const isDescCensored = !isWatched && shouldApplySpoilerRules && spoilerConfig.overview;
                        
                        const titleText = isTextCensored ? `Episode ${ep.episode_number}` : (ep.is_movie ? (ep.release_type === 'theatrical' ? 'Cinema Premiere' : 'Digital Release') : ep.name);
                        const subText = isDescCensored ? 'Description hidden' : (ep.is_movie ? ep.overview : `S${ep.season_number} E${ep.episode_number}`);
                        const isMarking = markingShowId === ep.show_id;

                        return (
                            <div key={`${ep.show_id}-${ep.id}`} onClick={() => onOpenDetails?.(ep.show_id || ep.id, ep.is_movie ? 'movie' : 'tv', ep.season_number, ep.episode_number)} className={`px-4 py-3 border-b border-white/[0.03] last:border-b-0 flex items-center justify-between gap-4 cursor-pointer ${isWatched ? 'opacity-30' : 'hover:bg-white/[0.02]'} transition-all`}>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1"><p className={`text-[11px] font-bold truncate leading-none ${isTextCensored ? 'text-zinc-600' : 'text-zinc-200'}`}>{titleText}</p></div>
                                    <div className="flex items-center gap-2">
                                        {ep.is_movie && (ep.release_type === 'theatrical' ? <Ticket className="w-2.5 h-2.5 text-pink-400" /> : <MonitorPlay className="w-2.5 h-2.5 text-emerald-400" />)}
                                        <p className={`text-[9px] font-mono uppercase tracking-tighter truncate ${isDescCensored ? 'text-zinc-700 italic' : 'text-zinc-500'}`}>{subText}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {!ep.is_movie && !isWatched && (
                                        <button onClick={(e) => { e.stopPropagation(); handleMarkPrevious(ep); }} disabled={isMarking} className="p-2 text-zinc-600 hover:text-indigo-400 transition-colors">
                                            {isMarking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); ep.show_id && toggleWatched({ tmdb_id: ep.show_id, media_type: ep.is_movie ? 'movie' : 'episode', season_number: ep.season_number, episode_number: ep.episode_number, is_watched: isWatched }); }} className={`p-2 transition-all ${isWatched ? 'text-emerald-500' : 'text-zinc-600 hover:text-white'}`}>
                                        <Check className={`w-4 h-4 ${isWatched ? 'stroke-[3px]' : 'stroke-2'}`} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const currentSuggestion = suggestions[suggestionIndex];

    const handleSuggestionAdd = () => {
        if (currentSuggestion) {
            addToWatchlist(currentSuggestion);
            setReminderCandidate(currentSuggestion); // Open modal for further actions
            setSuggestionIndex(prev => prev + 1);
        }
    };

    const handlePosterClick = () => {
        if (currentSuggestion && onOpenDetails) {
            onOpenDetails(currentSuggestion.id, currentSuggestion.media_type);
        }
    };

    // --- Suggestion UI Logic ---
    const getCategoryStyles = (cat: SuggestionCategory) => {
        switch(cat) {
            case 'viral': return { icon: Flame, color: 'text-amber-500', label: 'Viral Hit' };
            case 'upcoming': return { icon: CalendarClock, color: 'text-blue-400', label: 'Coming Soon' };
            default: return { icon: Sparkles, color: 'text-indigo-400', label: 'Suggested for You' };
        }
    };

    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] xl:hidden animate-fade-in"
                    onClick={onClose}
                />
            )}

            <aside className={`
                flex flex-col bg-background z-[100] overflow-hidden
                xl:w-[320px] xl:border-l xl:border-white/5 xl:shrink-0 xl:relative xl:h-full xl:translate-y-0 xl:rounded-none xl:border-t-0
                fixed bottom-0 left-0 right-0 h-[80vh] rounded-t-[2.5rem] border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] transition-transform duration-300 cubic-bezier(0.2, 0, 0, 1)
                ${isOpen ? 'translate-y-0' : 'translate-y-[110%] xl:translate-y-0'}
            `}>
                <div className="xl:hidden shrink-0 pt-4 pb-2 px-6 flex items-center justify-between bg-panel border-b border-white/5 relative">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-800 rounded-full" />
                    <div className="mt-4">
                        <h2 className="text-lg font-black text-white">{format(selectedDay, 'EEEE')}</h2>
                        <p className="text-xs text-zinc-500 font-medium">{format(selectedDay, 'MMMM do')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full text-zinc-400 mt-2">
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-background flex flex-col">
                    {dayEps.length > 0 ? (
                        <div className="flex flex-col">
                            {Object.values(groupedEps).map((group, idx) => (
                                <GroupedShowCard key={idx} eps={group} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-50">
                            <CalendarDays className="w-12 h-12 text-zinc-800 mb-4 stroke-[1px]" />
                            <h4 className="text-xs font-black text-zinc-700 uppercase tracking-widest mb-1">Clear Horizon</h4>
                            <p className="text-[10px] text-zinc-800 font-medium uppercase tracking-tighter">
                                No scheduled tracking for {format(selectedDay, 'MMMM d')}
                            </p>
                        </div>
                    )}

                    {/* SUGGESTION CARD */}
                    {settings.agendaSuggestions && (
                        currentSuggestion ? (
                            <div className="mt-auto p-4 bg-gradient-to-b from-transparent to-black/20 border-t border-white/5 animate-fade-in-up">
                                 <div className="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden shadow-lg relative group">
                                      <div className="absolute top-2 right-2 flex gap-2 z-20">
                                          <button 
                                            onClick={() => setSuggestionIndex(prev => prev + 1)} 
                                            className="p-1 rounded-full bg-black/60 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors border border-white/5"
                                            title="Not interested"
                                          >
                                              <ThumbsDown className="w-3 h-3" />
                                          </button>
                                      </div>
                                      
                                      <div className="flex">
                                          <div 
                                              className="w-20 shrink-0 bg-black relative cursor-pointer"
                                              onClick={handlePosterClick}
                                              title="View Details"
                                          >
                                              <img src={getImageUrl(currentSuggestion.poster_path)} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" alt="" />
                                          </div>
                                          <div className="flex-1 p-3 flex flex-col justify-center">
                                              {(() => {
                                                  const style = getCategoryStyles(currentSuggestion._category);
                                                  const Icon = style.icon;
                                                  return (
                                                      <div className={`flex items-center gap-1.5 mb-1 ${style.color}`}>
                                                          <Icon className="w-3 h-3" />
                                                          <span className="text-[9px] font-black uppercase tracking-widest">{style.label}</span>
                                                      </div>
                                                  );
                                              })()}
                                              
                                              <h4 className="text-sm font-bold text-white leading-tight mb-1 line-clamp-1">{currentSuggestion.name}</h4>
                                              <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed mb-3">
                                                  {currentSuggestion._reason} • {currentSuggestion.first_air_date?.split('-')[0]}
                                              </p>
                                              
                                              <div className="flex items-center justify-between">
                                                   <button onClick={handleSuggestionAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-indigo-400 hover:text-white transition-colors">
                                                       <Plus className="w-3 h-3" /> Add Library
                                                   </button>
                                                   <button onClick={() => { updateSettings({ agendaSuggestions: false }); setSuggestions([]); toast.success("Suggestions hidden"); }} className="text-[9px] text-zinc-600 hover:text-red-400 underline decoration-zinc-700 underline-offset-2">
                                                       Hide
                                                   </button>
                                              </div>
                                          </div>
                                      </div>
                                 </div>
                            </div>
                        ) : isLoadingSuggestions ? (
                            <div className="mt-auto p-4 bg-gradient-to-b from-transparent to-black/20 border-t border-white/5 animate-pulse">
                                <div className="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden shadow-lg h-28 flex">
                                    <div className="w-20 bg-zinc-800 shrink-0" />
                                    <div className="flex-1 p-3 flex flex-col justify-center space-y-2">
                                        <div className="w-24 h-3 bg-zinc-800 rounded" />
                                        <div className="w-32 h-4 bg-zinc-800 rounded" />
                                        <div className="flex justify-between items-center pt-2">
                                            <div className="w-20 h-6 bg-zinc-800 rounded" />
                                            <div className="w-8 h-3 bg-zinc-800 rounded" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null
                    )}
                </div>

                <footer className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-white/5 bg-panel/40">
                    <div className="flex items-center gap-3">
                        {user?.is_cloud ? (
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isSyncing ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                <Cloud className={`w-4 h-4 ${isSyncing ? 'text-indigo-400 animate-pulse' : 'text-emerald-400'}`} />
                             </div>
                        ) : (
                             <div className="w-8 h-8 rounded-full flex items-center justify-center border border-orange-500/20 bg-orange-500/10">
                                <HardDrive className="w-4 h-4 text-orange-400" />
                             </div>
                        )}
                        
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                {user?.is_cloud ? 'Cloud Sync' : 'Local Storage'}
                            </span>
                            <span className="text-[9px] font-medium text-zinc-600">
                                {isSyncing ? 'Syncing...' : (user?.is_cloud ? 'Up to date' : 'Device Only')}
                            </span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => user?.is_cloud ? triggerCloudSync() : window.location.reload()}
                        disabled={isSyncing}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all active:scale-95"
                        title={user?.is_cloud ? "Force Cloud Sync" : "Reload Page"}
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                </footer>
            </aside>
        </>
    );
};

export default V2Agenda;
