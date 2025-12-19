
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Compass, List, Settings, Search, User, LogOut, X, LayoutPanelLeft, Minimize2 } from 'lucide-react';
import { useStore } from '../store';

interface V2SidebarProps {
    onOpenSettings?: () => void;
    onOpenSearch?: () => void;
}

const V2Sidebar: React.FC<V2SidebarProps> = ({ onOpenSettings, onOpenSearch }) => {
    const { user, logout, settings, updateSettings } = useStore();
    const mode = settings.v2SidebarMode || 'fixed';
    const location = useLocation();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    
    const isActive = (path: string) => location.pathname.includes(path);

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
            
            {/* Mobile Dock logic remains similar but simplified */}
            <div className="md:hidden fixed bottom-6 left-0 right-0 z-[80] px-6 pointer-events-none flex justify-center pb-[env(safe-area-inset-bottom,0px)]">
                 <div className="pointer-events-auto w-full max-w-sm bg-black/60 backdrop-blur-3xl border border-white/10 rounded-full px-2 py-3 flex items-center justify-between shadow-2xl">
                    <Link to="/calendar" className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl ${isActive('/calendar') ? 'text-indigo-500' : 'text-zinc-500'}`}><Calendar className="w-6 h-6" /></Link>
                    <Link to="/discover" className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl ${isActive('/discover') ? 'text-indigo-500' : 'text-zinc-500'}`}><Compass className="w-6 h-6" /></Link>
                    <button onClick={onOpenSearch} className="flex flex-col items-center justify-center w-14 h-12 rounded-xl text-zinc-500"><Search className="w-6 h-6" /></button>
                    <Link to="/library" className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl ${isActive('/library') ? 'text-indigo-500' : 'text-zinc-500'}`}><List className="w-6 h-6" /></Link>
                    <button onClick={logout} className="flex flex-col items-center justify-center w-14 h-12 rounded-xl text-zinc-500"><LogOut className="w-6 h-6" /></button>
                 </div>
            </div>
        </>
    );
};

export default V2Sidebar;
