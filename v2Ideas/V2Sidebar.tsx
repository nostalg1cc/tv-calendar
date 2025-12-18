
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Calendar, Compass, List, Settings, 
    LayoutPanelLeft, Minimize2, Search
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface V2SidebarProps {
    onOpenSettings?: () => void;
}

const V2Sidebar: React.FC<V2SidebarProps> = ({ onOpenSettings }) => {
    const { settings, updateSettings, user, logout, setIsSearchOpen } = useAppContext();
    const mode = settings.v2SidebarMode || 'fixed';
    const location = useLocation();
    
    const isActive = (path: string) => location.pathname === path;

    const menuItems = [
        { id: 'v2-calendar', to: '/calendar', icon: Calendar, label: 'Calendar' },
        { id: 'v2-discover', to: '/discover', icon: Compass, label: 'Discovery' },
        { id: 'v2-library', to: '/library', icon: List, label: 'My Library' },
    ];

    const sidebarWidth = mode === 'collapsed' ? '72px' : '240px';

    const NavItem: React.FC<{ to: string; icon: any; label: string; onClick?: () => void; active?: boolean; danger?: boolean; highlight?: boolean }> = ({ to, icon: Icon, label, onClick, active: forceActive, danger, highlight }) => {
        const active = forceActive ?? isActive(to);
        const isSlim = mode === 'collapsed';

        const content = (
            <div 
                className={`
                    group flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all duration-200 relative mx-2
                    ${active 
                        ? 'text-white' 
                        : danger ? 'text-zinc-600 hover:text-red-400 hover:bg-white/[0.02]' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'}
                    ${isSlim ? 'justify-center' : ''}
                `}
            >
                <Icon className={`w-5 h-5 shrink-0 transition-transform ${active ? 'scale-110' : 'group-hover:scale-105'}`} strokeWidth={active ? 2.5 : 2} />
                
                {!isSlim && (
                    <span className={`text-[13px] tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
                )}
                
                {/* Active Indicator Line */}
                {active && !isSlim && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                )}

                {/* Collapsed Tooltip */}
                {isSlim && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[110] whitespace-nowrap shadow-xl">
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
                transition: 'width 0.4s cubic-bezier(0.2, 0, 0, 1)'
            }}
            className="flex flex-col bg-[#050505] border-r border-white/5 shrink-0 overflow-hidden h-full z-30"
        >
            {/* App Header / Logo Area */}
            <div className={`h-16 flex items-center shrink-0 border-b border-white/5 ${mode === 'collapsed' ? 'justify-center' : 'px-6'}`}>
                {mode === 'collapsed' ? (
                    <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-black font-black text-xs">TV</div>
                ) : (
                    <h1 className="text-sm font-black text-white tracking-[0.2em] uppercase">TV<span className="text-zinc-600">CAL</span></h1>
                )}
            </div>

            {/* Navigation Links */}
            <div className="flex-1 py-6 space-y-1">
                {menuItems.map(item => (
                    <NavItem 
                        key={item.id} 
                        to={item.to} 
                        icon={item.icon} 
                        label={item.label} 
                    />
                ))}
                
                <div className="my-2 mx-4 h-px bg-white/5" />
                
                <NavItem 
                    to="#" 
                    icon={Search} 
                    label="Quick Search" 
                    onClick={() => setIsSearchOpen(true)} 
                />
            </div>

            {/* Bottom Controls */}
            <div className="mt-auto border-t border-white/5 bg-zinc-950/30">
                <div className="p-2 space-y-1">
                    <NavItem 
                        to="#" 
                        icon={Settings} 
                        label="Settings" 
                        onClick={onOpenSettings}
                    />
                    
                    <button 
                        onClick={() => updateSettings({ v2SidebarMode: mode === 'fixed' ? 'collapsed' : 'fixed' })}
                        className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.04] transition-colors ${mode === 'collapsed' ? 'justify-center' : ''}`}
                    >
                        {mode === 'fixed' ? <Minimize2 className="w-5 h-5" /> : <LayoutPanelLeft className="w-5 h-5" />}
                        {mode === 'fixed' && <span className="text-[13px] font-medium">Collapse</span>}
                    </button>
                </div>

                {/* User Footer */}
                <div className="p-4 border-t border-white/5">
                    <div className={`flex items-center gap-3 ${mode === 'collapsed' ? 'justify-center' : ''}`}>
                        <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-400 shrink-0">
                            {user?.username.charAt(0).toUpperCase()}
                        </div>
                        {mode === 'fixed' && (
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-white truncate leading-none mb-1">{user?.username}</p>
                                <button onClick={logout} className="text-[10px] text-zinc-500 hover:text-red-400 font-medium uppercase tracking-wide flex items-center gap-1">
                                    Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default V2Sidebar;
