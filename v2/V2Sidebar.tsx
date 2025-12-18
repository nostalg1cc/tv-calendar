
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Calendar, Compass, List, Bell, Settings, Zap, 
    ArrowLeft, LayoutPanelLeft, Minimize2, Maximize2, 
    User, LogOut, ChevronRight, LayoutGrid, Search
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { V2SidebarMode } from '../types';

const V2Sidebar: React.FC = () => {
    const { settings, updateSettings, user, logout } = useAppContext();
    const mode = settings.v2SidebarMode || 'fixed';
    const location = useLocation();
    const [isHovered, setIsHovered] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const modes: { id: V2SidebarMode; label: string; icon: any }[] = [
        { id: 'fixed', label: 'Fixed', icon: LayoutPanelLeft },
        { id: 'collapsed', label: 'Slim', icon: Minimize2 },
        { id: 'floating', label: 'Float', icon: Zap },
    ];

    const menuItems = [
        { id: 'v2-home', to: '/v2', icon: LayoutGrid, label: 'Dashboard' },
        { id: 'v2-calendar', to: '/v2/calendar', icon: Calendar, label: 'Calendar' },
        { id: 'v2-discover', to: '/v2/discover', icon: Compass, label: 'Discover' },
        { id: 'v2-library', to: '/v2/library', icon: List, label: 'My Library' },
    ];

    // Sidebar Style Calculations
    const sidebarWidth = mode === 'collapsed' ? '84px' : '280px';
    
    // Floating logic
    const isFloating = mode === 'floating';
    const floatClasses = isFloating 
        ? `fixed left-4 top-4 bottom-4 z-[100] rounded-[2.5rem] shadow-2xl shadow-black/50 border border-white/10 backdrop-blur-3xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isHovered ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%-2rem)] opacity-40 hover:opacity-100'}` 
        : `relative border-r border-white/5`;

    const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
        const active = isActive(to);
        return (
            <Link 
                to={to}
                className={`
                    group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative
                    ${active 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                        : 'text-zinc-500 hover:text-white hover:bg-white/5'}
                    ${mode === 'collapsed' ? 'justify-center' : ''}
                `}
            >
                <Icon className={`w-6 h-6 shrink-0 ${active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {mode !== 'collapsed' && (
                    <span className="text-sm font-semibold tracking-tight">{label}</span>
                )}
                {active && mode !== 'collapsed' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                
                {/* Tooltip for Collapsed */}
                {mode === 'collapsed' && (
                    <div className="absolute left-full ml-4 px-3 py-2 bg-zinc-900 border border-white/10 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[110] whitespace-nowrap shadow-xl">
                        {label}
                    </div>
                )}
            </Link>
        );
    };

    return (
        <nav 
            style={{ width: isFloating ? '280px' : sidebarWidth }}
            className={`
                flex flex-col bg-zinc-950 transition-all duration-500 ease-in-out shrink-0 overflow-visible
                ${floatClasses}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header: Branding & Toggle */}
            <div className={`p-6 flex items-center gap-4 ${mode === 'collapsed' ? 'flex-col p-4' : 'justify-between'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 group cursor-pointer active:scale-95 transition-transform">
                        <Zap className="w-6 h-6 text-white group-hover:animate-pulse" />
                    </div>
                    {mode !== 'collapsed' && (
                        <div className="flex flex-col leading-none">
                            <span className="text-lg font-black tracking-tighter text-white">TV CAL</span>
                            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Version 2.0</span>
                        </div>
                    )}
                </div>

                <Link 
                    to="/" 
                    className={`p-2 rounded-xl bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 transition-all ${mode === 'collapsed' ? 'mt-2' : ''}`}
                    title="Exit V2"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto hide-scrollbar">
                {/* Fix: Line 106 - pass props explicitly to NavItem to avoid extra properties from spread */}
                {menuItems.map(item => (
                    <NavItem 
                        key={item.id} 
                        to={item.to} 
                        icon={item.icon} 
                        label={item.label} 
                    />
                ))}
                
                <div className={`h-px bg-white/5 my-6 ${mode === 'collapsed' ? 'mx-2' : 'mx-4'}`} />
                
                <button 
                    onClick={() => {}} // Global search coming soon
                    className={`
                        group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative w-full
                        text-zinc-500 hover:text-white hover:bg-white/5
                        ${mode === 'collapsed' ? 'justify-center' : ''}
                    `}
                >
                    <Search className="w-6 h-6 shrink-0 text-zinc-500 group-hover:text-zinc-300" />
                    {mode !== 'collapsed' && <span className="text-sm font-semibold tracking-tight">Search</span>}
                </button>
            </div>

            {/* Footer: Mode Switches & User */}
            <div className="mt-auto p-4 space-y-4">
                {/* Mode Switcher */}
                <div className={`
                    bg-zinc-900/50 p-1 rounded-2xl flex border border-white/5
                    ${mode === 'collapsed' ? 'flex-col gap-1' : ''}
                `}>
                    {modes.map(m => (
                        <button
                            key={m.id}
                            onClick={() => updateSettings({ v2SidebarMode: m.id })}
                            className={`
                                flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-300
                                ${mode === m.id ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-600 hover:text-zinc-400'}
                            `}
                            title={m.label}
                        >
                            <m.icon className="w-4 h-4" />
                            {mode !== 'collapsed' && <span className="text-[10px] font-bold uppercase tracking-widest">{m.label}</span>}
                        </button>
                    ))}
                </div>

                {/* User Card */}
                <div className={`
                    bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 rounded-3xl border border-white/5 shadow-xl transition-all duration-500
                    ${mode === 'collapsed' ? 'flex flex-col items-center justify-center p-2' : 'flex items-center gap-4'}
                `}>
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-500/10">
                        {user?.username.charAt(0).toUpperCase()}
                    </div>
                    {mode !== 'collapsed' && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{user?.username}</p>
                            <p className="text-[9px] font-mono text-zinc-600 truncate uppercase">Premium</p>
                        </div>
                    )}
                    {mode !== 'collapsed' && (
                        <button 
                            onClick={logout}
                            className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Trigger Strip for Floating Mode */}
            {isFloating && !isHovered && (
                <div className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-pointer pointer-events-auto">
                    <ChevronRight className="w-4 h-4 text-white/20" />
                </div>
            )}
        </nav>
    );
};

export default V2Sidebar;
