import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Search, List, LogOut, Tv, Settings, Compass, User } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import SettingsModal from './SettingsModal';

const Navbar: React.FC = () => {
  const { user, logout, setIsSearchOpen } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;
  
  // Desktop Sidebar Item Component
  const SidebarItem = ({ to, icon: Icon, label, onClick }: { to?: string, icon: any, label: string, onClick?: () => void }) => {
      const active = to ? isActive(to) : false;
      
      const content = (
        <div className={`
            relative p-3 rounded-xl transition-all duration-200 group flex items-center justify-center
            ${active 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'}
        `}>
            <Icon className="w-6 h-6" />
            
            {/* Tooltip */}
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-black/80 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-white/10 z-50 backdrop-blur-md">
                {label}
            </div>
        </div>
      );

      if (onClick) {
          return <button onClick={onClick} className="w-full flex justify-center">{content}</button>;
      }
      
      return <Link to={to!} className="w-full flex justify-center">{content}</Link>;
  };

  return (
    <>
      {/* DESKTOP SIDEBAR - Transparent */}
      <nav className="hidden md:flex flex-col w-20 bg-transparent backdrop-blur-2xl border-r border-white/5 h-screen fixed left-0 top-0 z-50 items-center py-6 gap-8">
        
        {/* Logo */}
        <Link to="/" className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 hover:bg-indigo-500/20 transition-colors">
            <Tv className="w-8 h-8" />
        </Link>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col gap-4 w-full px-2">
            <SidebarItem to="/" icon={Calendar} label="Calendar" />
            <SidebarItem to="/discover" icon={Compass} label="Discover" />
            <SidebarItem icon={Search} label="Search" onClick={() => setIsSearchOpen(true)} />
            <SidebarItem to="/watchlist" icon={List} label="Watchlist" />
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-4 w-full px-2 mb-4">
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="relative p-1 rounded-full group flex justify-center w-full"
            >
                <div className="w-10 h-10 rounded-full bg-transparent border border-white/10 flex items-center justify-center text-slate-300 font-bold group-hover:border-indigo-500 transition-colors">
                    {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-black/80 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-white/10 backdrop-blur-md">
                    Settings
                </div>
            </button>

            <SidebarItem icon={LogOut} label="Logout" onClick={logout} />
        </div>
      </nav>

      {/* MOBILE TOP BAR (Logo + Settings) - Transparent */}
      <div className="md:hidden flex items-center justify-between p-4 bg-transparent backdrop-blur-xl sticky top-0 z-40 border-b border-white/5">
           <Link to="/" className="flex items-center gap-2 text-indigo-500 font-bold text-lg tracking-tight">
                <div className="p-1 bg-indigo-500/10 rounded-lg">
                  <Tv className="w-5 h-5" />
                </div>
                <span className="text-white">TV <span className="text-indigo-400">Calendar</span></span>
           </Link>
           <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-8 h-8 rounded-full bg-transparent border border-white/5 flex items-center justify-center"
           >
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">
                    {user.username.charAt(0).toUpperCase()}
                </div>
           </button>
      </div>
        
      {/* MOBILE FLOATING PILL NAV (Bottom) - Transparent */}
      <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none safe-area-bottom">
          <div className="bg-transparent backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl shadow-black/50 p-1.5 flex items-center gap-1 pointer-events-auto max-w-sm w-full justify-between">
            <Link to="/" className={`relative p-3 rounded-full flex items-center justify-center w-full transition-all duration-300 ${isActive('/') ? 'text-white' : 'text-slate-500'}`}>
                {isActive('/') && <div className="absolute inset-0 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30 -z-10 animate-fade-in" />}
                <Calendar className="w-5 h-5" />
            </Link>
            
            <Link to="/discover" className={`relative p-3 rounded-full flex items-center justify-center w-full transition-all duration-300 ${isActive('/discover') ? 'text-white' : 'text-slate-500'}`}>
                {isActive('/discover') && <div className="absolute inset-0 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30 -z-10 animate-fade-in" />}
                <Compass className="w-5 h-5" />
            </Link>

            <button 
                onClick={() => setIsSearchOpen(true)}
                className="relative p-3 rounded-full flex items-center justify-center w-full text-slate-500 active:text-white active:bg-white/10"
            >
                <Search className="w-5 h-5" />
            </button>
            
            <Link to="/watchlist" className={`relative p-3 rounded-full flex items-center justify-center w-full transition-all duration-300 ${isActive('/watchlist') ? 'text-white' : 'text-slate-500'}`}>
                 {isActive('/watchlist') && <div className="absolute inset-0 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30 -z-10 animate-fade-in" />}
                <List className="w-5 h-5" />
            </Link>
          </div>
      </div>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default Navbar;