
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, Compass, GalleryHorizontalEnd, Settings, LogOut, LayoutPanelLeft, Minimize2, Earth, MoreHorizontal, User, Database, Cloud, RefreshCw, X, ChevronRight } from 'lucide-react';
import { useStore } from '../store';

interface V2SidebarProps {
    onOpenSettings?: () => void;
    onOpenSearch?: () => void;
}

const V2Sidebar: React.FC<V2SidebarProps> = ({ onOpenSettings }) => {
    const { user, logout, settings, updateSettings, isSyncing, triggerCloudSync } = useStore();
    const mode = settings.v2SidebarMode || 'fixed';
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const inactivityTimer = useRef<any>(null);
    
    const isActive = (path: string) => location.pathname.includes(path);

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

    // Scroll detection for hiding nav
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;
            if (!target || target.tagName === 'HTML') return; 
            
            const currentY = target.scrollTop;
            const diff = currentY - lastScrollY.current;

            if (Math.abs(diff) < 10) return;

            if (diff > 0 && currentY > 50) {
                setIsVisible(false);
            } else if (diff < 0) {
                setIsVisible(true);
            }

            lastScrollY.current = currentY;

            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            inactivityTimer.current = setTimeout(() => {
                setIsVisible(true);
            }, 2000);
        };

        window.addEventListener('scroll', handleScroll, { capture: true });
        return () => {
            window.removeEventListener('scroll', handleScroll, { capture: true });
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        };
    }, []);

    // Desktop Nav Item
    const NavItem: React.FC<{ to: string; icon: any; label: string; onClick?: () => void }> = ({ to, icon: Icon, label, onClick }) => {
        const active = isActive(to);
        const isSlim = mode === 'collapsed';

        const content = (
            <div className={`group flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all duration-200 relative mx-2 ${active ? 'text-text-main' : 'text-text-muted hover:text-text-main hover:bg-white/[0.04]'} ${isSlim ? 'justify-center' : ''}`}>
                <Icon className={`w-5 h-5 shrink-0 transition-transform ${active ? 'scale-110 text-indigo-500 stroke-[2.5px]' : 'group-hover:scale-105 stroke-2'}`} />
                {!isSlim && <span className={`text-[13px] tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>}
                {active && !isSlim && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.5)]" />}
            </div>
        );

        if (onClick) return <button onClick={onClick} className="w-full text-left outline-none">{content}</button>;
        return <Link to={to} className="block outline-none">{content}</Link>;
    };

    // Mobile Nav Item with smooth expansion
    const MobileNavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
        const active = isActive(to);
        
        return (
            <Link to={to} className="relative z-10 outline-none tap-highlight-transparent">
                <div 
                    className={`
                        flex items-center justify-center gap-2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                        ${active ? 'bg-white text-black px-5 py-3' : 'text-zinc-500 w-12 h-12 hover:text-zinc-300'}
                    `}
                >
                    <Icon className={`w-6 h-6 flex-shrink-0 stroke-[2px] ${active ? 'text-black' : ''}`} />
                    
                    <span className={`
                        text-sm font-bold overflow-hidden whitespace-nowrap transition-all duration-500 ease-out
                        ${active ? 'max-w-[100px] opacity-100 ml-1' : 'max-w-0 opacity-0'}
                    `}>
                        {label}
                    </span>
                </div>
            </Link>
        );
    };

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <nav style={{ width: mode === 'collapsed' ? '72px' : '240px', transition: 'width 0.4s' }} className="hidden md:flex flex-col bg-panel border-r border-border shrink-0 h-full z-30">
                <div className={`h-16 flex items-center shrink-0 border-b border-border ${mode === 'collapsed' ? 'justify-center' : 'px-6'}`}>
                    {mode === 'collapsed' ? <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-black font-black text-xs">TV</div> : <h1 className="text-sm font-black text-text-main tracking-[0.2em] uppercase">TV<span className="text-text-muted">CAL</span></h1>}
                </div>

                <div className="flex-1 py-6 space-y-1">
                    <NavItem to="/calendar" icon={CalendarDays} label="Calendar" />
                    <NavItem to="/discover" icon={Compass} label="Discovery" />
                    <NavItem to="/library" icon={GalleryHorizontalEnd} label="Library" />
                    <div className="my-2 mx-4 h-px bg-border" />
                    <NavItem to="/ipoint" icon={Earth} label="IPoint Tool" />
                </div>

                <div className="mt-auto border-t border-border bg-background/50">
                    <div className="p-2 space-y-1">
                        <NavItem to="#" icon={Settings} label="Settings" onClick={onOpenSettings} />
                        <button onClick={() => updateSettings({ v2SidebarMode: mode === 'fixed' ? 'collapsed' : 'fixed' })} className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-text-muted hover:text-text-main hover:bg-white/[0.04] transition-colors ${mode === 'collapsed' ? 'justify-center' : ''}`}>
                            {mode === 'fixed' ? <Minimize2 className="w-5 h-5" /> : <LayoutPanelLeft className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="p-4 border-t border-border">
                        <div className={`flex items-center gap-3 ${mode === 'collapsed' ? 'justify-center' : ''}`}>
                            <div className="w-8 h-8 rounded bg-card flex items-center justify-center font-bold text-xs text-text-muted shrink-0 border border-border">{user?.username?.charAt(0).toUpperCase()}</div>
                            {mode === 'fixed' && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-text-main truncate mb-1">{user?.username}</p>
                                    <button onClick={logout} className="text-[10px] text-text-muted hover:text-red-400 font-medium uppercase tracking-wide">Log Out</button>
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
                        pointer-events-auto bg-[#09090b]/90 backdrop-blur-3xl border border-white/10 rounded-full p-2 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)] flex items-center gap-1 ring-1 ring-white/5
                        transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-[150%] opacity-0 scale-95'}
                    `}
                 >
                    <MobileNavItem to="/calendar" icon={CalendarDays} label="Calendar" />
                    <MobileNavItem to="/discover" icon={Compass} label="Discover" />
                    <MobileNavItem to="/library" icon={GalleryHorizontalEnd} label="Library" />
                    
                    <div className="w-px h-8 bg-white/10 mx-2" />
                    
                    <button 
                        onClick={() => setIsMenuOpen(true)} 
                        className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${isMenuOpen ? 'bg-white/20 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <MoreHorizontal className="w-6 h-6 stroke-[2px]" />
                    </button>
                 </div>
            </div>

            {/* MOBILE MENU DRAWER */}
            {isMenuOpen && (
                <>
                    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md md:hidden animate-fade-in" onClick={() => setIsMenuOpen(false)} />
                    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#09090b] border-t border-white/10 rounded-t-[2.5rem] p-6 pb-32 md:hidden animate-slide-up shadow-2xl">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-8" />
                        
                        <div className="flex items-center justify-between mb-8">
                             <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-900/30">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{user?.username}</h3>
                                    <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5 font-medium">
                                        {user?.is_cloud ? <Cloud className="w-3 h-3 text-emerald-500" /> : <Database className="w-3 h-3 text-orange-500" />}
                                        {user?.is_cloud ? 'Cloud Synced' : 'Local Account'}
                                    </p>
                                </div>
                             </div>
                             <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-zinc-900 rounded-full text-zinc-500 hover:text-white">
                                 <X className="w-6 h-6" />
                             </button>
                        </div>

                        <div className="space-y-3">
                            <Link 
                                to="/ipoint" 
                                onClick={() => setIsMenuOpen(false)} 
                                className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                        <Earth className="w-5 h-5 stroke-2" />
                                    </div>
                                    <span className="text-sm font-bold text-white">IPoint Intelligence</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-600" />
                            </Link>

                            <button 
                                onClick={() => { setIsMenuOpen(false); onOpenSettings?.(); }} 
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                        <Settings className="w-5 h-5 stroke-2" />
                                    </div>
                                    <span className="text-sm font-bold text-white">Settings</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-600" />
                            </button>
                            
                             <button 
                                onClick={() => { setIsMenuOpen(false); if(user?.is_cloud) triggerCloudSync(); else window.location.reload(); }} 
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                        <RefreshCw className={`w-5 h-5 stroke-2 ${isSyncing ? 'animate-spin' : ''}`} />
                                    </div>
                                    <span className="text-sm font-bold text-white">{isSyncing ? 'Syncing...' : 'Force Sync'}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-600" />
                            </button>
                        </div>

                        <button 
                            onClick={logout} 
                            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/10 mt-6 active:scale-95"
                        >
                            <LogOut className="w-5 h-5 stroke-2" />
                            <span className="font-bold text-sm">Sign Out</span>
                        </button>
                    </div>
                </>
            )}
        </>
    );
};

export default V2Sidebar;
