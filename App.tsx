import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { V2Provider } from './context/v2';
import { useAppContext } from './context/AppContext'; 
import Navbar from './components/Navbar';
import CalendarPage from './pages/CalendarPage';
import SearchPage from './pages/SearchPage';
import WatchlistPage from './pages/WatchlistPage';
import DiscoverPage from './pages/DiscoverPage';
import LoginPage from './pages/v2/LoginPage'; 
import RemindersPage from './pages/RemindersPage';
import SearchModal from './components/SearchModal';
import MobileAddWarning from './components/MobileAddWarning';
import AskReminderModal from './components/AskReminderModal';
import ReminderConfigModal from './components/ReminderConfigModal';
import FullSyncModal from './components/FullSyncModal';
import MigrationModal from './components/MigrationModal';
import V2Dashboard from './v2/V2Dashboard';
import { Loader2, Terminal, CheckCircle2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAppContext();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings, reminderCandidate, setReminderCandidate } = useAppContext();
    const location = useLocation();
    
    // Check if we are in V2 context
    const isV2 = location.pathname.startsWith('/v2') || location.pathname === '/' || location.pathname.startsWith('/calendar') || location.pathname.startsWith('/discover') || location.pathname.startsWith('/library');
    if (isV2 && !location.pathname.startsWith('/v1')) return <>{children}</>;

    const isCalendar = location.pathname === '/v1/' || location.pathname === '/v1';
    const isCompactMode = settings.compactCalendar && isCalendar;
    const isPill = settings.mobileNavLayout === 'pill';

    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const handleConfirmReminder = () => {
        setIsConfigOpen(true);
    };

    const handleCloseFlow = () => {
        setReminderCandidate(null);
        setIsConfigOpen(false);
    };

    return (
        <div className="flex h-screen w-screen bg-[var(--bg-main)] text-slate-100 overflow-hidden">
            <Navbar />
            <div className={`
                flex-1 flex flex-col min-w-0 relative
                ${isCompactMode ? 'h-full' : 'h-full overflow-y-auto overflow-x-hidden'}
            `}>
                <div className={`
                    flex-1 w-full mx-auto transition-all duration-300
                    ${isCompactMode 
                        ? `h-full p-0 md:p-4 md:pb-4 ${isPill ? 'pb-2' : 'pb-28'}` 
                        : `max-w-[1920px] p-0 ${isPill ? 'pb-24' : 'pb-28'}`
                    }
                `}>
                    {children}
                </div>
                {isPill && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/80 to-transparent pointer-events-none z-40" />
                )}
            </div>
            <SearchModal />
            <MobileAddWarning />
            <FullSyncModal />
            <MigrationModal />
            <AskReminderModal 
                isOpen={!!reminderCandidate && !isConfigOpen} 
                item={reminderCandidate} 
                onClose={() => setReminderCandidate(null)} 
                onConfirm={handleConfirmReminder} 
            />
            {reminderCandidate && (
                <ReminderConfigModal 
                    isOpen={isConfigOpen} 
                    item={reminderCandidate} 
                    onClose={handleCloseFlow} 
                />
            )}
        </div>
    )
}

const StartupScreen: React.FC = () => {
    const { loadingStatus, syncProgress } = useAppContext();
    const pct = syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0;

    return (
        <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
             {/* Background Matrix Effect (Subtle) */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />

             <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
                 <div className="mb-8 flex justify-center">
                     <div className="relative">
                         <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 shadow-2xl">
                             <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                         </div>
                         <div className="absolute -bottom-2 -right-2 bg-indigo-600 rounded-lg p-1.5 shadow-lg border border-[#050505]">
                             <Terminal className="w-3 h-3 text-white" />
                         </div>
                     </div>
                 </div>

                 <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
                     <div className="flex justify-between items-center mb-4">
                         <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">System Boot</span>
                         <span className="text-xs font-mono text-indigo-400">{pct > 0 ? `${pct}%` : 'INIT'}</span>
                     </div>
                     
                     <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-6">
                         <div 
                            className="h-full bg-indigo-500 transition-all duration-300 ease-out relative" 
                            style={{ width: `${pct > 0 ? pct : 5}%` }}
                         >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                         </div>
                     </div>

                     <div className="space-y-3">
                         <div className="flex items-center gap-3 text-sm text-zinc-300">
                             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                             <span>Authentication</span>
                         </div>
                         <div className="flex items-center gap-3 text-sm text-zinc-300">
                             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                             <span>Database Connection</span>
                         </div>
                         <div className="flex items-center gap-3 text-sm text-white font-medium animate-pulse">
                             <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                             <span>{loadingStatus || "Loading resources..."}</span>
                         </div>
                     </div>
                 </div>

                 <p className="text-center text-[10px] text-zinc-600 font-mono mt-8 uppercase tracking-widest">
                     TV Calendar v2.5.0
                 </p>
             </div>
        </div>
    );
};

const AppRoutes: React.FC = () => {
    const { user, loading } = useAppContext();

    if (loading) {
        return <StartupScreen />;
    }

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
            
            {/* Legacy V1 Routes */}
            <Route path="/v1/*" element={
                <ProtectedRoute>
                    <Layout>
                        <Routes>
                            <Route path="/" element={<CalendarPage />} />
                            <Route path="/discover" element={<DiscoverPage />} />
                            <Route path="/search" element={<SearchPage />} />
                            <Route path="/watchlist" element={<WatchlistPage />} />
                            <Route path="/reminders" element={<RemindersPage />} />
                            <Route path="*" element={<Navigate to="/v1/" replace />} />
                        </Routes>
                    </Layout>
                </ProtectedRoute>
            } />

            {/* V2 Routes (Default) */}
            <Route path="/*" element={
                <ProtectedRoute>
                    <V2Dashboard />
                    <MigrationModal />
                </ProtectedRoute>
            } />
        </Routes>
    );
};

const App: React.FC = () => {
  return (
    <V2Provider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
    </V2Provider>
  );
};

export default App;