
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import V2Sidebar from './V2Sidebar';
import V2Calendar from './V2Calendar';
import V2SettingsModal from './V2SettingsModal';
import V2SearchModal from './V2SearchModal';
import V2Discover from './V2Discover';
import V2Library from './V2Library';

const V2Dashboard: React.FC = () => {
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    return (
        <div className="flex h-screen w-screen bg-[#020202] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
            <V2Sidebar 
                onOpenSettings={() => setIsSettingsOpen(true)} 
                onOpenSearch={() => setIsSearchOpen(true)}
            />

            <Routes>
                <Route path="calendar" element={
                    <main className="flex-1 flex flex-col min-w-0 h-full relative z-0">
                        <V2Calendar 
                            selectedDay={calendarDate} 
                            onSelectDay={setCalendarDate} 
                        />
                    </main>
                } />
                <Route path="discover" element={<V2Discover />} />
                <Route path="library" element={<V2Library />} />
                <Route path="*" element={<Navigate to="calendar" replace />} />
            </Routes>

            {isSettingsOpen && <V2SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
            {isSearchOpen && <V2SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
        </div>
    );
};

export default V2Dashboard;
