import React, { createContext, useContext, useEffect, useRef } from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList, Reminder, Interaction } from '../types';
import { useSettings } from './v2/SettingsContext';
import { useAuth } from './v2/AuthContext';
import { useData } from './v2/DataContext';
import { useCalendar } from './v2/CalendarContext';
import { useUI } from './v2/UIContext';
import { setApiToken } from '../services/tmdb';

export const THEMES: Record<string, Record<string, string>> = {
  default: { 500: '99, 102, 241' }, // Indigo
  emerald: { 500: '16, 185, 129' },
  rose: { 500: '244, 63, 94' },
  amber: { 500: '245, 158, 11' },
  cyan: { 500: '6, 182, 212' },
  violet: { 500: '139, 92, 246' },
  zinc: { 500: '113, 113, 122' },
};

export const generatePaletteFromHex = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    const rgb = result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '99, 102, 241';
    return { 500: rgb };
};

// --- TYPES (Legacy Interface Match) ---
interface AppContextType {
  user: User | null;
  login: (username: string, apiKey: string) => void;
  loginCloud: (session: any) => Promise<void>;
  logout: () => void;
  updateUserKey: (apiKey: string) => void;
  watchlist: TVShow[]; 
  subscribedLists: SubscribedList[];
  allTrackedShows: TVShow[]; 
  episodes: Record<string, Episode[]>; 
  reminders: Reminder[];
  interactions: Record<string, Interaction>; 
  addToWatchlist: (show: TVShow) => Promise<void>;
  removeFromWatchlist: (showId: number) => void;
  unhideShow: (showId: number) => void;
  batchAddShows: (shows: TVShow[]) => void; 
  batchSubscribe: (lists: SubscribedList[]) => void; 
  subscribeToList: (listId: string) => Promise<void>;
  unsubscribeFromList: (listId: string) => void;
  loading: boolean; 
  isSyncing: boolean; 
  syncProgress: { current: number; total: number }; 
  refreshEpisodes: (force?: boolean) => Promise<void>;
  loadArchivedEvents: () => Promise<void>;
  fullSyncRequired: boolean;
  performFullSync: (config?: Partial<AppSettings>) => Promise<void>;
  hardRefreshCalendar: () => Promise<void>;
  reloadAccount: () => Promise<void>;
  toggleWatched: (id: number, mediaType: 'tv' | 'movie') => Promise<void>;
  toggleEpisodeWatched: (showId: number, season: number, episode: number) => Promise<void>;
  markHistoryWatched: (showId: number, season: number, episode: number) => Promise<void>;
  setRating: (id: number, mediaType: 'tv' | 'movie', rating: number) => Promise<void>;
  addReminder: (reminder: Reminder) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  reminderCandidate: TVShow | Episode | null;
  setReminderCandidate: (item: TVShow | Episode | null) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  isMobileWarningOpen: boolean;
  closeMobileWarning: (suppressFuture: boolean) => void;
  calendarScrollPos: number;
  setCalendarScrollPos: (pos: number) => void;
  calendarDate: Date;
  setCalendarDate: (date: Date) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  importBackup: (data: any) => void;
  uploadBackupToCloud: (data: any) => Promise<void>;
  getSyncPayload: () => string;
  processSyncPayload: (payload: string) => void;
  testConnection: () => Promise<{ read: boolean; write: boolean; message: string }>;
  traktAuth: (clientId: string, clientSecret: string) => Promise<any>;
  traktPoll: (deviceCode: string, clientId: string, clientSecret: string) => Promise<any>;
  saveTraktToken: (tokenData: any) => Promise<void>;
  disconnectTrakt: () => Promise<void>;
  syncTraktData: (background?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Consume V2 Contexts
  const { settings, updateSettings } = useSettings();
  const { user, login, logout, loginCloud, updateUserKey, traktAuth, traktPoll, saveTraktToken, disconnectTrakt, authLoading } = useAuth();
  const { 
      watchlist, subscribedLists, reminders, interactions, 
      addToWatchlist, removeFromWatchlist, batchAddShows, subscribeToList, unsubscribeFromList, batchSubscribe,
      addReminder, removeReminder, toggleWatched, toggleEpisodeWatched, markHistoryWatched, setRating,
      syncTraktData, performFullSync: performDataSync, saveToCloudCalendar, 
      isSyncing, syncProgress, fullSyncRequired, setFullSyncRequired
  } = useData();
  const { episodes, calendarDate, setCalendarDate, refreshEpisodes, loadArchivedEvents, loading: calendarLoading } = useCalendar();
  const { isSearchOpen, setIsSearchOpen, isMobileWarningOpen, closeMobileWarning, calendarScrollPos, setCalendarScrollPos, reminderCandidate, setReminderCandidate } = useUI();

  // Derived
  const allTrackedShows = React.useMemo(() => {
      const map = new Map<number, TVShow>();
      watchlist.forEach(show => map.set(show.id, show));
      subscribedLists.forEach(list => list.items.forEach(show => { if (!map.has(show.id)) map.set(show.id, show); }));
      return Array.from(map.values());
  }, [watchlist, subscribedLists]);

  // Legacy Bridges
  const unhideShow = (showId: number) => {
      const newHidden = settings.hiddenItems.filter(i => i.id !== showId);
      updateSettings({ hiddenItems: newHidden });
      if (user?.traktToken) syncTraktData(true);
  };

  const performFullSyncBridge = async (config?: Partial<AppSettings>) => {
      if (config) updateSettings(config);
      await performDataSync(allTrackedShows);
  };

  const hardRefreshCalendar = async () => {
      await refreshEpisodes(true);
  };

  const reloadAccount = async () => {
       // Handled mostly by AuthContext init but exposes method
       window.location.reload();
  };

  const requestNotificationPermission = async () => {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;
      const permission = await Notification.requestPermission();
      return permission === 'granted';
  };

  const importBackup = (data: any) => {
      if (data.watchlist) batchAddShows(data.watchlist);
      if (data.settings) updateSettings(data.settings);
      // ... partial implementation for bridge
  };

  const uploadBackupToCloud = async (data: any) => { /* Implemented in V2 via DataContext if needed, mostly redundant */ };
  
  const getSyncPayload = () => JSON.stringify({ user, settings }); // Simplified
  const processSyncPayload = (payload: string) => { /* ... */ };

  const testConnection = async () => { return { read: true, write: true, message: 'V2 Bridge Active' }; };

  return (
    <AppContext.Provider value={{
      user, login, loginCloud, logout, updateUserKey,
      watchlist, addToWatchlist, removeFromWatchlist, unhideShow, batchAddShows, batchSubscribe,
      subscribedLists, subscribeToList, unsubscribeFromList, allTrackedShows,
      episodes, loading: authLoading || calendarLoading, isSyncing, syncProgress, refreshEpisodes, loadArchivedEvents,
      requestNotificationPermission,
      isSearchOpen, setIsSearchOpen,
      settings, updateSettings,
      importBackup, uploadBackupToCloud,
      getSyncPayload, processSyncPayload,
      isMobileWarningOpen, closeMobileWarning,
      reminders, addReminder, removeReminder,
      reminderCandidate, setReminderCandidate,
      reloadAccount,
      calendarScrollPos, setCalendarScrollPos,
      calendarDate, setCalendarDate,
      interactions, toggleWatched, toggleEpisodeWatched, markHistoryWatched, setRating,
      traktAuth, traktPoll, saveTraktToken, disconnectTrakt, syncTraktData,
      fullSyncRequired, performFullSync: performFullSyncBridge,
      hardRefreshCalendar,
      testConnection
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};