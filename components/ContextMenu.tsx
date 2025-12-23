
import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { 
    Check, Eye, EyeOff, Share2, Tv, Film, Trash2, Calendar, 
    MonitorPlay, Ticket, Copy, Filter, X, ExternalLink 
} from 'lucide-react';
import { Episode, TVShow } from '../types';
import toast from 'react-hot-toast';

type ContextType = 'episode' | 'show' | 'general' | 'calendar_bg';

interface ContextState {
    visible: boolean;
    x: number;
    y: number;
    type: ContextType;
    data: any;
}

const ContextMenu: React.FC = () => {
    const { 
        toggleWatched, 
        history, 
        removeFromWatchlist, 
        settings, 
        updateSettings,
        calendarDate
    } = useStore();
    
    const [state, setState] = useState<ContextState>({
        visible: false,
        x: 0,
        y: 0,
        type: 'general',
        data: null
    });
    
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            
            // Find closest element with data-context attributes
            const target = e.target as HTMLElement;
            const contextEl = target.closest('[data-context-type]');
            
            let type: ContextType = 'general';
            let data: any = null;

            if (contextEl) {
                type = contextEl.getAttribute('data-context-type') as ContextType;
                const rawData = contextEl.getAttribute('data-context-meta');
                if (rawData) {
                    try {
                        data = JSON.parse(rawData);
                    } catch (err) {
                        console.error("Failed to parse context data", err);
                    }
                }
            }

            // Calculate position to keep in bounds
            let x = e.pageX;
            let y = e.pageY;
            
            // Basic bounds check (will be refined by CSS/browser layout usually, but simple clamp here)
            if (x + 200 > window.innerWidth) x = window.innerWidth - 210;
            
            setState({ visible: true, x, y, type, data });
        };

        const handleClick = () => setState(prev => ({ ...prev, visible: false }));
        const handleScroll = () => setState(prev => ({ ...prev, visible: false }));

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', handleClick);
        window.addEventListener('scroll', handleScroll, { capture: true });

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('click', handleClick);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    if (!state.visible) return null;

    // --- ACTIONS ---

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const handleToggleWatched = () => {
        if (state.type !== 'episode' || !state.data) return;
        const ep = state.data as Episode;
        // Reconstruct interaction key to check current status for toggle logic if needed, 
        // but store's toggleWatched handles the flip based on the passed is_watched param usually.
        // However, the store expects us to pass the CURRENT is_watched to know what to flip FROM.
        const key = ep.is_movie 
            ? `movie-${ep.show_id}` 
            : `episode-${ep.show_id}-${ep.season_number}-${ep.episode_number}`;
        const currentWatched = history[key]?.is_watched;

        toggleWatched({
            tmdb_id: ep.show_id,
            media_type: ep.is_movie ? 'movie' : 'episode',
            season_number: ep.season_number,
            episode_number: ep.episode_number,
            is_watched: currentWatched
        });
        toast.success(currentWatched ? 'Marked as unwatched' : 'Marked as watched');
    };

    const handleRemoveShow = () => {
        if (!state.data?.show_id && !state.data?.id) return;
        const id = state.data.show_id || state.data.id;
        if (confirm("Remove this show from your library?")) {
            removeFromWatchlist(id);
            toast.success("Removed from library");
        }
    };

    const handleSearchGoogle = (query: string) => {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    };

    // --- MENU CONTENT ---

    return (
        <div 
            ref={menuRef}
            className="fixed z-[9999] min-w-[200px] bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1.5 animate-enter flex flex-col gap-1 text-sm font-medium text-zinc-300"
            style={{ top: state.y, left: state.x }}
            onClick={e => e.stopPropagation()} 
        >
            {/* --- EPISODE CONTEXT --- */}
            {state.type === 'episode' && state.data && (
                <>
                    <div className="px-2 py-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider border-b border-white/5 mb-1 truncate max-w-[220px]">
                        {state.data.show_name}
                    </div>
                    
                    <button onClick={() => { handleToggleWatched(); setState(p => ({...p, visible: false})); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-left">
                        {history[state.data.is_movie ? `movie-${state.data.show_id}` : `episode-${state.data.show_id}-${state.data.season_number}-${state.data.episode_number}`]?.is_watched ? (
                            <><EyeOff className="w-4 h-4" /> Mark Unwatched</>
                        ) : (
                            <><Check className="w-4 h-4" /> Mark Watched</>
                        )}
                    </button>

                    <button onClick={() => { handleCopy(`${state.data.show_name} - ${state.data.name}`); setState(p => ({...p, visible: false})); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-left">
                        <Copy className="w-4 h-4" /> Copy Title
                    </button>
                    
                     <button onClick={() => { handleSearchGoogle(`${state.data.show_name} ${state.data.name} review`); setState(p => ({...p, visible: false})); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-left">
                        <ExternalLink className="w-4 h-4" /> Search Reviews
                    </button>

                    <div className="h-px bg-white/10 my-1" />
                    
                    <button onClick={() => { handleRemoveShow(); setState(p => ({...p, visible: false})); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-red-400/80 transition-colors text-left">
                        <Trash2 className="w-4 h-4" /> Hide Show
                    </button>
                </>
            )}

            {/* --- SHOW/LIBRARY CONTEXT --- */}
            {state.type === 'show' && state.data && (
                 <>
                    <div className="px-2 py-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider border-b border-white/5 mb-1 truncate max-w-[220px]">
                        {state.data.name}
                    </div>
                    <button onClick={() => { handleCopy(state.data.name); setState(p => ({...p, visible: false})); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-left">
                        <Copy className="w-4 h-4" /> Copy Name
                    </button>
                    <button onClick={() => { handleSearchGoogle(`${state.data.name} ${state.data.media_type} rating`); setState(p => ({...p, visible: false})); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-left">
                        <ExternalLink className="w-4 h-4" /> Search Rating
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { handleRemoveShow(); setState(p => ({...p, visible: false})); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-red-400/80 transition-colors text-left">
                        <Trash2 className="w-4 h-4" /> Remove from Library
                    </button>
                 </>
            )}

            {/* --- GENERAL / CALENDAR BG CONTEXT --- */}
            {(state.type === 'general' || state.type === 'calendar_bg') && (
                <>
                    <div className="px-2 py-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider border-b border-white/5 mb-1">
                        Calendar Options
                    </div>
                    
                    <button 
                        onClick={() => { updateSettings({ calendarFilterTv: !settings.calendarFilterTv }); }} 
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-left group"
                    >
                        <div className="flex items-center gap-3"><Tv className="w-4 h-4" /> Show Series</div>
                        {settings.calendarFilterTv && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>

                    <button 
                        onClick={() => { updateSettings({ calendarFilterMovies: !settings.calendarFilterMovies }); }} 
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-left group"
                    >
                        <div className="flex items-center gap-3"><Film className="w-4 h-4" /> Show Movies</div>
                        {settings.calendarFilterMovies && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>

                    <div className="h-px bg-white/10 my-1" />
                    
                    <button onClick={() => window.location.reload()} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-left">
                        <Share2 className="w-4 h-4" /> Reload App
                    </button>
                </>
            )}
        </div>
    );
};

export default ContextMenu;
