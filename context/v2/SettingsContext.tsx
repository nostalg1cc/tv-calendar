import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '../../types';
import { generatePaletteFromHex, THEMES } from '../AppContext'; // Importing helpers from legacy for now to keep DRY or move helpers to utils later

const DEFAULT_SETTINGS: AppSettings = {
  spoilerConfig: { images: false, overview: false, title: false, includeMovies: false, replacementMode: 'blur' },
  hideTheatrical: false,
  ignoreSpecials: false,
  recommendationsEnabled: true,
  recommendationMethod: 'banner',
  compactCalendar: true, 
  viewMode: 'grid', 
  mobileNavLayout: 'standard',
  suppressMobileAddWarning: false,
  calendarPosterFillMode: 'cover',
  useSeason1Art: false,
  cleanGrid: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  timeShift: false, 
  theme: 'default',
  customThemeColor: '#6366f1',
  appDesign: 'default',
  baseTheme: 'cosmic', 
  appFont: 'inter',
  reminderStrategy: 'ask',
  hiddenItems: [],
  v2SidebarMode: 'fixed',
  v2LibraryLayout: 'grid',
  autoSync: true
};

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const local = localStorage.getItem('tv_calendar_settings');
            const parsed = local ? JSON.parse(local) : {};
            return { ...DEFAULT_SETTINGS, ...parsed };
        } catch {
            return DEFAULT_SETTINGS;
        }
    });

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            // We save to local storage here, but Cloud sync happens in DataContext via effects
            localStorage.setItem('tv_calendar_settings', JSON.stringify(updated));
            return updated;
        });
    };

    // Theme Effect
    useEffect(() => { 
        const themeKey = settings.theme || 'default'; 
        let themeColors: Record<string, string>; 
        
        // Helper access from legacy or duplicated logic
        if (themeKey === 'custom' && settings.customThemeColor) { 
             themeColors = generatePaletteFromHex(settings.customThemeColor);
        } else { 
            themeColors = THEMES[themeKey] || THEMES.default; 
        } 
        
        const root = document.documentElement; 
        Object.entries(themeColors).forEach(([shade, value]) => { 
            root.style.setProperty(`--theme-${shade}`, value); 
        }); 

        let activeTheme = settings.baseTheme || 'cosmic';
        if (activeTheme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            activeTheme = prefersDark ? 'cosmic' : 'light';
        }

        document.body.setAttribute('data-base-theme', activeTheme);
        document.body.setAttribute('data-font', settings.appFont || 'inter');
    }, [settings.theme, settings.customThemeColor, settings.baseTheme, settings.appFont]);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within SettingsProvider');
    return context;
};