
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';

// --- V2 Components (Active) ---
import V2Dashboard from './v2/V2Dashboard';
import FullSyncModal from './components/FullSyncModal';
import AskReminderModal from './components/AskReminderModal';
import ReminderConfigModal from './components/ReminderConfigModal';

// --- V1 Components (Legacy/Obsolete) ---
import Navbar from './obsolete/components/Navbar';
import CalendarPage from './obsolete/pages/CalendarPage';
import SearchPage from './obsolete/pages/SearchPage';
import WatchlistPage from './obsolete/pages/WatchlistPage';
import DiscoverPage from './obsolete/pages/DiscoverPage';
import RemindersPage from './obsolete/pages/RemindersPage';
import SearchModal from './obsolete/components/SearchModal';
import MobileAddWarning from './obsolete/components/MobileAddWarning';

import LoginPage from './pages/LoginPage';

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

const AppRoutes: React.FC = () => {
    const { user } = useAppContext();

    if (!user) {
        return <LoginPage />;
    }

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            {/* Legacy V1 Routes */}
            <Route path="/v1/*" element={
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
            } />

            {/* V2 Routes (Default) */}
            <Route path="/*" element={<ProtectedRoute><V2Dashboard /></ProtectedRoute>} />
        </Routes>
    );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
};

export default App;
        