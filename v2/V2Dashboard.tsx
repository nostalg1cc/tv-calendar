
import React, { useState } from 'react';
import V2Sidebar from './V2Sidebar';
import V2Calendar from './V2Calendar';
import V2Agenda from './V2Agenda';
import V2SettingsModal from './V2SettingsModal';
import V2TrailerModal from './V2TrailerModal';
import { useAppContext } from '../context/AppContext';
import { Episode } from '../types';

const V2Dashboard: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [trailerTarget, setTrailerTarget] = useState<{showId: number, mediaType: 'tv' | 'movie', episode?: Episode} | null>(null);

    const handlePlayTrailer = (showId: number, mediaType: 'tv' | 'movie', episode?: Episode) => {
        setTrailerTarget({ showId, mediaType, episode });
    };

    return (
        <div className="flex h-screen w-screen bg-[#020202] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Column 1: V2 Sidebar */}
            <V2Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

            {/* Column 2: Main Content (Calendar Area) */}
            <main className="flex-1 flex flex-col min-w-0 h-full">
                <V2Calendar 
                    selectedDay={selectedDate} 
                    onSelectDay={setSelectedDate} 
                />
            </main>

            {/* Column 3: Agenda (Right Sidebar) */}
            <V2Agenda 
                selectedDay={selectedDate} 
                onPlayTrailer={handlePlayTrailer}
            />

            {/* V2 Specific Modal Overlays */}
            <V2SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            
            {trailerTarget && (
                <V2TrailerModal 
                    isOpen={!!trailerTarget} 
                    onClose={() => setTrailerTarget(null)}
                    showId={trailerTarget.showId}
                    mediaType={trailerTarget.mediaType}
                    episode={trailerTarget.episode}
                />
            )}
        </div>
    );
};

export default V2Dashboard;
