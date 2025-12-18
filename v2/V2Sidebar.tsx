
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Calendar, Compass, List, Bell, Settings, Zap, 
    ArrowLeft, LayoutPanelLeft, Minimize2, 
    LogOut, Search, ChevronRight
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { V2SidebarMode } from '../types';

const V2Sidebar: React.FC = () => {
    const { settings, updateSettings, user, logout } = useAppContext();
    const mode = (settings.v2SidebarMode === ('floating' as any) ? 'fixed' : settings.v2SidebarMode) || 'fixed';
    const location = useLocation();
    const [isHovered, setIsHovered] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const modes: { id: V2SidebarMode; label: string; icon: any }[] = [
        { id: 'fixed', label: 'Fixed', icon: LayoutPanelLeft },
        { id: 'collapsed', label: 'Slim', icon: Minimize2 },
    ];

    const menuItems = [
        { id: 'v2-calendar', to: '/v2/calendar', icon: Calendar, label: 'Calendar' },
        { id: 'v2-discover', to: '/v2/discover', icon: Compass, label: 'Discovery' },
        { id: 'v2-library', to: '/v2/library', icon: List, label: 'My Library' },
    ];

    const sidebarWidth = mode === 'collapsed' ? '64px' : '240px';

    const NavItem: React.FC<{ to: string; icon: any; label: string; onClick?: () => void }> = ({ to, icon: Icon, label, onClick }) => {
        const active = isActive(to);
        const isSlim = mode === 'collapsed';

        return (
            <Link 
                to={onClick ? '#' : to} 
                onClick={onClick}
                className={`
                    group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative
                    ${active 
                        ? 'bg-indigo-600/10 text-indigo-400 font-bold' 
                        : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/[0.03]'}
                    ${isSlim ? 'justify-center' : ''}
                `}
            >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {!isSlim && (
                    <span className="text-[13px] tracking-tight truncate">{label}</span>
                )}
                {active && !isSlim && <ChevronRight className="ml-auto w-3 h-3 opacity-40" />}
                
                {isSlim && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-zinc-900 border border-white/10 text-white text-[10px] font-black uppercase rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[110] whitespace-nowrap shadow-2xl">
                        {label}
                    </div>
                )}
            </Link>
        );
    };

    return (
        <nav 
            style={{ 
                width: sidebarWidth,
                transition: 'width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
            className="flex flex-col bg-zinc-950/95 backdrop-blur-3xl shrink-0 overflow-visible relative border-r border-white/5"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header: Just Exit */}
            <div className={`p-4 flex items-center ${mode === 'collapsed' ? 'justify-center' : 'justify-end'}`}>
                <Link 
                    to="/" 
                    className="p-2 rounded-lg bg-white/5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Exit V2"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>
            </div>

            {/* Main Nav Items */}
            <div className="flex-1 px-3 space-y-1 mt-2">
                {menuItems.map(item => (
                    <NavItem 
                        key={item.id} 
                        to={item.to} 
                        icon={item.icon} 
                        label={item.label} 
                    />
                ))}
                
                <NavItem 
                    to="#" 
                    icon={Search} 
                    label="Search" 
                    onClick={() => {}} 
                />

                <div className="h-px bg-white/5 my-4 mx-2" />
                
                <NavItem 
                    to="/v2/notifications" 
                    icon={Bell} 
                    label="Alerts" 
                />
            </div>

            {/* Footer Area */}
            <div className="mt-auto p-3 space-y-3">
                {/* Settings positioned above user card */}
                <NavItem 
                    to="/v2/settings" 
                    icon={Settings} 
                    label="Settings" 
                />

                {/* Mode Switcher */}
                <div className={`
                    bg-zinc-900/60 p-1 rounded-xl flex border border-white/5
                    ${mode === 'collapsed' ? 'flex-col' : ''}
                `}>
                    {modes.map(m => (
                        <button
                            key={m.id}
                            onClick={() => updateSettings({ v2SidebarMode: m.id })}
                            className={`
                                flex-1 flex items-center justify-center py-1.5 rounded-lg transition-all
                                ${mode === m.id ? 'bg-zinc-800 text-indigo-400 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}
                            `}
                            title={m.label}
                        >
                            <m.icon className="w-3.5 h-3.5" />
                        </button>
                    ))}
                </div>

                {/* User Card */}
                <div className={`
                    bg-zinc-900/40 p-2 rounded-2xl border border-white/5 transition-all
                    ${mode === 'collapsed' ? 'flex flex-col items-center' : 'flex items-center gap-2.5'}
                `}>
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-[10px] shrink-0 border border-indigo-500/10">
                        {user?.username.charAt(0).toUpperCase()}
                    </div>
                    {mode !== 'collapsed' && (
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-zinc-200 truncate leading-none mb-1">{user?.username}</p>
                            <p className="text-[9px] font-mono text-zinc-600 truncate uppercase tracking-tight">Active</p>
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
        </nav>
    );
};

export default V2Sidebar;
