
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Compass, List, Settings, LogOut, ChevronLeft, ChevronRight, LayoutGrid, Zap } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const V2Sidebar: React.FC = () => {
    const { user, logout } = useAppContext();
    const location = useLocation();
    
    // Independent collapsed state for V2
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('tv_calendar_v2_sidebar_collapsed') === 'true';
        } catch {
            return true; // Default collapsed for cleaner look
        }
    });

    useEffect(() => {
        localStorage.setItem('tv_calendar_v2_sidebar_collapsed', String(isCollapsed));
    }, [isCollapsed]);

    const NavItem = ({ to, icon: Icon, label, exact = false }: any) => {
        const active = exact ? location.pathname === to : location.pathname.startsWith(to);
        
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
            </Link>
        );
    };

    return (
        <aside 
            className={`
                hidden md:flex flex-col h-full border-r border-white/5 bg-[var(--bg-panel)]/50 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-50
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
                        <h1 className="font-bold text-lg leading-none tracking-tight">TV Cal <span className="text-indigo-400">v2</span></h1>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1">BETA BUILD</p>
                    </div>
                )}
            </div>

            {/* Nav Links */}
            <nav className="flex-1 flex flex-col gap-2 px-3 py-6">
                <NavItem to="/v2" icon={Calendar} label="Calendar" exact />
                
                {/* These link back to V1 for now, but in V2 layout style */}
                <NavItem to="/discover" icon={Compass} label="Discover" />
                <NavItem to="/watchlist" icon={List} label="My Library" />
                
                <div className="mt-auto">
                    <div className="w-full h-px bg-white/5 mb-4" />
                    
                    {/* Return to V1 */}
                    <Link 
                        to="/"
                        className={`
                            group flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300
                            text-zinc-600 hover:text-zinc-300 hover:bg-white/5
                            ${isCollapsed ? 'justify-center' : ''}
                        `}
                        title="Return to Classic"
                    >
                        <LayoutGrid className="w-5 h-5" />
                        {!isCollapsed && <span className="font-medium text-xs">Return to Classic</span>}
                    </Link>

                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`
                            w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300
                            text-zinc-500 hover:text-white hover:bg-white/5
                            ${isCollapsed ? 'justify-center' : ''}
                        `}
                    >
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
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
    );
};

export default V2Sidebar;
