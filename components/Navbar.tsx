import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Search, List, LogOut, Tv, Settings, User, Compass } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import SettingsModal from './SettingsModal';

const Navbar: React.FC = () => {
  const { user, logout, setIsSearchOpen } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40" : "text-slate-400 hover:text-white";
  const isMobileActive = (path: string) => location.pathname === path ? "text-white" : "text-slate-500";

  return (
    <>
      {/* DESKTOP TOP NAV */}
      <nav className="hidden md:block bg-slate-900/60 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 text-indigo-500 font-bold text-xl tracking-tight">
                <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                  <Tv className="w-6 h-6" />
                </div>
                <span className="text-white">TV <span className="text-indigo-400">Calendar</span></span>
              </Link>
              <div className="ml-10">
                <div className="flex items-baseline space-x-2">
                  <Link to="/" className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${isActive('/')}`}>
                    <Calendar className="w-4 h-4" /> Calendar
                  </Link>
                   <Link to="/discover" className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${isActive('/discover')}`}>
                    <Compass className="w-4 h-4" /> Discover
                  </Link>
                  <button 
                    onClick={() => setIsSearchOpen(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 text-slate-400 hover:bg-white/5 hover:text-white`}
                  >
                    <Search className="w-4 h-4" /> Search
                  </button>
                  <Link to="/watchlist" className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${isActive('/watchlist')}`}>
                    <List className="w-4 h-4" /> Watchlist
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
              >
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                      {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">{user.username}</span>
                  <Settings className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
              </button>

              <button
                onClick={logout}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE TOP BAR (Logo + Settings) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
           <Link to="/" className="flex items-center gap-2 text-indigo-500 font-bold text-lg tracking-tight">
                <div className="p-1 bg-indigo-500/10 rounded-lg">
                  <Tv className="w-5 h-5" />
                </div>
                <span className="text-white">TV <span className="text-indigo-400">Calendar</span></span>
           </Link>
           <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center"
           >
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">
                    {user.username.charAt(0).toUpperCase()}
                </div>
           </button>
      </div>
        
      {/* MOBILE FLOATING PILL NAV (Bottom) */}
      <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none safe-area-bottom">
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl shadow-black/50 p-1.5 flex items-center gap-1 pointer-events-auto max-w-sm w-full justify-between">
            <Link to="/" className={`relative p-3 rounded-full flex items-center justify-center w-full transition-all duration-300 ${isMobileActive('/')}`}>
                {location.pathname === '/' && <div className="absolute inset-0 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30 -z-10 animate-fade-in" />}
                <Calendar className="w-5 h-5" />
            </Link>
            
            <Link to="/discover" className={`relative p-3 rounded-full flex items-center justify-center w-full transition-all duration-300 ${isMobileActive('/discover')}`}>
                {location.pathname === '/discover' && <div className="absolute inset-0 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30 -z-10 animate-fade-in" />}
                <Compass className="w-5 h-5" />
            </Link>

            <button 
                onClick={() => setIsSearchOpen(true)}
                className="relative p-3 rounded-full flex items-center justify-center w-full text-slate-500 active:text-white active:bg-white/10"
            >
                <Search className="w-5 h-5" />
            </button>
            
            <Link to="/watchlist" className={`relative p-3 rounded-full flex items-center justify-center w-full transition-all duration-300 ${isMobileActive('/watchlist')}`}>
                 {location.pathname === '/watchlist' && <div className="absolute inset-0 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30 -z-10 animate-fade-in" />}
                <List className="w-5 h-5" />
            </Link>
          </div>
      </div>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default Navbar;