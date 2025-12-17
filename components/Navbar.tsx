
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Compass, List, Settings, LogOut, Search, Bell, ChevronLeft, ChevronRight, Zap, PanelLeftClose, PanelLeftOpen, User as UserIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import SettingsModal from './SettingsModal';

const Navbar: React.FC = () => {
    const { user, logout, setIsSearchOpen } = useAppContext();
    const location = useLocation();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Persist sidebar state
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('tv_calendar_sidebar_collapsed') === 'true';
        } catch {
            return true; // Default collapsed for cleaner look
        }
    });

    useEffect(() => {
        localStorage.setItem('tv_calendar_sidebar_collapsed', String(isCollapsed));
    }, [isCollapsed]);

    if (!user) return null;

    const NavItem = ({ to, icon: Icon, label, exact = false, onClick }: any) => {
        const active = to ? (exact ? location.pathname === to : location.pathname.startsWith(to)) : false;
        
        const content = (
            <>
                <div className={`relative ${active ? 'text-indigo-400' : 'group-hover:scale-110 transition-transform'}`}>
                    <Icon className="w-6 h-6 stroke-[1.5]" />
                    {active && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-400 rounded-full shadow-[0_0_8px_currentColor]" />}
                </div>
                
                {!isCollapsed && (
                    <span className="font-medium text-sm tracking-wide">{label}</span>
                )}

                {/* Hover Tooltip for collapsed state */}
                {isCollapsed && (
                    <div className="absolute left-14 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                        {label}
                    </div>
                )}
            </>
        );

        if (onClick) {
            return (
                <button 
                    onClick={onClick}
                    className={`
                        w-full group flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300 relative
                        ${active ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}
                        ${isCollapsed ? 'justify-center' : ''}
                    `}
                    title={isCollapsed ? label : ''}
                >
                    {content}
                </button>
            )
        }

        return (
            <Link 
                to={to} 
                className={`
                    group flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300 relative
                    ${active ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}
                    ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? label : ''}
            >
                {content}
            </Link>
        );
    };

    return (
        <>
        {/* DESKTOP SIDEBAR */}
        <aside 
            className={`
                hidden md:flex flex-col h-full border-r border-white/5 bg-[var(--bg-panel)]/50 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-50 shrink-0
                ${isCollapsed ? 'w-20' : 'w-72'}
            `}
        >
            {/* Header / Logo */}
            <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'}`}>
                <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Zap className="w-6 h-6 text-white fill-white" />
                </div>
                {!isCollapsed && (
                    <div className="ml-3 animate-fade-in">
                        <h1 className="font-bold text-lg leading-none tracking-tight">TV Calendar</h1>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1">CLASSIC V1</p>
                    </div>
                )}
            </div>

            {/* Nav Links */}
            <nav className="flex-1 flex flex-col gap-2 px-3 py-6 overflow-y-auto scrollbar-hide">
                <NavItem to="/" icon={Calendar} label="Calendar" exact />
                <NavItem to="/discover" icon={Compass} label="Discover" />
                <NavItem to="/watchlist" icon={List} label="My Library" />
                
                <div className="mt-4 pt-4 border-t border-white/5">
                    <NavItem icon={Search} label="Search" onClick={() => setIsSearchOpen(true)} />
                    <NavItem to="/reminders" icon={Bell} label="Reminders" />
                </div>

                <div className="mt-auto">
                    <div className="w-full h-px bg-white/5 mb-4" />
                    
                    <NavItem icon={Settings} label="Settings" onClick={() => setIsSettingsOpen(true)} />

                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`
                            w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300
                            text-zinc-500 hover:text-white hover:bg-white/5
                            ${isCollapsed ? 'justify-center' : ''}
                        `}
                    >
                        {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                        {!isCollapsed && <span className="font-medium text-sm">Collapse</span>}
                    </button>
                </div>
            </nav>

            {/* User Footer */}
            <div className="p-3 border-t border-white/5">
                <div className={`flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 ${isCollapsed ? 'justify-center p-0 w-12 h-12 rounded-full mx-auto' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {user?.username?.[0].toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{user?.username}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{user?.isCloud ? 'Cloud Sync' : 'Local'}</p>
                        </div>
                    )}
                    {!isCollapsed && (
                        <button onClick={logout} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                            <LogOut className="w-4 h-4 text-zinc-500" />
                        </button>
                    )}
                </div>
            </div>
        </aside>

        {/* MOBILE NAV (V2 Pill Style) */}
        <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-2.5 flex items-center gap-6 shadow-2xl shadow-black/50 ring-1 ring-white/5 safe-area-bottom">
                <MobileNavItem to="/" icon={Calendar} active={location.pathname === '/'} />
                <MobileNavItem to="/discover" icon={Compass} active={location.pathname === '/discover'} />
                
                {/* Center Action Button */}
                <button 
                    onClick={() => setIsSearchOpen(true)}
                    className="relative -mt-8 bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/40 border border-indigo-400/20 active:scale-90 transition-transform"
                >
                    <Search className="w-5 h-5 text-white" />
                </button>

                <MobileNavItem to="/watchlist" icon={List} active={location.pathname === '/watchlist'} />
                
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className={`relative flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-300 text-zinc-500 hover:text-zinc-300`}
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
};

const MobileNavItem = ({ to, icon: Icon, active }: any) => (
    <Link 
        to={to} 
        className={`
            relative flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-300
            ${active ? 'text-indigo-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}
        `}
    >
        <Icon className={`w-5 h-5 ${active ? 'fill-current stroke-[2.5px]' : 'stroke-2'}`} />
        {active && <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-indigo-400" />}
    </Link>
);

export default Navbar;
