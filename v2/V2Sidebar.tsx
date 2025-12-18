
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Calendar, Compass, List, Settings, 
    LayoutPanelLeft, Minimize2, Search, User, LogOut, X, RefreshCw, ChevronRight
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface V2SidebarProps {
    onOpenSettings?: () => void;
    onOpenSearch?: () => void;
}

const V2Sidebar: React.FC<V2SidebarProps> = ({ onOpenSettings, onOpenSearch }) => {
    const { settings, updateSettings, user, logout, hardRefreshCalendar } = useAppContext();
    const mode = settings.v2SidebarMode || 'fixed';
    const location = useLocation();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    
    const isActive = (path: string) => location.pathname.includes(path);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        if (isUserMenuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isUserMenuOpen]);

    const menuItems = [
        { id: 'v2-calendar', to: '/calendar', icon: Calendar, label: 'Calendar' },
        { id: 'v2-discover', to: '/discover', icon: Compass, label: 'Discovery' },
        { id: 'v2-library', to: '/library', icon: List, label: 'Library' },
    ];

    const sidebarWidth = mode === 'collapsed' ? '72px' : '240px';

    // -- Desktop Nav Item --
    const NavItem: React.FC<{ to: string; icon: any; label: string; onClick?: () => void; active?: boolean }> = ({ to, icon: Icon, label, onClick, active: forceActive }) => {
        const active = forceActive ?? isActive(to);
        const isSlim = mode === 'collapsed';

        const content = (
            <div 
                className={`
                    group flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all duration-200 relative mx-2
                    ${active 
                        ? 'text-white' 
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'}
                    ${isSlim ? 'justify-center' : ''}
                `}
            >
                <Icon className={`w-5 h-5 shrink-0 transition-transform ${active ? 'scale-110' : 'group-hover:scale-105'}`} strokeWidth={active ? 2.5 : 2} />
                
                {!isSlim && (
                    <span className={`text-[13px] tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
                )}
                
                {active && !isSlim && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                )}

                {isSlim && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[110] whitespace-nowrap shadow-xl">
                        {label}
                    </div>
                )}
            </div>
        );

        if (onClick) return <button onClick={onClick} className="w-full text-left outline-none">{content}</button>;
        return <Link to={to} className="block outline-none">{content}</Link>;
    };

    return (
        <>
            {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
            <nav 
                style={{ 
                    width: sidebarWidth,
                    transition: 'width 0.4s cubic-bezier(0.2, 0, 0, 1)'
                }}
                className="hidden md:flex flex-col bg-[#050505] border-r border-white/5 shrink-0 overflow-hidden h-full z-30"
            >
                {/* Header */}
                <div className={`h-16 flex items-center shrink-0 border-b border-white/5 ${mode === 'collapsed' ? 'justify-center' : 'px-6'}`}>
                    {mode === 'collapsed' ? (
                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-black font-black text-xs">TV</div>
                    ) : (
                        <h1 className="text-sm font-black text-white tracking-[0.2em] uppercase">TV<span className="text-zinc-600">CAL</span></h1>
                    )}
                </div>

                {/* Links */}
                <div className="flex-1 py-6 space-y-1">
                    {menuItems.map(item => (
                        <NavItem key={item.id} to={item.to} icon={item.icon} label={item.label} />
                    ))}
                    <div className="my-2 mx-4 h-px bg-white/5" />
                    <NavItem to="#" icon={Search} label="Quick Search" onClick={onOpenSearch} />
                </div>

                {/* Footer Controls */}
                <div className="mt-auto border-t border-white/5 bg-zinc-950/30">
                    <div className="p-2 space-y-1">
                        <NavItem to="#" icon={Settings} label="Settings" onClick={onOpenSettings} />
                        <button 
                            onClick={() => updateSettings({ v2SidebarMode: mode === 'fixed' ? 'collapsed' : 'fixed' })}
                            className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.04] transition-colors ${mode === 'collapsed' ? 'justify-center' : ''}`}
                        >
                            {mode === 'fixed' ? <Minimize2 className="w-5 h-5" /> : <LayoutPanelLeft className="w-5 h-5" />}
                            {mode === 'fixed' && <span className="text-[13px] font-medium">Collapse</span>}
                        </button>
                    </div>
                    <div className="p-4 border-t border-white/5">
                        <div className={`flex items-center gap-3 ${mode === 'collapsed' ? 'justify-center' : ''}`}>
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-400 shrink-0">
                                {user?.username.charAt(0).toUpperCase()}
                            </div>
                            {mode === 'fixed' && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-white truncate leading-none mb-1">{user?.username}</p>
                                    <button onClick={logout} className="text-[10px] text-zinc-500 hover:text-red-400 font-medium uppercase tracking-wide flex items-center gap-1">Log Out</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* MOBILE FLOATING DOCK (Hidden on Desktop) */}
            <div className="md:hidden fixed bottom-6 left-0 right-0 z-[80] px-6 pointer-events-none flex justify-center pb-[env(safe-area-inset-bottom,0px)]">
                <div className="pointer-events-auto w-full max-w-sm bg-black/60 backdrop-blur-3xl backdrop-saturate-150 border border-white/10 rounded-full px-2 py-3 flex items-center justify-between shadow-2xl shadow-black/50">
                    {/* Calendar */}
                    <Link 
                        to="/calendar" 
                        className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-300 active:scale-90 ${isActive('/calendar') ? 'text-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Calendar className={`w-6 h-6 ${isActive('/calendar') ? 'fill-current' : 'stroke-2'}`} />
                        <span className="text-[9px] font-medium mt-1">Calendar</span>
                    </Link>

                    {/* Discover */}
                    <Link 
                        to="/discover" 
                        className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-300 active:scale-90 ${isActive('/discover') ? 'text-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Compass className={`w-6 h-6 ${isActive('/discover') ? 'fill-current' : 'stroke-2'}`} />
                        <span className="text-[9px] font-medium mt-1">Discover</span>
                    </Link>

                    {/* Search (Standard) */}
                    <button 
                        onClick={onOpenSearch}
                        className="flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-300 active:scale-90 text-zinc-500 hover:text-zinc-300"
                    >
                        <Search className="w-6 h-6 stroke-2" />
                        <span className="text-[9px] font-medium mt-1">Search</span>
                    </button>

                    {/* Library */}
                    <Link 
                        to="/library" 
                        className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-300 active:scale-90 ${isActive('/library') ? 'text-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <List className={`w-6 h-6 ${isActive('/library') ? 'fill-current' : 'stroke-2'}`} />
                        <span className="text-[9px] font-medium mt-1">Library</span>
                    </Link>

                    {/* User */}
                    <button 
                        onClick={() => setIsUserMenuOpen(true)}
                        className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-300 active:scale-90 ${isUserMenuOpen ? 'text-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <User className={`w-6 h-6 ${isUserMenuOpen ? 'fill-current' : 'stroke-2'}`} />
                        <span className="text-[9px] font-medium mt-1">Me</span>
                    </button>
                </div>
            </div>

            {/* MOBILE USER DRAWER */}
            {isUserMenuOpen && (
                <div className="md:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-fade-in flex flex-col justify-end">
                    <div 
                        ref={drawerRef}
                        className="bg-[#09090b] border-t border-white/10 rounded-t-[2.5rem] p-6 pb-[calc(env(safe-area-inset-bottom,20px)+2rem)] shadow-2xl animate-enter"
                    >
                        <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6" />
                        
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-600/20">
                                {user?.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">{user?.username}</h3>
                                <p className="text-sm text-zinc-500 font-medium">{user?.isCloud ? 'Cloud Account' : 'Local Device'}</p>
                            </div>
                            <button onClick={() => setIsUserMenuOpen(false)} className="ml-auto p-3 rounded-full bg-zinc-900 text-zinc-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <button 
                                onClick={() => { setIsUserMenuOpen(false); onOpenSettings && onOpenSettings(); }}
                                className="w-full flex items-center gap-4 p-4 bg-zinc-900/50 hover:bg-zinc-900 rounded-2xl border border-white/5 transition-colors group"
                            >
                                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="text-sm font-bold text-white">Settings</div>
                                    <div className="text-xs text-zinc-500">Preferences, Sync & Account</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-600" />
                            </button>

                            <button 
                                onClick={() => { if(confirm("Force Refresh Calendar?")) hardRefreshCalendar(); }}
                                className="w-full flex items-center gap-4 p-4 bg-zinc-900/50 hover:bg-zinc-900 rounded-2xl border border-white/5 transition-colors group"
                            >
                                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                    <RefreshCw className="w-5 h-5" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="text-sm font-bold text-white">Sync Data</div>
                                    <div className="text-xs text-zinc-500">Refresh content from TMDB</div>
                                </div>
                            </button>

                            <button 
                                onClick={logout}
                                className="w-full flex items-center gap-4 p-4 bg-red-500/5 hover:bg-red-500/10 rounded-2xl border border-red-500/10 transition-colors group mt-4"
                            >
                                <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="text-sm font-bold text-red-400">Log Out</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default V2Sidebar;
