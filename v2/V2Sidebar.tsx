
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Compass, List, Settings, Search, LogOut, LayoutPanelLeft, Minimize2, Globe, MoreHorizontal, ChevronRight, User } from 'lucide-react';
import { useStore } from '../store';

interface V2SidebarProps {
    onOpenSettings?: () => void;
    onOpenSearch?: () => void;
}

const V2Sidebar: React.FC<V2SidebarProps> = ({ onOpenSettings, onOpenSearch }) => {
    const { user, logout, settings, updateSettings } = useStore();
    const mode = settings.v2SidebarMode || 'fixed';
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const inactivityTimer = useRef<any>(null);
    
    const isActive = (path: string) => location.pathname.includes(path);

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

    // Handle Scroll Visibility
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;
            // Only care about vertical scrolling on main containers
            if (!target || target.tagName === 'HTML') return; 
            
            const currentY = target.scrollTop;
            const diff = currentY - lastScrollY.current;

            // Ignore small movements (bounce)
            if (Math.abs(diff) < 10) return;

            if (diff > 0 && currentY > 50) {
                // Scrolling Down -> Hide
                setIsVisible(false);
            } else if (diff < 0) {
                // Scrolling Up -> Show
                setIsVisible(true);
            }

            lastScrollY.current = currentY;

            // Reset inactivity timer
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            inactivityTimer.current = setTimeout(() => {
                setIsVisible(true);
            }, 2000);
        };

        // Capture scroll events from any element (since we use overflow containers)
        window.addEventListener('scroll', handleScroll, { capture: true });
        return () => {
            window.removeEventListener('scroll', handleScroll, { capture: true });
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        };
    }, []);

    const NavItem: React.FC<{ to: string; icon: any; label: string; onClick?: () => void }> = ({ to, icon: Icon, label, onClick }) => {
        const active = isActive(to);
        const isSlim = mode === 'collapsed';

        const content = (
            <div className={`group flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all duration-200 relative mx-2 ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'} ${isSlim ? 'justify-center' : ''}`}>
                <Icon className={`w-5 h-5 shrink-0 transition-transform ${active ? 'scale-110' : 'group-hover:scale-105'}`} />
                {!isSlim && <span className={`text-[13px] tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>}
                {active && !isSlim && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.5)]" />}
            </div>
        );

        if (onClick) return <button onClick={onClick} className="w-full text-left outline-none">{content}</button>;
        return <Link to={to} className="block outline-none">{content}</Link>;
    };

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <nav style={{ width: mode === 'collapsed' ? '72px' : '240px', transition: 'width 0.4s' }} className="hidden md:flex flex-col bg-[#050505] border-r border-white/5 shrink-0 h-full z-30">
                <div className={`h-16 flex items-center shrink-0 border-b border-white/5 ${mode === 'collapsed' ? 'justify-center' : 'px-6'}`}>
                    {mode === 'collapsed' ? <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-black font-black text-xs">TV</div> : <h1 className="text-sm font-black text-white tracking-[0.2em] uppercase">TV<span className="text-zinc-600">CAL</span></h1>}
                </div>

                <div className="flex-1 py-6 space-y-1">
                    <NavItem to="/calendar" icon={Calendar} label="Calendar" />
                    <NavItem to="/discover" icon={Compass} label="Discovery" />
                    <NavItem to="/library" icon={List} label="Library" />
                    <div className="my-2 mx-4 h-px bg-white/5" />
                    <NavItem to="#" icon={Search} label="Search" onClick={onOpenSearch} />
                    <NavItem to="/ipoint" icon={Globe} label="IPoint Tool" />
                </div>

                <div className="mt-auto border-t border-white/5 bg-zinc-950/30">
                    <div className="p-2 space-y-1">
                        <NavItem to="#" icon={Settings} label="Settings" onClick={onOpenSettings} />
                        <button onClick={() => updateSettings({ v2SidebarMode: mode === 'fixed' ? 'collapsed' : 'fixed' })} className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.04] transition-colors ${mode === 'collapsed' ? 'justify-center' : ''}`}>
                            {mode === 'fixed' ? <Minimize2 className="w-5 h-5" /> : <LayoutPanelLeft className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="p-4 border-t border-white/5">
                        <div className={`flex items-center gap-3 ${mode === 'collapsed' ? 'justify-center' : ''}`}>
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-400 shrink-0">{user?.username?.charAt(0).toUpperCase()}</div>
                            {mode === 'fixed' && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-white truncate mb-1">{user?.username}</p>
                                    <button onClick={logout} className="text-[10px] text-zinc-500 hover:text-red-400 font-medium uppercase tracking-wide">Log Out</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
            
            {/* MOBILE NAVIGATION PILL */}
            <div className="md:hidden fixed bottom-6 left-0 right-0 z-[80] flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom,0px)] px-4">
                 <div 
                    className={`
                        pointer-events-auto bg-[#09090b]/90 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center justify-between gap-6 sm:gap-8 ring-1 ring-white/5 min-w-[320px] max-w-sm
                        transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-[150%] opacity-0 scale-95'}
                    `}
                 >
                    <Link to="/calendar" className={`transition-all duration-300 ${isActive('/calendar') ? 'text-white scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <Calendar className="w-6 h-6 stroke-[2.5px]" />
                    </Link>
                    <Link to="/discover" className={`transition-all duration-300 ${isActive('/discover') ? 'text-white scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <Compass className="w-6 h-6 stroke-[2.5px]" />
                    </Link>
                    
                    {/* Search - Standard Styling */}
                    <button onClick={onOpenSearch} className="text-zinc-500 hover:text-white transition-all active:scale-95">
                        <Search className="w-6 h-6 stroke-[2.5px]" />
                    </button>
                    
                    <Link to="/library" className={`transition-all duration-300 ${isActive('/library') ? 'text-white scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <List className="w-6 h-6 stroke-[2.5px]" />
                    </Link>
                    
                    {/* Menu Trigger */}
                    <button onClick={() => setIsMenuOpen(true)} className={`transition-all duration-300 ${isMenuOpen ? 'text-white scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <MoreHorizontal className="w-6 h-6 stroke-[2.5px]" />
                    </button>
                 </div>
            </div>

            {/* MOBILE MENU DRAWER (Improved Design) */}
            {isMenuOpen && (
                <>
                    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:hidden animate-fade-in" onClick={() => setIsMenuOpen(false)} />
                    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#09090b] border-t border-white/10 rounded-t-[2.5rem] p-6 pb-28 md:hidden animate-slide-up shadow-[0_-20px_60px_rgba(0,0,0,0.9)]">
                        <div className="w-12 h-1.5 bg-zinc-800/50 rounded-full mx-auto mb-8" />
                        
                        {/* Profile Card */}
                        <div className="flex items-center gap-5 mb-8 bg-zinc-900/40 p-5 rounded-3xl border border-white/5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/20">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-lg">{user?.username}</h3>
                                <p className="text-xs text-zinc-500 font-medium">{user?.is_cloud ? 'Cloud Synced' : 'Local Account'}</p>
                            </div>
                            <button onClick={() => { setIsMenuOpen(false); onOpenSettings?.(); }} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white">
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tools Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <Link to="/ipoint" onClick={() => setIsMenuOpen(false)} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-800 transition-colors">
                                <Globe className="w-6 h-6 text-blue-400" />
                                <span className="text-xs font-bold text-zinc-300">IPoint</span>
                            </Link>
                            <button onClick={() => { setIsMenuOpen(false); onOpenSettings?.(); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-800 transition-colors">
                                <User className="w-6 h-6 text-purple-400" />
                                <span className="text-xs font-bold text-zinc-300">Profile</span>
                            </button>
                        </div>

                        {/* Logout */}
                        <button onClick={logout} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/10">
                            <LogOut className="w-5 h-5" />
                            <span className="font-bold text-sm">Sign Out</span>
                        </button>
                    </div>
                </>
            )}
        </>
    );
};

export default V2Sidebar;
