import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Navbar from './components/Navbar';
import CalendarPage from './pages/CalendarPage';
import SearchPage from './pages/SearchPage';
import WatchlistPage from './pages/WatchlistPage';
import DiscoverPage from './pages/DiscoverPage';
import LoginPage from './pages/LoginPage';
import SearchModal from './components/SearchModal';
import MobileAddWarning from './components/MobileAddWarning';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAppContext();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings } = useAppContext();
    const location = useLocation();
    
    const isCalendar = location.pathname === '/';
    const isCompactMode = settings.compactCalendar && isCalendar;

    return (
        <div className={`
            /* Removed solid bg-slate-900 to let body gradient show */
            text-slate-50
            ${isCompactMode ? 'h-screen overflow-hidden flex flex-col md:flex-row' : 'min-h-screen pb-20 md:pb-0 flex flex-col md:flex-row'}
        `}>
            <Navbar />
            <SearchModal />
            <MobileAddWarning />
            <main className={`
                flex-1 
                md:ml-20 /* Offset for sidebar */
                ${isCompactMode 
                    ? 'h-full overflow-hidden p-3' 
                    : 'w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8' 
                }
            `}>
                {children}
            </main>
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