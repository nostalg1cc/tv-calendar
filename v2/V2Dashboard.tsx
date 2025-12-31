
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import V2Sidebar from './V2Sidebar';
import V2Calendar from './V2Calendar';
import V2SettingsModal from './V2SettingsModal';
import V2SearchModal from './V2SearchModal';
import V2Discover from './V2Discover';
import V2Library from './V2Library';
import V2Agenda from './V2Agenda';
import V2TrailerModal from './V2TrailerModal';
import V2IPoint from './V2IPoint';
import ApiKeyPrompt from '../components/ApiKeyPrompt';
import ContextMenu from '../components/ContextMenu';
import PosterPickerModal from '../components/PosterPickerModal';
import ShowDetailsModal from '../components/ShowDetailsModal';
import UpsideDownEffect from '../components/UpsideDownEffect';

const V2Dashboard: React.FC = () => {
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    // For Agenda Mobile Toggle
    const [isAgendaOpen, setIsAgendaOpen] = useState(false);
    
    // Modal State lifted for global access
    const [trailerTarget, setTrailerTarget] = useState<{showId: number, mediaType: 'tv' | 'movie', episode?: any} | null>(null);
    const [posterTarget, setPosterTarget] = useState<{showId: number, mediaType: 'tv' | 'movie'} | null>(null);
    const [detailsTarget, setDetailsTarget] = useState<{showId: number, mediaType: 'tv' | 'movie', season?: number, episode?: number} | null>(null);

    const handlePlayTrailer = (showId: number, mediaType: 'tv' | 'movie', episode?: any) => {
        setTrailerTarget({ showId, mediaType, episode });
    };

    const handleOpenDetails = (showId: number, mediaType: 'tv' | 'movie', season?: number, episode?: number) => {
        setDetailsTarget({ showId, mediaType, season, episode });
    };

    const handleDateSelect = (date: Date) => {
        setCalendarDate(date);
        setIsAgendaOpen(true); // Auto-open agenda on mobile when date selected
    };

    const handleEditPoster = (showId: number, mediaType: 'tv' | 'movie') => {
        setPosterTarget({ showId, mediaType });
    };

    return (
        <div className="flex h-screen w-screen bg-background text-text-main overflow-hidden font-sans selection:bg-indigo-500/30">
            <ContextMenu onEditPoster={handleEditPoster} />
            <UpsideDownEffect />
            
            <V2Sidebar 
                onOpenSettings={() => setIsSettingsOpen(true)} 
                onOpenSearch={() => setIsSearchOpen(true)}
            />

            <Routes>
                <Route path="calendar" element={
                    <div className="flex-1 flex h-full overflow-hidden relative">
                        <main className="flex-1 flex flex-col min-w-0 h-full relative z-0">
                            <V2Calendar 
                                selectedDay={calendarDate} 
                                onSelectDay={handleDateSelect} 
                            />
                        </main>
                        
                        {/* Desktop Agenda Sidebar / Mobile Sheet */}
                        <V2Agenda 
                            selectedDay={calendarDate} 
                            onPlayTrailer={handlePlayTrailer}
                            onOpenDetails={handleOpenDetails}
                            isOpen={isAgendaOpen}
                            onClose={() => setIsAgendaOpen(false)}
                        />
                    </div>
                } />
                <Route path="discover" element={<V2Discover />} />
                <Route path="library" element={<V2Library />} />
                <Route path="ipoint" element={<V2IPoint />} />
                {/* Community Route Removed */}
                <Route path="*" element={<Navigate to="calendar" replace />} />
            </Routes>

            {isSettingsOpen && <V2SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
            {isSearchOpen && <V2SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
            
            {trailerTarget && (
                <V2TrailerModal 
                    isOpen={!!trailerTarget} 
                    onClose={() => setTrailerTarget(null)} 
                    showId={trailerTarget.showId} 
                    mediaType={trailerTarget.mediaType} 
                    episode={trailerTarget.episode} 
                />
            )}

            {posterTarget && (
                <PosterPickerModal 
                    isOpen={!!posterTarget}
                    onClose={() => setPosterTarget(null)}
                    showId={posterTarget.showId}
                    mediaType={posterTarget.mediaType}
                />
            )}

            {detailsTarget && (
                <ShowDetailsModal 
                    isOpen={!!detailsTarget} 
                    onClose={() => setDetailsTarget(null)} 
                    showId={detailsTarget.showId} 
                    mediaType={detailsTarget.mediaType}
                    initialSeason={detailsTarget.season}
                    initialEpisode={detailsTarget.episode}
                />
            )}

            <ApiKeyPrompt />
        </div>
    );
};

export default V2Dashboard;
