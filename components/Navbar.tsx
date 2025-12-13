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

  const isActive = (path: string) => location.pathname === path ? "bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white";

  return (
    <>
      <nav className="bg-slate-900/60 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 text-indigo-500 font-bold text-xl tracking-tight">
                <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                  <Tv className="w-6 h-6" />
                </div>
                <span className="text-white">TV <span className="text-indigo-400">Calendar</span></span>
              </Link>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-2">
                  <Link to="/" className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${isActive('/')}`}>
                    <Calendar className="w-4 h-4" /> Calendar
                  </Link>
                   <Link to="/discover" className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${isActive('/discover')}`}>
                    <Compass className="w-4 h-4" /> Discover
                  </Link>
                  {/* Search Button triggers Modal */}
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
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
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
        
        {/* Mobile Menu */}
        <div className="md:hidden border-t border-white/5 flex justify-around p-2 bg-slate-900/90 backdrop-blur-xl">
            <Link to="/" className={`p-3 rounded-xl ${isActive('/')}`}><Calendar className="w-6 h-6"/></Link>
            <Link to="/discover" className={`p-3 rounded-xl ${isActive('/discover')}`}><Compass className="w-6 h-6"/></Link>
            <button onClick={() => setIsSearchOpen(true)} className="p-3 rounded-xl text-slate-400 hover:text-white"><Search className="w-6 h-6"/></button>
            <Link to="/watchlist" className={`p-3 rounded-xl ${isActive('/watchlist')}`}><List className="w-6 h-6"/></Link>
            <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-xl text-slate-400 hover:text-white"><User className="w-6 h-6"/></button>
        </div>
      </nav>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default Navbar;