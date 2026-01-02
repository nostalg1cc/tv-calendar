
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Compass, List, Settings, Search, LogOut, LayoutPanelLeft, Minimize2, Globe, MoreHorizontal, ChevronRight, User, MessageSquare, Zap, Database, Cloud } from 'lucide-react';
import { useStore } from '../store';

interface V2SidebarProps {
    onOpenSettings?: () => void;
    onOpenSearch?: () => void; // Deprecated but kept for compatibility interface if needed
}

const V2Sidebar: React.FC<V2SidebarProps> = ({ onOpenSettings }) => {
    const { user, logout, settings, updateSettings } = useStore();
    const mode = settings.v2SidebarMode || 'fixed';
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const inactivityTimer = useRef<any>(null);
    
    const isActive = (path: string) => location.pathname.includes(path);

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

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

    const NavItem: React.FC<{ to: string; icon: any; label: string; onClick?: () => void }> = ({ to, icon: Icon, label, onClick }) => {
        const active = isActive(to);
        const isSlim = mode === 'collapsed';

        const content = (
            <div className={`group flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all duration-200 relative mx-2 ${active ? 'text-text-main' : 'text-text-muted hover:text-text-main hover:bg-white/[0.04]'} ${isSlim ? 'justify-center' : ''}`}>
                <Icon className={`w-5 h-5 shrink-0 transition-transform ${active ? 'scale-110 text-indigo-500' : 'group-hover:scale-105'}`} />
                {!isSlim && <span className={`text-[13px] tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>}
                {active && !isSlim && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.5)]" />}
            </div>
        );

        if (onClick) return <button onClick={onClick} className="w-full text-left outline-none">{content}</button>;
        return <Link to={to} className="block outline-none">{content}</Link>;
    };

    const MobileNavItem = ({ to, icon: Icon, label, onClick }: { to?: string, icon: any, label: string, onClick?: () => void }) => {
        const active = to ? isActive(to) : false; // Only check link activation if 'to' is present
        
        const content = (
            <div 
                className={`
                    flex items-center justify-center gap-2 rounded-full transition-all duration-300 overflow-hidden whitespace-nowrap
                    ${active ? 'bg-white text-black px-4 py-2.5' : 'text-zinc-500 w-10 h-10 hover:text-zinc-300'}
                `}
            >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'fill-current' : 'stroke-[2.5px]'}`} />
                {active && <span className="text-xs font-bold">{label}</span>}
            </div>
        );

        if (onClick) return <button onClick={onClick}>{content}</button>;
        return <Link to={to!}>{content}</Link>;
    };

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <nav style={{ width: mode === 'collapsed' ? '72px' : '240px', transition: 'width 0.4s' }} className="hidden md:flex flex-col bg-panel border-r border-border shrink-0 h-full z-30">
                <div className={`h-16 flex items-center shrink-0 border-b border-border ${mode === 'collapsed' ? 'justify-center' : 'px-6'}`}>
                    {mode === 'collapsed' ? <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-black font-black text-xs">TV</div> : <h1 className="text-sm font-black text-text-main tracking-[0.2em] uppercase">TV<span className="text-text-muted">CAL</span></h1>}
                </div>

                <div className="flex-1 py-6 space-y-1">
                    <NavItem to="/calendar" icon={Calendar} label="Calendar" />
                    <NavItem to="/discover" icon={Compass} label="Discovery" />
                    <NavItem to="/library" icon={List} label="Library" />
                    <div className="my-2 mx-4 h-px bg-border" />
                    <NavItem to="/ipoint" icon={Globe} label="IPoint Tool" />
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
                        pointer-events-auto bg-black/90 backdrop-blur-3xl border border-white/10 rounded-full p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] flex items-center gap-1 ring-1 ring-white/5
                        transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-[150%] opacity-0 scale-95'}
                    `}
                 >
                    <MobileNavItem to="/calendar" icon={Calendar} label="Calendar" />
                    <MobileNavItem to="/discover" icon={Compass} label="Discover" />
                    <MobileNavItem to="/library" icon={List} label="Library" />
                    
                    <div className="w-px h-6 bg-white/10 mx-1" />
                    
                    <button 
                        onClick={() => setIsMenuOpen(true)} 
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isMenuOpen ? 'bg-white/20 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <MoreHorizontal className="w-5 h-5 stroke-[2.5px]" />
                    </button>
                 </div>
            </div>

            {/* MOBILE MENU DRAWER (Replacing the old search/misc functionality) */}
            {isMenuOpen && (
                <>
                    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md md:hidden animate-fade-in" onClick={() => setIsMenuOpen(false)} />
                    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#09090b] border-t border-white/10 rounded-t-[2.5rem] p-6 pb-28 md:hidden animate-slide-up shadow-2xl">
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8" />
                        
                        <div className="flex items-center gap-4 mb-8 bg-white/5 p-4 rounded-3xl border border-white/5">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-indigo-900/30">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-base">{user?.username}</h3>
                                <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                    {user?.is_cloud ? <Cloud className="w-3 h-3 text-emerald-500" /> : <Database className="w-3 h-3 text-orange-500" />}
                                    {user?.is_cloud ? 'Cloud Synced' : 'Local Account'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <Link 
                                to="/ipoint" 
                                onClick={() => setIsMenuOpen(false)} 
                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-white">IPoint Tool</span>
                            </Link>

                            <button 
                                onClick={() => { setIsMenuOpen(false); onOpenSettings?.(); }} 
                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-white">Settings</span>
                            </button>
                        </div>

                        <button onClick={logout} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/10">
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
