
import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Calendar, Film, Tv, MonitorPlay, Ticket, ChevronRight, Clock, CheckCircle2, Disc } from 'lucide-react';
import { useStore } from '../store';
import { TVShow, Episode } from '../types';
import { getImageUrl, getBackdropUrl, getShowDetails, getSeasonDetails, getMovieReleaseDates } from '../services/tmdb';
import { format, parseISO, isFuture, isPast, compareAsc } from 'date-fns';

interface CalendarSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CalendarSearchModal: React.FC<CalendarSearchModalProps> = ({ isOpen, onClose }) => {
    const { watchlist } = useStore();
    const [query, setQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<TVShow | null>(null);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [loadingSchedule, setLoadingSchedule] = useState(false);

    // Filter watchlist based on query
    const results = useMemo(() => {
        if (!query.trim()) return [];
        return watchlist.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase())
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [query, watchlist]);

    // Fetch schedule when an item is selected
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
                    // Fallback if no specific dates found
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
                    // For TV, fetch details to get seasons, then fetch episodes for relevant seasons
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
                    
                    // Sort by date desc
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-[#09090b] border border-white/10 w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button Mobile */}
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-zinc-400 hover:text-white md:hidden z-50">
                    <X className="w-5 h-5" />
                </button>

                {/* Left Panel: Search & List */}
                <div className={`flex flex-col w-full md:w-1/3 border-r border-white/5 bg-zinc-950 ${selectedItem ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-white/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input 
                                type="text" 
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Find in calendar..." 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600 transition-colors"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {results.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500">
                                {query ? 'No matches found.' : 'Search your library to view schedules.'}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {results.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left group ${selectedItem?.id === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'}`}
                                    >
                                        <div className="w-10 h-14 bg-black rounded overflow-hidden shrink-0 border border-white/5">
                                            <img src={getImageUrl(item.poster_path)} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                            <div className="flex items-center gap-1.5 text-xs opacity-70">
                                                {item.media_type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                                                <span>{item.first_air_date?.split('-')[0]}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${selectedItem?.id === item.id ? 'opacity-100' : ''}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Details & Schedule */}
                <div className={`flex-1 flex-col bg-[#050505] overflow-hidden ${!selectedItem ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                    {!selectedItem ? (
                        <div className="text-zinc-600 flex flex-col items-center">
                            <Calendar className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-sm font-medium uppercase tracking-widest">Select an item</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="relative h-48 shrink-0">
                                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${getBackdropUrl(selectedItem.backdrop_path)})` }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
                                
                                <div className="absolute bottom-0 left-0 p-6 w-full">
                                    <button onClick={() => setSelectedItem(null)} className="md:hidden mb-4 flex items-center gap-1 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                                        <ChevronRight className="w-4 h-4 rotate-180" /> Back to list
                                    </button>
                                    <h2 className="text-3xl font-black text-white leading-none mb-2">{selectedItem.name}</h2>
                                    <p className="text-sm text-zinc-300 line-clamp-2 max-w-2xl">{selectedItem.overview}</p>
                                </div>
                                <button onClick={onClose} className="absolute top-6 right-6 hidden md:block p-2 bg-black/40 hover:bg-white/10 rounded-full text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Schedule List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 sticky top-0 bg-[#050505] py-2 z-10">Release Schedule</h3>
                                {loadingSchedule ? (
                                    <div className="space-y-3">
                                        {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-900/50 rounded-xl animate-pulse" />)}
                                    </div>
                                ) : (
                                    <div className="space-y-2 relative">
                                        {/* Vertical Timeline Line */}
                                        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-zinc-800" />
                                        
                                        {schedule.map((event, idx) => {
                                            const isPastEvent = isPast(parseISO(event.date));
                                            const isFutureEvent = isFuture(parseISO(event.date));
                                            const isPhysical = event.raw_type === 'physical';
                                            
                                            return (
                                                <div key={idx} className={`relative flex items-center gap-4 p-3 rounded-xl border transition-all ${isFutureEvent ? 'bg-zinc-900 border-zinc-800' : 'bg-transparent border-transparent opacity-60 hover:opacity-100'}`}>
                                                    {/* Dot */}
                                                    <div className={`relative z-10 w-2.5 h-2.5 rounded-full shrink-0 ml-1.5 ${isFutureEvent ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-zinc-700'}`} />
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                {event.country && <span className={`fi fi-${event.country.toLowerCase()} rounded-[1px] shadow-sm`} />}
                                                                <span className="text-sm font-bold text-white truncate pr-2">
                                                                    {selectedItem.media_type === 'movie' ? event.type : `S${event.season} E${event.number} • ${event.title}`}
                                                                </span>
                                                            </div>
                                                            <span className={`text-xs font-mono whitespace-nowrap ${isFutureEvent ? 'text-indigo-300' : 'text-zinc-500'}`}>
                                                                {event.date}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {selectedItem.media_type === 'movie' && (
                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${isPhysical ? 'text-purple-400 border-purple-500/20 bg-purple-500/5' : (event.is_digital ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-pink-400 border-pink-500/20 bg-pink-500/5')}`}>
                                                                    {isPhysical ? 'Physical' : (event.is_digital ? 'Digital' : 'Cinema')}
                                                                </span>
                                                            )}
                                                            {isPastEvent && <span className="text-[9px] font-bold text-zinc-600 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Released</span>}
                                                            {isFutureEvent && <span className="text-[9px] font-bold text-indigo-400 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Upcoming</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        {schedule.length === 0 && (
                                            <div className="text-center py-10 text-zinc-500">No release dates found.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarSearchModal;
