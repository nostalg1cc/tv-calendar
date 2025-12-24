
import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { 
    Check, Eye, EyeOff, Share2, Tv, Film, Trash2, 
    Copy, Filter, ExternalLink, ChevronRight, Sparkles, MonitorPlay, Calendar, Image as ImageIcon
} from 'lucide-react';
import { Episode } from '../types';
import toast from 'react-hot-toast';

type ContextType = 'episode' | 'show' | 'general' | 'calendar_bg';

interface ContextState {
    visible: boolean;
    x: number;
    y: number;
    type: ContextType;
    data: any;
}

interface ContextMenuProps {
    onEditPoster?: (showId: number, mediaType: 'tv' | 'movie') => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ onEditPoster }) => {
    const { 
        toggleWatched, 
        history, 
        removeFromWatchlist, 
        settings, 
        updateSettings,
    } = useStore();
    
    const [state, setState] = useState<ContextState>({
        visible: false,
        x: 0,
        y: 0,
        type: 'general',
        data: null
    });
    
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            
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

            // Bounds checking
            let x = e.pageX;
            let y = e.pageY;
            
            // Basic viewport collision
            if (x + 220 > window.innerWidth) x = window.innerWidth - 230;
            if (y + 300 > window.innerHeight) y = window.innerHeight - 310;
            
            setState({ visible: true, x, y, type, data });
            setActiveSubmenu(null); // Reset submenus on open
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
        const id = state.data?.show_id || state.data?.id;
        if (!id) return;
        if (confirm("Remove this show from your library?")) {
            removeFromWatchlist(id);
            toast.success("Removed from library");
        }
    };

    const handleSearchGoogle = (query: string) => {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    };

    const triggerPosterEdit = () => {
        if (!onEditPoster) return;
        const id = state.data.show_id || state.data.id;
        const type = state.data.is_movie ? 'movie' : (state.data.media_type || 'tv');
        onEditPoster(id, type === 'movie' ? 'movie' : 'tv');
    };

    // --- COMPONENTS ---

    const MenuItem = ({ icon: Icon, label, onClick, danger = false, rightElement }: any) => (
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); setState(p => ({...p, visible: false})); }} 
            className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left group
                ${danger 
                    ? 'text-red-400 hover:bg-red-500/10' 
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'}
            `}
        >
            <div className="flex items-center gap-3">
                {Icon && <Icon className="w-4 h-4 opacity-70 group-hover:opacity-100" />}
                <span className="text-xs font-bold tracking-wide">{label}</span>
            </div>
            {rightElement}
        </button>
    );

    const SubMenuTrigger = ({ icon: Icon, label, id, children }: any) => (
        <div 
            className="relative w-full group/submenu"
            onMouseEnter={() => setActiveSubmenu(id)}
            onMouseLeave={() => setActiveSubmenu(null)}
        >
            <button 
                className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left
                    ${activeSubmenu === id ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/10 hover:text-white'}
                `}
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon className="w-4 h-4 opacity-70" />}
                    <span className="text-xs font-bold tracking-wide">{label}</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-50" />
            </button>

            {/* Submenu Dropdown with Safe Area Bridge */}
            {activeSubmenu === id && (
                <div 
                    className="absolute left-full top-[-4px] pl-2 w-48 z-[10000] h-[calc(100%+8px)] flex items-start"
                >
                    <div className="w-full bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1.5 animate-menu-bounce origin-top-left">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );

    const Separator = () => <div className="h-px bg-white/5 my-1" />;
    const Header = ({ text }: { text: string }) => (
        <div className="px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-1 truncate max-w-[200px] select-none">
            {text}
        </div>
    );

    return (
        <>
            {/* Styles for the bouncy animation */}
            <style>{`
                @keyframes menuBounce {
                    0% { transform: scale(0.9) opacity(0); }
                    60% { transform: scale(1.02) opacity(1); }
                    100% { transform: scale(1) opacity(1); }
                }
                .animate-menu-bounce {
                    animation: menuBounce 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>

            <div 
                ref={menuRef}
                className="fixed z-[9999] min-w-[220px] bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-menu-bounce origin-top-left"
                style={{ top: state.y, left: state.x }}
                onClick={e => e.stopPropagation()} 
            >
                {/* --- EPISODE CONTEXT --- */}
                {state.type === 'episode' && state.data && (
                    <>
                        <Header text={state.data.show_name} />
                        
                        <MenuItem 
                            icon={history[state.data.is_movie ? `movie-${state.data.show_id}` : `episode-${state.data.show_id}-${state.data.season_number}-${state.data.episode_number}`]?.is_watched ? EyeOff : Check}
                            label={history[state.data.is_movie ? `movie-${state.data.show_id}` : `episode-${state.data.show_id}-${state.data.season_number}-${state.data.episode_number}`]?.is_watched ? "Mark Unwatched" : "Mark Watched"}
                            onClick={handleToggleWatched}
                        />
                        <MenuItem 
                            icon={ImageIcon} 
                            label="Change Poster" 
                            onClick={triggerPosterEdit} 
                        />
                        <MenuItem 
                            icon={Copy} 
                            label="Copy Title" 
                            onClick={() => handleCopy(`${state.data.show_name} - ${state.data.name}`)} 
                        />
                        <MenuItem 
                            icon={ExternalLink} 
                            label="Search Reviews" 
                            onClick={() => handleSearchGoogle(`${state.data.show_name} ${state.data.name} review`)} 
                        />

                        <Separator />
                        
                        <MenuItem 
                            icon={Trash2} 
                            label="Hide Show" 
                            danger 
                            onClick={handleRemoveShow} 
                        />
                    </>
                )}

                {/* --- SHOW/LIBRARY CONTEXT --- */}
                {state.type === 'show' && state.data && (
                    <>
                        <Header text={state.data.name} />
                        
                        <MenuItem 
                            icon={ImageIcon} 
                            label="Change Poster" 
                            onClick={triggerPosterEdit} 
                        />
                        <MenuItem 
                            icon={Copy} 
                            label="Copy Name" 
                            onClick={() => handleCopy(state.data.name)} 
                        />
                        <MenuItem 
                            icon={ExternalLink} 
                            label="Check Rating" 
                            onClick={() => handleSearchGoogle(`${state.data.name} ${state.data.media_type} review`)} 
                        />
                         <MenuItem 
                            icon={Sparkles} 
                            label="Similar Shows" 
                            onClick={() => handleSearchGoogle(`${state.data.name} similar shows`)} 
                        />

                        <Separator />
                        
                        <MenuItem 
                            icon={Trash2} 
                            label="Remove from Library" 
                            danger 
                            onClick={handleRemoveShow} 
                        />
                    </>
                )}

                {/* --- GENERAL / CALENDAR BG CONTEXT --- */}
                {(state.type === 'general' || state.type === 'calendar_bg') && (
                    <>
                        <Header text="Calendar" />
                        
                        <SubMenuTrigger icon={Filter} label="View Options" id="view-options">
                            <Header text="Display Filters" />
                            <MenuItem 
                                icon={Tv} 
                                label="TV Series" 
                                onClick={() => updateSettings({ calendarFilterTv: !settings.calendarFilterTv })}
                                rightElement={settings.calendarFilterTv && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                            />
                            <MenuItem 
                                icon={Film} 
                                label="Movies" 
                                onClick={() => updateSettings({ calendarFilterMovies: !settings.calendarFilterMovies })}
                                rightElement={settings.calendarFilterMovies && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                            />
                            <Separator />
                            <MenuItem 
                                icon={MonitorPlay} 
                                label="Digital Only" 
                                onClick={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })}
                                rightElement={settings.hideTheatrical && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                            />
                        </SubMenuTrigger>

                        <MenuItem 
                            icon={Calendar} 
                            label="Today" 
                            onClick={() => {
                                const todayEl = document.getElementById('v2-today-anchor');
                                if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }} 
                        />

                        <Separator />
                        
                        <MenuItem 
                            icon={Share2} 
                            label="Reload App" 
                            onClick={() => window.location.reload()} 
                        />
                    </>
                )}
            </div>
        </>
    );
};

export default ContextMenu;
