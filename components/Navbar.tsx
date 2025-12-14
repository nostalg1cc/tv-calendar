import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Search, List, LogOut, Tv, Settings, Compass, User as UserIcon, Menu, MoreHorizontal, X, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import SettingsModal from './SettingsModal';

const Navbar: React.FC = () => {
  const { user, logout, setIsSearchOpen } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

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
  
  // Desktop Sidebar Item
  const DesktopNavItem = ({ to, icon: Icon, label, onClick }: { to?: string, icon: any, label: string, onClick?: () => void }) => {
      const active = to ? isActive(to) : false;
      const baseClasses = `
          group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 w-full
          ${active 
              ? 'bg-indigo-600/10 text-indigo-400 font-medium' 
              : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.03]'}
      `;

      const content = (
          <>
            <Icon className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
            <span className="text-sm">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
          </>
      );

      if (onClick) {
          return <button onClick={onClick} className={baseClasses}>{content}</button>;
      }
      return <Link to={to!} className={baseClasses}>{content}</Link>;
  };

  return (
    <>
      {/* DESKTOP SIDEBAR (Visible md+) */}
      <nav className="hidden md:flex flex-col w-64 bg-[var(--bg-main)] border-r border-[var(--border-color)] h-full shrink-0">
        
        {/* Header / Logo */}
        <div className="p-6 pb-8">
            <Link to="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/20 group-hover:scale-105 transition-transform">
                    <Tv className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-bold text-white tracking-tight leading-none">TV Calendar</h1>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Pro Edition</span>
                </div>
            </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 overflow-y-auto">
            <div className="mb-6">
                <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Menu</p>
                <DesktopNavItem to="/" icon={Calendar} label="Calendar" />
                <DesktopNavItem to="/discover" icon={Compass} label="Discover" />
                <DesktopNavItem to="/watchlist" icon={List} label="My Library" />
            </div>

            <div>
                <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tools</p>
                <DesktopNavItem icon={Search} label="Quick Search" onClick={() => setIsSearchOpen(true)} />
                <DesktopNavItem icon={Settings} label="Settings" onClick={() => setIsSettingsOpen(true)} />
            </div>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-[var(--border-color)]">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
                    {user.username.charAt(0).toUpperCase()}
                </div>
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
            </div>
        </div>
      </nav>

      {/* MOBILE BOTTOM NAV (Visible < md) - Fixed Bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-main)]/95 backdrop-blur-xl border-t border-[var(--border-color)] z-50 safe-area-bottom pb-safe transition-transform duration-300">
          <div className="flex items-center justify-between px-2 h-16">
            <MobileTab to="/" icon={Calendar} label="Calendar" active={isActive('/')} />
            <MobileTab to="/discover" icon={Compass} label="Discover" active={isActive('/discover')} />
            
            <button 
                onClick={() => setIsSearchOpen(true)}
                className="flex flex-col items-center justify-center w-16 h-full"
            >
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-1 active:scale-95 transition-transform">
                    <Search className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-medium text-slate-400">Search</span>
            </button>
            
            <MobileTab to="/watchlist" icon={List} label="Library" active={isActive('/watchlist')} />
            
            <button 
                onClick={() => setIsUserMenuOpen(true)}
                className={`flex flex-col items-center justify-center w-full max-w-[4rem] h-full gap-1 ${isUserMenuOpen ? 'text-indigo-400' : 'text-slate-500'}`}
            >
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isUserMenuOpen ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-600 bg-slate-800'}`}>
                    <span className="text-[10px] font-bold">{user.username.charAt(0).toUpperCase()}</span>
                 </div>
                 <span className="text-[10px] font-medium">Profile</span>
            </button>
          </div>
      </div>

      {/* MOBILE USER MENU DRAWER */}
      {isUserMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
              <div 
                ref={menuRef}
                className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 pb-24 shadow-2xl animate-enter"
              >
                  <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/30">
                              <span className="text-lg font-bold">{user.username.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                              <h3 className="font-bold text-white text-lg">{user.username}</h3>
                              <p className="text-zinc-500 text-xs flex items-center gap-1.5">
                                  {user.isCloud ? <div className="w-2 h-2 rounded-full bg-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                  {user.isCloud ? 'Cloud Account' : 'Local Device'}
                              </p>
                          </div>
                      </div>
                      <button 
                        onClick={() => setIsUserMenuOpen(false)}
                        className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="space-y-3">
                      <button 
                        onClick={() => { setIsUserMenuOpen(false); setIsSettingsOpen(true); }}
                        className="w-full bg-zinc-800/50 hover:bg-zinc-800 p-4 rounded-xl flex items-center gap-4 text-zinc-200 transition-colors border border-zinc-800"
                      >
                          <Settings className="w-5 h-5 text-indigo-400" />
                          <div className="flex-1 text-left font-medium">Settings & Sync</div>
                      </button>
                      
                      <button 
                        onClick={() => { window.location.reload(); }}
                        className="w-full bg-zinc-800/50 hover:bg-zinc-800 p-4 rounded-xl flex items-center gap-4 text-zinc-200 transition-colors border border-zinc-800"
                      >
                          <RefreshCw className="w-5 h-5 text-emerald-400" />
                          <div className="flex-1 text-left font-medium">Force Refresh</div>
                      </button>

                      <button 
                        onClick={logout}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 p-4 rounded-xl flex items-center gap-4 text-red-400 transition-colors border border-red-500/10"
                      >
                          <LogOut className="w-5 h-5" />
                          <div className="flex-1 text-left font-medium">Log Out</div>
                      </button>
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
        <Icon className={`w-5 h-5 ${active ? 'fill-current opacity-20' : ''}`} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[9px] font-medium">{label}</span>
    </Link>
);

export default Navbar;