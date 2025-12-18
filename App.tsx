
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
import TrailerModal from './components/TrailerModal';
import { TVShow, Episode } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAppContext();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings, reminderCandidate, setReminderCandidate, trailerTarget, setTrailerTarget } = useAppContext();
    const location = useLocation();
    
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const handleConfirmReminder = () => {
        setIsConfigOpen(true);
    };

    const handleCloseFlow = () => {
        setReminderCandidate(null);
        setIsConfigOpen(false);
    };

    return (
        <div className="flex h-screen w-screen bg-[#020202] text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Sidebar Navigation */}
            <Navbar />
            
            {/* Main Content Area */}
            {children}

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

            {/* Global Trailer Modal */}
            {trailerTarget && (
                <TrailerModal 
                    isOpen={!!trailerTarget} 
                    onClose={() => setTrailerTarget(null)}
                    item={trailerTarget}
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
