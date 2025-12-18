
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Search, List, LogOut, Tv, Settings, Compass, User as UserIcon, Menu, MoreHorizontal, X, RefreshCw, Bell, PanelLeftClose, PanelLeftOpen, Zap, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import SettingsModal from './SettingsModal';

const Navbar: React.FC = () => {
  const { user, logout, setIsSearchOpen, settings } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
      try {
          return localStorage.getItem('tv_calendar_sidebar_collapsed') === 'true';
      } catch {
          return false;
      }
  });

  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      localStorage.setItem('tv_calendar_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;
  const isPillLayout = settings.mobileNavLayout === 'pill';
  
  const DesktopNavItem = ({ to, icon: Icon, label, onClick, isNew }: { to?: string, icon: any, label: string, onClick?: () => void, isNew?: boolean }) => {
      const active = to ? isActive(to) : false;
      const baseClasses = `
          group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 w-full relative
          ${active 
              ? 'bg-indigo-600/10 text-indigo-400 font-medium' 
              : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.03]'}
          ${isCollapsed ? 'justify-center' : ''}
      `;

      const content = (
          <>
            <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
            {!isCollapsed && <span className="text-sm truncate">{label}</span>}
            {isNew && !isCollapsed && (
              <span className="ml-2 px-1.5 py-0.5 bg-indigo-500 text-[8px] font-bold text-white rounded uppercase tracking-tighter animate-pulse">New</span>
            )}
            {active && !isCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
            {active && isCollapsed && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
          </>
      );

      if (onClick) {
          return (
            <button onClick={onClick} className={baseClasses} title={isCollapsed ? label : ''}>
                {content}
            </button>
          );
      }
      return (
        <Link to={to!} className={baseClasses} title={isCollapsed ? label : ''}>
            {content}
        </Link>
      );
  };

  return (
    <>
      <nav className={`hidden md:flex flex-col bg-[var(--bg-main)] border-r border-[var(--border-color)] h-full shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex-1 px-4 overflow-y-auto pt-8 scrollbar-hide">
            <div className="mb-6">
                {!isCollapsed && <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 transition-opacity">Menu</p>}
                <DesktopNavItem to="/" icon={Calendar} label="Calendar" />
                <DesktopNavItem to="/discover" icon={Compass} label="Discover" />
                <DesktopNavItem to="/watchlist" icon={List} label="My Library" />
                <DesktopNavItem to="/v2" icon={Zap} label="Try V2 (Preview)" isNew={true} />
            </div>

            <div>
                {!isCollapsed && <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 transition-opacity">Tools</p>}
                <DesktopNavItem icon={Search} label="Quick Search" onClick={() => setIsSearchOpen(true)} />
                <DesktopNavItem to="/reminders" icon={Bell} label="Reminders" />
                <DesktopNavItem icon={Settings} label="Settings" onClick={() => setIsSettingsOpen(true)} />
            </div>
        </div>

        <div className="p-4 border-t border-[var(--border-color)] flex flex-col gap-2">
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="self-end p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5 mb-2"
                title={isCollapsed ? "Expand" : "Collapse"}
            >
                {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            <div className={`flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-[var(--border-color)] ${isCollapsed ? 'justify-center p-0 border-none bg-transparent' : ''}`}>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {user.username.charAt(0).toUpperCase()}
                </div>
                {!isCollapsed && (
                    <>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user.username}</p>
                            <p className="text-[10px] text-slate-500 truncate">{user.isCloud ? 'Cloud Sync' : 'Local Mode'}</p>
                        </div>
                        <button 
                            onClick={logout}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        </div>
      </nav>

      {!isPillLayout ? (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-main)]/95 backdrop-blur-xl border-t border-[var(--border-color)] z-50 transition-transform duration-300 safe-area-bottom">
              <div className="flex items-center justify-between px-2 h-16">
                <MobileTab to="/" icon={Calendar} label="Calendar" active={isActive('/')} />
                <MobileTab to="/v2" icon={Zap} label="V2" active={isActive('/v2')} />
                
                <button onClick={() => setIsSearchOpen(true)} className="flex flex-col items-center justify-center w-16 h-full">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-1 active:scale-95 transition-transform">
                        <Search className="w-5 h-5" />
                    </div>
                </button>
                
                <MobileTab to="/watchlist" icon={List} label="Library" active={isActive('/watchlist')} />
                
                <button onClick={() => setIsUserMenuOpen(true)} className={`flex flex-col items-center justify-center w-full max-w-[4rem] h-full gap-1 ${isUserMenuOpen ? 'text-indigo-400' : 'text-slate-500'}`}>
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isUserMenuOpen ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-600 bg-slate-800'}`}>
                        <span className="text-[10px] font-bold">{user.username.charAt(0).toUpperCase()}</span>
                     </div>
                     <span className="text-[10px] font-medium">Menu</span>
                </button>
              </div>
          </div>
      ) : (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center px-4 mb-3 pb-[env(safe-area-inset-bottom,12px)]">
              <div className="pointer-events-auto bg-zinc-950/70 backdrop-blur-3xl border border-white/10 rounded-full px-7 py-3.5 flex items-center gap-6 shadow-2xl shadow-black/50 safe-area-bottom ring-1 ring-white/5">
                  <Link to="/" className={`relative flex flex-col items-center justify-center w-10 h-10 active:scale-90 transition-all duration-300 ${isActive('/') ? 'text-indigo-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><Calendar className={`w-6 h-6 ${isActive('/') ? 'stroke-[2.5px]' : 'stroke-2'}`} /></Link>
                  <Link to="/v2" className={`relative flex flex-col items-center justify-center w-10 h-10 active:scale-90 transition-all duration-300 ${isActive('/v2') ? 'text-indigo-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><Zap className={`w-6 h-6 ${isActive('/v2') ? 'stroke-[2.5px]' : 'stroke-2'}`} /></Link>
                  <button onClick={() => setIsSearchOpen(true)} className="relative flex flex-col items-center justify-center w-10 h-10 active:scale-90 transition-all duration-300 text-zinc-500 hover:text-zinc-300"><Search className="w-6 h-6 stroke-2" /></button>
                  <Link to="/watchlist" className={`relative flex flex-col items-center justify-center w-10 h-10 active:scale-90 transition-all duration-300 ${isActive('/watchlist') ? 'text-indigo-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><List className={`w-6 h-6 ${isActive('/watchlist') ? 'stroke-[2.5px]' : 'stroke-2'}`} /></Link>
                  <button onClick={() => setIsUserMenuOpen(true)} className={`relative flex flex-col items-center justify-center w-10 h-10 active:scale-90 transition-all duration-300 ${isUserMenuOpen ? 'text-indigo-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><UserIcon className={`w-6 h-6 ${isUserMenuOpen ? 'stroke-[2.5px]' : 'stroke-2'}`} /></button>
              </div>
          </div>
      )}

      {isUserMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
              <div ref={menuRef} className="bg-zinc-900 border-t border-zinc-800 rounded-t-[2.5rem] p-8 pb-28 shadow-2xl animate-enter">
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/30 font-black text-xl">{user.username.charAt(0).toUpperCase()}</div>
                          <div>
                              <h3 className="font-black text-white text-xl uppercase tracking-tighter">{user.username}</h3>
                              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">{user.isCloud ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />}{user.isCloud ? 'Cloud Sync' : 'Local Mode'}</p>
                          </div>
                      </div>
                      <button onClick={() => setIsUserMenuOpen(false)} className="p-3 bg-white/5 rounded-full text-zinc-400"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                      <Link to="/discover" onClick={() => setIsUserMenuOpen(false)} className="bg-zinc-800/50 p-4 rounded-2xl flex flex-col gap-3 border border-white/5"><Compass className="w-5 h-5 text-indigo-400" /><span className="text-xs font-black uppercase tracking-widest text-zinc-300">Discovery</span></Link>
                      <Link to="/reminders" onClick={() => setIsUserMenuOpen(false)} className="bg-zinc-800/50 p-4 rounded-2xl flex flex-col gap-3 border border-white/5"><Bell className="w-5 h-5 text-amber-400" /><span className="text-xs font-black uppercase tracking-widest text-zinc-300">Reminders</span></Link>
                  </div>

                  <div className="space-y-2">
                      <button onClick={() => { setIsUserMenuOpen(false); setIsSettingsOpen(true); }} className="w-full bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex items-center justify-between group transition-all"><div className="flex items-center gap-4"><Settings className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400" /><span className="text-sm font-bold text-zinc-300 group-hover:text-white">Settings</span></div><ChevronRight className="w-4 h-4 text-zinc-700" /></button>
                      <button onClick={logout} className="w-full bg-red-500/10 hover:bg-red-500/20 p-4 rounded-2xl flex items-center justify-between group transition-all"><div className="flex items-center gap-4"><LogOut className="w-5 h-5 text-red-900 group-hover:text-red-400" /><span className="text-sm font-bold text-red-900 group-hover:text-red-400">Log Out</span></div><ChevronRight className="w-4 h-4 text-red-950" /></button>
                  </div>
              </div>
          </div>
      )}
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

const MobileTab = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
    <Link to={to} className={`flex flex-col items-center justify-center w-full max-w-[4rem] h-full gap-1 active:scale-95 transition-transform ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-400 stroke-[2.5px]' : 'stroke-2'}`} />
        <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </Link>
);

export default Navbar;
