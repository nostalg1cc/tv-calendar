
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import MobileAddWarning from './components/MobileAddWarning';
import AskReminderModal from './components/AskReminderModal';
import ReminderConfigModal from './components/ReminderConfigModal';
import FullSyncModal from './components/FullSyncModal';
import SearchModal from './components/SearchModal';
import V2Dashboard from './v2/V2Dashboard';

const AppRoutes: React.FC = () => {
    const { user, settings, reminderCandidate, setReminderCandidate } = useAppContext();
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    if (!user) {
        return <LoginPage />;
    }

    const handleConfirmReminder = () => {
        setIsConfigOpen(true);
    };

    const handleCloseFlow = () => {
        setReminderCandidate(null);
        setIsConfigOpen(false);
    };

    return (
        <>
            <Routes>
                <Route path="/*" element={<V2Dashboard />} />
            </Routes>

            {/* Global Overlays */}
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
        </>
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
