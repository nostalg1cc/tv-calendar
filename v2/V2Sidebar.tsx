
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
        { id: 'v2-calendar', to: '/v2/calendar', icon: Calendar, label: 'Calendar' },
        { id: 'v2-discover', to: '/v2/discover', icon: Compass, label: 'Discover' },
        { id: 'v2-library', to: '/v2/library', icon: List, label: 'My Library' },
    ];

    // Sidebar Widths
    const sidebarWidth = mode === 'collapsed' ? '64px' : '240px';
    
    // Floating logic: Slide off almost entirely (only a 4px strip remains)
    const isFloating = mode === 'floating';
    const floatClasses = isFloating 
        ? `fixed left-0 top-0 bottom-0 z-[100] shadow-2xl shadow-black/50 border-r border-white/10 backdrop-blur-3xl transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] ${isHovered ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%-4px)] opacity-60'}` 
        : `relative border-r border-white/5`;

    const NavItem: React.FC<{ to: string; icon: any; label: string; onClick?: () => void }> = ({ to, icon: Icon, label, onClick }) => {
        const active = isActive(to);
        const content = (
            <div 
                className={`
                    group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative
                    ${active 
                        ? 'bg-indigo-600/10 text-indigo-400 font-medium' 
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]'}
                    ${mode === 'collapsed' ? 'justify-center' : ''}
                `}
            >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {mode !== 'collapsed' && (
                    <span className="text-[13px] tracking-tight">{label}</span>
                )}
                {active && mode !== 'collapsed' && <div className="ml-auto w-1 h-1 rounded-full bg-indigo-500" />}
                
                {mode === 'collapsed' && (
                    <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-white/10 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-[110] whitespace-nowrap shadow-xl">
                        {label}
                    </div>
                )}
            </div>
        );

        if (onClick) return <button onClick={onClick} className="w-full text-left">{content}</button>;
        return <Link to={to} className="block">{content}</Link>;
    };

    return (
        <nav 
            style={{ width: isFloating ? '240px' : sidebarWidth }}
            className={`
                flex flex-col bg-zinc-950 transition-all duration-500 ease-in-out shrink-0 overflow-visible
                ${floatClasses}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header: Simplified Exit */}
            <div className={`p-4 flex items-center ${mode === 'collapsed' ? 'justify-center' : 'justify-end'}`}>
                <Link 
                    to="/" 
                    className="p-1.5 rounded-lg bg-white/5 text-zinc-600 hover:text-white hover:bg-white/10 transition-all"
                    title="Exit V2"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto hide-scrollbar">
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
                    label="Quick Search" 
                    onClick={() => {}} 
                />

                <div className={`h-px bg-white/5 my-4 ${mode === 'collapsed' ? 'mx-1' : 'mx-2'}`} />
                
                <NavItem 
                    to="/v2/notifications" 
                    icon={Bell} 
                    label="Notifications" 
                />
            </div>

            {/* Footer Area */}
            <div className="mt-auto p-3 space-y-3">
                {/* Settings Item - Placed above User info per request */}
                <NavItem 
                    to="/v2/settings" 
                    icon={Settings} 
                    label="Settings" 
                />

                {/* Mode Switcher - Compact */}
                <div className={`
                    bg-zinc-900/40 p-0.5 rounded-xl flex border border-white/5
                    ${mode === 'collapsed' ? 'flex-col' : ''}
                `}>
                    {modes.map(m => (
                        <button
                            key={m.id}
                            onClick={() => updateSettings({ v2SidebarMode: m.id })}
                            className={`
                                flex-1 flex items-center justify-center py-1.5 rounded-lg transition-all duration-200
                                ${mode === m.id ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}
                            `}
                            title={m.label}
                        >
                            <m.icon className="w-3 h-3" />
                        </button>
                    ))}
                </div>

                {/* User Card - Slimmer */}
                <div className={`
                    bg-zinc-900/40 p-2.5 rounded-2xl border border-white/5 shadow-lg transition-all duration-300
                    ${mode === 'collapsed' ? 'flex flex-col items-center justify-center' : 'flex items-center gap-3'}
                `}>
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 border border-indigo-500/10">
                        {user?.username.charAt(0).toUpperCase()}
                    </div>
                    {mode !== 'collapsed' && (
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-zinc-300 truncate leading-tight">{user?.username}</p>
                            <p className="text-[9px] font-mono text-zinc-600 truncate uppercase tracking-tighter">Verified</p>
                        </div>
                    )}
                    {mode !== 'collapsed' && (
                        <button 
                            onClick={logout}
                            className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Trigger Strip for Floating Mode */}
            {isFloating && !isHovered && (
                <div className="absolute right-0 top-0 bottom-0 w-1 flex items-center justify-center pointer-events-none">
                    <div className="w-0.5 h-12 bg-white/10 rounded-full" />
                </div>
            )}
        </nav>
    );
};

export default V2Sidebar;
