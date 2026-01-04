import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Eye, X, Calendar, Layers, ChevronRight, Loader2, Check } from 'lucide-react';
import { useStore } from '../store';
import { TVShow, Episode, WatchedItem } from '../types';
import toast from 'react-hot-toast';
import { getShowDetails } from '../services/tmdb';

interface AskReminderModalProps {
    isOpen: boolean;
    item: TVShow | Episode | null;
    onClose: () => void;
    onConfirm: () => void; // Used for "Set Reminder" flow
}

const AskReminderModal: React.FC<AskReminderModalProps> = ({ isOpen, item, onClose, onConfirm }) => {
    const { markManyWatched, toggleWatched } = useStore();
    const [view, setView] = useState<'initial' | 'progress'>('initial');
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState<TVShow | null>(null);
    const [selectedSeason, setSelectedSeason] = useState<number>(1);
    const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

    useEffect(() => {
        if (isOpen) {
            setView('initial');
            setDetails(null);
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen || !item) return null;

    const name = 'show_name' in item ? item.show_name : 'name' in item ? item.name : 'this item';
    const isMovie = 'media_type' in item ? item.media_type === 'movie' : item.is_movie;
    const tmdbId = 'show_id' in item && item.show_id ? item.show_id : item.id;

    // --- HANDLERS ---

    const handleSeenAll = async () => {
        setLoading(true);
        try {
            const showData = await getShowDetails(tmdbId);
            const items: WatchedItem[] = [];
            
            showData.seasons?.forEach(s => {
                if (s.season_number > 0 && s.episode_count > 0) {
                    for (let i = 1; i <= s.episode_count; i++) {
                        items.push({
                            tmdb_id: tmdbId,
                            media_type: 'episode',
                            season_number: s.season_number,
                            episode_number: i,
                            is_watched: true
                        });
                    }
                }
            });

            if (items.length > 0) {
                markManyWatched(items);
                toast.success(`Marked ${items.length} episodes as watched`);
            } else {
                toast("No episodes found to mark.");
            }
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Failed to fetch show details.");
        } finally {
            setLoading(false);
        }
    };

    const handleMovieSeen = () => {
         toggleWatched({ tmdb_id: tmdbId, media_type: 'movie', is_watched: false }); // false passed to toggle flips to true
         toast.success("Marked as watched");
         onClose();
    };

    const handleSeenSome = async () => {
        setLoading(true);
        try {
            const showData = await getShowDetails(tmdbId);
            setDetails(showData);
            
            // Set defaults to first season
            if (showData.seasons && showData.seasons.length > 0) {
                const first = showData.seasons.find(s => s.season_number > 0) || showData.seasons[0];
                setSelectedSeason(first.season_number);
                setSelectedEpisode(1);
            }
            
            setView('progress');
        } catch (e) {
            toast.error("Failed to load seasons.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmProgress = () => {
        if (!details) return;

        const items: WatchedItem[] = [];
        
        details.seasons?.forEach(s => {
            if (s.season_number === 0) return; // Skip specials usually

            if (s.season_number < selectedSeason) {
                // Mark whole season if it's before the selected one
                for (let i = 1; i <= s.episode_count; i++) {
                     items.push({
                        tmdb_id: tmdbId,
                        media_type: 'episode',
                        season_number: s.season_number,
                        episode_number: i,
                        is_watched: true
                    });
                }
            } else if (s.season_number === selectedSeason) {
                // Mark up to selected episode in current season
                 for (let i = 1; i <= selectedEpisode; i++) {
                     items.push({
                        tmdb_id: tmdbId,
                        media_type: 'episode',
                        season_number: s.season_number,
                        episode_number: i,
                        is_watched: true
                    });
                }
            }
        });

        markManyWatched(items);
        toast.success(`Marked history up to S${selectedSeason} E${selectedEpisode}`);
        onClose();
    };

    const handleReminder = () => {
        onConfirm(); 
        onClose();
    };

    // Helper to get max episodes for selected season
    const currentSeasonEpisodeCount = details?.seasons?.find(s => s.season_number === selectedSeason)?.episode_count || 24;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-[#18181b] border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                
                {view === 'initial' && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-center w-14 h-14 bg-indigo-600/10 rounded-full mb-4 mx-auto text-indigo-500 ring-1 ring-indigo-500/20">
                            <CheckCircle className="w-7 h-7" />
                        </div>
                        
                        <h3 className="text-xl font-bold text-white text-center mb-1">Added to Library</h3>
                        <p className="text-zinc-400 text-center text-xs mb-6 truncate px-4">
                            <strong className="text-white">{name}</strong> is now tracked.
                        </p>

                        <div className="space-y-3">
                             {loading ? (
                                 <div className="py-8 flex justify-center">
                                     <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                 </div>
                             ) : (
                                 <>
                                    {isMovie ? (
                                        <button 
                                            onClick={handleMovieSeen}
                                            className="w-full py-3 px-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20 text-emerald-400 font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            I've Seen It
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={handleSeenAll}
                                                className="w-full py-3 px-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20 text-emerald-400 font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 group"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                I've Seen All Of It
                                            </button>

                                            <button 
                                                onClick={handleSeenSome}
                                                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 group"
                                            >
                                                <Layers className="w-4 h-4" />
                                                I'm Partway Through
                                            </button>
                                        </>
                                    )}

                                    <button 
                                        onClick={handleReminder}
                                        className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <Bell className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                                        {isMovie ? "Notify on Release" : "Notify New Releases"}
                                    </button>
                                 </>
                             )}
                        </div>
                    </div>
                )}

                {view === 'progress' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-white">Select Progress</h3>
                            <p className="text-xs text-zinc-400">Mark everything watched up to:</p>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Season</label>
                                <div className="relative">
                                    <select 
                                        value={selectedSeason}
                                        onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }}
                                        className="w-full bg-black/30 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:border-indigo-500 outline-none transition-colors"
                                    >
                                        {details?.seasons?.filter(s => s.season_number > 0).map(s => (
                                            <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Episode</label>
                                <div className="relative">
                                    <select 
                                        value={selectedEpisode}
                                        onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                                        className="w-full bg-black/30 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:border-indigo-500 outline-none transition-colors"
                                    >
                                        {Array.from({ length: currentSeasonEpisodeCount }, (_, i) => i + 1).map(num => (
                                            <option key={num} value={num}>Episode {num}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                             <button 
                                onClick={() => setView('initial')}
                                className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-wide hover:bg-zinc-700 transition-colors"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleConfirmProgress}
                                className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wide hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"
                            >
                                Mark Watched
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AskReminderModal;