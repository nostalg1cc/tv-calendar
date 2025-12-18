
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Calendar, Compass, List, Settings, 
    ArrowLeft, LayoutPanelLeft, Minimize2, 
    LogOut, Search
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { V2SidebarMode } from '../types';

interface V2SidebarProps {
    onOpenSettings?: () => void;
}

const V2Sidebar: React.FC<V2SidebarProps> = ({ onOpenSettings }) => {
    const { settings, updateSettings, user, logout } = useAppContext();
    const mode = settings.v2SidebarMode || 'fixed';
    const location = useLocation();
    
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

    const sidebarWidth = mode === 'collapsed' ? '72px' : '260px';

    const NavItem: React.FC<{ to: string; icon: any; label: string; onClick?: () => void; active?: boolean; danger?: boolean }> = ({ to, icon: Icon, label, onClick, active: forceActive, danger }) => {
        const active = forceActive ?? isActive(to);
        const isSlim = mode === 'collapsed';

        const content = (
            <div 
                className={`
                    group flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 relative
                    ${active 
                        ? 'bg-indigo-600/15 text-indigo-400 font-bold shadow-lg shadow-indigo-500/5' 
                        : danger ? 'text-red-900/40 hover:text-red-400 hover:bg-red-500/5' : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/[0.04]'}
                    ${isSlim ? 'justify-center' : ''}
                `}
            >
                <Icon className={`w-[20px] h-[20px] shrink-0 ${active ? 'text-indigo-400' : danger ? 'text-red-950' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {!isSlim && (
                    <span className="text-[14px] tracking-tight truncate">{label}</span>
                )}
                {active && !isSlim && <div className="ml-auto w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
                
                {isSlim && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 border border-white/10 text-white text-[11px] font-black uppercase tracking-wider rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[110] whitespace-nowrap shadow-2xl">
                        {label}
                    </div>
                )}
            </div>
        );

        if (onClick) return <button onClick={onClick} className="w-full text-left outline-none">{content}</button>;
        return <Link to={to} className="block outline-none">{content}</Link>;
    };

    return (
        <nav 
            style={{ 
                width: sidebarWidth,
                transition: 'width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
            className="flex flex-col bg-zinc-950/95 backdrop-blur-3xl shrink-0 overflow-visible relative border-r border-white/5"
        >
            {/* Top Navigation */}
            <div className="flex-1 px-3 space-y-1.5 mt-6">
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
            </div>

            {/* Bottom Area Reordered */}
            <div className="mt-auto p-3 space-y-2">
                
                {/* Mode Switcher */}
                <div className={`
                    bg-zinc-900/30 p-1.5 rounded-2xl flex border border-white/5 shadow-inner mb-4
                    ${mode === 'collapsed' ? 'flex-col gap-1' : 'gap-1'}
                `}>
                    {modes.map(m => (
                        <button
                            key={m.id}
                            onClick={() => updateSettings({ v2SidebarMode: m.id })}
                            className={`
                                flex-1 flex items-center justify-center py-2 rounded-xl transition-all
                                ${mode === m.id 
                                    ? 'bg-zinc-800 text-indigo-400 shadow-md ring-1 ring-white/5' 
                                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]'}
                            `}
                            title={m.label}
                        >
                            <m.icon className="w-4 h-4" />
                        </button>
                    ))}
                </div>

                {/* User Info Section (Minimal, no background) */}
                <div className={`
                    bg-transparent p-2.5 rounded-2xl transition-all group/user
                    ${mode === 'collapsed' ? 'flex flex-col items-center' : 'flex items-center gap-3'}
                `}>
                    <div className="w-9 h-9 flex items-center justify-center font-black text-lg shrink-0 text-white select-none">
                        {user?.username.charAt(0).toUpperCase()}
                    </div>
                    {mode !== 'collapsed' && (
                        <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-zinc-100 truncate leading-none">{user?.username}</p>
                        </div>
                    )}
                    {mode !== 'collapsed' && (
                        <button 
                            onClick={logout}
                            className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Bottom Tools */}
                <div className="space-y-0.5">
                    <NavItem 
                        to="#" 
                        icon={Settings} 
                        label="Settings" 
                        onClick={onOpenSettings}
                    />

                    <NavItem 
                        to="/" 
                        icon={ArrowLeft} 
                        label="Exit V2" 
                    />
                </div>
            </div>
        </nav>
    );
};

export default V2Sidebar;
