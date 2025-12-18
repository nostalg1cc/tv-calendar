
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
        { id: 'v2-discover', to: '/v2/discover', icon: Compass, label: 'Discovery' },
        { id: 'v2-library', to: '/v2/library', icon: List, label: 'My Library' },
    ];

    const isFloating = mode === 'floating';
    const sidebarWidth = mode === 'collapsed' ? '56px' : '220px';
    
    // Floating style: Overlay with margin and rounded corners
    const floatingStyles = isFloating ? {
        position: 'fixed' as const,
        left: '12px',
        top: '12px',
        bottom: '12px',
        zIndex: 100,
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        transform: isHovered ? 'translateX(0)' : 'translateX(calc(-100% + 4px))',
        opacity: isHovered ? 1 : 0.4,
    } : {
        width: sidebarWidth,
        position: 'relative' as const,
        borderRight: '1px solid rgba(255,255,255,0.05)',
    };

    const NavItem: React.FC<{ to: string; icon: any; label: string; onClick?: () => void; slim?: boolean }> = ({ to, icon: Icon, label, onClick, slim = false }) => {
        const active = isActive(to);
        const isSlim = mode === 'collapsed' && !isHovered;

        return (
            <Link 
                to={onClick ? '#' : to} 
                onClick={onClick}
                className={`
                    group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 relative
                    ${active 
                        ? 'bg-indigo-600/10 text-indigo-400 font-bold' 
                        : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/[0.03]'}
                    ${isSlim ? 'justify-center' : ''}
                `}
            >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {(!isSlim || isFloating) && (
                    <span className="text-[12px] tracking-tight truncate">{label}</span>
                )}
                {active && (!isSlim || isFloating) && <ChevronRight className="ml-auto w-2.5 h-2.5 opacity-40" />}
                
                {isSlim && !isFloating && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-zinc-900 border border-white/10 text-white text-[9px] font-black uppercase rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[110] whitespace-nowrap shadow-2xl">
                        {label}
                    </div>
                )}
            </Link>
        );
    };

    return (
        <nav 
            style={{ 
                ...floatingStyles,
                width: sidebarWidth,
                transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
            className="flex flex-col bg-zinc-950/95 backdrop-blur-3xl shrink-0 overflow-visible"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header: Just Exit */}
            <div className={`p-3 flex items-center ${mode === 'collapsed' && !isHovered ? 'justify-center' : 'justify-end'}`}>
                <Link 
                    to="/" 
                    className="p-1.5 rounded-md bg-white/5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Exit V2"
                >
                    <ArrowLeft className="w-3 h-3" />
                </Link>
            </div>

            {/* Main Nav Items */}
            <div className="flex-1 px-2 space-y-0.5 mt-1">
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

                <div className="h-px bg-white/5 my-3 mx-2" />
                
                <NavItem 
                    to="/v2/notifications" 
                    icon={Bell} 
                    label="Alerts" 
                />
            </div>

            {/* Footer Area */}
            <div className="mt-auto p-2 space-y-2.5">
                {/* Settings positioned above user card as requested */}
                <NavItem 
                    to="/v2/settings" 
                    icon={Settings} 
                    label="Settings" 
                />

                {/* Mode Switcher - High Density */}
                <div className={`
                    bg-zinc-900/60 p-0.5 rounded-lg flex border border-white/5
                    ${mode === 'collapsed' && !isHovered ? 'flex-col' : ''}
                `}>
                    {modes.map(m => (
                        <button
                            key={m.id}
                            onClick={() => updateSettings({ v2SidebarMode: m.id })}
                            className={`
                                flex-1 flex items-center justify-center py-1 rounded-md transition-all
                                ${mode === m.id ? 'bg-zinc-800 text-indigo-400 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}
                            `}
                            title={m.label}
                        >
                            <m.icon className="w-2.5 h-2.5" />
                        </button>
                    ))}
                </div>

                {/* User Card - Ultra Slim */}
                <div className={`
                    bg-zinc-900/40 p-1.5 rounded-xl border border-white/5 transition-all
                    ${mode === 'collapsed' && !isHovered ? 'flex flex-col items-center' : 'flex items-center gap-2'}
                `}>
                    <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-[9px] shrink-0 border border-indigo-500/10">
                        {user?.username.charAt(0).toUpperCase()}
                    </div>
                    {(mode !== 'collapsed' || isHovered) && (
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-zinc-200 truncate leading-none mb-0.5">{user?.username}</p>
                            <p className="text-[8px] font-mono text-zinc-600 truncate uppercase tracking-tight">Active</p>
                        </div>
                    )}
                    {(mode !== 'collapsed' || isHovered) && (
                        <button 
                            onClick={logout}
                            className="p-1 text-zinc-700 hover:text-red-400 transition-colors"
                        >
                            <LogOut className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Visual handle for floating mode when slid off */}
            {isFloating && !isHovered && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 flex items-center justify-center pointer-events-none">
                    <div className="w-0.5 h-full bg-indigo-500/20 rounded-full" />
                </div>
            )}
        </nav>
    );
};

export default V2Sidebar;
