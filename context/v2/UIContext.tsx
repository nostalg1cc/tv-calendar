import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useSettings } from './SettingsContext';
import { TVShow, Episode } from '../../types';

interface UIContextType {
    isSearchOpen: boolean;
    setIsSearchOpen: (v: boolean) => void;
    isMobileWarningOpen: boolean;
    closeMobileWarning: (suppress: boolean) => void;
    calendarScrollPos: number;
    setCalendarScrollPos: (v: number) => void;
    reminderCandidate: TVShow | Episode | null;
    setReminderCandidate: (v: TVShow | Episode | null) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { updateSettings } = useSettings();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileWarningOpen, setIsMobileWarningOpen] = useState(false);
    const [calendarScrollPos, setCalendarScrollPos] = useState(0);
    const [reminderCandidate, setReminderCandidate] = useState<TVShow | Episode | null>(null);

    const closeMobileWarning = (suppress: boolean) => {
        setIsMobileWarningOpen(false);
        if (suppress) updateSettings({ suppressMobileAddWarning: true });
    };

    return (
        <UIContext.Provider value={{ isSearchOpen, setIsSearchOpen, isMobileWarningOpen, closeMobileWarning, calendarScrollPos, setCalendarScrollPos, reminderCandidate, setReminderCandidate }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within UIProvider');
    return context;
};