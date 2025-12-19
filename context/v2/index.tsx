import React, { ReactNode } from 'react';
import { SettingsProvider } from './SettingsContext';
import { AuthProvider } from './AuthContext';
import { DataProvider } from './DataContext';
import { CalendarProvider } from './CalendarContext';
import { UIProvider } from './UIContext';

export const V2Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <SettingsProvider>
            <AuthProvider>
                <DataProvider>
                    <CalendarProvider>
                        <UIProvider>
                            {children}
                        </UIProvider>
                    </CalendarProvider>
                </DataProvider>
            </AuthProvider>
        </SettingsProvider>
    );
};

// Re-export hooks for easy access if needed directly
export { useSettings } from './SettingsContext';
export { useAuth } from './AuthContext';
export { useData } from './DataContext';
export { useCalendar } from './CalendarContext';
export { useUI } from './UIContext';