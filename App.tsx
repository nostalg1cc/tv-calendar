import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Navbar from './components/Navbar';
import CalendarPage from './pages/CalendarPage';
import SearchPage from './pages/SearchPage';
import WatchlistPage from './pages/WatchlistPage';
import DiscoverPage from './pages/DiscoverPage';
import LoginPage from './pages/LoginPage';
import RemindersPage from './pages/RemindersPage';
import SearchModal from './components/SearchModal';
import MobileAddWarning from './components/MobileAddWarning';
import AskReminderModal from './components/AskReminderModal';
import ReminderConfigModal from './components/ReminderConfigModal';
import FullSyncModal from './components/FullSyncModal';
import { TVShow, Episode } from './types';

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
    
    // Determine if we need specialized layout logic
    const isCalendar = location.pathname === '/';
    const isCompactMode = settings.compactCalendar && isCalendar;
    const isPill = settings.mobileNavLayout === 'pill';

    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // If reminderCandidate is set (Ask Modal is triggered)
    // If confirmed, close ask modal and open Config Modal
    const handleConfirmReminder = () => {
        setIsConfigOpen(true);
        // keep reminderCandidate set so ConfigModal can use it
    };

    const handleCloseFlow = () => {
        setReminderCandidate(null);
        setIsConfigOpen(false);
    };

    return (
        <div className="flex h-screen w-screen bg-[var(--bg-main)] text-slate-100 overflow-hidden">
            {/* Sidebar Navigation */}
            <Navbar />
            
            {/* Main Content Area */}
            <div className={`
                flex-1 flex flex-col min-w-0 relative
                ${isCompactMode ? 'h-full' : 'h-full overflow-y-auto overflow-x-hidden'}
            `}>
                <div className={`
                    flex-1 w-full mx-auto transition-all duration-300
                    ${isCompactMode 
                        ? `h-full p-0 md:p-4 md:pb-4 ${isPill ? 'pb-2' : 'pb-28'}` 
                        : `max-w-[1920px] p-0 md:p-8 md:pb-12 ${isPill ? 'pb-24' : 'pb-28'}`
                    }
                `}>
                    {children}
                </div>

                {/* Bottom Gradient Fade for Pill Mode */}
                {isPill && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/80 to-transparent pointer-events-none z-40" />
                )}
            </div>

            {/* Global Overlays */}
            <SearchModal />
            <MobileAddWarning />
            <FullSyncModal />
            
            {/* Global Reminder Flow */}
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
        <Layout>
            <Routes>
                <Route path="/" element={<CalendarPage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/watchlist" element={<WatchlistPage />} />
                <Route path="/reminders" element={<RemindersPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
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