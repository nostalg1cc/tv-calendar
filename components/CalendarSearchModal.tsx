
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Calendar, Film, Tv, MonitorPlay, Ticket, ChevronRight, Clock, CheckCircle2, Globe, Plus, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { TVShow } from '../types';
import { getImageUrl, getBackdropUrl, getShowDetails, getSeasonDetails, getMovieReleaseDates, searchShows } from '../services/tmdb';
import { format, parseISO, isFuture, isPast, compareAsc } from 'date-fns';

interface CalendarSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SearchScope = 'library' | 'global';

const CalendarSearchModal: React.FC<CalendarSearchModalProps> = ({ isOpen, onClose }) => {
    const { watchlist, addToWatchlist, setReminderCandidate } = useStore();
    
    // UI State
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState<SearchScope>('library');
    const [selectedItem, setSelectedItem] = useState<TVShow | null>(null);
    
    // Data State
    const [globalResults, setGlobalResults] = useState<TVShow[]>([]);
    const [schedule, setSchedule] = useState<any[]>([]);
    
    // Loading State
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
    const [loadingSchedule, setLoadingSchedule] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const scheduleScrollRef = useRef<HTMLDivElement>(null);

    // Reset on Open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setScope('library');
            setSelectedItem(null);
            setGlobalResults([]);
            setTimeout(() => inputRef.current?.focus(), 100);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Local Filtering
    const localResults = useMemo(() => {
        if (!query.trim()) return watchlist.sort((a, b) => a.name.localeCompare(b.name));
        return watchlist.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase())
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [query, watchlist]);

    // Global Search Handler
    const handleGlobalSearch = async () => {
        if (!query.trim()) return;
        setScope('global');
        setIsSearchingGlobal(true);
        try {
            const results = await searchShows(query);
            setGlobalResults(results);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearchingGlobal(false);
        }
    };

    // Add & View Handler
    const handleAddAndView = async (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        await addToWatchlist(show);
        setReminderCandidate(show); // Prompt reminder
        
        // Switch back to library mode and select this item to show schedule
        setScope('library');
        setQuery(''); 
        setSelectedItem(show);
    };

    // Fetch Schedule Logic
    useEffect(() => {
        if (!selectedItem) {
            setSchedule([]);
            return;
        }

        const fetchSchedule = async () => {
            setLoadingSchedule(true);
            try {
                if (selectedItem.media_type === 'movie') {
                    const dates = await getMovieReleaseDates(selectedItem.id);
                    if (dates.length === 0 && selectedItem.first_air_date) {
                        setSchedule([{ 
                            date: selectedItem.first_air_date, 
                            type: 'Theatrical Release', 
                            is_digital: false,
                            country: 'US'
                        }]);
                    } else {
                        setSchedule(dates.map(d => ({
                            date: d.date,
                            type: d.type.charAt(0).toUpperCase() + d.type.slice(1),
                            is_digital: d.type === 'digital' || d.type === 'physical',
                            country: d.country,
                            raw_type: d.type
                        })));
                    }
                } else {
                    const details = await getShowDetails(selectedItem.id);
                    const seasons = details.seasons || [];
                    const eps: any[] = [];
                    const relevantSeasons = seasons.slice(-3); 

                    for (const season of relevantSeasons) {
                        if (season.season_number === 0) continue; 
                        const sData = await getSeasonDetails(selectedItem.id, season.season_number);
                        sData.episodes.forEach((e: any) => {
                            if (e.air_date) {
                                eps.push({
                                    id: e.id,
                                    date: e.air_date,
                                    title: e.name,
                                    season: e.season_number,
                                    number: e.episode_number,
                                    overview: e.overview,
                                    is_digital: true 
                                });
                            }
                        });
                    }
                    eps.sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
                    setSchedule(eps);
                }
            } catch (e) {
                console.error("Failed to load schedule", e);
            } finally {
                setLoadingSchedule(false);
            }
        };

        fetchSchedule();
    }, [selectedItem]);

    // Auto-scroll to current or next release
    useEffect(() => {
        if (schedule.length > 0 && scheduleScrollRef.current) {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Start of today

            const firstUpcomingIndex = schedule.findIndex(s => {
                const d = parseISO(s.date);
                return d >= now;
            });

            if (firstUpcomingIndex !== -1) {
                setTimeout(() => {
                    const el = document.getElementById(`schedule-event-${firstUpcomingIndex}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 200);
            } else if (schedule.length > 0) {
                 // If all episodes are in the past, maybe scroll to the last one? 
                 // For now, let's keep it at top (history view) or scroll to bottom. 
                 // Usually people want to see where they left off or the latest. 
                 // If a show ended, seeing the finale is useful.
                 setTimeout(() => {
                     const lastIdx = schedule.length - 1;
                     const el = document.getElementById(`schedule-event-${lastIdx}`);
                     if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }, 200);
            }
        }
    }, [schedule]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#050505] animate-fade-in">
            {/* Top Bar */}
            <div className="shrink-0 h-20 px-6 flex items-center justify-between border-b border-white/5 bg-[#09090b]">
                <div className="flex items-center gap-4 w-full max-w-3xl mx-auto">
                     {scope === 'global' ? (
                        <button onClick={() => setScope('library')} className="p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                     ) : (
                        <Search className="w-6 h-6 text-zinc-500" />
                     )}
                     
                     <input 
                        ref={inputRef}
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                        placeholder={scope === 'library' ? "Search your calendar..." : "Search global database..."}
                        className="flex-1 bg-transparent border-none outline-none text-xl md:text-2xl font-medium text-white placeholder:text-zinc-700 h-full"
                    />
                    
                    {query && scope === 'library' && (
                         <button 
                            onClick={handleGlobalSearch}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold transition-colors"
                        >
                            Global Search <ArrowRight className="w-3 h-3" />
                        </button>
                    )}

                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto">
                {/* Left Panel: List */}
                <div className={`flex-1 flex flex-col min-w-0 border-r border-white/5 bg-[#050505] ${selectedItem ? 'hidden lg:flex' : 'flex'}`}>
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                        {scope === 'library' ? (
                            <>
                                {localResults.length === 0 && query ? (
                                    <div className="flex flex-col items-center justify-center pt-20 opacity-50">
                                        <Search className="w-12 h-12 text-zinc-700 mb-4" />
                                        <p className="text-zinc-500 mb-4">No results in your calendar.</p>
                                        <button 
                                            onClick={handleGlobalSearch}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                                        >
                                            <Globe className="w-4 h-4" /> Search Global Database
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {localResults.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => setSelectedItem(item)}
                                                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left group border ${selectedItem?.id === item.id ? 'bg-zinc-900 border-indigo-500/50' : 'bg-transparent border-transparent hover:bg-zinc-900 hover:border-white/5'}`}
                                            >
                                                <div className="w-12 h-16 bg-black rounded-lg overflow-hidden shrink-0 border border-white/5 shadow-sm">
                                                    <img src={getImageUrl(item.poster_path)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className={`font-bold text-base truncate ${selectedItem?.id === item.id ? 'text-indigo-400' : 'text-zinc-200 group-hover:text-white'}`}>{item.name}</h4>
                                                    <div className="flex items-center gap-2 text-xs opacity-60 text-zinc-400">
                                                        {item.media_type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                                                        <span>{item.first_air_date?.split('-')[0]}</span>
                                                        <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                                        <span>{item.vote_average.toFixed(1)} ★</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className={`w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors ${selectedItem?.id === item.id ? 'opacity-100 text-indigo-500' : ''}`} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {isSearchingGlobal ? (
                                    <div className="flex flex-col items-center justify-center pt-20">
                                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Searching TMDB...</span>
                                    </div>
                                ) : globalResults.length === 0 ? (
                                    <div className="text-center py-20 text-zinc-500">No results found.</div>
                                ) : (
                                    globalResults.map(item => {
                                        const isAdded = watchlist.some(w => w.id === item.id);
                                        return (
                                            <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-white/5 group transition-colors">
                                                <div className="w-12 h-16 bg-black rounded-lg overflow-hidden shrink-0 border border-white/5">
                                                    <img src={getImageUrl(item.poster_path)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-base text-zinc-200 truncate group-hover:text-white">{item.name}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                                                        <span className="uppercase font-bold text-[9px] border border-zinc-700 px-1.5 py-0.5 rounded">{item.media_type}</span>
                                                        <span>{item.first_air_date?.split('-')[0]}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => !isAdded && handleAddAndView(e, item)}
                                                    disabled={isAdded}
                                                    className={`h-10 px-4 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${isAdded ? 'bg-zinc-800 text-zinc-500 cursor-default' : 'bg-white text-black hover:bg-zinc-200'}`}
                                                >
                                                    {isAdded ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                    {isAdded ? 'Added' : 'Add'}
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                     </div>
                </div>

                {/* Right Panel: Details (or Placeholder) */}
                <div className={`flex-[1.5] flex-col bg-[#020202] border-l border-white/5 relative ${!selectedItem ? 'hidden lg:flex' : 'flex'}`}>
                     {!selectedItem ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 opacity-50">
                            <Calendar className="w-24 h-24 mb-6 stroke-1" />
                            <h3 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">Select an Item</h3>
                        </div>
                     ) : (
                        <div 
                            ref={scheduleScrollRef}
                            className="flex-1 overflow-y-auto custom-scrollbar relative"
                        >
                             <div className="relative h-64 md:h-80 w-full shrink-0">
                                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getBackdropUrl(selectedItem.backdrop_path)})` }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/50 to-transparent" />
                                
                                <button onClick={() => setSelectedItem(null)} className="absolute top-6 left-6 lg:hidden p-2 bg-black/50 backdrop-blur-md rounded-full text-white">
                                    <ChevronRight className="w-6 h-6 rotate-180" />
                                </button>

                                <div className="absolute bottom-0 left-0 p-8 w-full">
                                    <h2 className="text-4xl font-black text-white leading-none mb-4 drop-shadow-2xl">{selectedItem.name}</h2>
                                    <p className="text-sm text-zinc-300 line-clamp-3 max-w-2xl font-medium leading-relaxed drop-shadow-md">{selectedItem.overview}</p>
                                </div>
                             </div>

                             <div className="p-8">
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Release Schedule
                                </h3>

                                {loadingSchedule ? (
                                    <div className="space-y-4">
                                        {[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-900 rounded-xl animate-pulse" />)}
                                    </div>
                                ) : (
                                    <div className="relative border-l border-zinc-800 ml-3 space-y-8 pb-10">
                                        {schedule.length === 0 && (
                                            <div className="pl-8 text-zinc-500 italic">No upcoming dates found.</div>
                                        )}
                                        {schedule.map((event, idx) => {
                                            const isFutureEvent = isFuture(parseISO(event.date));
                                            const isPhysical = event.raw_type === 'physical';
                                            
                                            return (
                                                <div 
                                                    key={idx} 
                                                    id={`schedule-event-${idx}`}
                                                    className="relative pl-8 group"
                                                >
                                                    <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#020202] ${isFutureEvent ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-zinc-700'}`} />
                                                    
                                                    <div className={`p-4 rounded-xl border transition-all ${isFutureEvent ? 'bg-zinc-900/50 border-zinc-800' : 'bg-transparent border-transparent opacity-60'}`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-sm font-bold font-mono ${isFutureEvent ? 'text-indigo-300' : 'text-zinc-500'}`}>
                                                                    {format(parseISO(event.date), 'MMM d, yyyy')}
                                                                </span>
                                                                {event.country && <span className={`fi fi-${event.country.toLowerCase()} rounded-[2px]`} />}
                                                            </div>
                                                            {selectedItem.media_type === 'movie' && (
                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${isPhysical ? 'text-purple-400 border-purple-500/20 bg-purple-500/5' : (event.is_digital ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-pink-400 border-pink-500/20 bg-pink-500/5')}`}>
                                                                    {isPhysical ? 'Physical' : (event.is_digital ? 'Digital' : 'Cinema')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-base font-bold text-white leading-tight">
                                                            {selectedItem.media_type === 'movie' ? event.type : `S${event.season} E${event.number} • ${event.title}`}
                                                        </h4>
                                                        {!selectedItem.media_type && event.overview && (
                                                            <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{event.overview}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                             </div>
                        </div>
                     )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CalendarSearchModal;
